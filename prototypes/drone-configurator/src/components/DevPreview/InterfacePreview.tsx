// 参数示意：顶视布局图 + 侧视示意 + 读数 + “刚才的改动”。
// 顶视图里的轴心取自 computeLayout()，与导出的点线图、坐标和提示词布局句是同一组数。
import React, { useMemo, useState } from 'react';
import { useDroneStore, type Snapshot } from '../../store/droneStore';
import { computeLayout, frameRules, wlBasis, type Layout } from '../../design/design';
import { fieldByPath } from '../../design/fields';
import { compilePrompt, diffSentences } from '../../design/partPrompt';
import type { DroneParameters } from '../../types/DroneParameters';
import { Eye, EyeOff, Pin, PinOff, Undo2 } from 'lucide-react';

const basisLabel = { definition: '几何定义', experimental: '实验档位', designer: '设计者输入' } as const;

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
      <rect x={nose} y={bodyTop} width={bl} height={bh} rx="4" fill="url(#open-hatch-side)" stroke="#b45309" strokeWidth={fs * 0.12} strokeDasharray={`${fs * 0.45} ${fs * 0.3}`} />
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

const Stat: React.FC<{ label: string; value: string; note?: string; id?: string }> = ({ label, value, note, id }) => (
  <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5" data-stat={id}>
    <div className="text-[11px] leading-tight text-slate-500">{label}</div>
    <div className="text-sm font-semibold tabular-nums leading-tight text-slate-900">{value}</div>
    {note && <div className="text-[10px] leading-tight text-slate-500">{note}</div>}
  </div>
);

export const Readouts: React.FC<{ layout: Layout; parameters: DroneParameters }> = ({ layout, parameters }) => (
  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" data-testid="readouts">
    <Stat id="wl" label="W/L 横纵跨度比" value={layout.W_over_L.toFixed(2)} note={basisLabel[wlBasis(parameters.frame)]} />
    <Stat id="d" label="D 对角距均值" value={layout.D_mean_mm.toFixed(1) + ' mm'} note={`最大两轴距 ${layout.max_pair_mm.toFixed(1)}`} />
    <Stat id="angles" label="相邻夹角" value={layout.adjacent_deg.map(a => a.toFixed(0) + '°').join(' ')} note="R1 起顺时针" />
    <Stat id="dd" label="d/D 桨径比" value={layout.d_over_D_mean.toFixed(2)} note={`桨盘间隙 ${layout.disk_gap_mm.toFixed(0)} mm`} />
    <>
      <Stat id="w" label="W 横向跨度" value={layout.W_mm.toFixed(1) + ' mm'} />
      <Stat id="l" label="L 纵向跨度" value={layout.L_mm.toFixed(1) + ' mm'} />
      <Stat id="bw" label="机身宽/D" value={layout.body_width_over_D.toFixed(3)} note="待检验的紧凑代理量" />
      <Stat id="blw" label="机身长/宽" value={layout.body_length_over_width.toFixed(2)} />
    </>
  </div>
);

const layerNote = { top: '示意图已更新', text: '示意图不画这一项，只进文字', occluded: '顶视被遮挡，看侧视示意' } as const;

