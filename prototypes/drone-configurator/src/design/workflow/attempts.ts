import type { FrozenAttempt, DecisionKind } from '../candidateRecords';
import { frameRules, type Task } from '../design';
import { parseImported } from '../exporters';
import { candidateRetained } from '../candidateRecords';
import { generationStatus, isGenerationPending } from '../generation';
import { relation, type WorkflowGraph } from './types';
import { modelLabel } from '../imageBackend';

const choices: Record<DecisionKind, string> = {
  accept: '采纳候选', reject: '驳回候选', restore: '回选候选', manual: '人工深化', stop: '结束本轮',
};
const candidateNodeId = (id: string) => 'candidate-' + id;
const guideId = (id: string) => 'guide-' + id;
const parentImageId = (id: string) => 'parent-image-' + id;
const manualFileId = (id: string) => 'manual-file-' + id;

export function attemptImages(attempts: FrozenAttempt[]) {
  const files = new Map<string, Blob>();
  const candidates = new Set(attempts.flatMap(a => a.candidates.map(c => c.id)));
  for (const a of attempts) {
    if (a.condition === 'structured') files.set(guideId(a.id), a.guide);
    if (a.parentImage && (!a.parentId || !candidates.has(a.parentId))) files.set(parentImageId(a.id), a.parentImage);
    for (const c of a.candidates) files.set(candidateNodeId(c.id), c.file);
    for (const d of a.decisions) if (d.manualFile?.type.startsWith('image/')) files.set(manualFileId(d.id), d.manualFile);
  }
  return files;
}

