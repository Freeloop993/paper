// 提示词编译：按固定顺序逐句生成，每句登记来源和所用字段。
// 顺序：任务与视图 → 设计意图 → 布局与参考图 → 部件参数 → 已选造型项 → 色材 → 补充文字 → 呈现。
// 留白的造型项不生成任何句子；护圈、颜色、碳纹只有在设计者明确选择后才会出现。
import type { DesignIntent, DroneParameters, ParameterGroup } from '../types/DroneParameters.ts';
import { effectiveWl, frameRules, topologyOf, type Layout } from './design.ts';
import {
  armMaterialOptions, armRootOptions, cameraMountOptions, colourName, finishOptions, fuselageStyleOptions,
  legacyFuselageStyles, topCoverOptions, wordPairs,
} from './fields.ts';

/** fixed＝任务固定；default＝默认值；chosen＝含设计者的选择；adopted＝设计者采纳的意图；custom＝设计者补充的原话。 */
export type SentenceSource = 'fixed' | 'default' | 'chosen' | 'adopted' | 'custom';
export const sourceLabel: Record<SentenceSource, string> = {
  fixed: '任务固定', default: '默认值', chosen: '你的选择', adopted: '采纳的意图', custom: '你的补充',
};

export interface PromptSentence {
  id: string;
  group: ParameterGroup | 'task' | 'intent';
  source: SentenceSource;
  /** 这句话在说什么（中文提示，不发给模型）。 */
  zh: string;
  text: string;
  fields: string[];
}

const en = (options: { value: string; en?: string }[], value: string) => options.find(o => o.value === value)?.en ?? '';
const fmt = (v: number, digits = 2) => Number(v.toFixed(digits)).toString();

