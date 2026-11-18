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
