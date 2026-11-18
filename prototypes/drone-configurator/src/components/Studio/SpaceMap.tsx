// 布局空间：横轴是横纵比 W/L，纵轴是桨径 ÷ 轴距。把当前方案、实验档和真实机型放在同一张图上，
// 设计的不只是一个方案，而是看清它在可选范围里的位置。橙点可以直接拖。
import React, { useRef, useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { frameRules, topologyOf, usesConsumerReferences, type Layout } from '../../design/design';
import { aircraft, ddOf, type Aircraft } from '../../data/aircraft';

const X0 = 0.55, X1 = 1.75, Y0 = 0.3, Y1 = 0.75, W = 300, H = 214, L = 42, B = 28, T = 8, R = 8;
const px = (v: number) => L + ((v - X0) / (X1 - X0)) * (W - L - R);
const py = (v: number) => T + (1 - (v - Y0) / (Y1 - Y0)) * (H - T - B);
/** 四副桨同高时，相邻桨盘刚好相碰的 d/D：矩形布局里短边 ÷ 对角线。 */
const touch = (k: number) => Math.min(k, 1) / Math.hypot(1, k);

const SpaceMap: React.FC<{ layout: Layout; onGhost: (a: Aircraft) => void }> = ({ layout, onGhost }) => {
  const { parameters, setMany, intent } = useDroneStore();
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const rule = frameRules[parameters.frame.frame_type];
  const cur = { x: layout.W_over_L, y: layout.d_over_reference_span };
  const curve = Array.from({ length: 49 }, (_, i) => X0 + ((X1 - X0) * i) / 48);
  const region = `M${px(X0)},${py(Y1)} ` + curve.map(k => `L${px(k)},${py(Math.min(Y1, touch(k)))}`).join(' ') + ` L${px(X1)},${py(Y1)} Z`;

  const move = (e: React.PointerEvent) => {
    if (!dragging || !svg.current) return;
    const box = svg.current.getBoundingClientRect();
    const sx = ((e.clientX - box.left) / box.width) * W, sy = ((e.clientY - box.top) / box.height) * H;
    const wl = X0 + ((sx - L) / (W - L - R)) * (X1 - X0), dd = Y0 + (1 - (sy - T) / (H - T - B)) * (Y1 - Y0);
    const entries: [string, unknown][] = [['propulsion.prop_diameter_inch', Number(Math.min(10, Math.max(3, (dd * parameters.frame.wheelbase_mm) / 25.4)).toFixed(1))]];
    if (rule.wl.adjustable) {
      const snapped = [0.7, 1, 1.3].find(m => Math.abs(m - wl) < 0.02) ?? wl;
      entries.push(['frame.span_ratio_wl', Number(Math.min(rule.wl.max, Math.max(rule.wl.min, snapped)).toFixed(2))]);
    }
    setMany(entries, '在布局空间里拖动');
  };

  const topology = topologyOf(layout.frame_type);
  if (!usesConsumerReferences(layout.frame_type, intent.taskId) || ['Deadcat', '+ Configuration'].includes(layout.frame_type)) {
    return <section className="panel p-4" aria-label="布局空间" data-testid="space-map">
      <h3 className="panel-title">{rule.zh}布局</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-ink-soft">水平轴位</dt><dd className="num text-xl">{topology.axis_count}</dd></div>
        <div><dt className="text-ink-soft">每处旋翼层数</dt><dd className="num text-xl">{topology.layers_per_axis}</dd></div>
        <div><dt className="text-ink-soft">横纵跨度比</dt><dd className="num">{layout.W_over_L.toFixed(2)}</dd></div>
        <div><dt className="text-ink-soft">{layout.D_mean_mm === null ? '最远两轴间距' : '对置平均轴距'}</dt><dd className="num">{layout.reference_span_mm.toFixed(0)} mm</dd></div>
      </dl>
      <p className="mt-3 text-xs text-ink-soft">{topology.layer_visibility}</p>
    </section>;
  }

  return (
    <section className="panel p-4" aria-label="布局空间" data-testid="space-map">
      <div className="flex items-baseline gap-2">
        <h3 className="panel-title">布局空间</h3>
        <span className="eyebrow">Layout space</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">你的方案在哪儿：对照实验档和真实机型。橙点可以拖。</p>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full touch-none select-none" onPointerMove={move}
        onPointerUp={() => setDragging(false)} onPointerLeave={() => setDragging(false)} role="img" aria-label="横纵比与桨径比的二维图">
        <defs>
          <pattern id="map-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#f1c9b5" strokeWidth="1.2" /></pattern>
        </defs>
        <rect x={L} y={T} width={W - L - R} height={H - T - B} rx="6" fill="#f7f8fa" />
        <path d={region} fill="url(#map-hatch)" />
        <text x={px(0.6)} y={py(0.705)} fontSize="8.5" fill="#c2643a">桨盘重叠区（同高会相碰，需前后桨错层）</text>
        {[0.7, 1.0, 1.3, 1.6].map(v => <g key={v}><line x1={px(v)} y1={T} x2={px(v)} y2={H - B} stroke="#e5e8ee" /><text x={px(v)} y={H - B + 11} fontSize="8.5" textAnchor="middle" fill="#98a1ae" className="font-mono">{v.toFixed(2)}</text></g>)}
        {[0.4, 0.5, 0.6, 0.7].map(v => <g key={v}><line x1={L} y1={py(v)} x2={W - R} y2={py(v)} stroke="#e5e8ee" /><text x={L - 5} y={py(v) + 3} fontSize="8.5" textAnchor="end" fill="#98a1ae" className="font-mono">{v.toFixed(2)}</text></g>)}
        <text x={(L + W - R) / 2} y={H - 4} fontSize="9" textAnchor="middle" fill="#5b6472">横纵比 W/L →</text>
        <text x={10} y={(T + H - B) / 2} fontSize="9" textAnchor="middle" fill="#5b6472" transform={`rotate(-90 10 ${(T + H - B) / 2})`}>桨径 ÷ 轴距 →</text>

        {/* 实验档 */}
        {[0.7, 1.0, 1.3].flatMap(x => [0.4, 0.5, 0.6].map(y => <rect key={`${x}-${y}`} x={px(x) - 3} y={py(y) - 3} width="6" height="6" fill="#fff" stroke="#1f62f0" strokeWidth="1.2" />))}
        {/* 真实机型：有桨径与轴距的画成点；只有 W/L 的在横轴上画短线 */}
        {aircraft.map(a => {
          const dd = ddOf(a);
          if (!a.wl) return null;
          const on = hover === a.id;
          return dd ? (
            <g key={a.id} onPointerEnter={() => setHover(a.id)} onPointerLeave={() => setHover(null)} onClick={() => onGhost(a)} style={{ cursor: 'pointer' }} data-aircraft={a.id}>
              <circle cx={px(a.wl)} cy={py(dd)} r="8" fill="transparent" />
              <circle cx={px(a.wl)} cy={py(dd)} r={on ? 4.5 : 3.2} fill="#0b1220" />
            </g>
          ) : (
            <g key={a.id} onPointerEnter={() => setHover(a.id)} onPointerLeave={() => setHover(null)} onClick={() => onGhost(a)} style={{ cursor: 'pointer' }} data-aircraft={a.id}>
              <rect x={px(a.wl) - 4} y={H - B - 10} width="8" height="12" fill="transparent" />
              <line x1={px(a.wl)} y1={H - B - 7} x2={px(a.wl)} y2={H - B} stroke="#0b1220" strokeWidth={on ? 2.4 : 1.4} />
            </g>
          );
        })}
        {hover && (() => {
          const a = aircraft.find(x => x.id === hover)!, dd = ddOf(a);
          const x = px(a.wl!), y = dd ? py(dd) - 8 : H - B - 12;
          return <text x={Math.min(W - R - 2, x)} y={y} fontSize="9" textAnchor={x > W - 70 ? 'end' : 'middle'} fill="#0b1220" fontWeight="600" stroke="#f7f8fa" strokeWidth="3" paintOrder="stroke">{a.name}</text>;
        })()}
        {/* 当前方案 */}
        <g onPointerDown={e => { e.preventDefault(); svg.current?.setPointerCapture(e.pointerId); setDragging(true); }} style={{ cursor: dragging ? 'grabbing' : 'grab' }} data-testid="space-current">
          <circle cx={px(Math.min(X1, Math.max(X0, cur.x)))} cy={py(Math.min(Y1, Math.max(Y0, cur.y)))} r="11" fill="#ff6a1a" fillOpacity="0.18" />
          <circle cx={px(Math.min(X1, Math.max(X0, cur.x)))} cy={py(Math.min(Y1, Math.max(Y0, cur.y)))} r="5" fill="#ff6a1a" stroke="#fff" strokeWidth="1.6" />
        </g>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-soft">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-signal-500" />当前方案</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 border border-primary-600 bg-white" />实验档</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink" />真实机型（点一下叠到画布）</span>
      </div>
      {!rule.wl.adjustable && <p className="mt-1 text-[11px] text-ink-faint">{rule.zh}的横纵比由形状决定，这里只能上下拖动改桨径。</p>}
    </section>
  );
};

export default SpaceMap;
