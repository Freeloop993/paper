// 预览：顶视示意、将要导出的点线条件图、侧视示意，以及四个关键比例。
// 轴心取自 computeLayout()，与导出的条件图、坐标和提示词布局句是同一组数。
import React, { useMemo, useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, type Layout } from '../../design/design';
import type { DroneParameters } from '../../types/DroneParameters';
import { Eye, EyeOff, GitCompareArrows, Undo2, X } from 'lucide-react';

/** 机身包络在顶视下的大致轮廓（仅示意）。坐标：x 向右，y 向下，机头在上。 */
function bodyPath(style: DroneParameters['fuselage']['fuselage_style'], w: number, l: number) {
  const hw = w / 2, hl = l / 2, m = Math.min(w, l);
  const chamfer = (c: number) => `M${-hw + c},${-hl} H${hw - c} L${hw},${-hl + c} V${hl - c} L${hw - c},${hl} H${-hw + c} L${-hw},${hl - c} V${-hl + c} Z`;
  const round = (r: number) => `M${-hw + r},${-hl} H${hw - r} A${r},${r} 0 0 1 ${hw},${-hl + r} V${hl - r} A${r},${r} 0 0 1 ${hw - r},${hl} H${-hw + r} A${r},${r} 0 0 1 ${-hw},${hl - r} V${-hl + r} A${r},${r} 0 0 1 ${-hw + r},${-hl} Z`;
  if (style === 'Aerodynamic Pod') return round(m * 0.48);
  if (style === 'Boxy Enclosure') return chamfer(m * 0.1);
  if (style === 'Faceted Compact') return chamfer(m * 0.28);
  return round(m * 0.08);
}

