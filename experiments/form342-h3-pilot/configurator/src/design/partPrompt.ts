import type { DroneParameters } from '../types/DroneParameters';

export type PartGroup = keyof DroneParameters;
export const partOrder: PartGroup[] = ['frame', 'propulsion', 'fuselage', 'landing_gear', 'accessories'];

// Each phrase comes from an editable component field. The host adds its own view and task.
export function componentPhrases(p: DroneParameters, groups: PartGroup[]) {
  const { frame, propulsion, fuselage, landing_gear: gear, accessories } = p;
  const size = fuselage.fuselage_dimensions_mm;
  const skids = { '无独立起落架': 'integrated landing system', '低矮滑撬/支腿': 'low-profile skids', '高脚起落架': 'tall landing gear' };
  const byGroup: Record<PartGroup, string> = {
    frame: `Arms: ${frame.material_visual}, ${frame.arm_width_mm} wide and ${frame.arm_thickness_mm} thick.`,
    propulsion: `Propulsion: ${propulsion.prop_diameter_inch}-inch ${parseInt(propulsion.prop_blade_count, 10)}-blade propellers; motor tilt ${propulsion.motor_tilt_degree}°.`,
    fuselage: `Body: ${fuselage.fuselage_style}; design envelope ${size.length} × ${size.width} × ${size.height} mm (length × width × height).`,
    landing_gear: gear.landing_gear_style === '无独立起落架' ? 'Integrated landing system.' :
      `Landing gear: ${skids[gear.landing_gear_style]}, ${gear.landing_gear_height_mm} mm ground clearance.`,
    accessories: [accessories.has_camera_gimbal ? 'Camera gimbal fitted.' : 'No separate camera gimbal.', `Primary colour ${accessories.drone_primary_color}.`].join(' '),
  };
  return partOrder.filter(group => groups.includes(group)).map(group => byGroup[group]);
}