export function compilePrompt(p: DroneParameters, touched: Record<string, boolean>, intent: DesignIntent, layout: Layout) {
  const { frame, propulsion, fuselage, landing_gear: gear, accessories } = p;
  const out: PromptSentence[] = [];
  const src = (...paths: string[]): SentenceSource => (paths.some(path => touched[path]) ? 'chosen' : 'default');
  const add = (s: PromptSentence) => { if (s.text.trim()) out.push(s); };

  const topology = topologyOf(frame.frame_type);
  const aircraftName = { quad: 'quadcopter', tri: 'tricopter', flat_hex: 'flat hexacopter',
    flat_octo: 'flat octocopter', coax_hex: 'coaxial Y6 hexacopter', coax_octo: 'coaxial X8 octocopter' }[topology.layout_key];
  const purpose = { consumer_camera: 'everyday carry-along aerial photography',
    agricultural_spraying: 'civil agricultural crop care', neutral_design: 'a civilian industrial design comparison' }[intent.taskId ?? 'consumer_camera'];

  add({
    id: 'task', group: 'task', source: 'fixed', zh: '任务与视图', fields: [],
    text: `Design a ${aircraftName} for ${purpose}. Strict orthographic top view, nose toward the top edge of the image, arms fully unfolded.`,
  });

  const poles = wordPairs.filter(w => intent.targets[w.id]).map(w => (intent.targets[w.id] === 'left' ? w.leftEn : w.rightEn));
  if (poles.length)
    add({
      id: 'intent', group: 'intent', source: 'adopted', zh: '设计者采纳的目标一极', fields: ['intent.targets'],
      text: 'Design intent: ' + poles.join('; ') + '.',
    });
  const activeBrief = [...intent.log].reverse().find(entry => entry.action === 'brief' &&
    entry.brief && ['accept', 'custom', 'revoke'].includes(entry.brief.action))?.brief;
  const storageOnly = activeBrief && activeBrief.action !== 'revoke' && activeBrief.text.trim() === intent.note.trim()
    && (activeBrief.query.state === 'folded' || activeBrief.query.state === 'carrying');
  if (intent.note.trim() && !storageOnly)
    add({
      id: 'intent_note', group: 'intent', source: 'custom', zh: '设计者自己写的意图（原话）', fields: ['intent.note'],
      text: "Designer's note: " + intent.note.trim(),
    });

  const rule = frameRules[frame.frame_type];
  const first = layout.hubs[0].role === 'F' ? 'nose' : layout.hubs[0].role === 'M1' ? 'first' : 'front-left';
  const numberWord: Record<number,string> = { 3: 'Three', 4: 'Four', 6: 'Six', 8: 'Eight' };
  const spanDescription = layout.D_mean_mm === null ? 'Maximum horizontal axis-to-axis span' : 'Mean opposite-motor (diagonal) span';
  const layering = topology.layers_per_axis === 2
    ? ` Each of the ${topology.axis_count} horizontal axes has two rotors stacked vertically; the lower layer may be occluded in this view.` : '';
  add({
    id: 'layout', group: 'frame', source: src('frame.frame_type', 'frame.wheelbase_mm', 'frame.span_ratio_wl'),
    zh: '布局：构型、对角轴距 D、W/L、相邻夹角', fields: ['frame.frame_type', 'frame.wheelbase_mm', 'frame.span_ratio_wl'],
    text: `${numberWord[topology.rotor_count]} motors in a ${rule.en} layout: ${rule.shape_en}.${layering} ` +
      `${spanDescription} ${fmt(frame.wheelbase_mm, 1)} mm; motor-centre width-to-length span ratio W/L ${effectiveWl(frame).toFixed(2)}; ` +
      `adjacent arm angles clockwise from the ${first} motor: ${layout.adjacent_deg.map(a => fmt(a, 1) + '°').join(', ')}.`,
  });
  add({
    id: 'guide', group: 'task', source: 'fixed', zh: '随附点线图的读法', fields: [],
    text: 'Match the motor centres and frame links in the attached layout image: red dots mark motor centres, blue lines mark frame links. Do not reproduce the dots or lines in the result.',
  });

  const blades = parseInt(propulsion.prop_blade_count, 10);
  add({
    id: 'propulsion', group: 'propulsion',
    source: src('propulsion.prop_diameter_inch', 'propulsion.prop_blade_count', 'propulsion.motor_tilt_degree'),
    zh: '桨径、每轴桨叶数、电机倾角', fields: ['propulsion.prop_diameter_inch', 'propulsion.prop_blade_count', 'propulsion.motor_tilt_degree'],
    text: `Each motor carries one stationary ${blades}-blade propeller, ${fmt(propulsion.prop_diameter_inch, 1)}-inch (${fmt(layout.prop_diameter_mm, 0)} mm) diameter.` +
      (blades === 2 ? ' The two blades point in exactly opposite directions from the hub.' : '') +
      (propulsion.motor_tilt_degree > 0 ? ` Motors are tilted ${propulsion.motor_tilt_degree}° forward.` : ''),
  });
  add({
    id: 'prop_guard', group: 'propulsion', source: src('propulsion.prop_guard'), zh: '桨叶护圈（只按明确选择）', fields: ['propulsion.prop_guard'],
    text: propulsion.prop_guard === 'ring' ? 'Each propeller is enclosed by a slim ring guard.' : 'No propeller guards.',
  });

  const armW = parseInt(frame.arm_width_mm, 10), armT = parseInt(frame.arm_thickness_mm, 10);
  add({
    id: 'arm_size', group: 'frame', source: src('frame.arm_width_mm', 'frame.arm_thickness_mm'), zh: '机臂宽度与厚度',
    fields: ['frame.arm_width_mm', 'frame.arm_thickness_mm'],
    text: `Each arm is ${armW} mm wide and ${armT} mm thick; seen from above it reads as a ${armW} mm wide beam.`,
  });
  add({ id: 'arm_root', group: 'frame', source: 'chosen', zh: '臂根过渡', fields: ['frame.arm_root'], text: en(armRootOptions, frame.arm_root) });
  add({ id: 'arm_material', group: 'frame', source: 'chosen', zh: '机臂材料外观', fields: ['frame.material_visual'], text: en(armMaterialOptions, frame.material_visual) });

  const size = fuselage.fuselage_dimensions_mm;
  add({
    id: 'body_size', group: 'fuselage',
    source: src('fuselage.fuselage_dimensions_mm.length', 'fuselage.fuselage_dimensions_mm.width', 'fuselage.fuselage_dimensions_mm.height'),
    zh: '机身包络尺寸（只限尺寸，不定外形）',
    fields: ['fuselage.fuselage_dimensions_mm.length', 'fuselage.fuselage_dimensions_mm.width', 'fuselage.fuselage_dimensions_mm.height'],
    text: `Fuselage design envelope ${size.length} × ${size.width} × ${size.height} mm (length × width × height); this is a size limit, not a shape.`,
  });
  add({
    id: 'body_style', group: 'fuselage', source: 'chosen', zh: '机身轮廓', fields: ['fuselage.fuselage_style'],
    text: en([...fuselageStyleOptions, ...legacyFuselageStyles], fuselage.fuselage_style),
  });
  add({ id: 'top_cover', group: 'fuselage', source: 'chosen', zh: '顶盖分件', fields: ['fuselage.top_cover'], text: en(topCoverOptions, fuselage.top_cover) });

  add({
    id: 'camera', group: 'accessories', source: src('accessories.has_camera_gimbal'), zh: '前视相机：有无是选择，朝向是任务固定',
    fields: ['accessories.has_camera_gimbal'],
    text: accessories.has_camera_gimbal
      ? 'A forward-facing camera sits at the nose and looks horizontally toward the top edge of the image; no lens glass faces the viewer, and nothing camera-like appears at the tail.'
      : 'No camera or gimbal is fitted.',
  });
  if (accessories.has_camera_gimbal)
    add({ id: 'camera_mount', group: 'accessories', source: 'chosen', zh: '相机安装方式', fields: ['accessories.camera_mount'], text: en(cameraMountOptions, accessories.camera_mount) });

  add({
    id: 'landing', group: 'landing_gear', source: src('landing_gear.landing_gear_style', 'landing_gear.landing_gear_height_mm'),
    zh: '起落架（顶视被机身遮挡）', fields: ['landing_gear.landing_gear_style', 'landing_gear.landing_gear_height_mm'],
    text: gear.landing_gear_style === '无独立起落架' ? 'No separate landing gear.'
      : gear.landing_gear_style === '低矮滑撬/支腿'
        ? `Low landing skids with ${gear.landing_gear_height_mm} mm ground clearance, tucked beneath the aircraft.`
        : `Tall landing legs with ${gear.landing_gear_height_mm} mm ground clearance.`,
  });

  const hex = accessories.drone_primary_color;
  if (hex)
    add({
      id: 'colour', group: 'accessories', source: 'chosen', zh: '主色', fields: ['accessories.drone_primary_color'],
      text: `Main shell colour: ${colourName(hex)?.en ?? 'custom colour'} (${hex}).`,
    });
  add({ id: 'finish', group: 'accessories', source: 'chosen', zh: '表面处理', fields: ['accessories.surface_finish'], text: en(finishOptions, accessories.surface_finish) });

  add({
    id: 'custom', group: 'accessories', source: 'custom', zh: '设计者补充的原话', fields: ['accessories.custom_prompt_additions'],
    text: accessories.custom_prompt_additions.trim(),
  });
  add({
    id: 'presentation', group: 'task', source: 'fixed', zh: '呈现方式', fields: [],
    text: 'Show the complete product on a plain light background as a photorealistic industrial design rendering. Omit guide marks, dimensions and lettering.',
  });
  return { sentences: out, text: out.map(s => s.text).join('\n') };
}

