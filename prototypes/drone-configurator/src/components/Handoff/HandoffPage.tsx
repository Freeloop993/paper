// 交付：核对将要发给模型的三样东西——条件图、提示词、规格卡——然后导出。
import React, { useMemo } from 'react';
import { ImageOff } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules } from '../../design/design';
import { GuideView } from '../Studio/Stage';
import PromptGenerator from '../DevPreview/PromptGenerator';
import ParameterOverview from '../Overview/ParameterOverview';

const HandoffPage: React.FC<{ wide: boolean }> = ({ wide }) => {
  const { parameters, variants, activeVariant } = useDroneStore();
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const name = variants.find(v => v.id === activeVariant)?.name ?? '';
  return (
    <div className={`mx-auto max-w-[1500px] p-3 sm:p-5 ${wide ? 'flex h-full min-h-0 flex-col' : ''}`} data-testid="handoff">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <div>
          <div className="eyebrow">Handoff</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">核对后交给出图一方</h1>
        </div>
        <p className="pb-1 text-sm text-ink-soft">{name} · {frameRules[parameters.frame.frame_type].zh} · 三件出自同一份规格，文件名带同一个时间。</p>
      </div>

      <div className={`mt-4 gap-4 ${wide ? 'grid min-h-0 flex-1 grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)_minmax(0,1fr)]' : 'space-y-4'}`}>
        <section className="panel flex min-h-0 flex-col p-5" aria-label="条件图" data-testid="guide-card">
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold text-ink">条件图</h3>
            <span className="eyebrow">Layout image</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">只告诉模型电机在哪、机架怎么连；机身外形不画，留给造型。1024 × 1024，机头朝上。</p>
          <div className="mt-3 flex min-h-0 flex-1 items-center justify-center">
            <GuideView layout={layout} className="max-h-full w-full max-w-md rounded-2xl shadow-float" />
          </div>
          <dl className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-ink-soft">
            {layout.hubs.map(h => <div key={h.id} className="flex justify-between"><dt>{h.id} {h.role_zh}</dt><dd>{h.x_px.toFixed(0)}, {h.y_px.toFixed(0)} px</dd></div>)}
          </dl>
        </section>

        <PromptGenerator />
        <ParameterOverview />
      </div>

      <section className="panel mt-4 flex flex-wrap items-center gap-4 p-4" aria-label="候选图" data-testid="candidates">
        <div className="min-w-[12rem] flex-1">
          <div className="flex items-baseline gap-2"><h3 className="panel-title">候选图</h3><span className="eyebrow">Candidates</span></div>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">模型服务还没有接入。导出后由出图一方生成，每个方案一次出 3 张初稿；回图上的轴心与比例需要另行量测。</p>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ink/20 text-ink-faint">
            <ImageOff className="h-4 w-4" /><span className="text-[10px]">初稿 {i}</span>
          </div>
        ))}
      </section>
    </div>
  );
};

export default HandoffPage;
