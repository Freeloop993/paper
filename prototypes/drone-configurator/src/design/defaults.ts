// 工作台的起始设计值，和研究登记的实验条件，分开登记在这一个文件里。
// 起始设计值：打开空白项目、点「重置参数」时看到的数，取自真实产品量测。改它不影响任何实验。
// 实验条件：已经做完或已经登记的实验所用的数。只能照登记的来，不随起始设计值变。
import type { DroneParameters } from '../types/DroneParameters.ts';

/**
 * 32 款真实四旋翼产品图上的量测（S5 评议用图）。中位数和四分位，判读者一；括号外的数两位判读者相近：
 * W/L 1.35 与 1.34，机身宽/D 0.23 与 0.22，机身长/宽 2.76 与 2.63，d/D 0.58 与 0.56。
 * 逐款数值：experiments/s5-compactness-pilot/geometry/metrics.csv；四分位按不含端点的算法，与此前各处记录一致。
 */
export const realQuadrotors = {
  n: 32,
  source: 'experiments/s5-compactness-pilot/geometry/metrics.csv',
  wl: { q1: 1.17, median: 1.35, q3: 1.50 },
  bodyWidthOverD: { q1: 0.18, median: 0.23, q3: 0.29 },
  bodyLengthOverWidth: { q1: 2.38, median: 2.76, q3: 3.59 },
  dOverD: { n: 30, q1: 0.53, median: 0.58, q3: 0.62 },
} as const;

/**
 * 四旋翼的起始设计值。
 * W/L 取中位数 1.35。机身宽 55 mm 是轴距 250 mm 的 0.22，机身长 150 mm 是宽的 2.73 倍：
 * 两个数都在两位判读者的中位数之间（0.22–0.23、2.63–2.76），也落在界面滑块的 5 mm 刻度上。
 * 轴距 250 mm 和桨径 5 英寸没有动：前者是论文规格卡的设定，后者同时是实验档 d/D 0.50。
 */
export const designStart = {
  frame_type: 'Wide X', span_ratio_wl: 1.35, wheelbase_mm: 250,
  fuselage_dimensions_mm: { length: 150, width: 55, height: 30 },
} as const satisfies { frame_type: DroneParameters['frame']['frame_type']; span_ratio_wl: number; wheelbase_mm: number;
  fuselage_dimensions_mm: DroneParameters['fuselage']['fuselage_dimensions_mm'] };

/** 3.5.0 及以前的起始值。留着只为核对旧导出，界面不再使用。 */
export const legacyStart = {
  frame_type: 'True X', span_ratio_wl: 1, wheelbase_mm: 250,
  fuselage_dimensions_mm: { length: 100, width: 80, height: 30 },
} as const;

export interface StudyCondition {
  id: string;
  label: string;
  /** 登记了哪几项。没有登记的项（例如机身尺寸）不动。 */
  frame: { frame_type: DroneParameters['frame']['frame_type']; span_ratio_wl: number; wheelbase_mm: number };
  note: string;
  source: string;
}

/** 研究登记的实验条件。 */
export const study = {
  /** RQ2a 的三档布局比例，已有的 WLQ、E1、E3、B2 都按这三档读数。 */
  wlLevels: [0.7, 1.0, 1.3],
  /** d/D 的三档。 */
  ddLevels: [0.4, 0.5, 0.6],
  conditions: [{
    id: 'c2-pilot',
    label: 'C2 作者预试',
    frame: { frame_type: 'True X', span_ratio_wl: 1, wheelbase_mm: 250 },
    note: '正交顶视、四轴等宽等长（W/L 1.00）、对角轴距 250 mm。主持人的登记工具只收符合这三项的规格。',
    source: 'planning/advisor-20261118/pilot-bridge/README.md；capture.py 对规格的检查',
  }] as StudyCondition[],
};

/** 当前规格是否符合某个登记条件。 */
export function meetsCondition(parameters: DroneParameters, condition: StudyCondition, wl: number) {
  return parameters.frame.frame_type === condition.frame.frame_type
    && Math.abs(wl - condition.frame.span_ratio_wl) < 0.001
    && Math.abs(parameters.frame.wheelbase_mm - condition.frame.wheelbase_mm) < 0.01;
}
