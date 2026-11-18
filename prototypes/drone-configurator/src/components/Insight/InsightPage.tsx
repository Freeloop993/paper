import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Layers, SlidersHorizontal } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, topologyOf, layoutKey, taskLabels } from '../../design/design';
import { wordPairs } from '../../design/fields';
import { vocabulary, type TopicTag } from '../../design/semantics/lookup.mjs';
import { suggestFields, stateLabels, type BriefDecision } from '../../design/semantics/brief';
import { useEvidenceLibrary, decisionSources } from '../../design/semantics/evidenceLibrary';
import { TopStage } from '../Studio/Stage';
import ResearchLibrary from './ResearchLibrary';
import EvidenceGroups from './EvidenceGroups';
import './knowledge.css';

const topics = vocabulary().topics;
const actions: Record<BriefDecision['action'], string> = {
  accept: '采用依据', custom: '自定目标', reject: '驳回依据', revoke: '撤销目标', reference: '部件比较问题',
};
const samples = ['展开时希望机身显得紧凑', '折起来能放进小包', '加了保护罩后显得挺大'];

export default function InsightPage({ onNext, initialQuery = '' }: { wide: boolean; onNext: () => void; initialQuery?: string }) {
  const { parameters, intent, setField, setTarget, setMission, recordBrief, activeVariant } = useDroneStore();
  const mission = intent.taskId ?? 'consumer_camera';
  const frame = parameters.frame.frame_type;
  const history = intent.log.flatMap(item => item.brief ? [item.brief] : []);
  const previous = [...history].reverse().find(row => ['accept','custom'].includes(row.action) && row.text === intent.note
    && row.query.task === mission && row.query.layout === layoutKey(frame));
  const draftKey = 'multirotor-brief-draft/' + activeVariant;
  const [draft] = useState(() => {
    try {
      const data = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (!initialQuery && data?.base === intent.note && data.mission === mission && data.frame === frame &&
        typeof data.text === 'string' && typeof data.topic === 'string' && typeof data.state === 'string')
        return data as {text: string; topic:string; state:string};
    } catch { /* The editing session can also run without browser storage. */ }
    return null;
  });
  const [text, setText] = useState(initialQuery || (draft?.text ?? intent.note));
  const inferred = suggestFields(text);
  const savedTopic = previous?.query.topic === 'unmapped' ? '' : previous?.query.topic;
  const [topic, setTopic] = useState(draft?.topic ?? (initialQuery ? inferred.topic : savedTopic ?? inferred.topic));
  const [state, setState] = useState(draft?.state ?? (initialQuery ? inferred.state : previous?.query.state ?? inferred.state));
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const { library, error } = useEvidenceLibrary();
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({text, topic, state, base:intent.note, mission, frame})); }
    catch { /* The current draft remains editable. */ }
  }, [draftKey, text, topic, state, intent.note, mission, frame]);

  const query = { task: mission, layout: layoutKey(frame), topic: topic || 'unmapped', state };
  const result = library?.lookup(query);
  const inputText = text.trim();
  const related = library && inputText && !topic ? library.relatedTopics(library.search(inputText)) : [];
  const topicalLabel = topics.find(t => t.id === topic)?.label;
  const layout = computeLayout(parameters);
  const topology = topologyOf(frame);
  function changeText(value: string) {
    const fields = suggestFields(value);
    setText(value); setTopic(fields.topic); setState(fields.state); setReason(''); setFeedback('');
  }
  function chooseTopic(tag: TopicTag) {
    if (!inputText) changeText(tag.label);
    setTopic(tag.id); setFeedback(''); input.current?.focus(); input.current?.scrollIntoView({block:'center'});
  }
  function apply(action: 'accept' | 'custom' | 'reject' | 'revoke') {
    const at = new Date().toISOString();
    if (action === 'revoke' && previous) {
      recordBrief({...previous, action, at, reason:reason.trim()});
    } else {
      recordBrief({action, reason:reason.trim(), text:action === 'revoke' ? intent.note : inputText,
        at, ...decisionSources(query, result)});
    }
    setFeedback(action === 'reject' ? '已记录驳回理由。' : action === 'revoke' ? '已撤销设计目标。' : '已保存到方案 ' + activeVariant + '。');
  }

  return <div className="goal-page">
    <header className="goal-header"><h1>设计目标</h1><span>方案 {activeVariant} · {taskLabels[mission]}</span></header>
    <div className="goal-grid">
      <section className="goal-card goal-editor" data-testid="intent">
        <label className="goal-prompt" htmlFor="goal-intent">这次想改变什么？</label>
        <textarea ref={input} id="goal-intent" rows={3} value={text} data-testid="brief-input" onChange={e=>changeText(e.target.value)}
          placeholder="写下部位、使用情境，以及希望看到的变化。" />
        <div className="goal-examples"><span>试一条</span>{samples.map(sample =>
          <button type="button" key={sample} onClick={()=>changeText(sample)}>{sample}</button>)}</div>
        <details className="goal-context">
          <summary><SlidersHorizontal size={14}/> 用途与构型 <span>{frameRules[frame].zh}</span></summary>
          <div className="goal-field-grid">
            <label className="knowledge-field">使用任务<select value={mission} data-testid="mission" onChange={e=>{setMission(e.target.value as typeof mission);setFeedback('');}}>
              {Object.entries(taskLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
            <label className="knowledge-field">方案构型<select value={frame} data-testid="brief-frame" onChange={e=>{setField('frame.frame_type',e.target.value);setFeedback('');}}>
              {Object.entries(frameRules).map(([k,v])=><option key={k} value={k}>{v.zh}</option>)}</select></label>
          </div>
        </details>
        {intent.log.some(i=>i.action==='note' && i.value?.includes('原设计意图需重新确认')) && !intent.note &&
          <p className="goal-muted">用途或构型已变更，请重新确认目标。</p>}

        {inputText && <div className="goal-lookup" data-testid="lookup-result" data-status={result?.status ?? (error ? 'error' : 'loading')}>
          <h2>{error ? '公开卡校验失败' : result?.status==='retrieve' ? '可以参考的用户反馈' : result?.status==='clarify' ? '先确认使用情境'
            : result ? '当前条件下缺少直接依据' : '正在查找相关反馈…'}</h2>
          <p>{error ? '仍可保存自定目标。' : result?.reason}</p>
          {!!result?.choices.length && <div className="goal-options">{result.choices.map(choice => <button type="button" key={choice}
            onClick={()=>{if(result.choiceField === 'topic')setTopic(choice);else setState(choice);setFeedback('');}}>
            {stateLabels[choice] || topics.find(t=>t.id===choice)?.label || choice}</button>)}</div>}
          {related.length > 0 && <div className="research-topics"><span>检索到的相近话题</span>{related.map(t =>
            <button type="button" key={t.id} onClick={()=>chooseTopic(t)}>{t.label}</button>)}</div>}
          {(state === 'folded' || state === 'carrying') && <p className="goal-note">收纳目标会随方案保存。要核对适配，还需折叠态或携带情境的资料。</p>}
          {result?.hypotheses.map(h=><p key={h.id} className="goal-note"><b>待验证的比较方法</b> · {h.description}</p>)}
          {result && <EvidenceGroups groups={result.groups}/>}
          <details className="knowledge-disclosure" data-testid="goal-filters"><summary>调整检索条件{topicalLabel && ' · ' + topicalLabel}</summary>
            <div className="goal-field-grid">
              <label className="knowledge-field">话题<select value={topic} data-testid="brief-topic" onChange={e=>{setTopic(e.target.value);setFeedback('');}}>
                <option value="">自定话题</option>{topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
              <label className="knowledge-field">观察或使用状态<select value={state} data-testid="brief-state" onChange={e=>{setState(e.target.value);setFeedback('');}}>
                {Object.entries(stateLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
            </div>
          </details>
          <details className="knowledge-disclosure"><summary>补充判断理由</summary>
            <label className="knowledge-field"><span className="sr-only">判断理由</span><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="为什么采用或驳回这些反馈？" data-testid="brief-reason"/></label>
            {!!result?.groups.length && <button className="goal-text-button" type="button" disabled={!reason.trim()} onClick={()=>apply('reject')} data-testid="reject-evidence">记录驳回</button>}
          </details>
        </div>}
        <div className="goal-save">
          {inputText && result?.status==='retrieve' && <button type="button" className="goal-primary" onClick={()=>apply('accept')} data-testid="accept-evidence">采用依据并保存目标</button>}
          <button type="button" disabled={!inputText} className={inputText && result?.status==='retrieve'?'knowledge-button':'goal-primary'}
            onClick={()=>apply('custom')} data-testid="confirm-intent">{inputText && result?.status==='retrieve' ? '仅保存自定目标' : '保存自定目标'}</button>
          {feedback && <span role="status"><Check size={14}/>{feedback}</span>}
        </div>
        <details className="knowledge-disclosure goal-words"><summary>补充外观偏好</summary>
          <div className="goal-field-grid">{wordPairs.map(w=><label key={w.id} className="knowledge-field">{w.left} / {w.right}
            <select value={intent.targets[w.id] ?? ''} onChange={e=>setTarget(w.id,(e.target.value || null) as 'left'|'right'|null)}>
              <option value="">不作要求</option><option value="left">{w.left}</option><option value="right">{w.right}</option></select>
          </label>)}</div>
        </details>
      </section>
      <aside className="goal-card goal-preview" aria-label="当前方案">
        <div className="goal-preview-head"><Layers size={16}/><h2>当前方案</h2><span>{frameRules[frame].zh}</span></div>
        <div className="goal-stage dot-grid"><TopStage active="frame" onSelect={()=>{}} overlays={{dims:false,fov:false,hidden:false}} interactive={false}/></div>
        <div className="goal-preview-body">
          <p className="knowledge-id">{layout.hubs.length} 处轴位 · 每轴 {topology.layers_per_axis} 层 · {topology.rotor_count} 旋翼</p>
          <h3>已确认的设计目标</h3>
          <p data-testid="confirmed-intent">{intent.note || '还没有保存目标。'}</p>
          {intent.note && <button type="button" className="goal-text-button" onClick={()=>apply('revoke')}>撤销当前目标</button>}
          {!!history.length && <details className="knowledge-disclosure"><summary>查看方案记录 · {history.length}</summary>
            <ol className="goal-history">{[...history].reverse().map((entry,i)=><li key={i}><b>{actions[entry.action]}</b> · {entry.text}
              {entry.reason && <p>{entry.reason}</p>}{!!entry.evidence?.length && <p>{entry.evidence.map(c=>c.id).join('、')}</p>}</li>)}</ol>
          </details>}
          <button type="button" className="knowledge-button" onClick={onNext}>调整形态参数 <ArrowRight size={14}/></button>
        </div>
      </aside>
    </div>
    <ResearchLibrary onTopic={chooseTopic}/>
  </div>;
}
