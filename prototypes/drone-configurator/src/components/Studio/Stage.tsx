// 画布：方案的实时顶视图。可以直接拖动电机轴心、机身边缘和桨盘边缘；点哪个部件，左侧就切到它的参数。
// 轴心取自 computeLayout()，与导出的条件图、坐标和提示词布局句是同一组数。
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, usesConsumerReferences, sideRotorAxes, type Layout } from '../../design/design';
import { cameraView } from '../../design/checks';
import { realRanges } from '../../data/aircraft';
import type { DroneParameters, ParameterGroup } from '../../types/DroneParameters';

const INK = '#0b1220', BLUE = '#1f62f0', SIGNAL = '#ff6a1a', VIOLET = '#7c3aed', AMBER = '#f59e0b';

/** 数值过渡：参数一变，图形在约四分之一秒内滑到新位置；拖动时不做过渡。 */
function useTween(target: number[], immediate: boolean, ms = 260) {
  const [value, setValue] = useState(target);
  const st = useRef({ from: target, to: target, start: 0, raf: 0, current: target });
  const key = target.map(v => v.toFixed(3)).join(',');
  useEffect(() => {
    const s = st.current;
    cancelAnimationFrame(s.raf);
    if (immediate || s.current.length !== target.length) { s.current = target; setValue(target); return; }
    s.from = s.current; s.to = target; s.start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - s.start) / ms), e = 1 - Math.pow(1 - t, 3);
      s.current = s.to.map((v, i) => s.from[i] + (v - s.from[i]) * e);
      setValue(s.current);
      if (t < 1) s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
    // 目标数组以 key 表示，内容不变时不重启过渡。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, immediate, ms]);
  return value.length === target.length ? value : target;
}

function bodyPath(style: DroneParameters['fuselage']['fuselage_style'], w: number, l: number) {
  const hw = w / 2, hl = l / 2, m = Math.min(w, l);
  const chamfer = (c: number) => `M${-hw + c},${-hl} H${hw - c} L${hw},${-hl + c} V${hl - c} L${hw - c},${hl} H${-hw + c} L${-hw},${hl - c} V${-hl + c} Z`;
  const round = (r: number) => `M${-hw + r},${-hl} H${hw - r} A${r},${r} 0 0 1 ${hw},${-hl + r} V${hl - r} A${r},${r} 0 0 1 ${hw - r},${hl} H${-hw + r} A${r},${r} 0 0 1 ${-hw},${hl - r} V${-hl + r} A${r},${r} 0 0 1 ${-hw + r},${-hl} Z`;
  if (style === 'Aerodynamic Pod') return round(m * 0.48);
  if (style === 'Boxy Enclosure') return chamfer(m * 0.1);
  if (style === 'Faceted Compact') return chamfer(m * 0.28);
  return round(m * 0.12);
}