/** “刚才的改动”：同时说明图、文字和导出字段各自怎样变了。 */
export const ChangeBanner: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { lastChange, parameters, touched, intent, undo, history } = useDroneStore();
  const diff = useMemo(() => {
    if (!lastChange) return null;
    const b = lastChange.before;
    const before = compilePrompt(b.parameters, b.touched, b.intent, computeLayout(b.parameters)).sentences;
    const after = compilePrompt(parameters, touched, intent, computeLayout(parameters)).sentences;
    return { ...diffSentences(before, after), after };
  }, [lastChange, parameters, touched, intent]);
  if (!lastChange || !diff)
    return <p className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500" data-testid="change-banner">改动任一选项后，这里会说明图、文字和导出各自怎样变化。</p>;
  const path = lastChange.path.split('#')[0];
  const def = fieldByPath[path];
  const isIntent = path.startsWith('intent.');
  const n = (id: string) => diff.after.findIndex(s => s.id === id) + 1;
  const textChanges = diff.changed.length + diff.added.length + diff.removed.length;
  return (
    <div className="rounded-md border border-primary-500 bg-primary-50 px-3 py-2 text-xs text-slate-700" data-testid="change-banner">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold text-primary-700">刚才的改动</span>
        <span className="font-medium text-slate-900">{lastChange.label}：{lastChange.from} → {lastChange.to}</span>
        <button type="button" onClick={undo} disabled={!history.length} className="ml-auto inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-slate-700 hover:border-primary-500">
          <Undo2 className="h-3 w-3" />撤销
        </button>
      </div>
      {!compact && (
        <ul className="mt-1.5 space-y-1">
          <li><b className="font-medium">图：</b>{isIntent ? '不改变示意图，也不改任何参数' : def ? layerNote[def.visibility] : '—'}</li>
          <li>
            <b className="font-medium">文字：</b>
            {textChanges === 0 ? '提示词没有变化' : (
              <span>
                {diff.changed.map(c => <span key={c.id} className="block">第 {n(c.id)} 句改写：<del className="text-slate-500">{c.before}</del> → <ins className="bg-yellow-100 no-underline">{c.after}</ins></span>)}
                {diff.added.map(id => <span key={id} className="block">新增第 {n(id)} 句：<ins className="bg-emerald-100 no-underline">{diff.after[n(id) - 1].text}</ins></span>)}
                {diff.removed.map(r => <span key={r.id} className="block">删去一句：<del className="text-slate-500">{r.before}</del></span>)}
              </span>
            )}
          </li>
          <li><b className="font-medium">导出字段：</b><code className="rounded bg-white px-1">{isIntent ? path.replace(/\.(compact|simple|integrated|visible)$/, '') : 'parameters.' + path}</code></li>
        </ul>
      )}
      {compact && <p className="mt-0.5">{isIntent ? '参数未变。' : ''}{textChanges === 0 ? '提示词没有变化。' : `提示词有 ${textChanges} 句变化，见下方「发给模型的文字」。`}</p>}
    </div>
  );
};

const legend = (ghostLabel?: string) => (
  <ul className="space-y-1 text-[11px] leading-snug text-slate-500">
    <li><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500 align-middle" />红点＝电机轴心，与导出的点线图和坐标是同一组数</li>
    <li><span className="mr-1 inline-block h-2 w-3 border border-dashed border-amber-600 bg-amber-50 align-middle" />斜线虚框＝机身包络，外形留白；选了轮廓才换成实线</li>
    <li><span className="mr-1 inline-block h-2 w-3 border border-dashed border-violet-600 align-middle" />紫色虚线＝顶视被遮挡的相机；镜头朝前，不画在机背上</li>
    <li><span className="mr-1 inline-block h-2 w-3 border border-dashed border-slate-500 align-middle" />灰色虚线＝机身下方的起落架位置</li>
    {ghostLabel && <li><span className="mr-1 inline-block h-2 w-3 border border-dashed border-amber-500 align-middle" />橙色虚线＝对照方案「{ghostLabel}」的轴心</li>}
  </ul>
);

