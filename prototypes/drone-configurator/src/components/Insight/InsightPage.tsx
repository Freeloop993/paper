// 设计目标面板：选中画布上的「目标」卡片时出现在右侧。
// 目标文字与卡片上的输入框是同一份草稿；这里负责按话题和使用状态查用户原话、确认或驳回依据。
import { useRef, useState } from 'react';
import { Check, SlidersHorizontal } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { frameRules, taskLabels } from '../../design/design';
import { wordPairs } from '../../design/fields';
import { vocabulary, type TopicTag } from '../../design/semantics/lookup.mjs';
import { stateLabels, type BriefDecision } from '../../design/semantics/brief';
import { useGoalEditor } from './useGoalEditor';
import ResearchLibrary from './ResearchLibrary';
import EvidenceGroups from './EvidenceGroups';
import './knowledge.css';

const topics = vocabulary().topics;
const actions: Record<BriefDecision['action'], string> = {
  accept: '采用依据', custom: '自定目标', reject: '驳回依据', revoke: '撤销目标', reference: '部件比较问题',
};
const samples = ['展开时希望机身显得紧凑', '折起来能放进小包', '加了保护罩后显得挺大'];

export interface EvidencePins { pinned: Set<string>; onPin: (cardId: string) => void }

export default function GoalPanel({ pins }: { pins?: EvidencePins }) {
  const { intent, setField, setTarget, setMission } = useDroneStore();
  const goal = useGoalEditor();
  const { text, inputText, mission, frame, topic, state, result, library, error, history, feedback, unsaved, setTopic, setState, apply } = goal;
  const [reason, setReason] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const related = library && inputText && !topic ? library.relatedTopics(library.search(inputText)) : [];
  const topicalLabel = topics.find(t => t.id === topic)?.label;
  function changeText(value: string) { goal.setText(value); setReason(''); }
  function chooseTopic(tag: TopicTag) { goal.chooseTopic(tag.id, tag.label); input.current?.focus(); }

  return <div className="goal-panel" data-testid="goal-panel">
    <section className="goal-editor" data-testid="intent">
      <label className="goal-prompt" htmlFor="goal-intent">这次想改变什么？</label>
      <textarea ref={input} id="goal-intent" rows={3} value={text} data-testid="brief-input" onChange={e=>changeText(e.target.value)}
        placeholder="写下部位、使用情境，以及希望看到的变化。" />
      <div className="goal-examples"><span>试一条</span>{samples.map(sample =>
        <button type="button" key={sample} onClick={()=>changeText(sample)}>{sample}</button>)}</div>
      <details className="goal-context">
        <summary><SlidersHorizontal size={14}/> 用途与构型 <span>{taskLabels[mission]} · {frameRules[frame].zh}</span></summary>
        <div className="goal-field-grid">
          <label className="knowledge-field">使用任务<select value={mission} data-testid="mission" onChange={e=>{setMission(e.target.value as typeof mission);goal.clearFeedback();}}>
            {Object.entries(taskLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <label className="knowledge-field">方案构型<select value={frame} data-testid="brief-frame" onChange={e=>{setField('frame.frame_type',e.target.value);goal.clearFeedback();}}>
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
          onClick={()=>{if(result.choiceField === 'topic')setTopic(choice);else setState(choice);goal.clearFeedback();}}>
          {stateLabels[choice] || topics.find(t=>t.id===choice)?.label || choice}</button>)}</div>}
        {related.length > 0 && <div className="research-topics"><span>检索到的相近话题</span>{related.map(t =>
          <button type="button" key={t.id} onClick={()=>chooseTopic(t)}>{t.label}</button>)}</div>}
        {(state === 'folded' || state === 'carrying') && <p className="goal-note">收纳目标会随方案保存。要核对适配，还需折叠态或携带情境的资料。</p>}
        {result?.hypotheses.map(h=><p key={h.id} className="goal-note"><b>待验证的比较方法</b> · {h.description}{h.evidence ? <><br/>{h.evidence}</> : null}</p>)}
        {result && <EvidenceGroups groups={result.groups} pins={pins} open/>}
        <details className="knowledge-disclosure" data-testid="goal-filters"><summary>调整检索条件{topicalLabel && ' · ' + topicalLabel}</summary>
          <div className="goal-field-grid">
            <label className="knowledge-field">话题<select value={topic} data-testid="brief-topic" onChange={e=>{setTopic(e.target.value);goal.clearFeedback();}}>
              <option value="">自定话题</option>{topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
            <label className="knowledge-field">观察或使用状态<select value={state} data-testid="brief-state" onChange={e=>{setState(e.target.value);goal.clearFeedback();}}>
              {Object.entries(stateLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          </div>
        </details>
        <details className="knowledge-disclosure"><summary>补充判断理由</summary>
          <label className="knowledge-field"><span className="sr-only">判断理由</span><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="为什么采用或驳回这些反馈？" data-testid="brief-reason"/></label>
          {!!result?.groups.length && <button className="goal-text-button" type="button" disabled={!reason.trim()} onClick={()=>apply('reject',reason)} data-testid="reject-evidence">记录驳回</button>}
        </details>
      </div>}
      <div className="goal-save">
        {inputText && result?.status==='retrieve' && <button type="button" className="goal-primary" onClick={()=>apply('accept',reason)} data-testid="accept-evidence">采用依据并保存目标</button>}
        <button type="button" disabled={!inputText} className={inputText && result?.status==='retrieve'?'knowledge-button':'goal-primary'}
          onClick={()=>apply('custom',reason)} data-testid="confirm-intent">{inputText && result?.status==='retrieve' ? '仅保存自定目标' : '保存自定目标'}</button>
        {feedback && <span role="status"><Check size={14}/>{feedback}</span>}
      </div>
    </section>

    <section className="goal-confirmed" aria-label="已确认的设计目标">
      <h3>已确认的设计目标</h3>
      <p data-testid="confirmed-intent">{intent.note || '还没有保存目标。'}</p>
      {intent.note && unsaved && <p className="goal-muted">卡片上的文字尚未保存，生成时使用已确认的目标。</p>}
      {intent.note && <button type="button" className="goal-text-button" onClick={()=>apply('revoke',reason)}>撤销当前目标</button>}
      {!!history.length && <details className="knowledge-disclosure"><summary>查看方案记录 · {history.length}</summary>
        <ol className="goal-history">{[...history].reverse().map((entry,i)=><li key={i}><b>{actions[entry.action]}</b> · {entry.text}
          {entry.reason && <p>{entry.reason}</p>}{!!entry.evidence?.length && <p>{entry.evidence.map(c=>c.id).join('、')}</p>}</li>)}</ol>
      </details>}
      <details className="knowledge-disclosure goal-words"><summary>补充外观偏好</summary>
        <div className="goal-field-grid">{wordPairs.map(w=><label key={w.id} className="knowledge-field">{w.left} / {w.right}
          <select value={intent.targets[w.id] ?? ''} onChange={e=>setTarget(w.id,(e.target.value || null) as 'left'|'right'|null)}>
            <option value="">不作要求</option><option value="left">{w.left}</option><option value="right">{w.right}</option></select>
        </label>)}</div>
      </details>
    </section>
    <ResearchLibrary onTopic={chooseTopic} pins={pins}/>
  </div>;
}
