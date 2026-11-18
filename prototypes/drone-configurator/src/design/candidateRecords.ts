import { sha256Bytes } from './sha256';
import { buildExport, canvasPngBytes, download, fileStamp, guideCanvas, type ConfigExport, type ExportState } from './exporters';
import { computeLayout, type Task } from './design';
import { verifiedOutputNames, type ModelGraph as Graph } from './receiptOutputs';

export type DecisionKind = 'accept' | 'reject' | 'restore' | 'manual' | 'stop';
type Candidate = {id: string; name: string; hash: string; file: Blob; firstShown?: string};
type Decision = {id: string; at: string; kind: DecisionKind; candidate?: string; reason: string; manualFile?: File};
export interface FrozenAttempt {
  id: string; createdAt: string; config: ConfigExport; guide: Blob;
  confirmedText: string; condition: 'structured' | 'free'; variantId: string; variantName: string; variantScope?: string;
  goal: string; keep: string; parentId?: string; parentImage?: Blob;
  snapshot?: ExportState;
  workflowOrigin?: { id: string; task: Task };
  h3?: H3Archive;
  dispatch?: {request: Blob; hash: string; ack?: Blob; error?: string; server?: string; at: string; updatedAt: string};
  receipt?: {request: Blob; ack: Blob; history: Blob; at: string; inputVerification: string; runId:string};
  failure?: {history:Blob;runId:string;at:string;status:string};
  runId?: string; candidates: Candidate[]; decisions: Decision[];
}
export interface H3Archive {
  model: 'MiniMax-H3-Image';
  status: 'ready' | 'submitting' | 'running' | 'succeeded' | 'failed';
  request?: Blob;
  acknowledgement?: Blob;
  result?: Blob;
  issue?: string;
  traceId?: string;
}
const DB = 'multirotor-studio-design-records-v1';
const STORE = 'attempts';
const now = () => new Date().toISOString();
export const hashBlob = async (file: Blob) => sha256Bytes(new Uint8Array(await file.arrayBuffer()));
const notify = () => window.dispatchEvent(new Event('candidate-record-change'));

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE,{keyPath:'id'}).createIndex('job', 'runId', {unique:true});
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}
async function edit(id: string, update: (old?: FrozenAttempt) => FrozenAttempt) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE,'readwrite'), store = tx.objectStore(STORE);
    let failure: unknown;
    const get = store.get(id);
    get.onsuccess = () => {
      try { store.put(update(get.result)); } catch (e) { failure=e; tx.abort(); }
    };
    tx.oncomplete = () => {db.close();notify();resolve();};
    tx.onabort = () => {db.close();reject(failure ?? new Error(tx.error?.name === 'ConstraintError' ? '同一服务作业已经归入另一轮。' : '本地存储写入失败。'));};
  });
}
function requireAttempt(a?: FrozenAttempt): asserts a is FrozenAttempt {
  if (!a) throw new Error('没有找到对应轮次。');
}
export async function listAttempts(): Promise<FrozenAttempt[]> {
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE), req=tx.objectStore(STORE).getAll();
    tx.oncomplete=()=>{db.close();resolve((req.result as FrozenAttempt[]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));};
    tx.onabort=()=>{db.close();reject(tx.error);};
  });
}
export async function freezeAttempt(state: ExportState, details: Pick<FrozenAttempt,'condition'|'goal'|'keep'|'variantId'|'variantName'|'variantScope'|'workflowOrigin'|'h3'>,
  freeText: string, parent?: {id:string; file:Blob}, structuredText?:string, id: string = crypto.randomUUID()) {
  if (!details.goal.trim()) throw new Error('请写下本轮的设计目标。');
  const guideBytes=canvasPngBytes(guideCanvas(computeLayout(state.parameters)));
  const config=buildExport(state,{variant:details.variantName,note:details.goal,stamp:fileStamp()+'-'+id.slice(0,8),guideSha256:sha256Bytes(guideBytes)});
  const confirmedText=details.condition==='free'?freeText:structuredText??config.prompt.text;
  if (!confirmedText.trim()) throw new Error('请填入本轮实际提示词。');
  const attempt:FrozenAttempt={...details,id,goal:details.goal.trim(),keep:details.keep.trim(),config,createdAt:now(),
    guide:new Blob([new Uint8Array(guideBytes)],{type:'image/png'}),confirmedText,parentId:parent?.id,parentImage:parent?.file,
    snapshot:structuredClone(state),candidates:[],decisions:[]};
  await edit(id,old=>{if(old) throw new Error('轮次编号已存在。');return attempt;});
  return id;
}
export async function findAttempt(id: string): Promise<FrozenAttempt | undefined> {
  const db = await openDb();
  return new Promise((resolve,reject) => {
    const tx = db.transaction(STORE), query = tx.objectStore(STORE).get(id);
    tx.oncomplete = () => { db.close(); resolve(query.result); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export async function updateH3Record(id: string, update: Partial<H3Archive>, candidates?: Candidate[]) {
  await edit(id, a => {
    requireAttempt(a);
    if (!a.h3) throw new Error('所选轮次没有 H3 生成记录。');
    if (a.h3.status === 'succeeded' || a.h3.status === 'failed') return a;
    if (update.status === 'submitting' && a.h3.status !== 'ready') return a;
    return {...a, h3:{...a.h3, ...update}, ...(candidates ? {candidates} : {}),
      ...(update.result ? {runId: id} : {})};
  });
}
export async function recordDispatch(id:string,request:Blob,ack?:Blob,error?:string,server?:string) {
  const hash=await hashBlob(request);
  await edit(id,a=>{
    requireAttempt(a);const prev=a.dispatch;
    if(a.h3 || a.failure || a.receipt || (prev && (prev.hash!==hash || prev.ack || (!ack && !error)))) throw new Error('此轮已经登记提交，请按原作业取回结果。');
    return {...a,dispatch:{request,hash,ack,error,server:server??prev?.server,at:prev?.at??now(),updatedAt:now()}};
  });
}

function sorted(value:unknown):unknown {
  if(Array.isArray(value)) return value.map(sorted);
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,sorted(v)]));
  return value;
}
function sameGraph(a:Graph,b:Graph) {
  const normalized=(g:Graph)=>Object.fromEntries(Object.entries(g).map(([key,node])=>{
    const copy={...node};if(copy.class_type==='LoadImage')delete copy.is_changed;return [key,copy];
  }));
  return JSON.stringify(sorted(normalized(a)))===JSON.stringify(sorted(normalized(b)));
}
async function pngGraph(bytes:Uint8Array):Promise<Graph> {
  const header=[137,80,78,71,13,10,26,10];
  if(!header.every((v,i)=>bytes[i]===v))throw new Error('请提供服务返回的原始 PNG。');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), decoder=new TextDecoder();
  for(let i=8;i+12<=bytes.length;){
    const n=view.getUint32(i), kind=decoder.decode(bytes.subarray(i+4,i+8));
    if(i+12+n>bytes.length)throw new Error('PNG 数据不完整。');
    if(kind==='tEXt'||kind==='zTXt'||kind==='iTXt'){
      const block=bytes.subarray(i+8,i+8+n), sep=block.indexOf(0);
      if(decoder.decode(block.subarray(0,sep))==='prompt'){
        let start=sep+1, compressed=kind==='zTXt';
        if(kind==='zTXt')start++;
        if(kind==='iTXt'){
          compressed=block[start]===1;start+=2;
          for(let j=0;j<2;j++){const end=block.indexOf(0,start);if(end<0)throw new Error('PNG 文字块不完整。');start=end+1;}
        }
        const data=block.slice(start);
        const text=compressed?await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'))).text():decoder.decode(data);
        return JSON.parse(text) as Graph;
      }
    }
    i+=12+n;
  }
  throw new Error('原始 PNG 缺少模型工作流，不能与本轮关联。');
}
export async function attachReceipt(id:string,request:Blob,ack:Blob,history:Blob,files:File[]) {
  const attempt=(await listAttempts()).find(a=>a.id===id);requireAttempt(attempt);
  if (attempt.h3) throw new Error('H3 轮次只接收本轮的 H3 服务回执。');
  const dispatchHash=await hashBlob(request);
  const payload=JSON.parse(await request.text()), graph=payload.prompt as Graph;
  const nodes=Object.entries(graph);
  const promptNodes=nodes.filter(([,n])=>n.class_type==='TextEncodeQwenImage21');
  if(promptNodes.length!==1||promptNodes[0][1].inputs.prompt!==attempt.confirmedText) throw new Error('实发提示词与本轮确认文本不一致。');
  if(typeof payload.client_id==='string' && payload.client_id.startsWith('studio-') && payload.client_id!=='studio-'+id)throw new Error('实发请求属于其他轮次。');
  if(!attempt.dispatch && !nodes.some(([,n])=>n.class_type==='SaveImage' && n.inputs.filename_prefix==='studio-'+id))
    throw new Error('请使用本轮导出的运行请求。回执没有当前轮次的标记。');
  const expectedHashes:string[]=[];
  if(attempt.condition==='structured')expectedHashes.push(await hashBlob(attempt.guide));
  if(attempt.parentImage)expectedHashes.push(await hashBlob(attempt.parentImage));
  const loads=nodes.filter(([,n])=>n.class_type==='LoadImage');
  if(loads.length!==expectedHashes.length) throw new Error('条件图或父图数量与冻结策略不一致。');
  const inputs=promptNodes[0][1].inputs;
  const edges=Object.keys(inputs).filter(k=>/^images\.image_\d+$/.test(k));
  if(edges.length!==expectedHashes.length)throw new Error('正向编码器实际接收的图像数量不符。');
  const ordered=expectedHashes.map((expected,index)=>{
    const edge=inputs['images.image_'+(index+1)];
    if(!Array.isArray(edge)||edge.length!==2||edge[1]!==0||graph[edge[0]]?.class_type!=='LoadImage')
      throw new Error('正向编码器未按本轮输入策略接图。');
    return {key:String(edge[0]),expected};
  });
  if(new Set(ordered.map(x=>x.key)).size!==loads.length) throw new Error('条件图与父图连接重复。');
  const receipt=JSON.parse(await ack.text()), runId=receipt.prompt_id;
  if(typeof runId!=='string'||!runId||Object.keys(receipt.node_errors??{}).length)throw new Error('服务确认单缺少有效作业号。');
  const rawHistory=JSON.parse(await history.text()), h=rawHistory[runId]??rawHistory;
  if(h.prompt?.[1]!==runId||h.status?.status_str!=='success'||!h.status?.completed||!sameGraph(h.prompt[2],graph))throw new Error('历史记录与实际请求不符，或作业尚未成功。');
  const names=verifiedOutputNames(graph,promptNodes[0][0],h.outputs,h.prompt[4],attempt.dispatch?undefined:'studio-'+id);
  if(!names.length||names.length!==files.length||new Set(names).size!==names.length||new Set(files.map(f=>f.name)).size!==files.length)throw new Error('请附上服务记录中的全部原始回图，文件名需一一对应。');
  if(attempt.dispatch?.ack && JSON.parse(await attempt.dispatch.ack.text()).prompt_id!==runId)throw new Error('确认单作业号与本轮实发回执不同。');
  let fullHashEvidence=true;
  const candidates: Candidate[]=[];
  for(const name of names){
    const file=files.find(f=>f.name===name);if(!file)throw new Error('缺少原图 '+name);
    const bytes=new Uint8Array(await file.arrayBuffer()), embedded=await pngGraph(bytes);
    if(!sameGraph(embedded,graph))throw new Error('回图内嵌的工作流与请求不同。');
    const decoded=await createImageBitmap(file);decoded.close();
    for(const {key,expected} of ordered){
      const node=graph[key];
      const hash=embedded[key].is_changed;
      const fingerprint=Array.isArray(hash)?hash[0]:hash;
      const fileName=String(node.inputs.image);
      const cert=typeof fingerprint==='string' && /^[a-f0-9]{64}$/.test(fingerprint)?fingerprint:null;
      const namedHash=fileName.match(/(?:^|\/)studio-([a-f0-9]{64})\.png$/)?.[1];
      if((cert??namedHash)!==expected || (namedHash && namedHash!==expected))throw new Error('工作流内的输入图与本轮条件图或父图不符，或缺少可核的摘要。');
      if(!cert)fullHashEvidence=false;
    }
    candidates.push({id:id+'/'+(candidates.length+1),name,hash:sha256Bytes(bytes),file});
  }
  await edit(id,a=>{
    requireAttempt(a);
    if(a.receipt||a.failure)throw new Error('此轮已归档最终回执。');
    if(a.dispatch?.updatedAt!==attempt.dispatch?.updatedAt || Boolean(a.dispatch?.ack)!==Boolean(attempt.dispatch?.ack))
      throw new Error('提交状态在核对期间发生变化，请按最新作业回执重新核对。');
    if(a.dispatch && a.dispatch.hash!==dispatchHash)throw new Error('请求原件与已封存的实发请求不一致。');
    return {...a,runId,candidates,receipt:{request,ack,history,at:now(),runId,
      inputVerification:fullHashEvidence?'请求、作业、回图工作流与可用输入图内容摘要已核对':'请求、作业、回图工作流已核对；输入图仅核对按内容命名的文件名'}};
  });
}
export async function recordRunFailure(id:string,history:Blob) {
  const original=(await listAttempts()).find(a=>a.id===id);requireAttempt(original);
  if(!original.dispatch?.ack)throw new Error('缺少本轮服务确认单。');
  const runId=JSON.parse(await original.dispatch.ack.text()).prompt_id;
  const raw=JSON.parse(await history.text()), h=raw[runId]??raw;
  if(!runId||h.prompt?.[1]!==runId || !sameGraph(h.prompt[2],JSON.parse(await original.dispatch.request.text()).prompt))
    throw new Error('失败回执与冻结请求不符。');
  const status=h.status?.status_str;
  if(!['error','interrupted'].includes(status))throw new Error('服务未确认失败或中止。');
  await edit(id,a=>{requireAttempt(a);if(a.receipt||a.failure||a.dispatch?.hash!==original.dispatch?.hash)throw new Error('此轮已有最终回执或请求已经变更。');
    return {...a,runId,failure:{history,runId,at:now(),status}};});
}
export async function markPresented(id:string,candidateId:string){
  await edit(id,a=>{requireAttempt(a);
    return {...a,candidates:a.candidates.map(c=>c.id===candidateId&&!c.firstShown?{...c,firstShown:now()}:c)};
  });
}
export function candidateRetained(a: FrozenAttempt, candidate: string) {
  const last = [...a.decisions].reverse().find(d => d.candidate === candidate && ['accept','reject','restore'].includes(d.kind));
  return last?.kind === 'accept' || last?.kind === 'restore';
}

