import type { DroneParameters } from '../types/DroneParameters';
import { newInputs, type Inputs } from './design';
import { partOrder } from './partPrompt';

export const quadDirections = {
  A: { label: 'A · 紧凑舱式', style: 'Aerodynamic Pod', length: 100, width: 75 },
  B: { label: 'B · 纵长舱式', style: 'Aerodynamic Pod', length: 145, width: 55 },
  C: { label: 'C · 分体箱式', style: 'Boxy Enclosure', length: 100, width: 75 },
} as const;
export type Direction = keyof typeof quadDirections;

export function directionDraft(id: Direction, current: DroneParameters) {
  const card = quadDirections[id];
  const parameters: DroneParameters = {
    ...current,
    frame: { ...current.frame, frame_type: 'True X', wheelbase_mm: 250 },
    fuselage: { fuselage_style: card.style,
      fuselage_dimensions_mm: { length: card.length, width: card.width, height: 40 } },
    propulsion: { prop_diameter_inch: 5, prop_blade_count: '2叶', motor_tilt_degree: 0 },
    accessories: { ...current.accessories, has_camera_gimbal: true },
  };
  const inputs: Inputs = { ...newInputs('quad'), preset: id, groups: [...partOrder],
    source: '既定随行航拍四旋任务；构型与机身包络为可编辑的设计示例。',
    change: id === 'C' ? '在箱式机身与独立机架之间组织分件。' :
      '以所选舱体包络组织机身和机臂。',
    keep: '四轴布局、双叶和前向航拍功能。',
    free: '机鼻轮廓、相机安装方式、臂根过渡、壳面曲率和接缝走向。',
    guideTips: false, guideBladeLines: false };
  inputs.instruction = [inputs.change, inputs.keep, inputs.free].join('\n');
  return { parameters, inputs };
}