export function appendAttempts(graph: WorkflowGraph, attempts: FrozenAttempt[], task: Task, images: Map<string, string>) {
  const { nodes, edges } = graph;
  const candidates = new Set(attempts.flatMap(a => a.candidates.map(c => c.id)));
  const localIds = new Set(nodes.map(n => n.id));
  const references = new Set(nodes.filter(n => n.kind === 'image').map(n => n.id));
  for (const a of attempts) if (a.condition === 'structured') localIds.add('frozen-spec-' + a.id);
  for (const a of attempts) {
    const specId = 'frozen-spec-' + a.id, runId = 'run-' + a.id;
    const free = a.condition === 'free';
    const meta = { attemptId: a.id, variantId: a.variantId, createdAt: a.createdAt, method: a.condition };
    // 自由提示没有用到规格和条件图，不为它画冻结规格。
    if (!free) {
      const snapshot = a.snapshot ?? parseImported(a.config, a.config.parameters);
      const ancestor = a.workflowOrigin?.task === task && localIds.has(a.workflowOrigin.id) ? a.workflowOrigin.id : undefined;
      nodes.push({ ...meta, id: specId, kind: 'spec', research: true, title: a.variantName + ' · 冻结规格', parentId: ancestor,
        subtitle: frameRules[snapshot.parameters.frame.frame_type].zh, source: '本轮冻结配置', ...snapshot,
        detail: a.goal, canBranch: true, canRestore: true, facts: [{ label: '保持项', value: a.keep || '未指定' },
          { label: '规格来源', value: a.snapshot ? '冻结时的完整草稿' : '按旧归档的配置、已选字段和意图还原' }] });
      if (ancestor) edges.push(relation(ancestor, specId, '沿用分支编辑'));
    }
    const inputState = a.h3 ? (a.h3.status === 'succeeded' ? '已回图' : '冻结时指定') :
      a.receipt ? '回图工作流已核对' : a.dispatch?.ack ? '服务已接收' : '冻结时指定';
    const status = a.h3 ? generationStatus(a).title : a.receipt ? '已核对回图' : a.failure ? '运行失败或中止' : a.dispatch?.ack ? '服务已入队'
      : a.dispatch?.error ? '提交异常' : a.dispatch ? '已登记请求' : '待提交';
    const progress = a.h3 ? (a.h3.status === 'succeeded' ? 'done' : isGenerationPending(a) ? 'running' : 'issue')
      : a.receipt ? 'done' : a.failure || a.dispatch?.error ? 'issue' : 'pending';
    // 旧记录没有登记草稿范围时，只有四旋的方案 A 可以确定归属。
    const variantScope = a.variantScope ?? (task === 'quad' && a.variantId === 'A' ? 'quad/A' : undefined);
    nodes.push({ ...meta, id: runId, kind: 'run', title: a.goal, subtitle: status, progress, variantScope,
      source: a.h3 ? modelLabel(a.h3.model) + ' · 本机轮次记录' : '本机设计轮次', parentId: free ? undefined : specId, detail: a.confirmedText,
      facts: [{ label: '输入方式', value: a.condition === 'structured' ? '结构化提示与条件图' : '自由提示（只发设计者的原文' + (a.parentImage ? '和一张参考图' : '') + '）' },
        { label: '状态', value: status }, { label: '轮次编号', value: a.id },
        ...(a.h3?.issue ? [{ label: '服务记录', value: a.h3.issue }] : []),
        ...(a.runId ? [{ label: a.h3 ? '本机任务号' : '服务作业号', value: a.runId }] : []),
        ...(a.h3?.traceId ? [{ label: '服务追踪号', value: a.h3.traceId }] : [])] });
    if (!free) edges.push(relation(specId, runId, '冻结输入'));
    if (a.condition === 'structured') {
      const id = guideId(a.id);
      nodes.push({ ...meta, id, kind: 'image', research: true, title: '本轮布局条件图', subtitle: '冻结输入', source: '冻结的结构化条件图',
        image: images.get(id), parentId: specId, facts: [{ label: 'SHA-256', value: a.config.reference_image.png_sha256 ?? '未登记' }] });
      edges.push(relation(specId, id, '生成布局图'), relation(id, runId, inputState + ' · 条件图', 'reference'));
    }
    if (a.parentImage) {
      const known = a.parentId && candidates.has(a.parentId);
      // 设计者把画布上的参考图接到生成步骤时，父图编号就是那张参考图的节点。
      const reference = !known && a.parentId && references.has(a.parentId);
      const id = known ? candidateNodeId(a.parentId!) : reference ? a.parentId! : parentImageId(a.id);
      if (!known && !reference) nodes.push({ ...meta, id, kind: 'image', title: '本轮父图', subtitle: '归档输入', image: images.get(id),
        source: '随本轮冻结的父图原件', detail: a.parentId ? '原候选编号 · ' + a.parentId : '原候选编号未登记。' });
      edges.push(relation(id, runId, inputState + (reference ? ' · 参考图' : ' · 父图'), 'reference'));
    }
    for (const c of a.candidates) {
      const id = candidateNodeId(c.id);
      nodes.push({ ...meta, id, parentId: runId, kind: 'image', title: c.name, subtitle: '回执候选', image: images.get(id),
        candidateId: c.id, firstShown: c.firstShown, retained: candidateRetained(a, c.id), source: a.h3?.status === 'succeeded' ? modelLabel(a.h3.model) + ' · 服务回图' : '服务回执与候选原件',
        detail: a.receipt?.inputVerification, facts: [{ label: '原图 SHA-256', value: c.hash }] });
      edges.push(relation(runId, id, '返回候选'));
    }
    for (const d of a.decisions) {
      const id = 'decision-' + d.id;
      const parent = d.candidate && a.candidates.some(c => c.id === d.candidate) ? candidateNodeId(d.candidate) : d.kind === 'stop' ? runId : undefined;
      nodes.push({ ...meta, createdAt: d.at, id, parentId: parent, kind: 'decision', title: choices[d.kind],
        subtitle: d.reason, detail: d.reason, source: '设计者登记的取舍' });
      if (parent) edges.push(relation(parent, id, d.kind === 'stop' ? '结束轮次' : '候选取舍'));
      if (d.manualFile) {
        const fileId = manualFileId(d.id);
        nodes.push({ ...meta, createdAt: d.at, id: fileId, parentId: id, kind: 'edit', title: d.manualFile.name,
          subtitle: '人工深化附件', source: '取舍记录附件', image: images.get(fileId) });
        edges.push(relation(id, fileId, '登记附件'));
      }
    }
  }
}
