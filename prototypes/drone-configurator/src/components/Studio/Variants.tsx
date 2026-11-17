// 方案条：并行探索几个方向（论文里的 A、B、C）。点卡片切换；点“叠”把另一个方案叠到画布上对比。
import React from 'react';
import { Copy, Layers, X } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules } from '../../design/design';
import type { DroneParameters } from '../../types/DroneParameters';

const Thumb: React.FC<{ parameters: DroneParameters; active: boolean }> = ({ parameters, active }) => {
  const l = computeLayout(parameters);
  const r = l.prop_diameter_mm / 2, half = parameters.frame.wheelbase_mm * 0.56 + r + 8;
  const { length, width } = parameters.fuselage.fuselage_dimensions_mm;
  return (
    <svg viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`} className="h-12 w-12 shrink-0" aria-hidden="true">
      {l.links_mm.map(([x, y, u, v], i) => <line key={i} x1={x} y1={-y} x2={u} y2={-v} stroke={active ? '#fff' : '#8793a7'} strokeOpacity={active ? 0.7 : 1} strokeWidth={Math.max(8, parseInt(parameters.frame.arm_width_mm, 10))} strokeLinecap="round" />)}
      {l.hubs.map(h => <circle key={h.id} cx={h.x_mm} cy={-h.y_mm} r={r} fill="none" stroke={active ? '#fff' : '#a9bbdc'} strokeOpacity={active ? 0.55 : 1} strokeWidth="5" />)}
      <rect x={-width / 2} y={-length / 2} width={width} height={length} rx="10" fill={parameters.accessories.drone_primary_color || (active ? '#fff' : '#e5e8ee')} stroke={active ? '#fff' : '#0b1220'} strokeWidth="5" />
      {l.hubs.map(h => <circle key={'c' + h.id} cx={h.x_mm} cy={-h.y_mm} r="11" fill="#ff6a1a" />)}
    </svg>
  );
};

const Variants: React.FC = () => {
  const { variants, activeVariant, parameters, pinned, addVariant, switchVariant, removeVariant, setGhost } = useDroneStore();
  return (
    <section className="panel flex items-center gap-2 overflow-x-auto p-2" aria-label="方案" data-testid="variants">
      <div className="shrink-0 px-2">
        <div className="panel-title">方案</div>
        <div className="eyebrow">Variants</div>
      </div>
      {variants.map(v => {
        const active = v.id === activeVariant;
        const p = active ? parameters : v.snapshot.parameters;
        const l = computeLayout(p);
        const ghosted = pinned?.label === v.name;
        return (
          <div key={v.id} data-variant={v.id} data-active={active ? 'yes' : 'no'}
            className={`group relative flex shrink-0 items-center gap-2 rounded-2xl border py-1 pl-1 pr-3 ${active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink/40'}`}>
            <button type="button" onClick={() => switchVariant(v.id)} className="flex items-center gap-2 text-left" aria-pressed={active}>
              <Thumb parameters={p} active={active} />
              <span>
                <span className="block text-[13px] font-semibold leading-tight">{v.name}</span>
                <span className={`num block text-[11px] leading-tight ${active ? 'text-white/70' : 'text-ink-soft'}`}>{frameRules[p.frame.frame_type].zh} · W/L {l.W_over_L.toFixed(2)}</span>
              </span>
            </button>
            {!active && (
              <button type="button" onClick={() => setGhost(v.name, ghosted ? null : v.snapshot.parameters)} aria-pressed={ghosted} title="叠到画布上对比" data-action="ghost"
                className={`rounded-lg p-1 ${ghosted ? 'bg-amber-100 text-amber-700' : 'text-ink-faint hover:bg-canvas hover:text-ink'}`}><Layers className="h-4 w-4" /></button>
            )}
            {variants.length > 1 && (
              <button type="button" onClick={() => removeVariant(v.id)} title="删除这个方案" aria-label={`删除${v.name}`}
                className={`rounded-lg p-1 ${active ? 'text-white/50 hover:text-white' : 'text-ink-faint hover:text-ink'}`}><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
        );
      })}
      {variants.length < 6 && (
        <button type="button" onClick={addVariant} data-testid="variant-add" title="把当前方案复制一份，作为新的方向继续改"
          className="flex h-14 shrink-0 items-center gap-1.5 rounded-2xl border border-dashed border-ink/25 px-3 text-[13px] text-ink-soft hover:border-ink/50 hover:text-ink">
          <Copy className="h-4 w-4" />复制为新方案
        </button>
      )}
    </section>
  );
};

export default Variants;
