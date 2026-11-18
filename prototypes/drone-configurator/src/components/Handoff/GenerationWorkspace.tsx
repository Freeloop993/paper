import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUpRight, Check, Image as ImageIcon, LoaderCircle, Sparkles } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { candidateRetained, listAttempts, markPresented, recordDecision, type FrozenAttempt } from '../../design/candidateRecords';
import { computeLayout, frameRules, taskLabels } from '../../design/design';
import { generationStatus, isGenerationPending, recoverDesignGenerations, retryCollection, startDesignGeneration } from '../../design/generation';
import { GuideView } from '../Studio/Stage';
import CandidatePreview from './CandidatePreview';
import type { HandoffEntry } from './HandoffPage';

export default function GenerationWorkspace({entry}: {entry?: HandoffEntry}) {
  const {task, parameters, intent, activeVariant, variants} = useDroneStore();
  const [records, setRecords] = useState<FrozenAttempt[]>([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(entry?.attemptId ?? '');
  const [goal, setGoal] = useState('');
  const [parent, setParent] = useState(entry?.parentCandidateId);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const startLock = useRef(false);
  const layout = computeLayout(parameters);
  const variant = variants.find(v => v.id === activeVariant);
  const name = variant?.name ?? activeVariant;
  const variantScope = task + '/' + (variant?.workflowKey ?? activeVariant);

  useEffect(() => {
    let active = true, sequence = 0;
    const load = async () => {
      const tick = ++sequence;
      try {
        const rows = await listAttempts();
        if (active && tick === sequence) {setRecords(rows); setReady(true);}
      } catch (error) { if (active) setError(String(error)); }
    };
    const workerError = (event: Event) => setError((event as CustomEvent<{message:string}>).detail.message);
    void load();
    void recoverDesignGenerations().catch(error => { if (active) setError(String(error)); });
    window.addEventListener('candidate-record-change', load);
    window.addEventListener('generation-worker-finished', load);
    window.addEventListener('focus', load);
    window.addEventListener('generation-error', workerError);
    return () => {
      active = false;
      window.removeEventListener('candidate-record-change', load);
      window.removeEventListener('generation-worker-finished', load);
      window.removeEventListener('focus', load);
      window.removeEventListener('generation-error', workerError);
    };
  }, []);

  useEffect(() => {
    if (!entry?.generate) return;
    let active = true;
    setStarting(true); setError('');
    void startDesignGeneration({id: entry.generate, task, parentCandidateId: entry.parentCandidateId}).then(id => {
      if (active) {setSelected(id); setParent(undefined);}
    }).catch(error => { if (active) setError(String(error)); }).finally(() => { if (active) setStarting(false); });
    return () => { active = false; };
  }, [entry?.generate, entry?.parentCandidateId, task]);

  const rounds = records.filter(row => row.id === entry?.attemptId || row.h3 && (row.variantScope === variantScope ||
    (!row.variantScope && variantScope === 'quad/A' && row.variantId === 'A')));
  const round = rounds.find(row => row.id === selected) ?? rounds[0];
  const status = round && generationStatus(round);
  const pending = starting || !!round && isGenerationPending(round);
  const issue = round?.h3?.issue;
  const hasResult = round?.h3?.status === 'succeeded' || !!round?.receipt;

  async function generate(parentId?: string) {
    if (startLock.current || pending) return;
    startLock.current = true; setStarting(true); setError('');
    try {
      const id = await startDesignGeneration({id: crypto.randomUUID(), task, goal, parentCandidateId: parentId});
      setSelected(id); setGoal(''); setParent(undefined);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setStarting(false); startLock.current = false; }
  }

  return <div className="generation-workspace">
    <section className="generation-input" aria-label="当前设计">
      <h2>当前设计</h2>
      <div className="generation-layout"><GuideView layout={layout} className="generation-guide"/><div><strong>{name}</strong><p>{frameRules[parameters.frame.frame_type].zh} · {layout.hubs.length} 个轴位</p><p>{taskLabels[intent.taskId ?? 'consumer_camera']}</p></div></div>
      <label className="generation-goal">这轮想改变什么<span>选填</span><textarea rows={2} value={goal} onChange={e => setGoal(e.target.value)} data-testid="generation-goal" placeholder={intent.note.trim() || '例如，让机鼻和相机的过渡更圆润'}/></label>
      {parent && <p className="generation-parent">已选候选图作为本轮参考。<button type="button" onClick={() => setParent(undefined)}>移除</button></p>}
      <button type="button" className="canvas-action primary generation-start" disabled={!ready || pending} data-testid="generate-current" onClick={() => void generate(parent)}>
        {pending ? <LoaderCircle size={16} className="animate-spin"/> : <Sparkles size={16}/>}
        {pending ? '正在生成' : issue && round?.h3?.status !== 'failed' ? '按当前设计另起一轮' : '生成效果图'}
      </button>
      <p className="generation-provider" data-testid="generation-model">MiniMax H3 Image</p>
    </section>
    <section className="generation-results" aria-label="生成结果">
      <header><h2>生成结果</h2>{round && rounds.length > 1 && <select aria-label="选择生成轮次" data-testid="generation-round" value={round.id} onChange={e => setSelected(e.target.value)}>
        {rounds.map((row, index) => <option key={row.id} value={row.id}>第 {rounds.length - index} 轮 · {row.goal}</option>)}
      </select>}</header>
      {round && status ? <>
        <div className={'generation-status' + (issue || round.failure ? ' issue' : '')} data-testid="generation-status" role="status">
          {issue || round.failure ? <AlertCircle size={17}/> : hasResult ? <Check size={17}/> : <ImageIcon size={17}/>}
          <div><strong>{status.title}</strong><p>{status.detail}</p>
            {issue && round.h3?.status !== 'failed' && <button type="button" onClick={() => void retryCollection(round.id).catch(e => setError(String(e)))}>恢复本轮生成</button>}
          </div>
        </div>
        <div className="generation-round-meta"><strong>{round.goal}</strong><span>{new Date(round.createdAt).toLocaleString('zh-CN', {hour12:false})}</span>
        </div>
        {hasResult && <div className="generation-outputs">{round.candidates.map((candidate,index) => <figure className="generation-output" data-testid="generation-result" key={candidate.id}>
          <CandidatePreview show candidate={candidate} onVisible={() => markPresented(round.id, candidate.id)} onError={setError}/>
          <figcaption><span>候选 {String(index + 1).padStart(2, '0')}</span>
            <div className="generation-output-actions">
              <button type="button" data-retain-candidate={candidate.id} disabled={!candidate.firstShown || candidateRetained(round,candidate.id)}
                onClick={() => void recordDecision(round.id,'accept','设计者选择保留此方案。',candidate.id,undefined,true).catch(e=>setError(String(e)))}>
                <Check size={14}/>{candidateRetained(round,candidate.id) ? '已保留' : '保留此方案'}
              </button>
              <button type="button" disabled={pending || !candidate.firstShown} data-generate-from={candidate.id} onClick={() => void generate(candidate.id)}>以此图继续生成<ArrowUpRight size={14}/></button>
            </div>
          </figcaption>
        </figure>)}</div>}
      </> : <div className="generation-empty"><ImageIcon size={26}/><p>{ready ? '生成后，效果图会出现在这里。' : '正在读取本机记录…'}</p></div>}
    </section>
    {error && <p className="generation-error" role="alert">{error}</p>}
  </div>;
}