type Drag = { kind: 'hub'; index: number; startD: number; startR: number } | { kind: 'bodyW' } | { kind: 'bodyL' } | { kind: 'prop'; index: number };
const snap = (v: number, marks: number[], tol: number) => marks.find(m => Math.abs(m - v) <= tol) ?? v;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const TopStage: React.FC<{
  active: ParameterGroup; onSelect: (g: ParameterGroup) => void; overlays: { dims: boolean; fov: boolean; hidden: boolean }; interactive?: boolean;
  previewWidth?: number;
  /** 画布上并排的其他方向：按给定规格静态显示，不读取当前草稿。 */
  source?: DroneParameters;
}> = ({ active, onSelect, overlays, interactive = true, previewWidth, source }) => {
  const store = useDroneStore();
  const { setMany, intent } = store;
  const parameters = source ?? store.parameters, pinned = source ? null : store.pinned;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  /** 拖动期间锁住画布比例，否则图一缩放，指针对应的毫米数跟着变，数值会越拖越大。 */
  const frozenHalf = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<ParameterGroup | null>(null);
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const ghost = useMemo(() => (pinned ? computeLayout(pinned.parameters) : null), [pinned]);
  const { frame, propulsion, fuselage, landing_gear: gear, accessories } = parameters;
  const size = fuselage.fuselage_dimensions_mm;
  const rule = frameRules[frame.frame_type];

  const targetHalf = Math.max(frame.wheelbase_mm * 0.56 + layout.prop_diameter_mm / 2 + 34, size.length / 2 + 60);
  const tw = useTween([...layout.hubs.flatMap(h => [h.x_mm, h.y_mm]), layout.prop_diameter_mm / 2, parseInt(frame.arm_width_mm, 10), size.length, size.width, frozenHalf.current ?? targetHalf], dragging);
  const n = layout.hubs.length;
  const hubs = layout.hubs.map((h, i) => ({ ...h, x: tw[i * 2], y: -tw[i * 2 + 1] }));
  const [propR, armW, bl, bw, half] = tw.slice(n * 2);
  const fs = half / 22;
  const lit = (g: ParameterGroup) => active === g || hover === g;
  const blades = parseInt(propulsion.prop_blade_count, 10);
  const colour = accessories.drone_primary_color;
  const styleOpen = fuselage.fuselage_style === '';
  const links: [number, number, number, number][] = frame.frame_type === 'H-Frame'
    ? [[hubs[0].x, hubs[0].y, hubs[3].x, hubs[3].y], [hubs[1].x, hubs[1].y, hubs[2].x, hubs[2].y], [hubs[0].x, 0, hubs[1].x, 0]]
    : hubs.map(h => [0, 0, h.x, h.y]);
  const cam = cameraView(parameters, layout);
  const mount = accessories.camera_mount;
  const camW = Math.max(14, bw * 0.34);
  const xs = hubs.map(h => h.x), ys = hubs.map(h => h.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);

  const toMm = (e: React.PointerEvent) => {
    const el = svg.current!;
    const pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse());
    return { x: p.x, y: -p.y };
  };
  const begin = (d: Drag, g: ParameterGroup) => (e: React.PointerEvent) => {
    if (!interactive) return;
    e.stopPropagation(); e.preventDefault();
    svg.current?.setPointerCapture(e.pointerId);
    frozenHalf.current = half; drag.current = d; setDragging(true); onSelect(g);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toMm(e);
    if (d.kind === 'hub') {
      const ax = Math.max(8, Math.abs(p.x)), ay = Math.max(8, Math.abs(p.y));
      if (frame.frame_type === 'True X' || rule.wl.adjustable) {
        const entries: [string, unknown][] = [['frame.wheelbase_mm', Math.round(clamp(2 * Math.hypot(ax, ay), 100, 500))]];
        if (rule.wl.adjustable) entries.push(['frame.span_ratio_wl', Number(snap(clamp(ax / ay, rule.wl.min, rule.wl.max), [0.7, 1, 1.3], 0.02).toFixed(2))]);
        setMany(entries, '拖动电机');
      } else {
        setMany([['frame.wheelbase_mm', Math.round(clamp((d.startD * Math.hypot(p.x, p.y)) / d.startR, 100, Math.max(usesConsumerReferences(frame.frame_type, intent.taskId) ? 500 : 2000, d.startD)))]], '拖动电机');
      }
    } else if (d.kind === 'bodyW') setMany([['fuselage.fuselage_dimensions_mm.width', clamp(Math.round((2 * Math.abs(p.x)) / 5) * 5, 30, 200)]], '拖动机身');
    else if (d.kind === 'bodyL') setMany([['fuselage.fuselage_dimensions_mm.length', clamp(Math.round((2 * Math.abs(p.y)) / 5) * 5, 50, 300)]], '拖动机身');
    else {
      const h = layout.hubs[d.index];
      setMany([['propulsion.prop_diameter_inch', Number(clamp((2 * Math.hypot(p.x - h.x_mm, p.y - h.y_mm)) / 25.4, 3, Math.max(usesConsumerReferences(frame.frame_type, intent.taskId) ? 10 : 30, parameters.propulsion.prop_diameter_inch)).toFixed(1))]], '拖动桨盘');
    }
  };
  const end = (e: React.PointerEvent) => { if (drag.current) { svg.current?.releasePointerCapture(e.pointerId); drag.current = null; frozenHalf.current = null; setDragging(false); } };
  const pick = (g: ParameterGroup) => ({ onPointerEnter: () => setHover(g), onPointerLeave: () => setHover(null), onClick: () => onSelect(g), style: { cursor: 'pointer' } as const });
  const handle = (x: number, y: number, d: Drag, g: ParameterGroup, cursor: string, key: string) => (
    <circle key={key} cx={x} cy={y} r={fs * 0.62} fill="#fff" stroke={BLUE} strokeWidth={fs * 0.16} style={{ cursor }} onPointerDown={begin(d, g)} data-handle={key} />
  );
  const wedge = (() => {
    const len = half * 0.62, a = (cam.half * Math.PI) / 180, y0 = -cam.apex.y;
    return `M0,${y0} L${-Math.sin(a) * len},${y0 - Math.cos(a) * len} A${len},${len} 0 0 1 ${Math.sin(a) * len},${y0 - Math.cos(a) * len} Z`;
  })();

  return (
    <svg ref={svg} viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`} className="h-full w-full touch-none select-none" role="img" data-testid={source ? 'top-view-static' : 'top-view'}
      aria-label={`顶视图：${rule.zh}，横纵比 ${layout.W_over_L.toFixed(2)}`} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <defs>
        <pattern id={`stage-hatch-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="#ffffff" /><line x1="0" y1="0" x2="0" y2="5" stroke="#cbd3df" strokeWidth="1.1" />
        </pattern>
        <radialGradient id={`stage-disc-${uid}`}><stop offset="0.55" stopColor={BLUE} stopOpacity="0.03" /><stop offset="1" stopColor={BLUE} stopOpacity="0.11" /></radialGradient>
        <linearGradient id={`stage-fov-${uid}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={VIOLET} stopOpacity="0.2" /><stop offset="1" stopColor={VIOLET} stopOpacity="0" /></linearGradient>
        <filter id={`stage-shadow-${uid}`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy={fs * 0.2} stdDeviation={fs * 0.35} floodColor={INK} floodOpacity="0.16" /></filter>
      </defs>

      {/* 机头方向 */}
      <g fill={INK}>
        <path d={`M0,${-half + fs * 0.7} l${fs * 0.5},${fs * 0.85} h${-fs} Z`} />
        <text x={fs * 0.9} y={-half + fs * 1.5} fontSize={fs * 0.72} className="font-mono" letterSpacing={fs * 0.06}>机头 FRONT</text>
      </g>

      {/* 对比方案（橙色虚线） */}
      {ghost && (
        <g data-layer="ghost" stroke={AMBER} fill="none" strokeDasharray={`${fs * 0.45} ${fs * 0.3}`} strokeWidth={fs * 0.13}>
          {ghost.links_mm.map(([x, y, u, v], i) => <line key={i} x1={x} y1={-y} x2={u} y2={-v} />)}
          {ghost.hubs.map(h => <circle key={h.id} cx={h.x_mm} cy={-h.y_mm} r={ghost.prop_diameter_mm / 2} strokeOpacity="0.55" />)}
          {ghost.hubs.map(h => <circle key={'c' + h.id} cx={h.x_mm} cy={-h.y_mm} r={fs * 0.4} fill={AMBER} stroke="none" />)}
        </g>
      )}

      {/* 相机视野（俯视近似） */}
      {overlays.fov && accessories.has_camera_gimbal && <path d={wedge} fill={`url(#stage-fov-${uid})`} data-layer="fov" pointerEvents="none" />}

      {/* 起落架：在机身下方，虚线标位置 */}
      {overlays.hidden && gear.landing_gear_style !== '无独立起落架' && (
        <g data-layer="gear" stroke={lit('landing_gear') ? BLUE : '#7c8aa0'} strokeWidth={fs * 0.1} strokeDasharray={`${fs * 0.3} ${fs * 0.25}`} fill="none" {...pick('landing_gear')}>
          {gear.landing_gear_style === '低矮滑撬/支腿'
            ? [-1, 1].map(s => <line key={s} x1={s * (bw / 2 + 6)} y1={-bl * 0.36} x2={s * (bw / 2 + 6)} y2={bl * 0.36} />)
            : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => <circle key={i} cx={sx * (bw / 2 + 7)} cy={sy * bl * 0.32} r={fs * 0.3} />)}
        </g>
      )}

      {/* 机臂：宽度即机臂宽度（mm） */}
      <g data-layer="arms" data-width={parseInt(frame.arm_width_mm, 10)} strokeLinecap="round" {...pick('frame')}>
        {links.map(([x, y, u, v], i) => <line key={i} x1={x} y1={y} x2={u} y2={v} stroke={lit('frame') ? '#5f7190' : '#8793a7'} strokeWidth={armW} />)}
        {links.map(([x, y, u, v], i) => <line key={'h' + i} x1={x} y1={y} x2={u} y2={v} stroke="#ffffff" strokeOpacity="0.35" strokeWidth={Math.max(1, armW * 0.28)} />)}
      </g>

      {/* 桨盘与桨叶 */}
      <g data-layer="props" {...pick('propulsion')}>
        {hubs.map((h, i) => {
          const base = (Math.atan2(h.y, h.x) * 180) / Math.PI + 90 + i * 17;
          const bladeW = Math.max(2.4, propR * 0.11);
          return (
            <g key={h.id}>
              <circle cx={h.x} cy={h.y} r={propR} fill={`url(#stage-disc-${uid})`} stroke={lit('propulsion') ? BLUE : '#a9bbdc'} strokeWidth={fs * 0.07} />
              {propulsion.prop_guard === 'ring' && <circle cx={h.x} cy={h.y} r={propR + 4} fill="none" stroke={INK} strokeOpacity="0.7" strokeWidth={3.2} />}
              {Array.from({ length: blades }, (_, k) => (
                <path key={k} d={`M0,0 Q${propR * 0.45},${-bladeW} ${propR},0 Q${propR * 0.45},${bladeW} 0,0 Z`} fill={INK} fillOpacity="0.86"
                  transform={`translate(${h.x} ${h.y}) rotate(${base + (360 / blades) * k})`} />
              ))}
            </g>
          );
        })}
      </g>

      {/* 机身包络 */}
      <g data-layer="body" filter={`url(#stage-shadow-${uid})`} {...pick('fuselage')}>
        <path d={bodyPath(fuselage.fuselage_style, bw, bl)} fill={colour || `url(#stage-hatch-${uid})`}
          stroke={lit('fuselage') ? BLUE : INK} strokeWidth={fs * 0.13} strokeDasharray={styleOpen ? `${fs * 0.5} ${fs * 0.32}` : undefined} />
      </g>
      <g pointerEvents="none" stroke={INK} strokeOpacity="0.7" fill="none" strokeWidth={fs * 0.08}>
        {fuselage.top_cover === 'two' && <path d={`M${-bw / 2},${-bl * 0.2} Q0,${-bl * 0.3} ${bw / 2},${-bl * 0.2}`} />}
        {fuselage.top_cover === 'multi' && [-0.22, 0.16].map(k => <line key={k} x1={-bw / 2} y1={bl * k} x2={bw / 2} y2={bl * k} />)}
      </g>

      {/* 前视相机：朝机头前方，俯视被机鼻遮挡 */}
      {accessories.has_camera_gimbal && (
        <g data-layer="camera" data-mount={mount || 'open'} {...pick('accessories')}>
          {mount === 'flush' && <rect x={-camW / 2} y={-bl / 2 + 1} width={camW} height={2.8} rx="1.2" fill={INK} />}
          {mount === 'underslung' && <path d={`M${-camW / 2},${-bl / 2} q${camW / 2},${-7.5} ${camW},0 Z`} fill="#3b4658" />}
          {overlays.hidden && (
            <rect x={-camW / 2} y={-bl / 2 + (mount === 'underslung' ? -2.5 : 2)} width={camW} height={Math.min(16, bl * 0.2)} rx="3.5" fill={VIOLET} fillOpacity="0.07"
              stroke={VIOLET} strokeWidth={fs * 0.1} strokeDasharray={`${fs * 0.28} ${fs * 0.22}`} />
          )}
          {overlays.hidden && <text x={0} y={-bl / 2 + Math.min(16, bl * 0.2) * 0.5 + 2 + fs * 0.26} fontSize={fs * 0.62} textAnchor="middle" fill={VIOLET} className="font-mono">{mount ? 'CAM' : 'CAM ?'}</text>}
        </g>
      )}

      {/* 电机轴心：与条件图同一组坐标；橙点可拖动 */}
      {hubs.map((h, i) => {
        const out = Math.hypot(h.x, h.y) || 1;
        return (
          <g key={h.id} data-layer="hub" data-hub={h.id} data-x={layout.hubs[i].x_mm} data-y={layout.hubs[i].y_mm}>
            <circle cx={h.x} cy={h.y} r={fs * 0.95} fill={SIGNAL} fillOpacity={lit('frame') ? 0.18 : 0} />
            <circle cx={h.x} cy={h.y} r={fs * 0.42} fill={SIGNAL} stroke="#fff" strokeWidth={fs * 0.12} />
            {overlays.dims && <text x={h.x + (h.x / out) * (propR + fs * 0.9)} y={h.y + (h.y / out) * (propR + fs * 0.9) + fs * 0.25} fontSize={fs * 0.66} textAnchor="middle" fill="#5b6472" className="font-mono">{h.id}</text>}
            {interactive && <circle cx={h.x} cy={h.y} r={fs * 1.3} fill="transparent" style={{ cursor: 'grab' }} data-handle={'hub-' + h.id}
              onPointerDown={begin({ kind: 'hub', index: i, startD: frame.wheelbase_mm, startR: Math.hypot(layout.hubs[i].x_mm, layout.hubs[i].y_mm) }, 'frame')} onPointerEnter={() => setHover('frame')} onPointerLeave={() => setHover(null)} />}
          </g>
        );
      })}

      {/* 拖动手柄：选中机身或动力时出现 */}
      {previewWidth !== undefined && (
        <path data-layer="width-preview" data-width-mm={previewWidth} pointerEvents="none"
          d={bodyPath(fuselage.fuselage_style, previewWidth, bl)} fill="#0d9488" fillOpacity="0.15"
          stroke="#0f766e" strokeWidth={fs * 0.19} strokeDasharray={`${fs * 0.55} ${fs * 0.26}`} />
      )}
      {interactive && lit('fuselage') && [handle(bw / 2, 0, { kind: 'bodyW' }, 'fuselage', 'ew-resize', 'body-width'), handle(0, bl / 2, { kind: 'bodyL' }, 'fuselage', 'ns-resize', 'body-length')]}
      {interactive && lit('propulsion') && (() => {
        const h = hubs[1], out = Math.hypot(h.x, h.y) || 1;
        return handle(h.x + (h.x / out) * propR, h.y + (h.y / out) * propR, { kind: 'prop', index: 1 }, 'propulsion', 'nwse-resize', 'prop-size');
      })()}

      {/* 尺寸标注 */}
      {overlays.dims && (
        <g data-layer="dims" pointerEvents="none" stroke="#7c8696" strokeWidth={fs * 0.05} fill="#5b6472" fontSize={fs * 0.66} className="font-mono">
          <line x1={minX} y1={maxY + propR + fs} x2={maxX} y2={maxY + propR + fs} />
          <line x1={minX} y1={maxY + propR + fs * 0.7} x2={minX} y2={maxY + propR + fs * 1.3} /><line x1={maxX} y1={maxY + propR + fs * 0.7} x2={maxX} y2={maxY + propR + fs * 1.3} />
          <text x={(minX + maxX) / 2} y={maxY + propR + fs * 2} textAnchor="middle" stroke="none">W {layout.W_mm.toFixed(0)}</text>
          {layout.L_mm > 0.5 && <>
            <line x1={maxX + propR + fs} y1={minY} x2={maxX + propR + fs} y2={maxY} />
            <line x1={maxX + propR + fs * 0.7} y1={minY} x2={maxX + propR + fs * 1.3} y2={minY} /><line x1={maxX + propR + fs * 0.7} y1={maxY} x2={maxX + propR + fs * 1.3} y2={maxY} />
            <text x={maxX + propR + fs * 1.5} y={(minY + maxY) / 2 + fs * 0.25} stroke="none">L {layout.L_mm.toFixed(0)}</text>
          </>}
          <line x1={-half + fs} y1={half - fs} x2={-half + fs + 50} y2={half - fs} stroke={INK} strokeWidth={fs * 0.09} />
          <text x={-half + fs} y={half - fs * 1.4} stroke="none" fill={INK}>50 mm</text>
        </g>
      )}
    </svg>
  );
};

