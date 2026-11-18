import type { ParameterGroup } from '../../types/DroneParameters';

export interface Comparison {
  label: string;
  topic: string;
  state: string;
  question: string;
}

export const comparisons: Record<ParameterGroup, Comparison[]> = {
  frame: [
    { label: '折叠收纳', topic: 'bag_fit', state: 'folded',
      question: '折叠后计划放入哪只包？记录目标包的内尺寸，再用折叠样机或图纸核对。' },
    { label: '口袋与小包', topic: 'pocket_fit', state: 'carrying',
      question: '分别指定一个口袋和一个小包，记录哪种携带方式是本方案的目标。' },
  ],
  propulsion: [
    { label: '护圈外形', topic: 'blade_guard', state: 'unspecified',
      question: '并排查看有护圈和无护圈的顶视图，标记桨叶周围哪一段轮廓发生了变化。' },
    { label: '护圈的厚重感', topic: 'guard_thickness', state: 'unspecified',
      question: '请评阅者分别描述护圈自身的厚薄感和整机的大小感，两项各记一条。' },
  ],
  fuselage: [
    { label: '机身简洁感', topic: 'simplicity', state: 'unspecified',
      question: '保持壳体尺寸一致，并排看单盖与分段顶盖，记录哪处接缝影响了简洁感。' },
    { label: '机身大小感', topic: 'general_size', state: 'unspecified',
      question: '用同一视角比较两个机身轮廓，让评阅者指出判断大小时参照的部位。' },
  ],
  accessories: [
    { label: '配色辨识', topic: 'color_recognition', state: 'unspecified',
      question: '用同一轮廓展示两种配色，分别记录第一眼能否认出、个人更喜欢哪种。' },
    { label: '色材质感', topic: 'color_material', state: 'unspecified',
      question: '固定主色，只改变表面处理，比较两张图给人的质感印象。' },
  ],
  landing_gear: [],
};
