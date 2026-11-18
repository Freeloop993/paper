// 布局几何的唯一来源。屏幕预览、相邻夹角、点线条件图、导出坐标和提示词的布局句
// 全部读取 computeLayout() 返回的同一组轴心，避免各处各算一遍。
import type { DroneParameters, FrameParameters } from '../types/DroneParameters.ts';

export type Task = 'quad' | 'hexa';
export const quadBladeCount: DroneParameters['propulsion']['prop_blade_count'] = '2叶';
export type FrameType = FrameParameters['frame_type'];

/** 依据类别：定义＝几何定义；experimental＝研究登记的实验档；designer＝缺厂商或图面依据，记为设计者输入。 */
export type Basis = 'definition' | 'experimental' | 'designer';

export type LayoutKey = 'quad' | 'tri' | 'flat_hex' | 'flat_octo' | 'coax_hex' | 'coax_octo';
export const taskLabels = {
  consumer_camera: '日常随行航拍',
  agricultural_spraying: '农业植保',
  neutral_design: '民用中性造型',
} as const;

export interface FrameRule {
  zh: string;
  en: string;
  hubs: 3 | 4 | 6 | 8;
  layers?: 2;
  topology?: Exclude<LayoutKey, 'quad'>;
  /** W/L 的缺省值与可调范围；adjustable=false 时由形状规则算出。 */
  wl: { value: number; min: number; max: number; adjustable: boolean };
  basis: Basis;
  rule: string;
  /** 给设计者看的一句话说明。 */
  desc: string;
  shape_en: string;
}

