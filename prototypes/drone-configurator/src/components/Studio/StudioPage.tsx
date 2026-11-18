// 造型：画布居中，左边是所选部件的参数，右边是布局空间、设计提示和参考机型，下面是方案条。
import React, { useMemo, useRef, useState } from 'react';
import { Anchor, Box, Camera, ChevronDown, Eye, Ruler, Settings, Undo2, Video, Zap } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, topologyOf } from '../../design/design';
import type { ParameterGroup } from '../../types/DroneParameters';
import FrameParameters from '../Parameters/FrameParameters';
import PropulsionParameters from '../Parameters/PropulsionParameters';
import FuselageParameters from '../Parameters/FuselageParameters';
import LandingGearParameters from '../Parameters/LandingGearParameters';
import AccessoriesParameters from '../Parameters/AccessoriesParameters';
import ParameterEvidence from '../Insight/ParameterEvidence';
import { GuideView, RatioHud, SideView, TopStage } from './Stage';
import SpaceMap from './SpaceMap';
import Hints from './Hints';
import References from './References';
import { aircraftParameters } from '../../data/aircraft';
import Variants from './Variants';
import { chatContext, chatScopeKey } from '../../design/designChatAudit';
import DesignChat, { type WidthPreview } from './DesignChat';

const tabs: { id: ParameterGroup; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'frame', label: '机架', icon: Settings },
  { id: 'propulsion', label: '动力', icon: Zap },
  { id: 'fuselage', label: '机身', icon: Box },
  { id: 'landing_gear', label: '起落架', icon: Anchor },
  { id: 'accessories', label: '配件', icon: Camera },
];
type View = 'top' | 'guide' | 'side';
const views: { id: View; label: string }[] = [{ id: 'top', label: '顶视' }, { id: 'guide', label: '条件图' }, { id: 'side', label: '侧视' }];

