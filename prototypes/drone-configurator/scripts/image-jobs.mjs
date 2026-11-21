import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { ChatError } from './design-chat.mjs';

export const imageModel = 'MiniMax-H3-Image';
export const qwenModel = 'Qwen-Image-2.1';
// 与第 4 章 E3 设计通路已归档的请求是同一套工作流和设置（experiments/e3-quad-qwen/requests/*.request.json）。
export const comfyDefaults = { unet:'qwen_image_2.1_bf16.safetensors', clip:'qwen3vl_8b_bf16.safetensors', vae:'qwen_image_2.1_vae_bf16.safetensors',
  steps:40, cfg:3, sampler_name:'euler', scheduler:'simple',
  negative_prompt:'flat schematic, line drawing, collage, text, labels, logo, cropped rotor, disconnected arm, extra rotor, perspective camera' };
// 不带图的自由提示与 E1 纯文字组已归档的请求同构（evidence/e1-open-20261112/E1-actual/E1-text-*/request.json）：编码器只接文字，不接 VAE。
export function comfyGraph(id, prompt, seed, imageNames, s=comfyDefaults) {
  const encoder={clip:['2',0],...(imageNames.length ? {vae:['3',0]} : {}),prompt,negative_prompt:s.negative_prompt,resolution:1024};
  const graph={
    '1':{class_type:'UNETLoader',inputs:{unet_name:s.unet,weight_dtype:'default'}},
    '2':{class_type:'CLIPLoader',inputs:{clip_name:s.clip,type:'qwen_image',device:'default'}},
    '3':{class_type:'VAELoader',inputs:{vae_name:s.vae}},
    '4':{class_type:'TextEncodeQwenImage21',inputs:encoder},
    '10':{class_type:'KSampler',inputs:{model:['1',0],positive:['4',0],negative:['4',1],latent_image:['4',2],
      seed,steps:s.steps,cfg:s.cfg,sampler_name:s.sampler_name,scheduler:s.scheduler,denoise:1}},
    '11':{class_type:'VAEDecode',inputs:{samples:['10',0],vae:['3',0]}},
    '12':{class_type:'SaveImage',inputs:{images:['11',0],filename_prefix:'studio-'+id}},
  };
  imageNames.forEach((name,index)=>{ const node=String(15+index); graph[node]={class_type:'LoadImage',inputs:{image:name}}; encoder['images.image_'+(index+1)]=[node,0]; });
  return graph;
}
// 同一轮次重交时种子不变：取轮次编号摘要的前 32 位。
export const seedOf = id => parseInt(sha(id).slice(0,8),16);
const origins = { global:'https://api.minimax.io', cn:'https://api.minimaxi.com' };
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const dataHeader = 'data:image/png;base64,';
const signature = Buffer.from('89504e470d0a1a0a','hex');
const fail = (code,message) => { throw new ChatError(code,'image_job_error',message); };
function checkedPng(bytes, inbound) {
  if (bytes.length < 33 || !bytes.subarray(0,8).equals(signature) || bytes.toString('ascii',12,16)!=='IHDR') return false;
  const w=bytes.readUInt32BE(16), h=bytes.readUInt32BE(20);
  return inbound ? Math.min(w,h)>=128 && Math.max(w,h)<=8192 && Math.max(w,h)/Math.min(w,h)<=4 : w===1024 && h===1024;
}
// 两种方式共用同一个入口。结构化：布局条件图在前，可再带一张父图或参考图。自由提示：只有设计者的原文，可带一张父图或参考图，不带布局条件图。
function validate(request) {
  const {attemptId,prompt,inputs}=request ?? {};
  if (![undefined,'structured','free'].includes(request?.condition)) fail(400,'图像请求的生成方式无法识别。');
  const free=request.condition==='free';
  if (typeof attemptId!=='string' || !uuid.test(attemptId) || typeof prompt!=='string' || !prompt.trim() ||
      prompt.length>32000 || !Array.isArray(inputs) || !(free ? [0,1] : [1,2]).includes(inputs.length)) fail(400,free ? '自由提示请求缺少文字，或带了多余的图。' : '图像请求缺少本轮目标或布局图。');
  const references=inputs.map((input,i)=>{
    if (input?.role!==(!free && i===0?'layout':'parent') || typeof input.dataUrl!=='string' || !input.dataUrl.startsWith(dataHeader) ||
        !/^[a-f\d]{64}$/.test(input.sha256)) fail(400,'参考图格式或顺序与本轮规格不符。');
    const bytes=Buffer.from(input.dataUrl.slice(dataHeader.length),'base64');
    if(!checkedPng(bytes,true) || sha(bytes)!==input.sha256) fail(400,'参考图的尺寸、格式或内容摘要校验失败。');
    return {role:input.role, sha256:input.sha256, dataUrl:input.dataUrl};
  });
  return {attemptId,prompt,references,free};
}

