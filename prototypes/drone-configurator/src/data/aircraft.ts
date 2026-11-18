import type { DroneParameters } from '../types/DroneParameters.ts';

// 参考机型：仓库里已核的官方规格（A1）与手册图面量测（A2）。只收有出处的数值，缺的留空。
// 轴距、桨径、重量为厂商公布值；W/L、机身宽 ÷ 轴距为手册顶视图上的量测值；d/D 由公布的桨径 ÷ 轴距算出。
export interface Aircraft {
  id: string;
  name: string;
  maker: string;
  weight_g: number;
  /** 厂商公布的对角轴距（mm）。 */
  wheelbase_mm?: number;
  /** 厂商公布或标称的桨径（mm）。 */
  prop_mm?: number;
  /** 手册顶视图量测：电机左右跨度 ÷ 前后跨度。 */
  wl?: number;
  /** 手册顶视图量测：机身宽 ÷ 对角轴距均值。 */
  body_width_over_d?: number;
  /** 手册图面量测的桨径 ÷ 轴距（仅个别机型）。 */
  dd_drawing?: number;
  note?: string;
}

export const aircraft: Aircraft[] = [
  { id: 'mini3pro', name: 'Mini 3 Pro', maker: 'DJI', weight_g: 249, wheelbase_mm: 247, prop_mm: 152.4, wl: 1.516 },
  { id: 'mini4pro', name: 'Mini 4 Pro', maker: 'DJI', weight_g: 249, wl: 1.485 },
  { id: 'nano', name: 'EVO Nano+', maker: 'Autel', weight_g: 249, wheelbase_mm: 231, prop_mm: 126, wl: 1.472 },
  { id: 'mavicmini', name: 'Mavic Mini', maker: 'DJI', weight_g: 249, wheelbase_mm: 213, wl: 1.407 },
  { id: 'neo2', name: 'Neo 2', maker: 'DJI', weight_g: 151, wl: 1.52, body_width_over_d: 0.325, note: '一体护圈' },
  { id: 'neo', name: 'Neo', maker: 'DJI', weight_g: 135, wl: 1.444, body_width_over_d: 0.234, note: '一体护圈' },
  { id: 'air', name: 'Mavic Air', maker: 'DJI', weight_g: 430, wheelbase_mm: 213, prop_mm: 134.62, wl: 1.155 },
  { id: 'air2', name: 'Mavic Air 2', maker: 'DJI', weight_g: 570, wheelbase_mm: 302, prop_mm: 183, wl: 1.369 },
  { id: 'air3', name: 'Air 3', maker: 'DJI', weight_g: 720, wl: 1.346, body_width_over_d: 0.208 },
  { id: 'm2pro', name: 'Mavic 2 Pro', maker: 'DJI', weight_g: 907, wheelbase_mm: 354, prop_mm: 220.98, wl: 1.361 },
  { id: 'm3pro', name: 'Mavic 3 Pro', maker: 'DJI', weight_g: 958, wl: 1.346, body_width_over_d: 0.211, dd_drawing: 0.628 },
];

export const ddOf = (a: Aircraft) => (a.wheelbase_mm && a.prop_mm ? a.prop_mm / a.wheelbase_mm : a.dd_drawing);

const range = (values: number[]) => ({ min: Math.min(...values), max: Math.max(...values), n: values.length });
export const realRanges = {
  wl: range(aircraft.flatMap(a => (a.wl ? [a.wl] : []))),
  dd: range(aircraft.flatMap(a => { const v = ddOf(a); return v ? [v] : []; })),
  bodyWidth: range(aircraft.flatMap(a => (a.body_width_over_d ? [a.body_width_over_d] : []))),
};

export const aircraftSources = [
  'evidence/20261117-research-update/a1/a1-all-models.csv（厂商公布的重量、轴距、桨径）',
  'evidence/20261117-research-update/a1/a2-metrics.csv 与 evidence/20261117-config-review/A2、A2-extension（手册顶视图量测的 W/L、机身宽 ÷ 轴距）',
];
export const aircraftNote = '便利样本：有官方手册顶视图可量的 11 款消费航拍四旋，不代表行业范围。';

/** 把一款机型的布局换算成一份参数：没有公布的数值沿用当前方案的。 */
export function aircraftParameters(a: Aircraft, base: DroneParameters): DroneParameters {
  const p = structuredClone(base);
  if (a.wl) { p.frame.frame_type = 'Wide X'; p.frame.span_ratio_wl = Math.min(1.6, Math.max(1.05, a.wl)); }
  if (a.wheelbase_mm) p.frame.wheelbase_mm = a.wheelbase_mm;
  if (a.prop_mm) p.propulsion.prop_diameter_inch = Number(Math.min(10, Math.max(3, a.prop_mm / 25.4)).toFixed(1));
  return p;
}