export const frameRules: Record<FrameType, FrameRule> = {
  'True X': {
    zh: '真 X 型', en: 'True X', hubs: 4, wl: { value: 1, min: 1, max: 1, adjustable: false }, basis: 'definition',
    rule: '四个轴心位于正方形四角，相邻夹角均为 90°，W/L 恒为 1.00（几何定义）。',
    desc: '四个电机在正方形的四个角上。',
    shape_en: 'the four motor centres sit at the corners of a square',
  },
  'Wide X': {
    zh: '宽 X 型', en: 'Wide X', hubs: 4, wl: { value: 1.3, min: 1.05, max: 1.6, adjustable: true }, basis: 'experimental',
    rule: '四个轴心位于横向较宽的矩形四角。缺省 W/L 取研究登记的宽档 1.30（实验探测档，不是行业标准）；改动后记为设计者输入。',
    desc: '左右比前后更宽；手册图面量过的 11 款消费航拍机都属于这一类。',
    shape_en: 'the four motor centres sit at the corners of a rectangle that is wider than it is long',
  },
  'Stretch X': {
    zh: '伸展 X 型', en: 'Stretch X', hubs: 4, wl: { value: 0.7, min: 0.6, max: 0.95, adjustable: true }, basis: 'experimental',
    rule: '四个轴心位于纵向较长的矩形四角。缺省 W/L 取研究登记的窄档 0.70（实验探测档）；改动后记为设计者输入。',
    desc: '前后比左右更长。',
    shape_en: 'the four motor centres sit at the corners of a rectangle that is longer than it is wide',
  },
  'H-Frame': {
    zh: 'H 型', en: 'H-frame', hubs: 4, wl: { value: 1, min: 0.6, max: 1.6, adjustable: true }, basis: 'designer',
    rule: '轴心位于矩形四角，机架为两条纵梁加一根横梁。连接拓扑取自早期构型图；W/L 没有厂商或图面依据，记为设计者输入。',
    desc: '两条纵梁加一根横梁，电机在四角。',
    shape_en: 'the four motor centres sit at the corners of a rectangle, joined by two fore-aft rails and one cross beam',
  },
  Deadcat: {
    zh: 'Deadcat 型', en: 'Deadcat', hubs: 4, wl: { value: 1.656, min: 1.656, max: 1.656, adjustable: false }, basis: 'designer',
    rule: '前两臂方位 ±65°、后两臂方位 ±145°，后臂长为前臂的 0.82。沿用桌面版布局函数的示意规则，缺厂商或图面依据，记为设计者输入。',
    desc: '前两臂向外张开、后两臂收拢且较短，让前方视野避开桨叶。',
    shape_en: 'the two front motors are swept wide apart and the two rear motors sit closer together on shorter arms',
  },
  '+ Configuration': {
    zh: '十字型', en: 'Plus (+)', hubs: 4, wl: { value: 1, min: 1, max: 1, adjustable: false }, basis: 'definition',
    rule: '四个轴心分别在机头、右、机尾、左方向，相邻夹角均为 90°（几何定义）。',
    desc: '电机分别在前、后、左、右。',
    shape_en: 'one motor at the nose, one at the tail and one on each side',
  },
  'Radial Tri': {
    zh: '平面三旋', en: 'Radial tri', topology: 'tri', hubs: 3,
    wl: { value: 2 / Math.sqrt(3), min: 2 / Math.sqrt(3), max: 2 / Math.sqrt(3), adjustable: false },
    basis: 'definition', rule: '三处单层轴位按 120° 均布；一臂朝后。尺度取最远两轴间距。',
    desc: '三个轴位，每处一副旋翼。', shape_en: 'three distinct horizontal axes in a triangular Y arrangement',
  },
  'Radial Octo': {
    zh: '平面八旋', en: 'Radial octo', topology: 'flat_octo', hubs: 8,
    wl: { value: 1, min: 1, max: 1, adjustable: false },
    basis: 'definition', rule: '八处单层轴位位于正八边形顶点。',
    desc: '八个独立轴位，每处一副旋翼。', shape_en: 'eight distinct horizontal axes at the corners of a regular octagon',
  },
  'Coax Y6': {
    zh: '共轴六旋 Y6', en: 'Coaxial Y6', topology: 'coax_hex', hubs: 3, layers: 2,
    wl: { value: 2 / Math.sqrt(3), min: 2 / Math.sqrt(3), max: 2 / Math.sqrt(3), adjustable: false },
    basis: 'definition', rule: '三处水平轴位，每处上下两层旋翼；一臂朝后。尺度取最远两轴间距。',
    desc: '三轴六旋，顶视下两层桨可能重合。', shape_en: 'three distinct horizontal axes in a triangular Y arrangement',
  },
  'Coax X8': {
    zh: '共轴八旋 X8', en: 'Coaxial X8', topology: 'coax_octo', hubs: 4, layers: 2,
    wl: { value: 1, min: 1, max: 1, adjustable: false },
    basis: 'definition', rule: '四处水平轴位分布在正方形四角，每处上下两层旋翼。',
    desc: '四轴八旋，顶视下两层桨可能重合。', shape_en: 'four distinct horizontal axes at the corners of a square',
  },
  'Radial Hex': {
    zh: '平面六旋', en: 'Radial hex', topology: 'flat_hex', hubs: 6, wl: { value: 1.1547, min: 1.1547, max: 1.1547, adjustable: false }, basis: 'definition',
    rule: '六个轴心位于正六边形顶点（几何定义）。',
    desc: '六个电机在正六边形的六个角上。',
    shape_en: 'six motor centres at the corners of a regular hexagon',
  },
};

export function layoutKey(frame: FrameType): LayoutKey {
  return frameRules[frame].topology ?? 'quad';
}

export function usesConsumerReferences(frame: FrameType, task = 'consumer_camera') {
  return layoutKey(frame) === 'quad' && task === 'consumer_camera';
}

/** 设计目标与顶视可见项分开。层数属于规格，在生成图中须另行判读。 */
export function topologyOf(frame: FrameType) {
  const rule = frameRules[frame];
  const layers = rule.layers ?? 1;
  return { layout_key: layoutKey(frame), axis_count: rule.hubs, layers_per_axis: layers,
    rotor_count: rule.hubs * layers, target_view: 'orthographic_top' as const,
    layer_visibility: layers === 2 ? '下层可能被遮挡，需同一方案的侧视或斜视判读。' : '顶视按水平轴位判读。' };
}

export const GUIDE_SIZE = 1024;
/** 条件图把对角轴距均值 D 归一到 600 px，与已登记的研究条件图（nominal_D_px = 600）同尺度。 */
export const GUIDE_D_PX = 600;

