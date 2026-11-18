import { useEffect, useState } from 'react';
import { ArrowRight, Check, CornerDownRight, Layers, SlidersHorizontal } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, topologyOf, layoutKey, taskLabels as missionLabels } from '../../design/design';
import { wordPairs } from '../../design/fields';
import { createLookup, vocabulary, type LookupResult } from '../../design/semantics/lookup.mjs';
import { suggestFields, stateLabels, type BriefDecision } from '../../design/semantics/brief';
import evidence from '../../data/evidenceCards.json';
import { TopStage } from '../Studio/Stage';
import ResearchLibrary from './ResearchLibrary';


const topics = vocabulary().topics;
const actions = { accept: '采用依据', custom: '自定意图', reject: '驳回依据', revoke: '撤销意图' };
let loaded: ReturnType<typeof createLookup> | undefined;
const getLookup = () => loaded ??= createLookup(evidence).catch(err => { loaded = undefined; throw err; });
const control = 'input-field mt-1.5 block w-full';
const samples = ['展开时希望机身显得紧凑', '折起来能放进小包', '加了保护罩后显得挺大'];

export default function InsightPage({ onNext, initialQuery = '' }: { wide: boolean; onNext: () => void; initialQuery?: string }) {
  const { parameters, intent, setField, setTarget, setMission, recordBrief, activeVariant } = useDroneStore();
  const mission = intent.taskId ?? 'consumer_camera';
  const history = intent.log.flatMap(item => item.brief ? [item.brief] : []);
  const previous = [...history].reverse().find(row => ['accept','custom'].includes(row.action) && row.text === intent.note);
  const draftKey = 'multirotor-brief-draft/' + activeVariant;
  const [draft] = useState(() => {
    try {
      const data = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (!initialQuery && data?.base === intent.note && data.mission === mission &&
          data.frame === parameters.frame.frame_type && typeof data.text === 'string') return data as {
        text: string; topic:string; state:string;
      };
    } catch { /* The workbench also runs without browser draft storage. */ }
    return null;
  });
  const [text, setText] = useState(initialQuery || draft?.text || intent.note);
  const inferred = suggestFields(text);
  const [topic, setTopic] = useState(draft?.topic ?? previous?.query.topic ?? inferred.topic);
  const [state, setState] = useState(draft?.state ?? previous?.query.state ?? inferred.state);
  useEffect(() => {
    try {sessionStorage.setItem(draftKey, JSON.stringify({text, topic, state, base:intent.note, mission, frame:parameters.frame.frame_type}));}
    catch { /* Current editing remains available. */ }
  }, [draftKey, text, topic, state, intent.note, mission, parameters.frame.frame_type]);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [lookup, setLookup] = useState<Awaited<ReturnType<typeof createLookup>>>();
  const [error, setError] = useState('');
  useEffect(() => { let alive = true; getLookup().then(fn => { if(alive) setLookup(() => fn); }).catch(() => { if(alive) setError('公开卡表未能校验。可继续使用自定意图。'); }); return () => {alive = false;}; }, []);
  const frame = parameters.frame.frame_type;
  const layout = computeLayout(parameters);
  const topology = topologyOf(frame);
  const query = {task: mission, layout: layoutKey(frame), topic: topic || 'unmapped', state};
  const result = lookup?.(query);
  const changeText = (value: string) => {
    setText(value); setFeedback(''); setReason('');
    const parsed = suggestFields(value); setTopic(parsed.topic); setState(parsed.state);
  };
  const apply = (action: BriefDecision['action']) => {
    if(action === 'revoke' && previous) {
      recordBrief({...previous, action, at:new Date().toISOString(), reason:reason.trim()});
      setFeedback('已撤销当前意图，保留原记录。'); return;
    }
    const material: LookupResult = result ?? {version:'unavailable',corpus:'',query,status:'abstain',component:undefined,
      reason:'未载入卡表',choices:[],choiceField:null,groups:[],hypotheses:[]};
    const entry = { action, reason:reason.trim(), text:action === 'revoke' ? intent.note : text.trim(), at:new Date().toISOString(),
      query, status:material.status, sourceVersion:material.version, corpus:material.corpus,
      evidence:material.groups.flatMap(g=>g.cards.map(c=>({id:c.id,source:g.source,role:c.role}))),
      hypotheses:material.hypotheses.map(h=>h.id) };
    recordBrief(entry);
    setFeedback(action === 'reject' ? '已记录驳回理由。' : action === 'revoke' ? '已撤销当前意图，保留原记录。' : '已写入本方案简报。');
  };
  const inputText = text.trim();
  return <div className="mx-auto max-w-[1370px] px-4 py-6 sm:px-7 lg:py-9">
    <div className="mb-6 flex items-end justify-between gap-5">
      <div><div className="eyebrow">Design brief</div><h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">任务简报</h1>
      <p className="mt-2 text-sm text-ink-soft">确定设计用途与构型，写下这次想改变的外观。</p></div>
      <button className="btn-dark shrink-0" onClick={onNext}>进入造型 <ArrowRight size={15}/></button>
    </div>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section className="panel p-5 sm:p-7" data-testid="intent">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">使用任务<select className={control} value={mission} data-testid="mission" onChange={e=>{setMission(e.target.value as typeof mission);setFeedback('');}}>
            {Object.entries(missionLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm font-medium">方案构型<select className={control} value={frame} data-testid="brief-frame" onChange={e=>{setField('frame.frame_type', e.target.value);setFeedback('');}}>
            {Object.entries(frameRules).map(([k,v])=><option key={k} value={k}>{v.zh}</option>)}</select></label>
        </div>
        {intent.log.some(i=>i.action==='note' && i.value?.includes('原设计意图需重新确认')) && !intent.note && <p className="mt-3 text-xs text-ink-soft">任务或构型已变更，请在本方案内重新确认意图。</p>}
        <label className="mt-6 block text-sm font-medium">设计意图<textarea rows={3} value={text} data-testid="brief-input" onChange={e=>changeText(e.target.value)} className={control + ' resize-y leading-7'} placeholder="例如，希望展开时机身显得紧凑，同时保住臂根连接。"/></label>
        <div className="mt-2 flex flex-wrap gap-2">{samples.map(s=><button key={s} className="chip hover:border-primary-500" onClick={()=>changeText(s)}>{s}</button>)}</div>
        {inputText && <div className="mt-5 border-t border-line pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-ink-soft">意图涉及的话题<select className={control} value={topic} data-testid="brief-topic" onChange={e=>{setTopic(e.target.value);setFeedback('');}}>
              <option value="">自定话题</option>{topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
            <label className="text-xs text-ink-soft">观察或使用状态<select className={control} value={state} data-testid="brief-state" onChange={e=>{setState(e.target.value);setFeedback('');}}>
              {Object.entries(stateLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/70 p-4" data-testid="lookup-result" data-status={result?.status ?? 'loading'}>
            <div className="flex items-center gap-2 text-sm font-semibold"><CornerDownRight size={15}/>{result?.status === 'retrieve' ? '相关用户表达' : result?.status === 'clarify' ? '先确认语境' : result ? '此条件下缺少直接依据' : '读取公开依据'}</div>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{error || result?.reason}</p>
            {!!result?.choices.length && <div className="mt-2 flex flex-wrap gap-2">{result.choices.map(c=><button key={c} className="chip" onClick={()=>{if(result.choiceField === 'topic')setTopic(c);else setState(c);setFeedback('');}}>{stateLabels[c] || topics.find(t=>t.id===c)?.label || c}</button>)}</div>}
            {(state === 'folded' || state === 'carrying') && <p className="mt-2 text-xs leading-5 text-ink-soft">此项保留在简报。当前条件图展示展开外观，收纳适配需另作表达。</p>}
            {result?.hypotheses.map(h=><p key={h.id} className="mt-2 text-sm"><strong>待验假设 · </strong>{h.description}</p>)}
            {!!result?.groups.length && <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">查看 {result.groups.length} 个来源与适用限制</summary>
              {result.groups.map(g=><div className="mt-3 border-l-2 border-primary-200 pl-3" key={g.source}>{g.cards.map(c=><div key={c.id} className="mb-2" data-card={c.id}><span className="num mr-2 text-[11px] text-ink-soft">{c.id}{c.role==='caution' ? ' · 限制' : ''}</span>{c.quote}<p className="mt-1 text-xs text-ink-soft">{c.limits}</p></div>)}</div>)}
            </details>}
          </div>
          <label className="mt-4 block text-xs text-ink-soft">判断理由<input value={reason} onChange={e=>setReason(e.target.value)} className={control} placeholder="记下取舍或改写原因" data-testid="brief-reason"/></label>
          <div className="mt-3 flex flex-wrap gap-2">
            {result?.status==='retrieve' && <button className="btn-primary" onClick={()=>apply('accept')} data-testid="accept-evidence">采用依据并确认意图</button>}
            <button className={result?.status==='retrieve'?'btn-line':'btn-primary'} onClick={()=>apply('custom')} data-testid="confirm-intent">按自定意图确认</button>
            {!!result?.groups.length && <button className="btn-ghost" disabled={!reason.trim()} onClick={()=>apply('reject')} data-testid="reject-evidence">记录驳回</button>}
          </div>
        </div>}
        {feedback && <p className="mt-3 flex items-center gap-1 text-sm text-emerald-700" role="status"><Check size={14}/>{feedback}</p>}
        <details className="mt-5 border-t border-line pt-4"><summary className="cursor-pointer text-sm font-medium">外观语义词对</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{wordPairs.map(w=><label key={w.id} className="text-xs text-ink-soft">{w.left} / {w.right}<select className={control} value={intent.targets[w.id] ?? ''} onChange={e=>setTarget(w.id,(e.target.value || null) as 'left'|'right'|null)}><option value="">不作要求</option><option value="left">{w.left}</option><option value="right">{w.right}</option></select></label>)}</div>
        </details>
      </section>
      <aside className="panel overflow-hidden" aria-label="当前方案">
        <div className="flex items-center justify-between border-b border-line px-5 py-3"><span className="flex items-center gap-2 text-sm font-semibold"><Layers size={16}/>方案 {activeVariant}</span><span className="num text-xs">{frameRules[frame].zh}</span></div>
        <div className="dot-grid h-[210px] bg-canvas sm:h-[255px]"><TopStage active="frame" onSelect={()=>{}} overlays={{dims:false,fov:false,hidden:false}} interactive={false}/></div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap gap-2"><span className="chip">{missionLabels[mission]}</span><span className="chip">{layout.hubs.length} 轴位 · {topology.layers_per_axis} 层 · {topology.rotor_count} 旋翼</span></div>
          <div className="text-sm font-semibold">已确认意图</div>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-soft" data-testid="confirmed-intent">{intent.note || '尚未确认，可以先探索布局。'}</p>
          {intent.note && <button className="btn-ghost !px-0 text-xs" onClick={()=>apply('revoke')}>撤销当前意图</button>}
          {!!history.length && <details className="border-t border-line pt-3"><summary className="cursor-pointer text-sm">简报记录 · {history.length}</summary><ol className="mt-2 max-h-64 space-y-2 overflow-y-auto">{[...history].reverse().map((h,i)=><li key={i} className="rounded-lg bg-canvas p-3 text-xs"><strong>{actions[h.action]}</strong> · {h.text}<p className="mt-1 text-ink-soft">{h.reason || h.evidence.map(c=>c.id).join('、') || stateLabels[h.query.state]}</p></li>)}</ol></details>}
          <button onClick={onNext} className="btn-line"><SlidersHorizontal size={14}/>调整形态参数</button>
        </div>
      </aside>
    </div>
    <ResearchLibrary/>
  </div>;
}
