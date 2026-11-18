import type { Snapshot, Variant } from '../../store/droneStore';
import type { FrozenAttempt } from '../candidateRecords';
import { frameRules, taskLabels, type Task } from '../design';
import { wordPairs } from '../fields';
import { appendAttempts } from './attempts';
import { appendEvidence } from './evidence';
import { historyGraph } from './history';
import { referenceProblem, relation, type WorkflowGraph, type WorkflowNode } from './types';
import type { BoardRecords } from './workspaceRecords';

export interface ProjectDraft extends Snapshot { task: Task; variants: Variant[]; activeVariant: string }
export const draftId = (task: Task, variant: string) => 'draft-' + task + '-' + variant;
const briefId = (task: Task, variant: string) => 'brief-' + task + '-' + variant;

export function nodeSnapshot(node: WorkflowNode): Snapshot {
  if (!node.parameters || !node.intent || !node.touched) throw new Error('这个节点没有可编辑的规格。');
  return structuredClone({ parameters: node.parameters, intent: node.intent, touched: node.touched });
}

export function buildProject(draft: ProjectDraft, attempts: FrozenAttempt[], records: BoardRecords,
  images: Map<string, string>, strictReferences = false): WorkflowGraph {
  const graph: WorkflowGraph = { nodes: [], edges: [] };
  const { nodes, edges } = graph;
  for (const branch of records.branches) {
    const config = branch.snapshot.parameters;
    nodes.push({ id: branch.id, title: branch.title, kind: 'spec', subtitle: frameRules[config.frame.frame_type].zh,
      ...branch.snapshot, source: '本机保存的不可变规格', parentId: branch.parentId, variantId: branch.variantId,
      createdAt: branch.createdAt, canRestore: true, canBranch: true,
      detail: branch.copied ? '从所选版本复制规格，作为新的编辑起点。' : '保存当时的编辑草稿，包括参数、设计目标和已选字段。' });
  }
  for (const img of records.images) {
    const history = img.historyNodeId ? historyGraph.nodes.find(n => n.id === img.historyNodeId) : undefined;
    nodes.push({ id: img.id, kind: 'image', title: img.title, createdAt: img.createdAt,
      source: history?.source ?? '设计者上传的参考图', sourceUrl: history?.sourceUrl,
      subtitle: history ? '历史案例参考图' : '上传参考图', image: history?.image ?? images.get(img.id),
      facts: history ? [{ label: '历史节点', value: history.id }, { label: '来源图', value: history.title }]
        : img.file ? [{ label: '原文件', value: img.file.name }] : [] });
  }

  appendAttempts(graph, attempts, draft.task, images);
  const savedIds = new Set(nodes.map(n => n.id));
  for (const branch of records.branches) if (branch.parentId && savedIds.has(branch.parentId))
    edges.push(relation(branch.parentId, branch.id, branch.copied ? '另存分支' : '保存修订'));
  for (const v of draft.variants) {
    const active = v.id === draft.activeVariant;
    const s = active ? draft : v.snapshot;
    const key = v.workflowKey ?? v.id;
    const spec = draftId(draft.task, key), brief = briefId(draft.task, key);
    const base = s.workflowOrigin?.task === draft.task && savedIds.has(s.workflowOrigin.id) ? s.workflowOrigin.id : undefined;
    const mission = taskLabels[s.intent.taskId ?? 'consumer_camera'];
    const targetWords = wordPairs.flatMap(w => {
      const selected = s.intent.targets[w.id];
      return selected ? [selected === 'left' ? w.left : w.right] : [];
    });
    nodes.push({ id: brief, kind: 'brief', title: active ? '当前设计目标' : v.name + ' · 设计目标',
      variantId: v.id, source: '方案草稿中的设计意图', subtitle: mission, detail: s.intent.note || '尚未填写设计说明。',
      intent: s.intent, facts: [
        { label: '使用任务', value: mission },
        ...(targetWords.length ? [{ label: '已选目标', value: targetWords.join('、') }] : []),
      ] });
    nodes.push({ id: spec, kind: 'spec', title: active ? '当前规格草稿' : v.name + ' · 草稿',
      variantId: v.id, source: '本机参数工作台', parentId: base, isDraft: true, canBranch: true,
      parameters: s.parameters, intent: s.intent, touched: s.touched, subtitle: frameRules[s.parameters.frame.frame_type].zh,
      detail: v.name + '的可编辑规格。', facts: [{ label: '方案', value: v.name }] });
    edges.push(relation(brief, spec, '设计目标', 'reference'));
    if (base) edges.push(relation(base, spec, '继续编辑'));
  }
  // A later adoption can connect the same pair as an earlier manual reference. Preserve both records.
  const structuralGraph = { nodes, edges: [...edges] };
  appendEvidence(graph, records.references, attempts);
  const visibleIds = new Set(nodes.map(n => n.id));
  for (const reference of records.references) {
    if (!visibleIds.has(reference.source) || !visibleIds.has(reference.target)) continue;
    const problem = referenceProblem(structuralGraph, reference.source, reference.target);
    if (!problem) {
      edges.push(reference);
      structuralGraph.edges.push(reference);
    }
    else if (strictReferences) throw new Error('此操作与已有手动引用冲突，请先撤回相关连线。' + problem);
  }
  return graph;
}