export interface Hub {
  id: string;
  role: string;
  role_zh: string;
  /** 机架中心为原点；x 向右为正，y 向机头为正。 */
  x_mm: number;
  y_mm: number;
  /** 1024 × 1024 条件图像素；原点在左上，y 向下，机头朝上。 */
  x_px: number;
  y_px: number;
  /** 从机头方向顺时针量到该轴心的方位角。 */
  bearing_deg: number;
}

export interface Layout {
  frame_type: FrameType;
  basis: Basis;
  rule: string;
  hubs: Hub[];
  /** 机架连接线，mm 与 px 各一份，端点顺序相同。 */
  links_mm: [number, number, number, number][];
  links_px: [number, number, number, number][];
  W_mm: number;
  L_mm: number;
  W_over_L: number;
  /** 对置（对角）电机中心距，逐条列出。 */
  opposite_mm: number[];
  D_mean_mm: number | null;
  reference_span_mm: number;
  D_opposite_max_mm: number | null;
  /** 任意两轴之间的最大距离。 */
  max_pair_mm: number;
  min_pair_mm: number;
  adjacent_deg: number[];
  r1_bearing_deg: number;
  prop_diameter_mm: number;
  d_over_reference_span: number;
  d_over_max_pair: number;
  /** 相邻桨盘之间的最小间隙；负值表示重叠。 */
  disk_gap_mm: number;
  body_width_over_D: number;
  body_length_over_width: number;
  guide: { size: number; px_per_mm: number; nose: 'up'; origin: 'top-left'; mm_origin: string; mm_axes: string };
  warnings: string[];
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (bearing: number, r: number) => ({ x: r * Math.sin(rad(bearing)), y: r * Math.cos(rad(bearing)) });

type UnitHub = { x: number; y: number; role: string; role_zh: string };

/** 未缩放的轴心形状；x 向右，y 向机头。四旋顺序为左前、右前、右后、左后（从 R1 起顺时针）。 */
export function unitHubs(frame: FrameType, wl: number): UnitHub[] {
  const quad = (pts: { x: number; y: number }[]): UnitHub[] => pts.map((p, i) => ({
    ...p, role: ['FL', 'FR', 'RR', 'RL'][i], role_zh: ['左前', '右前', '右后', '左后'][i],
  }));
  const rule = frameRules[frame];
  if (rule.topology) {
    const start = rule.hubs === 3 ? -60 : -180 / rule.hubs;
    return Array.from({ length: rule.hubs }, (_, i) => ({
      ...polar(start + i * 360 / rule.hubs, 1), role: 'M' + (i + 1), role_zh: '第 ' + (i + 1) + ' 轴',
    }));
  }
  if (frame === '+ Configuration')
    return [0, 90, 180, 270].map((b, i) => ({
      ...polar(b, 1), role: ['F', 'R', 'B', 'L'][i], role_zh: ['机头', '右', '机尾', '左'][i],
    }));
  if (frame === 'Deadcat')
    return quad([polar(-65, 1), polar(65, 1), polar(145, 0.82), polar(215, 0.82)]);
  const k = frame === 'True X' ? 1 : wl;
  return quad([{ x: -k, y: 1 }, { x: k, y: 1 }, { x: k, y: -1 }, { x: -k, y: -1 }]);
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

export function effectiveWl(frame: FrameParameters): number {
  const rule = frameRules[frame.frame_type];
  if (!rule.wl.adjustable) return rule.wl.value;
  const v = Number.isFinite(frame.span_ratio_wl) ? frame.span_ratio_wl : rule.wl.value;
  return Math.min(rule.wl.max, Math.max(rule.wl.min, v));
}

/** W/L 的来源：与规则缺省值一致时沿用规则依据，否则是设计者输入。 */
export function wlBasis(frame: FrameParameters): Basis {
  const rule = frameRules[frame.frame_type];
  if (!rule.wl.adjustable) return rule.basis;
  return Math.abs(effectiveWl(frame) - rule.wl.value) < 1e-9 ? rule.basis : 'designer';
}

export function computeLayout(parameters: DroneParameters): Layout {
  const { frame, propulsion, fuselage } = parameters;
  const rule = frameRules[frame.frame_type];
  const D = frame.wheelbase_mm;
  if (!Number.isFinite(D) || D <= 0) throw new Error('布局尺度须为正数。');
  const unit = unitHubs(frame.frame_type, effectiveWl(frame));
  const n = unit.length;
  const half = n % 2 === 0 ? n / 2 : 0;
  const unitOpposite = Array.from({ length: half }, (_, i) => dist(unit[i], unit[i + half]));
  const unitScale = half ? unitOpposite.reduce((sum, v) => sum + v, 0) / half
    : Math.max(...unit.flatMap((a, i) => unit.slice(i + 1).map(b => dist(a, b))));
  const scale = D / unitScale;
  const pxPerMm = GUIDE_D_PX / D;
  const c = GUIDE_SIZE / 2;
  const toPx = (x: number, y: number): [number, number] => [c + x * pxPerMm, c - y * pxPerMm];
  const hubs: Hub[] = unit.map((p, i) => {
    const x = p.x * scale, y = p.y * scale;
    const [x_px, y_px] = toPx(x, y);
    return {
      id: 'R' + (i + 1), role: p.role, role_zh: p.role_zh, x_mm: x, y_mm: y, x_px, y_px,
      bearing_deg: ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360,
    };
  });
  const pts = hubs.map(h => ({ x: h.x_mm, y: h.y_mm }));
  let links_mm: [number, number, number, number][] = pts.map(p => [0, 0, p.x, p.y]);
  if (frame.frame_type === 'H-Frame') {
    const [fl, fr, rr, rl] = pts;
    links_mm = [
      [fl.x, fl.y, rl.x, rl.y], [fr.x, fr.y, rr.x, rr.y],
      [(fl.x + rl.x) / 2, (fl.y + rl.y) / 2, (fr.x + rr.x) / 2, (fr.y + rr.y) / 2],
    ];
  }
  const links_px = links_mm.map(([x, y, u, v]) => [...toPx(x, y), ...toPx(u, v)] as [number, number, number, number]);
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const W = Math.max(...xs) - Math.min(...xs), L = Math.max(...ys) - Math.min(...ys);
  const opposite = Array.from({ length: half }, (_, i) => dist(pts[i], pts[i + half]));
  const pairs = pts.flatMap((a, i) => pts.slice(i + 1).map(b => dist(a, b)));
  const Dmean = half ? opposite.reduce((s, v) => s + v, 0) / half : null;
  const referenceSpan = Dmean ?? Math.max(...pairs);
  const d = propulsion.prop_diameter_inch * 25.4;
  const minPair = Math.min(...pairs), maxPair = Math.max(...pairs);
  const bearings = hubs.map(h => h.bearing_deg);
  const size = fuselage.fuselage_dimensions_mm;
  const warnings: string[] = [];
  if (minPair - d < 0)
    warnings.push(`相邻桨盘重叠 ${(d - minPair).toFixed(1)} mm：请减小桨径、加大对角轴距或调整 W/L。`);
  if (size.width > W && n === 4 && frame.frame_type !== '+ Configuration')
    warnings.push('机身宽度超过轴心横向跨度，机身会盖住电机位置。');
  return {
    frame_type: frame.frame_type, basis: wlBasis(frame), rule: rule.rule, hubs, links_mm, links_px,
    W_mm: W, L_mm: L, W_over_L: W / L, opposite_mm: opposite, D_mean_mm: Dmean, reference_span_mm: referenceSpan,
    D_opposite_max_mm: half ? Math.max(...opposite) : null, max_pair_mm: maxPair, min_pair_mm: minPair,
    adjacent_deg: bearings.map((b, i) => (bearings[(i + 1) % n] - b + 360) % 360),
    r1_bearing_deg: bearings[0], prop_diameter_mm: d, d_over_reference_span: d / referenceSpan, d_over_max_pair: d / maxPair,
    disk_gap_mm: minPair - d, body_width_over_D: size.width / referenceSpan, body_length_over_width: size.length / size.width,
    guide: {
      size: GUIDE_SIZE, px_per_mm: pxPerMm, nose: 'up', origin: 'top-left',
      mm_origin: '机架中心', mm_axes: 'x 向右为正，y 向机头为正',
    },
    warnings,
  };
}

/** 侧视沿机身纵向投影；上下桨的图示距离只用于辨认层数。 */
export function sideRotorAxes(layout: Layout, armThickness: number) {
  const nLayers = topologyOf(layout.frame_type).layers_per_axis;
  return layout.hubs.flatMap(hub =>
    Array.from({ length: nLayers }, (_, layer) => ({
      hub: hub.id, layer: layer + 1, x: -hub.y_mm,
      y: layer === 0 ? -6 : armThickness + 8,
    })));
}

/** 点线条件图：黑底、蓝色机架连接线、红色轴心点；图内不放文字、刻度或箭头。 */
export function drawGuide(canvas: HTMLCanvasElement, layout: Layout) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法绘制条件图。');
  const size = layout.guide.size;
  canvas.width = canvas.height = size;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#205cff';
  ctx.lineWidth = 3;
  for (const [x, y, u, v] of layout.links_px) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(u, v); ctx.stroke();
  }
  ctx.fillStyle = '#ff0000';
  for (const h of layout.hubs) {
    ctx.beginPath(); ctx.arc(h.x_px, h.y_px, 10, 0, Math.PI * 2); ctx.fill();
  }
}

