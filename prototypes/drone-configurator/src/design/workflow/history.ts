import archive from '../../data/history/cases.json';
import layout from '../../data/history/quad-guide.png';
import original from '../../data/history/quad.webp';
import clean from '../../data/history/B2-no-window.webp';
import upper from '../../data/history/B2-upper.webp';
import lower from '../../data/history/B2-lower.webp';
import { relation, type WorkflowGraph } from './types';

const revision = 'https://github.com/Freeloop993/paper/tree/e96d41946ea84237da506bb76c2f713a3f3b9275/';
const round = revision + 'evidence/e3-quad-qwen-20261115/round-3';
const comparison = revision + 'experiments/e3-deepening/end-comparison';
const archiveSource = 'E3 第三轮 · E3R3-B2';
const compareSource = '4.4 深化归档 · end-comparison';
const originalInfo = archive.quad;

export const historyGraph: WorkflowGraph = {
  nodes: [
    { id: 'b2-guide', kind: 'image', title: '四轴布局条件图', subtitle: '模型输入', image: layout,
      source: archiveSource, sourceUrl: round,
      detail: 'B2 这一轮实际送入模型的布局条件图。冻结提示词要求真 X 构型、250 mm 对角轴距、四组双叶桨及正交俯视。',
      facts: [{ label: '原件', value: originalInfo.guide }, { label: '输入图 SHA-256', value: originalInfo.guideHash }] },
    { id: 'b2-original', kind: 'image', title: 'B2 原始候选', subtitle: '第三轮 · 模型回图', image: original,
      source: archiveSource, sourceUrl: round, parentId: 'b2-guide',
      detail: '第三轮共九张候选。作者初评时将父图栏留空，希望调整 B2 看似内嵌的相机。明确三个方向的用途后，作者选择 B2 作父图。后续模型修订用 C1 作辅助参考，作者随后回到 B2 做人工安装对照。',
      facts: [{ label: '作业号', value: originalInfo.jobId }, { label: '种子', value: String(originalInfo.seed) },
        { label: '原图 SHA-256', value: originalInfo.imageHash }, { label: '实发提示词', value: originalInfo.prompt }] },
    { id: 'b2-clean', kind: 'edit', title: '去除上端深色开窗', subtitle: '人工修图 · 深化底图', image: clean,
      parentId: 'b2-original', source: compareSource, sourceUrl: comparison,
      detail: '用 B2 相邻壳面纹理覆盖画面上端的深色开窗，保留原有机身方向。作者指定这张尚未安装相机舱的底图作为 4.4 节深化父图。',
      facts: [{ label: '原件', value: 'B2-no-window.png' }, { label: '原件 SHA-256', value: '9726c778774296c3f164f19ef497c636edc9a23d31ef0f29c83a1b99a0e7b175' }] },
    { id: 'b2-upper', kind: 'image', title: '相机装在上端', subtitle: '人工合成 · 上端对照', image: upper,
      parentId: 'b2-clean', source: compareSource, sourceUrl: comparison,
      detail: '取已有 r01 相机舱图层，沿机身中线居中，在去窗底图的画面上端安装。两版相机舱尺寸相同。',
      facts: [{ label: '对照原件', value: 'B2-upper.png' }, { label: '相机舱图层', value: 'B2-cam-r01.png' }] },
    { id: 'b2-lower', kind: 'image', title: '相机装在下端', subtitle: '人工合成 · 下端对照', image: lower,
      parentId: 'b2-clean', source: compareSource, sourceUrl: comparison,
      detail: '保持机身方向，将同一个 r01 相机舱图层在画面内旋转 180°，按相同尺度装在机身下端。',
      facts: [{ label: '对照原件', value: 'B2-lower.png' }, { label: '相机舱图层', value: 'B2-cam-r01.png' }] },
    { id: 'b2-choice', kind: 'decision', title: '作者倾向下端方案', subtitle: '作者取舍 · 2026.11.15',
      parentId: 'b2-lower', source: compareSource, sourceUrl: comparison,
      detail: '看过两版对照后，作者认为上端安装可能不太符合自己的设计意图，更倾向将相机装在下端，并由下端方案接续深化。' },
  ],
  edges: [
    relation('b2-guide', 'b2-original', '布局条件', 'reference'),
    relation('b2-original', 'b2-clean', '人工去窗'),
    relation('b2-clean', 'b2-upper', '上端安装'),
    relation('b2-clean', 'b2-lower', '下端安装'),
    relation('b2-upper', 'b2-choice', '对照', 'reference'),
    relation('b2-lower', 'b2-choice', '优先深化'),
  ],
};
