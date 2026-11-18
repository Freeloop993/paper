import { useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import type { ParameterGroup } from '../../types/DroneParameters';
import { layoutKey } from '../../design/design';
import { comparisons } from '../../design/semantics/comparisonQuestions';
import { decisionSources, useEvidenceLibrary } from '../../design/semantics/evidenceLibrary';
import EvidenceGroups from './EvidenceGroups';
import './knowledge.css';

export default function ParameterEvidence({ part }: { part: ParameterGroup }) {
  const { parameters, intent, recordBrief } = useDroneStore();
  const { library, error } = useEvidenceLibrary();
  const [choice, setChoice] = useState('');
  const items = comparisons[part];
  const selected = items.find(item => item.topic === choice) ?? items[0];
  const task = intent.taskId ?? 'consumer_camera';
  const layout = layoutKey(parameters.frame.frame_type);
  const query = selected && { task, layout, topic: selected.topic, state: selected.state };
  const result = query && library?.lookup(query);
  const recorded = !!query && intent.log.some(({brief}) => brief?.action === 'reference' && brief.part === part
    && brief.query.task === task && brief.query.layout === layout && brief.query.topic === query.topic && brief.query.state === query.state);
  const record = () => {
    if (recorded || !selected || !query || result?.status !== 'retrieve') return;
    recordBrief({ action:'reference', part, text:selected.question, reason:'', at:new Date().toISOString(),
      ...decisionSources(query, result) });
  };
  return <details className="knowledge-parameter" data-testid="parameter-evidence" key={part}>
    <summary><BookOpen size={15}/> 相关用户反馈 <span>{selected?.label ?? '起落架'}</span></summary>
    <div className="knowledge-parameter-body">
      {!selected ? <p>公开短引中暂无针对起落架外形的反馈。</p> : <>
        <label className="knowledge-field">想核对什么
          <select value={selected.topic} onChange={e => setChoice(e.target.value)}>
            {items.map(item => <option key={item.topic} value={item.topic}>{item.label}</option>)}
          </select>
        </label>
        {error ? <p role="status">公开卡校验失败。</p> : !result ? <p>正在读取公开卡…</p> : <>
          <p>{result.reason}</p>
          {result.status === 'retrieve' && <>
            <EvidenceGroups groups={result.groups}/>
            <div className="knowledge-question"><strong>设计时可以这样比较</strong><p>{selected.question}</p></div>
            <button className="knowledge-button" type="button" disabled={recorded} onClick={record} data-testid="record-part-evidence">
              {recorded ? <><Check size={14}/> 已记入方案</> : '记录问题和 ' + result.groups.length + ' 个来源'}
            </button>
          </>}
        </>}
      </>}
    </div>
  </details>;
}
