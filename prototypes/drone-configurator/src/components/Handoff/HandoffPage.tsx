// 交付：核对将要发给模型的三样东西——条件图、提示词、规格卡——然后导出。
import React, { useCallback, useMemo, useState } from 'react';
import CandidateWorkspace from './CandidateWorkspace';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, taskLabels, topologyOf } from '../../design/design';
import { GuideView } from '../Studio/Stage';
import PromptGenerator from '../DevPreview/PromptGenerator';
import ParameterOverview from '../Overview/ParameterOverview';

export interface HandoffEntry { attemptId?: string; parentCandidateId?: string; candidates?: boolean }

const HandoffPage: React.FC<{ wide: boolean; entry?: HandoffEntry }> = ({ wide, entry }) => {
  const { parameters, intent, variants, activeVariant } = useDroneStore();
  const [panel, setPanel] = useState<'inputs'|'candidates'>(entry?.candidates ? 'candidates' : 'inputs');
  const [initialParent,setInitialParent]=useState(entry?.parentCandidateId);
  const consumeParent=useCallback(()=>setInitialParent(undefined),[]);
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const name = variants.find(v => v.id === activeVariant)?.name ?? '';
  return (
    <div className={`mx-auto max-w-[1500px] p-3 sm:p-5 ${wide ? 'flex h-full min-h-0 flex-col' : ''}`} data-testid="handoff">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <div>
          <div className="eyebrow">Handoff</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">设计交付</h1>
        </div>
        <p className="pb-1 text-sm text-ink-soft">{name} · {frameRules[parameters.frame.frame_type].zh} · {taskLabels[intent.taskId ?? 'consumer_camera']} · {layout.hubs.length} 个轴位</p>
      </div>

      <div className="mt-4 flex w-fit gap-1 rounded-full border border-line bg-white p-1" aria-label="交付内容">{([['inputs','设计输入'],['candidates','候选与记录']] as const).map(([id,label])=><button key={id} data-handoff-tab={id} aria-pressed={panel===id} className={panel===id?'btn-dark':'btn-ghost'} onClick={()=>setPanel(id)}>{label}</button>)}</div>
      {panel==='inputs' ? <div className={`mt-4 gap-4 ${wide ? 'grid min-h-0 flex-1 grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)_minmax(0,1fr)]' : 'space-y-4'}`}>
        <section className="panel flex min-h-0 flex-col p-5" aria-label="条件图" data-testid="guide-card">
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold text-ink">条件图</h3>
            <span className="eyebrow">Layout image</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">1024 × 1024，机头朝上。点表示轴位，线表示机架连接。{topologyOf(parameters.frame.frame_type).layers_per_axis === 2 && ' 上下旋翼重叠，顶视只能判读轴位。'}</p>
          <div className="mt-3 flex min-h-0 flex-1 items-center justify-center">
            <GuideView layout={layout} className="max-h-full w-full max-w-md rounded-2xl shadow-float" />
          </div>
          <dl className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-ink-soft">
            {layout.hubs.map(h => <div key={h.id} className="flex justify-between"><dt>{h.id} {h.role_zh}</dt><dd>{h.x_px.toFixed(0)}, {h.y_px.toFixed(0)} px</dd></div>)}
          </dl>
        </section>

        <PromptGenerator />
        <ParameterOverview />
      </div> : <div className="scroll-thin mt-4 min-h-0 flex-1 overflow-y-auto"><CandidateWorkspace initialAttempt={entry?.attemptId} initialParent={initialParent} onParentConsumed={consumeParent}/></div>}
    </div>
  );
};

export default HandoffPage;
