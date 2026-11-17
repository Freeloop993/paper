import type { DroneParameters, UserProfile } from '../types/DroneParameters';
import { drawGuide, quadBladeCount, quadRotorConstraint, type Inputs, type Layout } from './design';

async function hash(bytes:BufferSource) {
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export type Asset = {mime:string;width:number;height:number;sha256:string;dataUrl:string};
export async function imageAsset(file:Blob):Promise<Asset> {
  if (!['image/png','image/jpeg'].includes(file.type) || file.size>12*1024*1024) throw new Error('请选择 12 MB 以内的 PNG 或 JPEG。');
  const dataUrl=await new Promise<string>((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('文件读取失败。'));r.readAsDataURL(file);
  });
  const img=new Image();img.src=dataUrl;
  await img.decode();
  return {dataUrl,mime:file.type,width:img.naturalWidth,height:img.naturalHeight,sha256:await hash(await file.arrayBuffer())};
}
export interface Draft {
  inputs:Inputs;parameters:DroneParameters;profile:UserProfile|null;
}
export type TextOrigin='compiler'|'designer'|'gemini'|'rag';
export type Revision = Awaited<ReturnType<typeof freeze>>;
export async function freeze(draft:Draft,layout:Layout,prompt:string,compiledPrompt:string,textOrigin:TextOrigin,parent:Asset|null,basedOn:string|null,reason:string) {
  if (basedOn && !reason.trim()) throw new Error('请记录沿用或修改上一版的理由。');
  if (draft.inputs.task==='quad') {
    if (draft.parameters.propulsion.prop_blade_count!==quadBladeCount)
      throw new Error('此旧规格的叶数与当前四旋基线不同。新版本请先在动力页选用双叶桨。');
    if (!prompt.split('\n').includes(quadRotorConstraint))
      throw new Error('四旋研究的共同旋翼条件缺失或被修改。请从当前规格重新编译后确认。');
  }
  if (!prompt.trim()) throw new Error('请先填写准备提交的文本。');
  const canvas=document.createElement('canvas');
  drawGuide(canvas,layout,draft.inputs.guideLines,draft.inputs.guideBladeLines);
  const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG 导出失败。')),'image/png'));
  const guide=await imageAsset(png);
  const assets=draft.inputs.route==='guide' ? [guide,...(parent?[parent]:[])] : [];
  return {schema:'uav-configurator-e/2',id:crypto.randomUUID(),basedOn,reason,confirmedAt:new Date().toISOString(),
    draft,layout,guide,compiledPrompt,textOrigin,parent:draft.inputs.route==='guide'?parent:null,request:{
      route:draft.inputs.route,prompt,promptSha256:await hash(new TextEncoder().encode(prompt)),provider:null,model:null,textBody:null,
      references:assets.map((image,i)=>({role:i?'appearance-parent':'top-layout',sha256:image.sha256,mime:image.mime})),
    }};
}
export interface Attempt {
  id:string;versionId:string;startedAt:string;finishedAt?:string;state:'submitted'|'returned'|'unverified';
}
export interface Decision {
  id:string;versionId:string;task:Inputs['task'];choice:'继续深化'|'回选此版本'|'停止本轮';reason:string;at:string;
}
let pending:Promise<IDBDatabase>|undefined;
function openDatabase() {
  if (!pending) pending=new Promise<IDBDatabase>((resolve,reject)=>{
    const req=indexedDB.open('uavdesign-native-configurator',2);
    req.onupgradeneeded=()=>{for(const name of ['versions','attempts','decisions']) { if(!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name,{keyPath:'id'}); }};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  return pending;
}
export async function records<T extends Revision|Attempt|Decision>(name:'versions'|'attempts'|'decisions'):Promise<T[]> {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const r=db.transaction(name).objectStore(name).getAll();
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
}
export async function save(record:Revision|Attempt|Decision) {
  const db=await openDatabase();
  const isVersion='draft' in record;
  const name=isVersion?'versions':('choice' in record?'decisions':'attempts');
  return new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(name,'readwrite');
    const store=tx.objectStore(name);
    if(isVersion) store.add(record); else store.put(record);
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
  });
}
export function download(file:string,url:string) {
  const a=document.createElement('a');a.href=url;a.download=file;document.body.append(a);a.click();a.remove();
}
export function exportRecord(v:Revision,versions:Revision[],attempts:Attempt[],decisions:Decision[]) {
  // Stored v1 records may contain an old provider body. Export every version as an offline specification.
  const payload={...v,sourceSchema:v.schema,schema:'uav-configurator-e/2',
    request:{...v.request,provider:null,model:null,textBody:null},decisions,attempts:attempts.filter(a=>a.versionId===v.id),
    history:versions.map(item=>({id:item.id,basedOn:item.basedOn,confirmedAt:item.confirmedAt,reason:item.reason,
      draft:item.draft,prompt:item.request.prompt,promptSha256:item.request.promptSha256,
      layoutSha256:item.guide.sha256,parentSha256:item.parent?.sha256??null}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  download('uav-'+v.draft.inputs.task+'-'+v.id+'.json',url);setTimeout(()=>URL.revokeObjectURL(url),1000);
}
