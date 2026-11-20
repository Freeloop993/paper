import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createImageJobs } from './image-jobs.mjs';

test('an H3 job binds the prompt, ordered reference images and at most one provider call to an attempt', async () => {
  const directory=await mkdtemp(join(tmpdir(),'h3-job-test-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  const base64=png.toString('base64');
  const digest=createHash('sha256').update(png).digest('hex');
  const input={attemptId:randomUUID(),prompt:'civilian product study',
    inputs:[{role:'layout',sha256:digest,dataUrl:'data:image/png;base64,'+base64}]};
  let resolveProvider, calls=0;
  const provider=new Promise(resolve=>{resolveProvider=resolve;});
  const options={apiKey:'fixture',directory,fetchImpl:async(url,init)=>{
    calls++;
    const body=JSON.parse(init.body);
    assert.equal(url,'https://api.minimax.io/v1/images/edits');
    assert.equal(body.images[0].image_url,input.inputs[0].dataUrl);
    assert.equal(body.prompt,input.prompt);
    assert.equal(body.size,'1024x1024');
    assert.equal('disable_prompt_enhanced' in body,false);
    await provider;
    return Response.json({data:[{b64_json:base64,revised_prompt:'provider text'}]},{headers:{'trace-id':'fixture-trace'}});
  }};
  try {
    const jobs=createImageJobs(options);
    await Promise.all([jobs.submit(input), jobs.submit(input)]);
    assert.equal(calls,1);
    assert.equal((await jobs.get(input.attemptId)).status,'running');
    await assert.rejects(jobs.submit({...input,prompt:'changed'}),error=>error.status===409);
    await assert.rejects(jobs.submit({...input,inputs:[{...input.inputs[0],sha256:'0'.repeat(64)}]}),error=>error.status===400);
    resolveProvider();
    let result;
    for(let i=0;i<100;i++){
      result=await jobs.get(input.attemptId);
      if(result.status!=='running') break;
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.equal(result.status,'succeeded');
    assert.equal(result.outputs[0].sha256,digest);
    assert.equal(result.evidence.response.traceId,'fixture-trace');
    assert.equal(result.evidence.response.revisedPrompt,'provider text');
    const restarted=createImageJobs(options);
    await restarted.submit(input);
    assert.equal((await restarted.get(input.attemptId)).outputs[0].dataUrl,input.inputs[0].dataUrl);
    assert.equal(calls,1);
  } finally {
    resolveProvider();
    await rm(directory,{recursive:true,force:true});
  }
});

test('a Qwen job runs the archived E3 workflow on ComfyUI, keeps the raw receipts and reuses its seed', async () => {
  const { comfyDefaults, seedOf, qwenModel } = await import('./image-jobs.mjs');
  const directory=await mkdtemp(join(tmpdir(),'qwen-job-test-'));
  const png=await readFile(new URL('../src/data/history/quad-guide.png',import.meta.url));
  const digest=createHash('sha256').update(png).digest('hex');
  const input={attemptId:randomUUID(),prompt:'civilian product study',
    inputs:[{role:'layout',sha256:digest,dataUrl:'data:image/png;base64,'+png.toString('base64')}]};
  const seen=[]; let polls=0, graph;
  const fetchImpl=async(url,init={})=>{
    const {pathname,searchParams}=new URL(url); seen.push(pathname);
    if(pathname==='/upload/image'){ const file=init.body.get('image'); assert.equal(file.name,'studio-'+digest+'.png');
      assert.equal(createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex'),digest); return Response.json({name:file.name,subfolder:'',type:'input'}); }
    if(pathname==='/prompt'){ graph=JSON.parse(init.body).prompt; return Response.json({prompt_id:'run-1',node_errors:{}}); }
    if(pathname==='/history/run-1') return Response.json(++polls<2 ? {} : {'run-1':{status:{completed:true,status_str:'success'},
      outputs:{12:{images:[{filename:'studio-x_00001_.png',subfolder:'',type:'output'}]}}}});
    if(pathname==='/view'){ assert.equal(searchParams.get('filename'),'studio-x_00001_.png'); return new Response(png); }
    return new Response('',{status:404});
  };
  try {
    const jobs=createImageJobs({backend:{provider:'qwen-comfy',url:'http://gpu.test:8188/',pollMs:5},fetchImpl,directory});
    assert.deepEqual(jobs.describe(),{provider:'qwen-comfy',model:qwenModel,endpoint:'/prompt',label:'Qwen-Image 2.1（本机 ComfyUI）',configured:true});
    assert.deepEqual(await jobs.submit(input),{attemptId:input.attemptId,jobId:input.attemptId,provider:'qwen-comfy',model:qwenModel});
    let job; for(let i=0;i<200 && (job=await jobs.get(input.attemptId)).status==='running';i++) await new Promise(r=>setTimeout(r,10));
    assert.equal(job.status,'succeeded',job.error);
    assert.deepEqual(seen.filter(p=>p!=='/history/run-1'),['/upload/image','/prompt','/view']);
    // 与归档的 E3 请求同构：节点类别、权重文件名、采样设置、负面词、条件图接在 image_1
    assert.deepEqual(Object.fromEntries(Object.entries(graph).map(([k,v])=>[k,v.class_type])),
      {1:'UNETLoader',2:'CLIPLoader',3:'VAELoader',4:'TextEncodeQwenImage21',10:'KSampler',11:'VAEDecode',12:'SaveImage',15:'LoadImage'});
    assert.equal(graph['1'].inputs.unet_name,'qwen_image_2.1_bf16.safetensors');
    assert.deepEqual({steps:graph['10'].inputs.steps,cfg:graph['10'].inputs.cfg,sampler:graph['10'].inputs.sampler_name,scheduler:graph['10'].inputs.scheduler,denoise:graph['10'].inputs.denoise},
      {steps:40,cfg:3,sampler:'euler',scheduler:'simple',denoise:1});
    assert.equal(graph['4'].inputs.negative_prompt,comfyDefaults.negative_prompt);
    assert.equal(graph['4'].inputs.prompt,input.prompt);
    assert.deepEqual(graph['4'].inputs['images.image_1'],['15',0]);
    assert.equal(graph['15'].inputs.image,'studio-'+digest+'.png');
    assert.equal(graph['10'].inputs.seed,seedOf(input.attemptId));
    assert.equal(job.evidence.request.seed,seedOf(input.attemptId));
    assert.equal(job.evidence.request.endpoint,'/prompt');
    assert.equal(job.evidence.response.traceId,'run-1');
    assert.equal(job.outputs[0].sha256,digest);
    for(const kind of ['request','ack','history']) assert.ok((await readFile(join(directory,input.attemptId+'.comfy-'+kind+'.json'))).length>10);
    // 同一轮次重交：不再调用服务，种子不变
    const before=seen.length; await jobs.submit(input); assert.equal(seen.length,before);
    // 没有配置地址时，记录失败而不是去连别的服务
    const none=createImageJobs({backend:{provider:'qwen-comfy'},fetchImpl:async()=>{throw new Error('should not be called');},directory});
    const other={...input,attemptId:randomUUID()}; await none.submit(other);
    assert.match((await none.get(other.attemptId)).error,/尚未配置 Qwen/);
  } finally { await rm(directory,{recursive:true,force:true}); }
});