/** 逐句比较两次编译：返回新增、删除和改动的句子 id。 */
export function diffSentences(before: PromptSentence[], after: PromptSentence[]) {
  const prev = new Map(before.map(s => [s.id, s.text]));
  const next = new Map(after.map(s => [s.id, s.text]));
  return {
    changed: after.filter(s => prev.has(s.id) && prev.get(s.id) !== s.text).map(s => ({ id: s.id, before: prev.get(s.id) as string, after: s.text })),
    added: after.filter(s => !prev.has(s.id)).map(s => s.id),
    removed: before.filter(s => !next.has(s.id)).map(s => ({ id: s.id, before: s.text })),
  };
}

export interface AuditItem {
  topic: 'guard' | 'colour' | 'carbon';
  label: string;
  /** absent＝全文未出现；selected＝出现且对应设计者的明确选择；custom＝来自设计者补充的原话；unexpected＝模板自行加入（不应发生）。 */
  status: 'absent' | 'selected' | 'custom' | 'unexpected';
  detail: string;
  sentences: string[];
}

const topics: { topic: AuditItem['topic']; label: string; pattern: RegExp; allowed: (p: DroneParameters) => string[]; negation?: RegExp }[] = [
  {
    topic: 'guard', label: '桨叶护圈', pattern: /\b(guards?|guarded|cage|shroud|ducted|duct)\b|护圈|保护罩|桨保/i, negation: /^No propeller guards\.$/,
    allowed: p => (p.propulsion.prop_guard === 'ring' ? ['prop_guard'] : []),
  },
  {
    topic: 'colour', label: '颜色',
    pattern: /#[0-9a-f]{6}\b|\b(black|white|grey|gray|orange|red|blue|green|purple|pink|yellow|silver|golden?|charcoal)\b|colou?r|配色|黑|灰|橙/i,
    allowed: p => (p.accessories.drone_primary_color ? ['colour'] : []),
  },
  {
    topic: 'carbon', label: '碳纤维纹理', pattern: /carbon|weave|碳/i,
    allowed: p => (p.frame.material_visual === 'Carbon Fiber' ? ['arm_material'] : []),
  },
];
const userWritten = new Set(['custom', 'intent_note']);
/** 这一句描述的是随附点线图本身（红点、蓝线），不是产品的颜色，不计入颜色自检。 */
const describesGuide = new Set(['guide']);

/** 模板自检：检查护圈、颜色、碳纹是否只在设计者选择后出现。 */
export function auditPrompt(p: DroneParameters, sentences: PromptSentence[]): AuditItem[] {
  return topics.map(t => {
    const hits = sentences.filter(s => !describesGuide.has(s.id) && t.pattern.test(s.text) && !(t.negation && t.negation.test(s.text)));
    const allowed = new Set(t.allowed(p));
    const unexpected = hits.filter(s => !allowed.has(s.id) && !userWritten.has(s.id));
    const custom = hits.filter(s => userWritten.has(s.id));
    const status: AuditItem['status'] = unexpected.length ? 'unexpected' : hits.some(s => allowed.has(s.id)) ? 'selected' : custom.length ? 'custom' : 'absent';
    const detail = status === 'absent' ? '未出现在提示词中'
      : status === 'selected' ? '出现，来自你的明确选择'
        : status === 'custom' ? '出现，来自你写的补充文字或意图'
          : '模板自行加入，需修正';
    return { topic: t.topic, label: t.label, status, detail, sentences: hits.map(s => s.id) };
  });
}
