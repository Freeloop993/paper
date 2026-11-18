import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import { ChatError } from './design-chat.mjs';

export const imageModel = 'MiniMax-H3-Image';
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
function validate(request) {
  const {attemptId,prompt,inputs}=request ?? {};
  if (typeof attemptId!=='string' || !uuid.test(attemptId) || typeof prompt!=='string' || !prompt.trim() ||
      prompt.length>32000 || !Array.isArray(inputs) || ![1,2].includes(inputs.length)) fail(400,'图像请求缺少本轮目标或布局图。');
  const references=inputs.map((input,i)=>{
    if (input?.role!==(i===0?'layout':'parent') || typeof input.dataUrl!=='string' || !input.dataUrl.startsWith(dataHeader) ||
        !/^[a-f\d]{64}$/.test(input.sha256)) fail(400,'参考图格式或顺序与本轮规格不符。');
    const bytes=Buffer.from(input.dataUrl.slice(dataHeader.length),'base64');
    if(!checkedPng(bytes,true) || sha(bytes)!==input.sha256) fail(400,'参考图的尺寸、格式或内容摘要校验失败。');
    return {role:input.role, sha256:input.sha256, dataUrl:input.dataUrl};
  });
  return {attemptId,prompt,references};
}

const baseRecord = id => ({attemptId:id, jobId:id, provider:'minimax', model:imageModel});
function providerMessage(status, code, detail) {
  if (status===402 || String(code)==='1008' || /insufficient balance/i.test(detail)) return 'MiniMax 账户图像 API 余额不足。';
  if ([401,403].includes(status) || ['1004','2049'].includes(String(code)) || /not support|not authorized|permission/i.test(detail) && /plan|auth|model/i.test(detail))
    return 'MiniMax 未授权此密钥调用 H3 Image。请核对密钥区域和图像模型权限。';
  if(status===429) return 'MiniMax 当前达到调用限额，请稍后开启新一轮。';
  return 'MiniMax 未完成本轮图像生成。' + (detail ? ' '+String(detail).replace(/sk-[\w-]+|Bearer\s+\S+|https?:\/\/\S+/gi,'[已隐藏]').slice(0,280) : '');
}

// The provider edits endpoint is synchronous and non-idempotent. Reserve a durable local job before calling it.
export function createImageJobs({apiKey,region='global',fetchImpl=globalThis.fetch,
  directory=path.join(process.env.LOCALAPPDATA || homedir(),'Freeloop','multirotor-workbench','image-jobs')}={}) {
  if (!Object.hasOwn(origins,region)) throw new Error('图像服务区域设置无效。');
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
  async function execute(record, refs) {
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
    const {attemptId,prompt,references}=validate(raw);
    const hashes=references.map(x=>x.sha256);
    const request={model:imageModel,prompt,size:'1024x1024',n:1,response_format:'b64_json',output_format:'png',
      endpoint:'/v1/images/edits',images:references.map(({role,sha256})=>({role,sha256}))};
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
    } else if (!apiKey) {
      record.status='failed';record.error='尚未配置 MiniMax 图像服务凭据。';await save(record);
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
  return {submit,get};
}