const round = (v: number, digits: number) => Number(v.toFixed(digits));

/** 导出用的轴心与比例；屏幕读数也取自这里，保证数值一致。 */
export function layoutExport(layout: Layout) {
  return {
    frame_type: layout.frame_type,
    ...(layoutKey(layout.frame_type) === 'quad' ? {} : {
      topology: topologyOf(layout.frame_type), reference_span_mm: round(layout.reference_span_mm, 3),
      d_over_reference_span: round(layout.d_over_reference_span, 4), body_width_over_reference_span: round(layout.body_width_over_D, 4),
    }),
    geometry_rule: layout.rule,
    geometry_basis: layout.basis,
    hub_order: '从 R1 起顺时针',
    hubs: layout.hubs.map(h => ({
      id: h.id, role: h.role, role_zh: h.role_zh,
      x_mm: round(h.x_mm, 3), y_mm: round(h.y_mm, 3),
      x_px: round(h.x_px, 2), y_px: round(h.y_px, 2),
      bearing_deg: round(h.bearing_deg, 2),
    })),
    links_px: layout.links_px.map(l => l.map(v => round(v, 2))),
    W_mm: round(layout.W_mm, 3), L_mm: round(layout.L_mm, 3), W_over_L: round(layout.W_over_L, 4),
    opposite_motor_distances_mm: layout.opposite_mm.map(v => round(v, 3)),
    D_mean_mm: layout.D_mean_mm === null ? null : round(layout.D_mean_mm, 3),
    D_opposite_max_mm: layout.D_opposite_max_mm === null ? null : round(layout.D_opposite_max_mm, 3),
    max_pair_distance_mm: round(layout.max_pair_mm, 3),
    D_definition: layout.D_mean_mm === null ? '三轴位无对置轴。设计尺度取最远两轴心间距。' : '设计值 D = 对置（对角）电机中心距的均值；另列对置最大距与任意两轴最大距。',
    adjacent_deg: layout.adjacent_deg.map(v => round(v, 2)),
    r1_bearing_from_nose_deg: round(layout.r1_bearing_deg, 2),
    prop_diameter_mm: round(layout.prop_diameter_mm, 2),
    d_over_D_mean: layout.D_mean_mm === null ? null : round(layout.d_over_reference_span, 4),
    d_over_max_pair: round(layout.d_over_max_pair, 4),
    disk_gap_mm: round(layout.disk_gap_mm, 2),
    body_width_over_D_mean: layout.D_mean_mm === null ? null : round(layout.body_width_over_D, 4),
    body_length_over_width: round(layout.body_length_over_width, 4),
    guide: { ...layout.guide, px_per_mm: round(layout.guide.px_per_mm, 6), type: '点线图（轴心与机架连接）' },
    warnings: layout.warnings,
  };
}