export const TopView: React.FC<{ parameters: DroneParameters; layout: Layout; ghost?: Layout | null; xray: boolean; className?: string }> = ({
  parameters, layout, ghost, xray, className = '',
}) => {
  const { frame, propulsion, fuselage, landing_gear: gear, accessories } = parameters;
  const armW = parseInt(frame.arm_width_mm, 10);
  const propR = layout.prop_diameter_mm / 2;
  const { length: bl, width: bw } = fuselage.fuselage_dimensions_mm;
  const half = Math.max(frame.wheelbase_mm * 0.56 + propR + 26, bl / 2 + 40);
  const fs = half / 17;
  const blades = parseInt(propulsion.prop_blade_count, 10);
  const styleOpen = fuselage.fuselage_style === '';
  const colour = accessories.drone_primary_color;
  const Y = (y: number) => -y; // mm 的 y 向机头为正；SVG 的 y 向下
  const xs = layout.hubs.map(h => h.x_mm), ys = layout.hubs.map(h => h.y_mm);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const dimY = Y(minY) + propR + fs * 0.9, dimX = maxX + propR + fs * 0.9;
  const camW = Math.max(14, bw * 0.34);
  const mount = accessories.camera_mount;
  return (
    <svg viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`} className={className} role="img"
      aria-label={`顶视布局示意：${frameRules[frame.frame_type].zh}，W/L ${layout.W_over_L.toFixed(2)}`}>
      <defs>
        <pattern id="open-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#fffbeb" /><line x1="0" y1="0" x2="0" y2="6" stroke="#fcd34d" strokeWidth="1.6" />
        </pattern>
        <pattern id="grid50" width="50" height="50" patternUnits="userSpaceOnUse" x="0" y="0">
          <path d="M50 0H0V50" fill="none" stroke="#e2e8f0" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect x={-half} y={-half} width={half * 2} height={half * 2} fill="#f8fafc" />
      <rect x={-half} y={-half} width={half * 2} height={half * 2} fill="url(#grid50)" />

      {/* 机头方向 */}
      <g fill="#0f172a">
        <path d={`M0,${-half + fs * 0.5} l${fs * 0.55},${fs * 0.9} h${-fs * 1.1} Z`} />
        <text x={fs * 0.9} y={-half + fs * 1.35} fontSize={fs * 0.85}>机头</text>
      </g>

      {/* 对照方案（虚线） */}
      {ghost && (
        <g data-layer="ghost" stroke="#f59e0b" fill="none" strokeDasharray={`${fs * 0.4} ${fs * 0.3}`} strokeWidth={fs * 0.12}>
          {ghost.links_mm.map(([x, y, u, v], i) => <line key={i} x1={x} y1={Y(y)} x2={u} y2={Y(v)} />)}
          {ghost.hubs.map(h => <circle key={h.id} cx={h.x_mm} cy={Y(h.y_mm)} r={fs * 0.42} />)}
        </g>
      )}

      {/* 起落架：顶视被机身遮挡，虚线标位置 */}
      {xray && gear.landing_gear_style !== '无独立起落架' && (
        <g data-layer="gear" stroke="#64748b" strokeWidth={fs * 0.1} strokeDasharray={`${fs * 0.3} ${fs * 0.25}`} fill="none">
          {gear.landing_gear_style === '低矮滑撬/支腿'
            ? [-1, 1].map(s => <line key={s} x1={s * bw * 0.32} y1={-bl * 0.36} x2={s * bw * 0.32} y2={bl * 0.36} />)
            : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => <circle key={i} cx={sx * (bw / 2 + 5)} cy={sy * bl * 0.3} r={fs * 0.28} />)}
        </g>
      )}

      {/* 机臂：线宽即机臂宽度（mm） */}
      <g data-layer="arms" stroke="#64748b" strokeLinecap="round" opacity="0.9">
        {layout.links_mm.map(([x, y, u, v], i) => <line key={i} x1={x} y1={Y(y)} x2={u} y2={Y(v)} strokeWidth={armW} />)}
      </g>

      {/* 机身包络 */}
      <g data-layer="body">
        <path d={bodyPath(fuselage.fuselage_style, bw, bl)} fill={colour || 'url(#open-hatch)'} fillOpacity={colour ? 0.92 : 1}
          stroke={styleOpen ? '#b45309' : '#0f172a'} strokeWidth={fs * 0.12} strokeDasharray={styleOpen ? `${fs * 0.45} ${fs * 0.3}` : undefined} />
        {fuselage.top_cover === 'two' && <path d={`M${-bw / 2},${-bl * 0.2} Q0,${-bl * 0.3} ${bw / 2},${-bl * 0.2}`} fill="none" stroke="#0f172a" strokeWidth={fs * 0.08} />}
        {fuselage.top_cover === 'multi' && [-0.22, 0.16].map(k => <line key={k} x1={-bw / 2} y1={bl * k} x2={bw / 2} y2={bl * k} stroke="#0f172a" strokeWidth={fs * 0.08} />)}
      </g>

      {/* 桨盘、桨叶与护圈 */}
      {layout.hubs.map(h => {
        const cx = h.x_mm, cy = Y(h.y_mm);
        const base = (Math.atan2(cy, cx) * 180) / Math.PI + 90;
        return (
          <g key={h.id} data-layer="prop">
            <circle cx={cx} cy={cy} r={propR} fill="#0ea5e9" fillOpacity="0.07" stroke="#0284c7" strokeWidth={fs * 0.07} strokeDasharray={`${fs * 0.25} ${fs * 0.2}`} />
            {propulsion.prop_guard === 'ring' && <circle cx={cx} cy={cy} r={propR + 4} fill="none" stroke="#334155" strokeWidth={3.2} />}
            {Array.from({ length: blades }, (_, i) => (
              <line key={i} x1={cx} y1={cy} x2={cx + propR} y2={cy} stroke="#1e293b" strokeWidth={Math.max(2, propR * 0.09)} strokeLinecap="round"
                transform={`rotate(${base + (360 / blades) * i} ${cx} ${cy})`} />
            ))}
          </g>
        );
      })}

      {/* 轴心：与点线条件图同一组坐标 */}
      {layout.hubs.map(h => {
        const cx = h.x_mm, cy = Y(h.y_mm), out = Math.hypot(cx, cy) || 1;
        return (
          <g key={h.id} data-layer="hub" data-hub={h.id}>
            <circle cx={cx} cy={cy} r={fs * 0.42} fill="#ef4444" stroke="#ffffff" strokeWidth={fs * 0.1} />
            <text x={cx + (cx / out) * (propR + fs * 0.9)} y={cy + (cy / out) * (propR + fs * 0.9) + fs * 0.3} fontSize={fs * 0.8} textAnchor="middle" fill="#334155">
              {h.id} {h.role_zh}
            </text>
          </g>
        );
      })}

      {/* 前视相机：朝机头前方，顶视可被遮挡 */}
      {accessories.has_camera_gimbal && (
        <g data-layer="camera" data-mount={mount || 'open'}>
          {mount === 'flush' && <rect x={-camW / 2} y={-bl / 2 + 1} width={camW} height={2.6} rx="1" fill="#0f172a" />}
          {mount === 'underslung' && <path d={`M${-camW / 2},${-bl / 2} q${camW / 2},${-7} ${camW},0 Z`} fill="#334155" />}
          {xray && (
            <rect x={-camW / 2} y={-bl / 2 + (mount === 'underslung' ? -2 : 2)} width={camW} height={Math.min(16, bl * 0.2)} rx="3" fill="none"
              stroke="#7c3aed" strokeWidth={fs * 0.1} strokeDasharray={`${fs * 0.28} ${fs * 0.22}`} />
          )}
          {mount === '' && xray && <text x={0} y={-bl / 2 + Math.min(16, bl * 0.2) * 0.5 + 2 + fs * 0.3} fontSize={fs * 0.8} textAnchor="middle" fill="#7c3aed">?</text>}
          <g stroke="#7c3aed" fill="#7c3aed" strokeWidth={fs * 0.1}>
            <line x1={0} y1={-bl / 2 - fs * 0.5} x2={0} y2={-bl / 2 - fs * 1.9} />
            <path d={`M0,${-bl / 2 - fs * 2.4} l${fs * 0.35},${fs * 0.6} h${-fs * 0.7} Z`} stroke="none" />
          </g>
          <text x={fs * 0.6} y={-bl / 2 - fs * 1.2} fontSize={fs * 0.72} fill="#6d28d9">相机朝前</text>
        </g>
      )}

      {/* W、L 尺寸线 */}
      <g data-layer="dims" stroke="#475569" strokeWidth={fs * 0.06} fill="#475569" fontSize={fs * 0.78}>
        <line x1={minX} y1={dimY} x2={maxX} y2={dimY} />
        <line x1={minX} y1={dimY - fs * 0.3} x2={minX} y2={dimY + fs * 0.3} /><line x1={maxX} y1={dimY - fs * 0.3} x2={maxX} y2={dimY + fs * 0.3} />
        <text x={(minX + maxX) / 2} y={dimY + fs * 1.05} textAnchor="middle" stroke="none">W {layout.W_mm.toFixed(1)} mm</text>
        {layout.L_mm > 0.5 && <>
          <line x1={dimX} y1={Y(maxY)} x2={dimX} y2={Y(minY)} />
          <line x1={dimX - fs * 0.3} y1={Y(maxY)} x2={dimX + fs * 0.3} y2={Y(maxY)} /><line x1={dimX - fs * 0.3} y1={Y(minY)} x2={dimX + fs * 0.3} y2={Y(minY)} />
          <text x={dimX + fs * 0.4} y={(Y(maxY) + Y(minY)) / 2} stroke="none" transform={`rotate(90 ${dimX + fs * 0.4} ${(Y(maxY) + Y(minY)) / 2})`} textAnchor="middle">L {layout.L_mm.toFixed(1)} mm</text>
        </>}
      </g>

      {/* 比例尺 */}
      <g stroke="#0f172a" strokeWidth={fs * 0.1} fill="#0f172a" fontSize={fs * 0.72}>
        <line x1={-half + fs} y1={half - fs} x2={-half + fs + 50} y2={half - fs} />
        <text x={-half + fs} y={half - fs * 1.4} stroke="none">50 mm</text>
      </g>
    </svg>
  );
};

/** 侧视示意：把顶视看不到的东西画出来——相机朝前的视线、机身高度、机臂厚度、起落架离地高度。 */
export const SideView: React.FC<{ parameters: DroneParameters; layout: Layout; className?: string }> = ({ parameters, layout, className = '' }) => {
  const { fuselage, landing_gear: gear, accessories, frame } = parameters;
  const { length: bl, height: bh } = fuselage.fuselage_dimensions_mm;
  const hasGear = gear.landing_gear_style !== '无独立起落架';
  const clear = hasGear ? gear.landing_gear_height_mm : 4;
  const armT = parseInt(frame.arm_thickness_mm, 10);
  const reach = Math.max(bl / 2, layout.L_mm / 2 + layout.prop_diameter_mm / 2);
  const left = -reach - 70, width = reach * 2 + 100, top = -(clear + bh + 44), height = clear + bh + 62;
  const fs = width / 21;
  const bodyTop = -(clear + bh), bodyBottom = -clear, nose = -bl / 2;
  const mount = accessories.camera_mount;
  const camY = mount === 'flush' ? bodyBottom - Math.min(12, bh * 0.45) : bodyBottom - 4;
  const camH = Math.min(12, bh * 0.45), camLen = 14;
  return (
    <svg viewBox={`${left} ${top} ${width} ${height}`} className={className} role="img" aria-label="侧视示意：相机朝机头前方，起落架在机身下方">
      <line x1={left} y1={0} x2={left + width} y2={0} stroke="#94a3b8" strokeWidth={fs * 0.1} />
      {/* 桨平面与机臂 */}
      <line x1={-reach} y1={bodyTop - 5} x2={reach} y2={bodyTop - 5} stroke="#0284c7" strokeWidth={fs * 0.1} strokeDasharray={`${fs * 0.4} ${fs * 0.3}`} />
      <rect x={-layout.L_mm / 2 - 4} y={bodyTop + 2} width={layout.L_mm + 8} height={armT} fill="#64748b" opacity="0.85" />
      {/* 机身包络 */}
      <rect x={nose} y={bodyTop} width={bl} height={bh} rx="4" fill={accessories.drone_primary_color || 'url(#open-hatch-side)'}
        stroke={fuselage.fuselage_style ? '#0f172a' : '#b45309'} strokeWidth={fs * 0.12} strokeDasharray={fuselage.fuselage_style ? undefined : `${fs * 0.45} ${fs * 0.3}`} />
      <defs>
        <pattern id="open-hatch-side" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#fffbeb" /><line x1="0" y1="0" x2="0" y2="6" stroke="#fcd34d" strokeWidth="1.6" />
        </pattern>
      </defs>
      {/* 起落架 */}
      {hasGear && (gear.landing_gear_style === '低矮滑撬/支腿'
        ? <path d={`M${-bl * 0.3},${bodyBottom} V${-1.5} H${bl * 0.3} V${bodyBottom}`} fill="none" stroke="#475569" strokeWidth={fs * 0.14} />
        : <path d={`M${-bl * 0.3},${bodyBottom} L${-bl * 0.42},0 M${bl * 0.3},${bodyBottom} L${bl * 0.42},0`} fill="none" stroke="#475569" strokeWidth={fs * 0.14} />)}
      {hasGear && <text x={bl * 0.42 + fs * 0.4} y={-clear / 2 + fs * 0.3} fontSize={fs * 0.8} fill="#475569">离地 {clear} mm</text>}
      {/* 相机与朝前视线 */}
      {accessories.has_camera_gimbal && (
        <g data-layer="side-camera">
          <rect x={mount === 'flush' ? nose + 1 : nose - 3} y={camY} width={camLen} height={camH} rx="2.5"
            fill={mount ? '#334155' : 'none'} stroke="#7c3aed" strokeWidth={fs * 0.12} strokeDasharray={mount ? undefined : `${fs * 0.3} ${fs * 0.22}`} />
          <path d={`M${nose - 3},${camY + camH / 2} L${nose - 52},${camY + camH / 2 - 14} M${nose - 3},${camY + camH / 2} L${nose - 52},${camY + camH / 2 + 14}`}
            stroke="#7c3aed" strokeWidth={fs * 0.08} fill="none" />
          <text x={nose - 56} y={camY + camH / 2 + fs * 0.3} fontSize={fs * 0.8} fill="#6d28d9" textAnchor="end">视线朝前</text>
        </g>
      )}
      <text x={left + fs * 0.4} y={top + fs * 1.1} fontSize={fs * 0.85} fill="#0f172a">← 机头</text>
      <text x={left + width - fs * 0.4} y={top + fs * 1.1} fontSize={fs * 0.8} fill="#64748b" textAnchor="end">侧视示意 · 高 {bh} mm</text>
    </svg>
  );
};

/** 点线条件图：与导出的 PNG 同一组像素坐标（黑底、蓝线、红点，不含文字）。 */
export const GuideView: React.FC<{ layout: Layout; className?: string }> = ({ layout, className = '' }) => (
  <svg viewBox={`0 0 ${layout.guide.size} ${layout.guide.size}`} className={className} role="img" aria-label="点线条件图：红点是电机轴心，蓝线是机架连接">
    <rect width={layout.guide.size} height={layout.guide.size} fill="#000000" />
    {layout.links_px.map(([x, y, u, v], i) => <line key={i} x1={x} y1={y} x2={u} y2={v} stroke="#205cff" strokeWidth="3" />)}
    {layout.hubs.map(h => <circle key={h.id} cx={h.x_px} cy={h.y_px} r="10" fill="#ff0000" data-guide-hub={h.id} />)}
  </svg>
);

const Ratio: React.FC<{ id: string; label: string; formula: string; value: string }> = ({ id, label, formula, value }) => (
  <div className="rounded-lg bg-slate-50 px-3 py-2" data-stat={id} title={formula}>
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-lg font-semibold tabular-nums leading-tight text-slate-900">{value}</div>
  </div>
);

type View = 'top' | 'guide' | 'side';
const views: { id: View; label: string }[] = [{ id: 'top', label: '顶视示意' }, { id: 'guide', label: '条件图' }, { id: 'side', label: '侧视' }];
const caption: Record<View, string> = {
  top: '红点是电机轴心；斜线虚框是机身大小（外形未指定时）；紫色虚线是被机鼻挡住的相机。',
  guide: '这就是随提示词一起导出的条件图：只有电机轴心和机架连接，不画机身外形。',
  side: '俯视看不到的都在这里：相机朝正前方，机身高度、机臂厚度和起落架离地高度。',
};

const InterfacePreview: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { parameters, pinned, pin, unpin, lastChange, undo, history } = useDroneStore();
  const [view, setView] = useState<View>('top');
  const [xray, setXray] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const ghost = useMemo(() => (pinned ? computeLayout(pinned.parameters) : null), [pinned]);
  const frame = frameRules[parameters.frame.frame_type];
  const canvas = compact ? 'mx-auto block h-[25vh] max-h-[240px] w-auto max-w-full rounded-lg border border-slate-200' : 'w-full rounded-lg border border-slate-200';

  return (
    <section className={compact ? 'rounded-xl border border-slate-200 bg-white p-3 shadow-sm' : 'card'} aria-label="预览" data-testid="preview">
      <div className="flex flex-wrap items-center gap-2">
        {!compact && <h2 className="text-lg font-semibold text-slate-900">预览</h2>}
        <div className="flex rounded-lg bg-slate-100 p-0.5" role="tablist" aria-label="预览视图">
          {views.map(v => (
            <button key={v.id} type="button" role="tab" aria-selected={view === v.id && !collapsed} data-view={v.id} onClick={() => { setView(v.id); setCollapsed(false); }}
              className={`rounded-md py-1 text-sm ${compact ? 'px-2.5' : 'px-3'} ${view === v.id && !collapsed ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{compact && v.id === 'top' ? '顶视' : v.label}</button>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-1">
          {view === 'top' && !collapsed && (
            <button type="button" onClick={() => setXray(v => !v)} aria-pressed={xray} title={xray ? '正在显示被遮挡的相机和起落架，点一下隐藏' : '显示被遮挡的相机和起落架'}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900">{xray ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
          )}
          <button type="button" onClick={() => (pinned ? unpin() : pin(frame.zh))} data-testid="compare-toggle"
            title="记下当前方案，再改参数时用橙色虚线叠在图上对比"
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm ${pinned ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <GitCompareArrows className="h-4 w-4" />{compact ? (pinned ? '结束' : '') : pinned ? '结束对比' : '对比'}
          </button>
          {compact && <button type="button" onClick={() => setCollapsed(v => !v)} aria-expanded={!collapsed} className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">{collapsed ? '展开' : '收起'}</button>}
        </span>
      </div>

      {!collapsed && (
        <div className={compact ? 'mt-2' : 'mt-3'}>
          {view === 'top' && <TopView parameters={parameters} layout={layout} ghost={ghost} xray={xray} className={canvas} />}
          {view === 'guide' && <GuideView layout={layout} className={canvas} />}
          {view === 'side' && <SideView parameters={parameters} layout={layout} className={`${canvas} bg-slate-50`} />}
          {!compact && <p className="mt-2 text-xs leading-relaxed text-slate-500">{caption[view]}</p>}
        </div>
      )}

      {compact ? (
        <p className="mt-2 flex flex-wrap gap-x-3 text-xs tabular-nums text-slate-600" data-testid="ratios">
          <span data-stat="wl">横纵比 <b className="font-semibold text-slate-900">{layout.W_over_L.toFixed(2)}</b></span>
          <span data-stat="dd">桨径÷轴距 <b className="font-semibold text-slate-900">{layout.d_over_D_mean.toFixed(2)}</b></span>
          <span data-stat="bw">机身宽÷轴距 <b className="font-semibold text-slate-900">{layout.body_width_over_D.toFixed(2)}</b></span>
          <span data-stat="blw">长÷宽 <b className="font-semibold text-slate-900">{layout.body_length_over_width.toFixed(2)}</b></span>
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="ratios">
          <Ratio id="wl" label="横纵比 W/L" formula="电机左右跨度 ÷ 前后跨度" value={layout.W_over_L.toFixed(2)} />
          <Ratio id="dd" label="桨径 ÷ 轴距" formula="桨径 ÷ 对角电机中心距的平均值" value={layout.d_over_D_mean.toFixed(2)} />
          <Ratio id="bw" label="机身宽 ÷ 轴距" formula="机身宽 ÷ 对角电机中心距的平均值" value={layout.body_width_over_D.toFixed(2)} />
          <Ratio id="blw" label="机身长 ÷ 宽" formula="机身长 ÷ 机身宽" value={layout.body_length_over_width.toFixed(2)} />
        </div>
      )}

      {pinned && ghost && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="compare-line">
          <span className="font-medium">对比（橙色虚线）</span>
          <span>{pinned.label} · W/L {ghost.W_over_L.toFixed(2)} · {ghost.W_mm.toFixed(0)} × {ghost.L_mm.toFixed(0)} mm</span>
          <span>→ 现在 {frame.zh} · W/L {layout.W_over_L.toFixed(2)} · {layout.W_mm.toFixed(0)} × {layout.L_mm.toFixed(0)} mm</span>
          <button type="button" onClick={unpin} aria-label="结束对比" className="ml-auto text-amber-700 hover:text-amber-950"><X className="h-3.5 w-3.5" /></button>
        </p>
      )}
      {layout.warnings.map(w => <p key={w} className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" role="alert">{w}</p>)}

      {lastChange && (
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500" data-testid="last-change">
          <span className="min-w-0 truncate">刚才：{lastChange.label} {lastChange.from} → <b className="font-medium text-slate-700">{lastChange.to}</b></span>
          <button type="button" onClick={undo} disabled={!history.length} className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <Undo2 className="h-3.5 w-3.5" />撤销
          </button>
        </p>
      )}
    </section>
  );
};

export default InterfacePreview;