const InterfacePreview: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { parameters, pinned, pin, unpin } = useDroneStore();
  const [xray, setXray] = useState(true);
  const [view, setView] = useState<'top' | 'side'>('top');
  const [collapsed, setCollapsed] = useState(false);
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const ghost = useMemo(() => (pinned ? computeLayout((pinned as Snapshot).parameters) : null), [pinned]);
  const togglePin = () => (pinned ? unpin() : pin(frameRules[parameters.frame.frame_type].zh));
  const warnings = layout.warnings.map(w => <p key={w} className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800" role="alert">{w}</p>);

  if (compact)
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="参数示意" data-testid="preview">
        <div className="flex items-center gap-1 text-xs">
          {(['top', 'side'] as const).map(v => (
            <button key={v} type="button" onClick={() => { setView(v); setCollapsed(false); }} aria-pressed={view === v && !collapsed}
              className={`rounded px-2 py-1 ${view === v && !collapsed ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-600'}`}>{v === 'top' ? '顶视' : '侧视'}</button>
          ))}
          <span className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setXray(v => !v)} aria-pressed={xray} aria-label={xray ? '显示被遮挡部件' : '只看顶视可见'} title={xray ? '显示被遮挡部件' : '只看顶视可见'}
              className="rounded border border-slate-300 p-1 text-slate-700">{xray ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
            <button type="button" onClick={togglePin} className={`inline-flex items-center gap-1 rounded border px-1.5 py-1 ${pinned ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-300 text-slate-700'}`}>
              {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}{pinned ? '取消对照' : '记为对照'}
            </button>
            <button type="button" onClick={() => setCollapsed(v => !v)} aria-expanded={!collapsed} className="rounded border border-slate-300 px-1.5 py-1 text-slate-700">{collapsed ? '展开图' : '收起图'}</button>
          </span>
        </div>
        {!collapsed && (view === 'top'
          ? <TopView parameters={parameters} layout={layout} ghost={ghost} xray={xray} className="mx-auto mt-1.5 block h-[27vh] max-h-[260px] w-auto max-w-full rounded-lg border border-slate-200" />
          : <SideView parameters={parameters} layout={layout} className="mt-1.5 block max-h-[27vh] w-full rounded-lg border border-slate-200 bg-slate-50" />)}
        <p className="mt-1.5 flex flex-wrap gap-x-2 text-xs tabular-nums text-slate-700" data-testid="readouts">
          <span>W/L <b className="font-semibold">{layout.W_over_L.toFixed(2)}</b></span>
          <span>D <b className="font-semibold">{layout.D_mean_mm.toFixed(0)}</b> mm</span>
          <span>夹角 <b className="font-semibold">{layout.adjacent_deg.map(a => a.toFixed(0)).join('·')}</b>°</span>
          <span>d/D <b className="font-semibold">{layout.d_over_D_mean.toFixed(2)}</b></span>
          <span>机身宽/D <b className="font-semibold">{layout.body_width_over_D.toFixed(2)}</b></span>
        </p>
        {warnings}
        <div className="mt-1.5"><ChangeBanner compact /></div>
      </section>
    );

  return (
    <section className="card !p-3 sm:!p-4" aria-label="参数示意" data-testid="preview">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-slate-900">顶视布局示意</h2>
        <span className="text-xs text-slate-500">{frameRules[parameters.frame.frame_type].zh} · 机头朝上 · 按毫米等比例</span>
        <span className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => setXray(v => !v)} aria-pressed={xray}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-primary-500">
            {xray ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{xray ? '显示被遮挡部件' : '只看顶视可见'}
          </button>
          <button type="button" onClick={togglePin} title="把当前方案记为对照，再改参数即可并排比较" data-testid="pin"
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${pinned ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-300 text-slate-700 hover:border-primary-500'}`}>
            {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}{pinned ? '取消对照' : '记为对照'}
          </button>
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-3">
        <TopView parameters={parameters} layout={layout} ghost={ghost} xray={xray} className="w-full rounded-lg border border-slate-200" />
        <div className="flex min-w-0 flex-col gap-2">
          <SideView parameters={parameters} layout={layout} className="w-full rounded-lg border border-slate-200 bg-slate-50" />
          {legend(ghost ? pinned?.label : undefined)}
        </div>
      </div>
      <div className="mt-2"><Readouts layout={layout} parameters={parameters} /></div>
      {warnings}
      <div className="mt-2"><ChangeBanner /></div>
    </section>
  );
};

export default InterfacePreview;
