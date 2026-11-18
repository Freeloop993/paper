import library from '../../data/evidenceCards.json';
import type { FrozenAttempt } from '../candidateRecords';
import { layoutKey } from '../design';
import { groupLabel } from '../fields';
import { stateLabels } from '../semantics/brief';
import { sha256Text } from '../sha256';
import { relation, type WorkflowEdge, type WorkflowGraph, type WorkflowNode } from './types';

const byId = new Map(library.cards.map(card => [card.id, card]));
const evidenceId = (id: string) => 'evidence-' + id;

function evidenceNode(card: typeof library.cards[number]): WorkflowNode {
  return {
    id: evidenceId(card.id), kind: 'evidence', title: card.id + ' · ' + card.quote,
    subtitle: card.object, detail: card.limits, source: '公开短引 · ' + card.source_key,
    facts: [
      { label: '卡号', value: card.id }, { label: '卡上短引', value: card.quote },
      { label: '描述对象', value: card.object }, { label: '使用状态', value: card.state },
      { label: '类别', value: card.category }, { label: '倾向', value: card.polarity },
      { label: '适用边界', value: card.limits }, { label: '例证关系', value: card.relation },
      { label: '来源编号', value: card.source_key }, { label: '记录编号', value: card.record },
      { label: '数据集', value: card.dataset }, { label: '原卡表', value: library.source },
      { label: '卡表 SHA-256', value: library.sha256 },
    ],
  };
}

function appendPartQuestions(graph: WorkflowGraph, used: Set<string>) {
  const questions = new Map<string, WorkflowNode>();
  for (const spec of graph.nodes) {
    if (spec.kind !== 'spec' || !spec.parameters || !spec.intent) continue;
    const mission = spec.intent.taskId ?? 'consumer_camera';
    const layout = layoutKey(spec.parameters.frame.frame_type);
    const inSpec = new Set<string>();
    for (const item of spec.intent.log ?? []) {
      const entry = item.brief;
      if (item.action !== 'brief' || entry?.action !== 'reference' || !entry.part || !groupLabel[entry.part] ||
          entry.query?.task !== mission || entry.query.layout !== layout || !entry.text || !Array.isArray(entry.evidence)) continue;
      const id = 'part-reference-' + sha256Text(JSON.stringify([entry.at, entry.part, entry.text, entry.query, entry.evidence, entry.corpus]));
      if (inSpec.has(id)) continue;
      inSpec.add(id);
      if (!questions.has(id)) {
        const part = groupLabel[entry.part];
        questions.set(id, { id, kind: 'note', title: part + ' · 对照问题', subtitle: part,
          detail: entry.text, source: '设计者保存的部件对照', createdAt: entry.at,
          facts: [{ label: '对照部件', value: part }, { label: '观察状态', value: stateLabels[entry.query.state] || entry.query.state },
            { label: '检索版本', value: entry.sourceVersion }] });
        for (const ref of new Map(entry.evidence.map(ref => [ref.id, ref])).values()) {
          const card = byId.get(ref.id);
          if (!card || card.source_key !== ref.source || !['caution', 'example'].includes(ref.role)) continue;
          used.add(card.id);
          graph.edges.push(relation(evidenceId(card.id), id, ref.role === 'caution' ? '对照限制' : '对照案例', 'reference'));
        }
      }
      graph.edges.push(relation(id, spec.id, '部件对照', 'reference'));
    }
  }
  graph.nodes.push(...questions.values());
}

export function appendEvidence(graph: WorkflowGraph, manual: WorkflowEdge[], attempts: FrozenAttempt[]) {
  const used = new Set<string>();
  const frozen = new Map(attempts.map(attempt => [attempt.id, attempt]));
  for (const node of graph.nodes) {
    if (node.kind !== 'brief' && (node.kind !== 'spec' || node.isDraft)) continue;
    const archive = node.attemptId ? frozen.get(node.attemptId)?.config.intent : undefined;
    // The adopted list is the state at save/freeze time. Search results and revoked decisions also live in the log.
    const adopted = node.intent?.cards ?? archive?.adopted_cards?.map(card => card.id);
    if (!Array.isArray(adopted)) continue;
    for (const id of new Set(adopted)) {
      const card = byId.get(id);
      const archivedCard = archive?.adopted_cards?.find(item => item.id === id);
      // An unrecognized ID or a revised short quote cannot identify this edition of the original card.
      if (!card || (archivedCard?.quote && archivedCard.quote !== card.quote) ||
          (archivedCard?.limits && archivedCard.limits !== card.limits)) {
        (node.facts ??= []).push({ label: '归档依据 · ' + id, value: archivedCard
          ? [archivedCard.quote, archivedCard.limits].filter(Boolean).join(' · ') || '原卡版本待核对'
          : '本机卡库未收录此编号' });
        continue;
      }
      used.add(id);
      const label = node.kind === 'brief' ? '目标采纳' : node.attemptId ? '冻结时采纳' : '保存时采纳';
      graph.edges.push(relation(evidenceId(id), node.id, label, 'reference'));
    }
  }
  appendPartQuestions(graph, used);
  // Withdrawing a goal removes its automatic edge. A separate, saved manual reference still needs its endpoint.
  const visible = new Set(graph.nodes.map(node => node.id));
  const evidenceKeys = new Map(library.cards.map(card => [evidenceId(card.id), card.id]));
  for (const edge of manual) {
    if (!(visible.has(edge.source) || evidenceKeys.has(edge.source)) ||
        !(visible.has(edge.target) || evidenceKeys.has(edge.target))) continue;
    for (const endpoint of [edge.source, edge.target]) {
      const id = evidenceKeys.get(endpoint);
      if (id) used.add(id);
    }
  }
  for (const id of used) graph.nodes.push(evidenceNode(byId.get(id)!));
}