export async function recordDecision(id:string,kind:DecisionKind,reason:string,candidate?:string,manualFile?:File,onlyIfUnretained=false) {
  if(!reason.trim())throw new Error('请记录这次取舍的理由。');
  await edit(id,a=>{requireAttempt(a);
    if(kind!=='stop' && !a.candidates.some(c=>c.id===candidate&&c.firstShown)) throw new Error('请先实际查看所选候选。');
    if(onlyIfUnretained && kind==='accept' && candidate && candidateRetained(a,candidate))return a;
    if(kind==='restore' && !a.decisions.some(d=>d.candidate===candidate))throw new Error('请回选已有取舍记录的候选。');
    return {...a,decisions:[...a.decisions,{id:crypto.randomUUID(),at:now(),kind,candidate,reason:reason.trim(),manualFile}]};
  });
}
async function material(blob:Blob) {
  const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
  return {sha256:await hashBlob(blob),bytes:blob.size,data};
}
export async function exportRecord(a:FrozenAttempt){
  const originals:{[key:string]:Awaited<ReturnType<typeof material>>}={};
  async function asset(b?:Blob){if(!b)return null;const v=await material(b);originals[v.sha256]=v;return {sha256:v.sha256,bytes:v.bytes};}
  const guide=await asset(a.guide),parentImage=await asset(a.parentImage);
  const dispatch=a.dispatch?{...a.dispatch,request:await asset(a.dispatch.request),ack:await asset(a.dispatch.ack)}:null;
  const receipt=a.receipt?{...a.receipt,request:await asset(a.receipt.request),ack:await asset(a.receipt.ack),history:await asset(a.receipt.history)}:null;
  const candidates=await Promise.all(a.candidates.map(async c=>({...c,file:await asset(c.file)})));
  const decisions=await Promise.all(a.decisions.map(async d=>({...d,manualFile:d.manualFile?{name:d.manualFile.name,asset:await asset(d.manualFile)}:null})));
  const failure=a.failure?{...a.failure,history:await asset(a.failure.history)}:null;
  const h3=a.h3?{...a.h3,request:await asset(a.h3.request),acknowledgement:await asset(a.h3.acknowledgement),result:await asset(a.h3.result)}:undefined;
  const record={schema:'design-studio/attempt-v1',...a,h3,guide,parentImage,dispatch,receipt,failure,candidates,decisions,originals};
  download('studio-attempt-'+a.id+'.json',JSON.stringify(record),'application/json');
}