const StudioPage: React.FC<{ wide: boolean; initialTab?: ParameterGroup | null }> = ({ wide, initialTab }) => {
  const draft = useDroneStore();
  const { parameters, pinned, setGhost, lastChange, undo, history } = draft;
  const [tab, setTab] = useState<ParameterGroup>(initialTab ?? 'frame');
  const [view, setView] = useState<View>('top');
  const [preview, setPreview] = useState<WidthPreview | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const scopeKey = chatScopeKey(draft);
  const context = chatContext(draft, scopeKey, tab, view);
  const visiblePreview = preview?.version === context.version ? preview : null;
  const shownView = visiblePreview ? 'top' : view;
  const [overlays, setOverlays] = useState({ dims: true, fov: true, hidden: true });
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const select = (g: ParameterGroup) => { setTab(g); if (g === 'landing_gear') setView('side'); };
  const toggle = (k: keyof typeof overlays) => setOverlays(o => ({ ...o, [k]: !o[k] }));
  const tool = (on: boolean) => `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${on ? 'bg-ink text-white' : 'text-ink-soft hover:bg-ink/5'}`;

  const inspector = (
    <section className="panel flex min-h-0 flex-col" aria-label="部件参数" data-testid="inspector">
      <div className="grid grid-cols-5 gap-1 border-b border-line p-2" role="tablist" aria-label="部件">
        {tabs.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} data-tab={t.id} onClick={() => select(t.id)}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs font-medium transition-colors ${tab === t.id ? 'bg-ink text-white' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>
      <div className={`scroll-thin p-4 ${wide ? 'min-h-0 flex-1 overflow-y-auto' : ''}`} role="tabpanel">
        <ParameterEvidence part={tab}/>
        {tab === 'frame' && <FrameParameters />}
        {tab === 'propulsion' && <PropulsionParameters />}
        {tab === 'fuselage' && <FuselageParameters />}
        {tab === 'landing_gear' && <LandingGearParameters />}
        {tab === 'accessories' && <AccessoriesParameters />}
      </div>
    </section>
  );

  const stage = (
    <section ref={stageRef} className={`panel dot-grid relative scroll-mt-16 overflow-hidden ${wide ? 'min-h-0 flex-1' : 'order-1 h-[46vh] min-h-[300px]'}`} aria-label="画布" data-testid="preview">
      <div className={`absolute inset-0 ${shownView === 'guide' ? 'px-10 pb-32 pt-16' : shownView === 'side' ? 'px-4 pb-32 pt-14' : 'pb-32 pt-12'}`}>
        {shownView === 'top' && <TopStage active={tab} onSelect={select} overlays={overlays} previewWidth={visiblePreview?.width} />}
        {shownView === 'guide' && <GuideView layout={layout} className="mx-auto h-full max-w-full rounded-2xl shadow-float" />}
        {shownView === 'side' && <SideView parameters={parameters} layout={layout} className="h-full w-full" />}
      </div>

      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-line bg-white/90 p-1 shadow-panel backdrop-blur" role="tablist" aria-label="视图">
        {views.map(v => (
          <button key={v.id} type="button" role="tab" aria-selected={shownView === v.id} data-view={v.id} onClick={() => { setPreview(null); setView(v.id); }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${shownView === v.id ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}>{v.label}</button>
        ))}
      </div>
      {shownView === 'top' && (
        <div className="absolute right-3 top-3 flex items-center gap-0.5 rounded-full border border-line bg-white/90 p-1 shadow-panel backdrop-blur">
          <button type="button" className={tool(overlays.dims)} aria-pressed={overlays.dims} onClick={() => toggle('dims')} title="尺寸标注"><Ruler className="h-3.5 w-3.5" />{wide && '标注'}</button>
          <button type="button" className={tool(overlays.fov)} aria-pressed={overlays.fov} onClick={() => toggle('fov')} title="相机视野（俯视近似）"><Video className="h-3.5 w-3.5" />{wide && '视野'}</button>
          <button type="button" className={tool(overlays.hidden)} aria-pressed={overlays.hidden} onClick={() => toggle('hidden')} title="显示被机身挡住的相机与起落架"><Eye className="h-3.5 w-3.5" />{wide && '透视'}</button>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-center gap-2">
        {visiblePreview && <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs text-teal-900" data-testid="width-preview-caption">
          <span className="w-4 border-t-2 border-dashed border-teal-700" />试调轮廓 · {context.widthMm} → {visiblePreview.width} mm
          <button type="button" className="font-medium underline" onClick={() => setPreview(null)}>退出预览</button>
        </div>}
        {lastChange && !visiblePreview && (
          <span className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-line bg-white/90 px-3 py-1 text-xs text-ink-soft shadow-panel backdrop-blur" data-testid="last-change">
            <span className="min-w-0 truncate">{lastChange.label}{lastChange.from && `：${lastChange.from}`} → <b className="font-medium text-ink">{lastChange.to}</b></span>
            <button type="button" onClick={undo} disabled={!history.length} className="inline-flex shrink-0 items-center gap-1 font-medium text-ink hover:text-primary-600"><Undo2 className="h-3 w-3" />撤销</button>
          </span>
        )}
        {pinned && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-900" data-testid="compare-line">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />对比：{pinned.label}
            <span className="num">W/L {computeLayout(pinned.parameters).W_over_L.toFixed(2)}</span>
            <button type="button" onClick={() => setGhost('', null)} className="font-medium hover:underline">结束</button>
          </div>
        )}
        <div className="pointer-events-auto w-full max-w-2xl"><RatioHud layout={layout} compact={!wide} /></div>
      </div>

      {shownView !== 'top' && wide && (
        <p className="absolute right-3 top-3 max-w-xs rounded-2xl border border-line bg-white/90 px-3 py-2 text-xs leading-relaxed text-ink-soft shadow-panel backdrop-blur">
          {view === 'guide' ? '生成时使用这张图定位电机轴心和机架连接。' : topologyOf(layout.frame_type).layers_per_axis === 2 ? '共轴侧视示意。上下两层来自同一方案，层间距仅用于辨认。' : '侧视显示机身高度、机臂厚度和起落架离地高度。'}
        </p>
      )}
      {shownView === 'top' && wide && !lastChange && !visiblePreview && (
        <div className="pointer-events-none absolute inset-x-0 top-3 hidden justify-center min-[1360px]:flex">
          <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] text-ink-faint backdrop-blur">拖橙色轴心改布局 · 点机身或桨盘会出现可拖的手柄</span>
        </div>
      )}
    </section>
  );

  return (
    <div className={`grid gap-3 p-3 ${wide ? 'h-full min-h-0 grid-cols-[minmax(275px,22%)_minmax(0,1fr)_minmax(310px,25%)]' : 'grid-cols-[minmax(0,1fr)]'}`}
      data-testid="studio" data-frame-name={frameRules[parameters.frame.frame_type].zh}>
      <div id="studio-parts" className={`scroll-mt-16 ${wide ? 'order-1 flex min-h-0 flex-col [&>section]:flex-1' : 'order-4'}`}>{inspector}</div>
      <div className={wide ? 'order-2 flex min-h-0 min-w-0 flex-col gap-3' : 'contents'}>
        {stage}<div className="order-5"><Variants /></div>
      </div>
      {!wide && <nav aria-label="造型面板" className="order-2 flex items-center gap-2">
        <a href="#studio-chat" onClick={e => { e.preventDefault(); document.getElementById('studio-chat')?.scrollIntoView(); }} className="btn-line !text-xs">设计对话</a>
        <a href="#studio-parts" onClick={e => { e.preventDefault(); document.getElementById('studio-parts')?.scrollIntoView(); }} className="btn-line !text-xs">部件参数</a>
      </nav>}
      <aside id="studio-chat" className={`order-3 flex min-w-0 scroll-mt-16 flex-col gap-3 ${wide ? 'min-h-0' : ''}`}>
        <DesignChat key={JSON.stringify([scopeKey, context.task, context.frame])} context={context} scopeKey={scopeKey} preview={visiblePreview}
          scopeLabel={[frameRules[context.frame].zh, tabs.find(t => t.id === tab)?.label, views.find(v => v.id === view)?.label].join(' · ')}
          onSelectBody={() => select('fuselage')}
          onPreview={next => {
            setPreview(next);
            if (next && !wide) stageRef.current?.scrollIntoView({ block: 'start' });
          }}
          />
        <details className={`panel scroll-thin shrink-0 overflow-y-auto ${wide ? 'max-h-[42%]' : ''}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">布局与参考<ChevronDown size={15} /></summary>
          <div className="space-y-3 px-2 pb-2">
            <SpaceMap layout={layout} onGhost={a => setGhost(a.name, pinned?.label === a.name ? null : aircraftParameters(a, parameters))} />
            <Hints parameters={parameters} layout={layout} onSelect={select} />
            <References />
          </div>
        </details>
      </aside>
    </div>
  );
};

export default StudioPage;
