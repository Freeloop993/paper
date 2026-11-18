import { useEffect, useRef, useState } from 'react';
import { Camera, FileClock, FolderInput, Save } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { compilePrompt } from '../../design/partPrompt';
import { computeLayout, frameRules } from '../../design/design';
import { attachReceipt, exportRecord, freezeAttempt, listAttempts, markPresented, recordDecision, type DecisionKind, type FrozenAttempt } from '../../design/candidateRecords';
import ModelDispatch from './ModelDispatch';
import HistoryReplay from './HistoryReplay';

const input='mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink';
const stamp=(value:string)=>new Date(value).toLocaleString('zh-CN',{hour12:false});
const labels:Record<DecisionKind,string>={accept:'采纳',reject:'驳回',restore:'回选',manual:'人工深化',stop:'结束本轮'};
const receiptInputs=[['request','实发请求 JSON'],['ack','入队回执 JSON'],['history','运行历史 JSON']] as const;

function CandidatePreview({candidate,onVisible,onError}:{candidate:FrozenAttempt['candidates'][number];onVisible:()=>Promise<void>;onError:(msg:string)=>void}){
  const [visible,setVisible]=useState(false),[url,setUrl]=useState('');
  const [loaded,setLoaded]=useState(false),img=useRef<HTMLImageElement>(null);
  const [original]=useState(()=>candidate.file); // The parent keys this component by immutable candidate ID.
  const callback=useRef(onVisible),err=useRef(onError);callback.current=onVisible;err.current=onError;
  useEffect(()=>{if(!visible)return;const u=URL.createObjectURL(original);setUrl(u);return()=>URL.revokeObjectURL(u);},[visible,original]);
  useEffect(()=>{
    if(!visible||!loaded||candidate.firstShown||!img.current)return;
    let seen=false,inside=false;
    const check=()=>{if(!seen&&inside&&document.visibilityState==='visible'){seen=true;callback.current().catch(e=>{err.current(String(e));seen=false;});}};
    const observer=new IntersectionObserver(([entry])=>{inside=entry.isIntersecting;check();});
    observer.observe(img.current);document.addEventListener('visibilitychange',check);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',check);};
  },[visible,loaded,candidate.firstShown]);
  return <div>{visible&&url?<img ref={img} src={url} alt={'已收到的候选 '+candidate.name} className="mt-2 max-h-72 w-full rounded-lg object-contain" onLoad={()=>setLoaded(true)} onError={()=>err.current('图片无法显示。')}/>:<button className="btn-ghost" data-show-candidate={candidate.id} onClick={()=>setVisible(true)}><Camera size={14}/>查看候选</button>}</div>;
}