/** 点线条件图：与导出的 PNG 同一组像素坐标（黑底、蓝线、红点，不含文字）。 */
export const GuideView: React.FC<{ layout: Layout; className?: string }> = ({ layout, className = '' }) => (
  <svg viewBox={`0 0 ${layout.guide.size} ${layout.guide.size}`} className={className} role="img" aria-label="点线条件图：红点是电机轴心，蓝线是机架连接" data-testid="guide-view">
    <rect width={layout.guide.size} height={layout.guide.size} fill="#000000" />
    {layout.links_px.map(([x, y, u, v], i) => <line key={i} x1={x} y1={y} x2={u} y2={v} stroke="#205cff" strokeWidth="3" />)}
    {layout.hubs.map(h => <circle key={h.id} cx={h.x_px} cy={h.y_px} r="10" fill="#ff0000" data-guide-hub={h.id} />)}
  </svg>
);

/** 侧视：俯视看不到的都在这里——相机朝前的视线、机身高度、机臂厚度和起落架离地高度。 */
export const SideView: React.FC<{ parameters: DroneParameters; layout: Layout; className?: string }> = ({ parameters, layout, className = '' }) => {
  const { fuselage, landing_gear: gear, accessories, frame } = parameters;
  const { length: bl, height: bh } = fuselage.fuselage_dimensions_mm;
  const hasGear = gear.landing_gear_style !== '无独立起落架';
  const clear = hasGear ? gear.landing_gear_height_mm : 5;
  const armT = parseInt(frame.arm_thickness_mm, 10);
  const reach = Math.max(bl / 2, Math.max(...layout.hubs.map(h => Math.abs(h.y_mm))) + layout.prop_diameter_mm / 2);
  const left = -reach - 90, width = reach * 2 + 130;
  const top = -(clear + bh + 70), height = clear + bh + 110;
  const fs = width / 34;
  const bodyTop = -(clear + bh), bodyBottom = -clear, nose = -bl / 2;
  const mount = accessories.camera_mount;
  const camH = Math.min(13, bh * 0.45), camLen = 15;
  const camY = mount === 'flush' ? bodyBottom - camH - 1 : bodyBottom - 4;
  const colour = accessories.drone_primary_color;
  return (
    <svg viewBox={`${left} ${top} ${width} ${height}`} className={className} role="img" aria-label="侧视：相机朝机头前方，起落架在机身下方" data-testid="side-view">
      <defs>
        <pattern id="side-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="#ffffff" /><line x1="0" y1="0" x2="0" y2="5" stroke="#cbd3df" strokeWidth="1.1" />
        </pattern>
        <linearGradient id="side-fov" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor={VIOLET} stopOpacity="0.22" /><stop offset="1" stopColor={VIOLET} stopOpacity="0" /></linearGradient>
      </defs>
      <line x1={left} y1={0} x2={left + width} y2={0} stroke="#c3cad6" strokeWidth={fs * 0.1} />
      <text x={left + width - fs * 0.5} y={fs * 1.1} fontSize={fs * 0.7} fill="#98a1ae" textAnchor="end" className="font-mono">地面 GROUND</text>
      {/* 桨平面 */}
      {sideRotorAxes(layout, armT).map(a => <g key={a.hub + '/' + a.layer} data-side-hub={a.hub} data-side-layer={a.layer}>
        <line x1={a.x - layout.prop_diameter_mm / 2} y1={bodyTop + a.y} x2={a.x + layout.prop_diameter_mm / 2} y2={bodyTop + a.y}
          stroke={a.layer === 1 ? INK : BLUE} strokeOpacity="0.8" strokeWidth={fs * 0.16} strokeLinecap="round" />
        <line x1={a.x} x2={a.x} y1={bodyTop + a.y} y2={bodyTop + 2 + armT / 2} stroke="#8793a7" strokeWidth={fs * 0.28}/>
      </g>)}
      <rect x={-Math.max(...layout.hubs.map(h => h.y_mm)) - 3} y={bodyTop + 2} width={layout.L_mm + 6} height={armT} rx={armT / 2} fill="#8793a7" />
      {/* 相机视线 */}
      {accessories.has_camera_gimbal && <path d={`M${nose - 3},${camY + camH / 2} L${nose - 84},${camY + camH / 2 - 24} L${nose - 84},${camY + camH / 2 + 24} Z`} fill="url(#side-fov)" />}
      {/* 机身 */}
      <rect x={nose} y={bodyTop} width={bl} height={bh} rx="5" fill={colour || 'url(#side-hatch)'} stroke={INK} strokeWidth={fs * 0.13} strokeDasharray={fuselage.fuselage_style ? undefined : `${fs * 0.5} ${fs * 0.32}`} />
      {hasGear && (gear.landing_gear_style === '低矮滑撬/支腿'
        ? <path d={`M${-bl * 0.3},${bodyBottom} V${-1.5} H${bl * 0.3} V${bodyBottom}`} fill="none" stroke="#4a5568" strokeWidth={fs * 0.16} strokeLinejoin="round" />
        : <path d={`M${-bl * 0.3},${bodyBottom} L${-bl * 0.44},0 M${bl * 0.3},${bodyBottom} L${bl * 0.44},0`} fill="none" stroke="#4a5568" strokeWidth={fs * 0.16} strokeLinecap="round" />)}
      {accessories.has_camera_gimbal && (
        <g data-layer="side-camera">
          <rect x={mount === 'flush' ? nose + 1 : nose - 4} y={camY} width={camLen} height={camH} rx="3" fill={mount ? '#3b4658' : '#fff'} stroke={VIOLET} strokeWidth={fs * 0.12} strokeDasharray={mount ? undefined : `${fs * 0.3} ${fs * 0.22}`} />
          <text x={nose - 88} y={camY + camH / 2 + fs * 0.25} fontSize={fs * 0.78} fill={VIOLET} textAnchor="end">相机朝前</text>
        </g>
      )}
      {/* 标注 */}
      <g fontSize={fs * 0.72} fill="#5b6472" className="font-mono" stroke="#7c8696" strokeWidth={fs * 0.05}>
        <line x1={bl / 2 + 10} y1={bodyTop} x2={bl / 2 + 10} y2={bodyBottom} />
        <text x={bl / 2 + 14} y={(bodyTop + bodyBottom) / 2 + fs * 0.25} stroke="none">高 {bh}</text>
        {hasGear && <><line x1={bl / 2 + 10} y1={bodyBottom} x2={bl / 2 + 10} y2={0} strokeDasharray={`${fs * 0.2} ${fs * 0.2}`} /><text x={bl / 2 + 14} y={-clear / 2 + fs * 0.25} stroke="none">离地 {clear}</text></>}
      </g>
      <text x={left + fs * 0.5} y={top + fs * 1.2} fontSize={fs * 0.72} fill={INK} className="font-mono" letterSpacing={fs * 0.06}>← 机头 FRONT</text>
    </svg>
  );
};