function providerMessage(status, code, detail) {
  if (status===402 || String(code)==='1008' || /insufficient balance/i.test(detail)) return 'MiniMax 账户图像 API 余额不足。';
  if ([401,403].includes(status) || ['1004','2049'].includes(String(code)) || /not support|not authorized|permission/i.test(detail) && /plan|auth|model/i.test(detail))
    return 'MiniMax 未授权此密钥调用 H3 Image。请核对密钥区域和图像模型权限。';
  if(status===429) return 'MiniMax 当前达到调用限额，请稍后开启新一轮。';
  return 'MiniMax 未完成本轮图像生成。' + (detail ? ' '+String(detail).replace(/sk-[\w-]+|Bearer\s+\S+|https?:\/\/\S+/gi,'[已隐藏]').slice(0,280) : '');
}

// The provider edits endpoint is synchronous and non-idempotent. Reserve a durable local job before calling it.
export function createImageJobs({apiKey,region='global',fetchImpl=globalThis.fetch,backend,
  directory=path.join(process.env.LOCALAPPDATA || homedir(),'Freeloop','multirotor-workbench','image-jobs')}={}) {
  if (!Object.hasOwn(origins,region)) throw new Error('图像服务区域设置无效。');
  // backend 为 {provider:'qwen-comfy', url} 时走本机 ComfyUI 上的 Qwen；否则走 MiniMax H3（开发用）。
  const comfy=backend?.provider==='qwen-comfy' ? {...comfyDefaults,...Object.fromEntries(Object.entries(backend).filter(([,v])=>v!==undefined && v!==''))} : null;
  const ident=comfy ? {provider:'qwen-comfy',model:qwenModel} : {provider:'minimax',model:imageModel};
  const baseRecord=id=>({attemptId:id,jobId:id,...ident});
  const describe=()=>({...ident,endpoint:comfy ? '/prompt' : '/v1/images/edits',label:comfy ? 'Qwen-Image 2.1（本机 ComfyUI）' : 'MiniMax H3 Image',configured:comfy ? !!comfy.url : !!apiKey});
  const active=new Map();
  const filename=id=>path.join(directory,id+'.json');
  const read=async id=>{
    try {return JSON.parse(await readFile(filename(id),'utf8'));}
    catch(e){if(e.code==='ENOENT') return null;throw e;}
  };
  async function save(record) {
    const tmp=filename(record.jobId)+'.'+randomUUID()+'.tmp';
    await writeFile(tmp,JSON.stringify(record),{mode:0o600});
    await rename(tmp,filename(record.jobId));
  }
  async function executeComfy(record, refs) {
    const req=record.evidence.request, base=String(comfy.url).replace(/\/+$/,'');
    const call=async(route,init={})=>{
      const response=await fetchImpl(base+route,{redirect:'error',signal:AbortSignal.timeout(60000),...init});
      if(!response.ok) throw new Error('Qwen 服务返回 HTTP '+response.status+'。');
      return response;
    };
    try {
      const names=[];
      for (const ref of refs) {
        const form=new FormData();
        form.append('image',new Blob([Buffer.from(ref.dataUrl.slice(dataHeader.length),'base64')],{type:'image/png'}),'studio-'+ref.sha256+'.png');
        form.append('type','input'); form.append('overwrite','true');
        const up=await (await call('/upload/image',{method:'POST',body:form})).json();
        if(typeof up.name!=='string' || !up.name) throw new Error('Qwen 服务没有返回输入图的名称。');
        names.push([up.subfolder,up.name].filter(Boolean).join('/'));
      }
      // 实际发出的请求、入队回执和运行历史原样存盘，供主持人登记场次时使用。
      const body=JSON.stringify({client_id:'studio-'+record.jobId,prompt:comfyGraph(record.jobId,req.prompt,req.seed,names,comfy)});
      await writeFile(path.join(directory,record.jobId+'.comfy-request.json'),body,{mode:0o600});
      // 实际发给模型的文字另存一份纯文本（不加换行），主持人登记时直接引用。自由提示这一份就是设计者的原文。
      await writeFile(path.join(directory,record.jobId+'.prompt.txt'),req.prompt,{mode:0o600});
      const ackText=await (await call('/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body})).text();
      await writeFile(path.join(directory,record.jobId+'.comfy-ack.json'),ackText,{mode:0o600});
      const ack=JSON.parse(ackText);
      if(typeof ack.prompt_id!=='string' || !ack.prompt_id || Object.keys(ack.node_errors ?? {}).length)
        throw new Error('Qwen 服务未确认入队。请核对工作流节点和权重文件名。');
      record.evidence.response={httpStatus:200,traceId:ack.prompt_id,requestSha256:sha(body),inputNames:names};
      await save(record);
      const deadline=Date.now()+(comfy.timeoutMs ?? 600000); let run=null, historyText='';
      while(Date.now()<deadline) {
        historyText=await (await call('/history/'+encodeURIComponent(ack.prompt_id))).text();
        run=JSON.parse(historyText)[ack.prompt_id];
        if(run && (run.status?.completed || ['error','interrupted'].includes(run.status?.status_str))) break;
        run=null; await new Promise(resolve=>setTimeout(resolve,comfy.pollMs ?? 2000));
      }
      if(!run) throw new Error('Qwen 服务在限定时间内没有完成本轮。');
      await writeFile(path.join(directory,record.jobId+'.comfy-history.json'),historyText,{mode:0o600});
      if(run.status?.status_str!=='success') throw new Error('Qwen 服务报告本轮运行失败，原始记录已保存。');
      const images=Object.values(run.outputs ?? {}).flatMap(node=>node.images ?? []).filter(item=>item.type==='output');
      if(images.length!==1) throw new Error('Qwen 服务返回了 '+images.length+' 张图，本轮只请求一张。');
      const query=new URLSearchParams({filename:images[0].filename,subfolder:images[0].subfolder ?? '',type:'output'});
      const png=Buffer.from(await (await call('/view?'+query)).arrayBuffer());
      if(!checkedPng(png,false)) throw new Error('Qwen 回图未通过 1024 × 1024 PNG 校验。');
      const hash=sha(png), name='QWEN-'+record.jobId+'.png';
      await writeFile(path.join(directory,name),png,{mode:0o600});
      // 主持人的登记工具要求回图以后端报告的原文件名附上，所以按原名再存一份（文件名里带轮次编号，不会相互覆盖）。
      const original=path.basename(String(images[0].filename));
      if(/^[\w.-]+\.png$/i.test(original) && original!==name) await writeFile(path.join(directory,original),png,{mode:0o600});
      record.outputs=[{name,mimeType:'image/png',sha256:hash}];
      Object.assign(record.evidence.response,{outputHashes:[hash],outputName:images[0].filename});
      record.status='succeeded';
    } catch(err) {
      record.status='failed';
      record.error=/^Qwen/.test(err.message) ? err.message : '无法连接 Qwen 图像服务，已保留本轮记录。请核对服务地址和 GPU 主机是否在线。';
    }
    record.completedAt=new Date().toISOString();
    await save(record);
  }
  async function execute(record, refs) {
    if(comfy) return executeComfy(record,refs);
    const req=record.evidence.request;
    const {prompt,model,size,n,response_format,output_format}=req;
    try {
      const response=await fetchImpl(origins[region]+'/v1/images/edits',{
        method:'POST', redirect:'error',signal:AbortSignal.timeout(600000),
        headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
        body:JSON.stringify({prompt,model,size,n,response_format,output_format,images:refs.map(r=>({image_url:r.dataUrl}))}),
      });
      const data=await response.json().catch(()=>({}));
      const code=data.base_resp?.status_code ?? data.error?.code ?? data.data?.[0]?.error?.code;
      const traceId=(response.headers.get('trace-id') || response.headers.get('x-request-id') || data.request_id || data.id || '').toString().slice(0,160);
      const detail=data.error?.message || data.base_resp?.status_msg || data.data?.[0]?.error?.message || '';
      record.evidence.response={httpStatus:response.status,traceId,code:code ?? null,created:data.created ?? null,
        outputFormat:data.output_format ?? null,size:data.data?.[0]?.size ?? null,
        revisedPrompt:typeof data.data?.[0]?.revised_prompt==='string' ? data.data[0].revised_prompt : null};
      if (!response.ok || (code!=null && Number(code)!==0) || data.data?.[0]?.error || data.error) {
        throw new Error(providerMessage(response.status,code,detail));
      }
      const item=data.data?.[0];
      if(!item || data.data.length!==1 || typeof item.b64_json!=='string' || item.b64_json.length>32*1024*1024)
        throw new Error('MiniMax 回执未包含本轮请求的单张 PNG 原图。');
      const png=Buffer.from(item.b64_json,'base64');
      if (!checkedPng(png,false)) throw new Error('MiniMax 回图未通过 1024 × 1024 PNG 校验。');
      const hash=sha(png), name='H3-'+record.jobId+'.png';
      await writeFile(path.join(directory,name),png,{mode:0o600});
      record.outputs=[{name,mimeType:'image/png',sha256:hash}];
      record.evidence.response.outputHashes=[hash];
      record.status='succeeded';
    } catch(err) {
      record.status='failed';
      record.error=record.evidence.response ? err.message : '未收到 MiniMax 完整回执，已保留本轮记录。';
    }
    record.completedAt=new Date().toISOString();
    await save(record);
  }
  async function submit(raw) {
    const {attemptId,prompt,references,free}=validate(raw);
    // MiniMax 的接口是改图接口，必须带图。它只作开发用，不为它另接一个文生图接口。
    if(free && !comfy && !references.length) fail(400,'开发用的 MiniMax 后端不接受不带图的自由提示。请用 Qwen 后端启动工作台。');
    const hashes=references.map(x=>x.sha256);
    const images=references.map(({role,sha256})=>({role,sha256}));
    // 两种方式的模型、画幅、步数、引导强度、采样器、负向词和种子规则完全相同；差别只在发什么文字、带不带布局条件图。
    const request=comfy ? {model:qwenModel,prompt,size:'1024x1024',n:1,output_format:'png',endpoint:'/prompt',seed:seedOf(attemptId),
        steps:comfy.steps,cfg:comfy.cfg,sampler_name:comfy.sampler_name,scheduler:comfy.scheduler,negative_prompt:comfy.negative_prompt,
        weights:{unet:comfy.unet,clip:comfy.clip,vae:comfy.vae},images,...(free ? {condition:'free'} : {})}
      : {model:imageModel,prompt,size:'1024x1024',n:1,response_format:'b64_json',output_format:'png',endpoint:'/v1/images/edits',images,...(free ? {condition:'free'} : {})};
    const fingerprint=sha(JSON.stringify(request));
    await mkdir(directory,{recursive:true,mode:0o700});
    const record={...baseRecord(attemptId),status:'running',inputHashes:hashes,fingerprint,ownerPid:process.pid,startedAt:new Date().toISOString(),evidence:{request}};
    // A unique staging file plus a hard link publishes the complete reservation atomically, even to a second process.
    const stage=filename(attemptId)+'.'+randomUUID()+'.claim';
    await writeFile(stage,JSON.stringify(record),{mode:0o600});
    let claimed=false;
    try {await link(stage,filename(attemptId));claimed=true;}
    catch(e){if(e.code!=='EEXIST') throw e;}
    finally {await unlink(stage);}
    if(!claimed){
      const old=await read(attemptId);
      if(old?.fingerprint!==fingerprint)fail(409,'同一轮次编号已经用于另一组设计输入。');
    } else if (comfy ? !comfy.url : !apiKey) {
      record.status='failed';record.error=comfy ? '尚未配置 Qwen 图像服务地址。' : '尚未配置 MiniMax 图像服务凭据。';await save(record);
    } else {
      const work=execute(record,references).catch(err=>console.error('保存图像回执失败',err.code || err.name)).finally(()=>active.delete(attemptId));
      active.set(attemptId,work);
    }
    return baseRecord(attemptId);
  }
  async function get(id) {
    if(!uuid.test(id))fail(400,'轮次编号格式不正确。');
    const record=await read(id);
    if(!record)fail(404,'未找到这次图像生成记录。');
    const {fingerprint,ownerPid,...visible}=record;
    let ownerAlive=ownerPid===process.pid;
    if(!ownerAlive && Number.isSafeInteger(ownerPid)) {
      try {process.kill(ownerPid,0);ownerAlive=true;} catch { /* Owner ended before publishing a receipt. */ }
    }
    if(visible.status==='running' && (!ownerAlive || Date.now()-Date.parse(record.startedAt)>630000)){
      visible.status='failed';visible.error='工作台服务在收到完整回执前重启。请核对该轮服务记录，当前请求已保留。';
    }
    if(visible.outputs)visible.outputs=await Promise.all(visible.outputs.map(async file=>({...file,dataUrl:dataHeader+(await readFile(path.join(directory,file.name))).toString('base64')})));
    return visible;
  }
  return {submit,get,describe};
}