function AttemptView({attempt,onParent}:{attempt:FrozenAttempt;onParent:(id:string)=>void}){
  const [files,setFiles]=useState<Partial<Record<'request'|'ack'|'history',File>>>({}),[outputs,setOutputs]=useState<File[]>([]);
  const [picked,setPicked]=useState(''),[kind,setKind]=useState<DecisionKind>('accept'),[reason,setReason]=useState('');
  const [manual,setManual]=useState<File>(),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function act(fn:()=>Promise<void>,success:string){if(busy)return;setBusy(true);try{await fn();setMessage(success);}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  const done=!!(attempt.receipt||attempt.failure);
  const choice=attempt.candidates.find(c=>c.id===picked);
  return <div className="mt-3 rounded-xl border border-line bg-paper p-3 sm:p-4" data-testid="attempt-detail">
    <p className="break-all text-sm font-semibold">{attempt.variantName} · {frameRules[attempt.config.parameters.frame.frame_type].zh} · {attempt.config.layout.hubs.length} 个轴位</p>
    <p className="mt-1 text-sm">{attempt.goal}</p><p className="text-xs text-ink-soft">保持项 · {attempt.keep||'未指定'} / {attempt.condition==='free'?'自由提示':'结构化提示'} / {stamp(attempt.createdAt)}</p>
    <details className="mt-2 text-xs"><summary className="cursor-pointer font-medium">冻结输入与编号</summary><p className="mt-2 break-all font-mono">{attempt.id}</p><p className="mt-1 break-all">条件图 SHA-256 · {attempt.config.reference_image.png_sha256}</p><p className="mt-1">父图 · {attempt.parentId||'无'}</p><p className="mt-2 whitespace-pre-wrap break-words" lang="en">{attempt.confirmedText}</p></details>
    {!done&&<ModelDispatch key={attempt.id} attempt={attempt}/>}
    {!done&&<details className="mt-2 rounded-xl border border-line bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">导入外部回执</summary><p className="mt-2 text-xs text-ink-soft">选取本轮的实际请求、原始作业回执、运行历史及全部回图。文件名沿用后端导出。</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">{receiptInputs.map(([k,title])=><label className="min-w-0 text-xs" key={k}>{title}<input className={input} type="file" accept=".json,application/json" data-receipt-file={k} onChange={e=>setFiles({...files,[k]:e.target.files?.[0]})}/></label>)}
        <label className="min-w-0 text-xs">全部候选 PNG<input className={input} type="file" accept=".png,image/png" multiple data-receipt-file="outputs" onChange={e=>setOutputs(Array.from(e.target.files??[]))}/></label></div>
      <button data-attach-receipt className="btn-dark mt-3" disabled={busy||!files.request||!files.ack||!files.history||!outputs.length}
        onClick={()=>void act(()=>attachReceipt(attempt.id,files.request!,files.ack!,files.history!,outputs),'已核对全部候选。')}><FolderInput size={14}/>核对并归档</button></details>}
    {attempt.failure&&<p className="mt-3 text-sm text-rose-700">后端已确认失败或中止 · {attempt.failure.status}，原始回执已归档。</p>}
    {attempt.receipt&&<div className="mt-3"><p className="text-sm font-semibold">候选 · {attempt.candidates.length}</p><p className="mt-1 text-xs text-ink-soft">{attempt.dispatch?'已登记实发':'外部原件导入'} · {attempt.receipt?.inputVerification}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">{attempt.candidates.map(c=><div key={c.id} className="rounded-lg border border-line bg-white p-3"><div className="break-all text-xs font-medium">{c.name}</div><CandidatePreview candidate={c} onError={setMessage} onVisible={()=>markPresented(attempt.id,c.id)}/><p className="mt-1 text-xs text-ink-soft">{c.firstShown?'首次展示 '+stamp(c.firstShown):'首次展示待登记'}</p></div>)}</div>
    </div>}
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs">取舍<select className={input} value={kind} data-decision-kind onChange={e=>setKind(e.target.value as DecisionKind)}>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    {kind!=='stop'&&<label className="text-xs">对应候选<select className={input} data-decision-candidate value={picked} onChange={e=>setPicked(e.target.value)}><option value="">选择已查看的图</option>{attempt.candidates.filter(c=>c.firstShown).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}</div>
    {kind==='manual'&&<label className="mt-2 block text-xs">深化文件（可选）<input type="file" className={input} onChange={e=>setManual(e.target.files?.[0])}/></label>}
    <label className="mt-2 block text-xs">取舍理由<input className={input} data-decision-reason value={reason} onChange={e=>setReason(e.target.value)} placeholder="例如，机鼻过渡连续，保留这张作为父图"/></label>
    <div className="mt-2 flex flex-wrap gap-2"><button className="btn-dark" disabled={busy||!reason.trim()||(kind!=='stop'&&!choice)} data-save-decision onClick={()=>void act(async()=>{await recordDecision(attempt.id,kind,reason,kind==='stop'?undefined:picked,kind==='manual'?manual:undefined);setReason('');},'取舍已保存。')}>保存取舍</button>
      {choice&&<button className="btn-ghost" data-continue-candidate onClick={()=>onParent(choice.id)}>以此图继续修订</button>}
      <button className="btn-ghost" data-export-attempt disabled={busy} onClick={()=>void act(()=>exportRecord(attempt),'已导出本轮原件和记录。')}>导出本轮记录</button></div>
    {attempt.decisions.length>0&&<ol className="mt-3 space-y-1 border-t border-line pt-2 text-xs">{attempt.decisions.map(decision=><li key={decision.id}><b>{labels[decision.kind]}</b> · {stamp(decision.at)} · {attempt.candidates.find(c=>c.id===decision.candidate)?.name} {decision.reason}</li>)}</ol>}
    <p role="status" className="mt-2 break-words text-xs text-ink-soft">{message}</p>
  </div>;
}

export default function CandidateWorkspace(){
  const {parameters,touched,intent,activeVariant,variants}=useDroneStore();
  const [attempts,setAttempts]=useState<FrozenAttempt[]>([]),[selected,setSelected]=useState('');
  const [condition,setCondition]=useState<'free'|'structured'>('structured'),[text,setText]=useState(''),[editText,setEditText]=useState<string|null>(null);
  const [goal,setGoal]=useState(''),[keep,setKeep]=useState(''),[parentId,setParentId]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const form=useRef<HTMLFormElement>(null);
  const compiled=compilePrompt(parameters,touched,intent,computeLayout(parameters)).text;
  useEffect(()=>{let active=true;let serial=0;const load=async()=>{const current=++serial;try{const data=await listAttempts();if(active&&current===serial)setAttempts(data);}catch(e){if(active)setError(String(e));}};void load();window.addEventListener('candidate-record-change',load);return()=>{active=false;window.removeEventListener('candidate-record-change',load);};},[]);
  const parentKey='multirotor-studio/revision-parent/'+activeVariant;
  useEffect(()=>{setEditText(null);},[compiled,activeVariant]);
  useEffect(()=>{try{setParentId(localStorage.getItem(parentKey)??'');}catch{setParentId('');}},[parentKey]);
  function chooseParent(id:string){
    setParentId(id);
    try{if(id)localStorage.setItem(parentKey,id);else localStorage.removeItem(parentKey);}catch{setError('当前浏览器存储不可用，父图只保存在本页。');}
  }
  const attempt=attempts.find(a=>a.id===selected)??attempts[0];
  async function freeze(){
    if(busy)return;setBusy(true);setError('');
    try{const parent=attempts.flatMap(a=>a.candidates).find(c=>c.id===parentId);
      if(parentId&&!parent)throw new Error('找不到选定的父图，请重新指定。');
      const id=await freezeAttempt({parameters,touched,intent},{condition,goal,keep,variantId:activeVariant,variantName:variants.find(v=>v.id===activeVariant)?.name??activeVariant},text,parent,editText??undefined);
      setSelected(id);setGoal('');setKeep('');chooseParent('');
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  }
  return <div className="space-y-4 pb-5" data-testid="candidate-workspace">
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,.85fr)_minmax(0,1.15fr)]">
      <form ref={form} className="panel p-4 sm:p-5" onSubmit={e=>{e.preventDefault();void freeze();}}>
        <h3 className="flex items-center gap-2 font-semibold"><Save size={17}/>新一轮设计</h3><p className="mt-1 text-xs text-ink-soft">先确认输入，再连接服务或导入外部运行结果。</p>
        <label className="mt-3 block text-xs">本轮想改什么<input data-attempt-goal required className={input} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="例如，调整机身与臂根的过渡"/></label>
        <label className="mt-3 block text-xs">希望保持什么<input className={input} value={keep} onChange={e=>setKeep(e.target.value)} placeholder="例如，当前布局和机鼻位置"/></label>
        <label className="mt-3 block text-xs">输入方式<select className={input} value={condition} onChange={e=>setCondition(e.target.value as typeof condition)}><option value="structured">结构化提示和条件图</option><option value="free">自由提示</option></select></label>
        {condition==='free'?<label className="mt-2 block text-xs">实际提示词<textarea className={input} data-free-prompt rows={4} required value={text} onChange={e=>setText(e.target.value)}/></label>:
        <details className="mt-3"><summary className="cursor-pointer text-xs font-medium">核对或修改编译文字</summary><textarea aria-label="确认的结构化提示词" rows={5} className={input} value={editText??compiled} onChange={e=>setEditText(e.target.value)}/></details>}
        {parentId&&<p className="mt-2 break-all text-xs">父图 · {parentId} <button className="underline" type="button" onClick={()=>chooseParent('')}>移除</button></p>}
        <button type="submit" data-freeze-attempt className="btn-dark mt-4" disabled={busy||!goal.trim()||(condition==='free'&&!text.trim())}>确认并冻结本轮输入</button>
        {error&&<p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
      </form>
      <section className="panel p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-semibold"><FileClock size={17}/>本机设计记录</h3>
        {attempt?<><label className="mt-3 block text-xs">选择轮次<select data-attempt className={input} value={attempt.id} onChange={e=>setSelected(e.target.value)}>{attempts.map(a=><option value={a.id} key={a.id}>{a.variantName} · {a.goal} · {stamp(a.createdAt)}</option>)}</select></label>
          <AttemptView key={attempt.id} attempt={attempt} onParent={id=>{chooseParent(id);form.current?.scrollIntoView({block:'start'});}}/></>:<p className="mt-3 rounded-xl border border-dashed border-line p-5 text-sm text-ink-soft">暂无设计轮次。冻结一份输入后，在这里核对回执、查看候选和记录取舍。</p>}
      </section>
    </div>
    <HistoryReplay/>
  </div>;
}