/** 画布下方的四个比例：数值旁的细条标出真实机型所在的范围。 */
export const RatioHud: React.FC<{ layout: Layout; compact?: boolean }> = ({ layout, compact }) => {
  const { intent } = useDroneStore();
  const consumer = usesConsumerReferences(layout.frame_type, intent.taskId);
  const items = [
    { id: 'wl', label: '横纵比', sub: 'W/L', value: layout.W_over_L, lo: 0.6, hi: 1.7, real: consumer ? realRanges.wl : null },
    { id: 'dd', label: '桨径 ÷ 轴距', sub: 'd/D', value: layout.d_over_reference_span, lo: 0.3, hi: 0.75, real: consumer ? realRanges.dd : null },
    { id: 'bw', label: '机身宽 ÷ 轴距', sub: '', value: layout.body_width_over_D, lo: 0.1, hi: 0.6, real: consumer ? realRanges.bodyWidth : null },
    { id: 'blw', label: '机身长 ÷ 宽', sub: '', value: layout.body_length_over_width, lo: 0.5, hi: 3, real: null },
  ];
  const pct = (v: number, lo: number, hi: number) => clamp(((v - lo) / (hi - lo)) * 100, 0, 100);
  return (
    <div className={`grid grid-cols-4 divide-x divide-line ${compact ? '' : 'rounded-2xl border border-line bg-white/90 shadow-panel backdrop-blur'}`} data-testid="ratios">
      {items.map(it => (
        <div key={it.id} className={compact ? 'px-2 py-1' : 'px-4 py-2.5'} data-stat={it.id} title={it.real ? `灰条：量过的 ${it.real.n} 款真实机型的范围 ${it.real.min.toFixed(2)}–${it.real.max.toFixed(2)}` : undefined}>
          <div className="flex items-baseline justify-between gap-2">
            <span className={`whitespace-nowrap text-ink-soft ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{it.label}</span>
            {!compact && it.sub && <span className="eyebrow">{it.sub}</span>}
          </div>
          <div className={`num font-semibold leading-tight text-ink ${compact ? 'text-base' : 'text-xl'}`} data-value>{it.value.toFixed(2)}</div>
          <div className="relative mt-1 h-1 rounded-full bg-line">
            {it.real && <span className="absolute inset-y-0 rounded-full bg-ink/25" style={{ left: pct(it.real.min, it.lo, it.hi) + '%', width: pct(it.real.max, it.lo, it.hi) - pct(it.real.min, it.lo, it.hi) + '%' }} />}
            <span className="absolute -top-1 h-3 w-0.5 -translate-x-1/2 rounded bg-signal-500" style={{ left: pct(it.value, it.lo, it.hi) + '%' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

