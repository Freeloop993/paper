import type { Snapshot } from '../../store/droneStore';

export type WorkflowBoard = 'history' | 'project';
export interface WorkflowNode extends Partial<Snapshot> {
  id: string;
  kind: 'brief' | 'spec' | 'run' | 'image' | 'decision' | 'edit' | 'note' | 'evidence';
  title: string;
  subtitle?: string;
  detail?: string;
  image?: string;
  source?: string;
  sourceUrl?: string;
  parentId?: string;
  widthMm?: number;
  candidateId?: string;
  attemptId?: string;
  variantId?: string;
  createdAt?: string;
  firstShown?: string;
  isDraft?: boolean;
  canRestore?: boolean;
  canBranch?: boolean;
  facts?: { label: string; value: string }[];
}
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  kind?: 'reference' | 'lineage' | 'manual';
  removable?: boolean;
}
export interface WorkflowGraph { nodes: WorkflowNode[]; edges: WorkflowEdge[] }

export function relation(source: string, target: string, label: string, kind: WorkflowEdge['kind'] = 'lineage'): WorkflowEdge {
  return { id: JSON.stringify([source, target]), source, target, label, kind };
}

export function referenceProblem(graph: WorkflowGraph, source: string, target: string) {
  if (source === target) return '不能把节点连回自身。';
  const ids = new Set(graph.nodes.map(n => n.id));
  if (!ids.has(source) || !ids.has(target)) return '所选节点已不在这张画布。';
  if (graph.edges.some(e => e.source === source && e.target === target)) return '这两个节点之间已有同向连线。';
  const outbound = new Map<string, string[]>();
  for (const e of graph.edges) {
    const next = outbound.get(e.source) ?? [];
    next.push(e.target);
    outbound.set(e.source, next);
  }
  const pending = [target], seen = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (id === source) return '这条连线会形成闭环。';
    if (!seen.has(id)) {
      seen.add(id);
      pending.push(...outbound.get(id) ?? []);
    }
  }
  return null;
}
