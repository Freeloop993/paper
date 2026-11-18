import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DroneStoreContext, type Snapshot } from '../store/droneStore';
import { listAttempts, type FrozenAttempt } from './candidateRecords';
import { attemptImages } from './workflow/attempts';
import { historyGraph } from './workflow/history';
import { buildProject, designerView, nodeSnapshot, type ProjectDraft } from './workflow/project';
import { referenceProblem, type WorkflowBoard, type WorkflowNode } from './workflow/types';
import { emptyRecords, newWorkflowId, readRecords, updateRecords, workflowChannel } from './workflow/workspaceRecords';

export type { WorkflowBoard, WorkflowEdge, WorkflowGraph, WorkflowNode } from './workflow/types';

function useImages(attempts: FrozenAttempt[], records: ReturnType<typeof emptyRecords>) {
  const files = useMemo(() => {
    const byId = attemptImages(attempts);
    for (const i of records.images) if (i.file) byId.set(i.id, i.file);
    return byId;
  }, [attempts, records.images]);
  const cache = useRef(new Map<string, string>());
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());
  useEffect(() => {
    const current = cache.current;
    let changed = false;
    for (const [id, url] of current) if (!files.has(id)) {
      URL.revokeObjectURL(url);
      current.delete(id);
      changed = true;
    }
    for (const [id, file] of files) if (!current.has(id)) {
      current.set(id, URL.createObjectURL(file));
      changed = true;
    }
    if (changed) setUrls(new Map(current));
  }, [files]);
  useEffect(() => {
    const current = cache.current;
    return () => { for (const url of current.values()) URL.revokeObjectURL(url); current.clear(); };
  }, []);
  return urls;
}

function asDraft(s: ProjectDraft, id: string, snapshot: Snapshot): ProjectDraft {
  return { ...s, ...snapshot, activeVariant: id,
    variants: s.variants.map(v => v.id === s.activeVariant ? { ...v, snapshot: {
      parameters: s.parameters, intent: s.intent, touched: s.touched, designChatAudit: s.designChatAudit, workflowOrigin: s.workflowOrigin,
    } } : v) };
}
function editableVariant(draft: ProjectDraft, node: WorkflowNode) {
  return draft.variants.find(v => v.id === node.variantId)?.id ?? draft.activeVariant;
}
function message(error: unknown) { return error instanceof Error ? error.message : String(error); }

export function useWorkflowGraph(board: WorkflowBoard, research = false) {
  const bound = useContext(DroneStoreContext);
  const draft = bound(), task = draft.task;
  const [attempts, setAttempts] = useState<FrozenAttempt[]>([]);
  const [records, setRecords] = useState(emptyRecords);
  const [loading, setLoading] = useState(board === 'project');
  const [error, setError] = useState<string | null>(null);
  const images = useImages(attempts, records);
  const full = useMemo(() => board === 'history' ? historyGraph : buildProject(draft, attempts, records, images),
    [board, draft, attempts, records, images]);
  const graph = useMemo(() => board === 'history' || research ? full : designerView(full, task), [board, research, full, task]);

  useEffect(() => {
    setError(null);
    if (board !== 'project') { setLoading(false); return; }
    let alive = true, serial = 0;
    setLoading(true);
    const refresh = async () => {
      const call = ++serial;
      const [versions, rounds] = await Promise.allSettled([readRecords(task), listAttempts()]);
      if (!alive || call !== serial) return;
      if (versions.status === 'fulfilled') setRecords(versions.value);
      if (rounds.status === 'fulfilled') setAttempts(rounds.value);
      const errors = [versions, rounds].flatMap(r => r.status === 'rejected' ? [message(r.reason)] : []);
      setError(errors.length ? errors.join(' · ') : null);
      setLoading(false);
    };
    const imageError = (e: Event) => setError((e as CustomEvent<string>).detail);
    const channel = workflowChannel();
    if (channel) channel.onmessage = e => { if (e.data === task) void refresh(); };
    window.addEventListener('workflow-record-change', refresh);
    window.addEventListener('candidate-record-change', refresh);
    window.addEventListener('workflow-image-error', imageError);
    window.addEventListener('focus', refresh);
    void refresh();
    return () => {
      alive = false;
      channel?.close();
      window.removeEventListener('workflow-record-change', refresh);
      window.removeEventListener('candidate-record-change', refresh);
      window.removeEventListener('workflow-image-error', imageError);
      window.removeEventListener('focus', refresh);
    };
  }, [board, task]);

  function projectOnly() {
    if (board !== 'project') throw new Error('历史档案只读。请在当前项目中编辑。');
  }
  function selected(nodeId: string) {
    projectOnly();
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) throw new Error('未找到所选节点。');
    return node;
  }
  function loadDraft(variant: string, snapshot: Snapshot) {
    const current = bound.getState();
    if (current.variants.some(v => v.id === variant) && current.activeVariant !== variant) current.switchVariant(variant);
    bound.getState().importSnapshot(snapshot);
  }

  async function saveBranch(sourceId: string, title?: string) {
    const node = selected(sourceId);
    if (!node.canBranch) throw new Error('请选择参数草稿或保存的规格版本。');
    const id = newWorkflowId('version');
    const before = bound.getState(), variant = editableVariant(before, node);
    const snapshot = nodeSnapshot(node);
    const parentId = node.isDraft ? node.parentId : node.id;
    const editing = { ...snapshot, workflowOrigin: { task, id } };
    const next = await updateRecords(task, latest => {
      latest.branches.push({ id, title: title?.trim() || '规格版本 ' + (latest.branches.length + 1),
        parentId, copied: !node.isDraft, snapshot, variantId: variant, createdAt: new Date().toISOString() });
      buildProject(asDraft(before, variant, editing), attempts, latest, images, true);
    });
    setRecords(next);
    // Preserve edits made while the browser was writing this draft's immutable version.
    const current = bound.getState();
    if (node.isDraft && current.activeVariant === variant && before.activeVariant === variant &&
      current.workflowOrigin?.id === before.workflowOrigin?.id) {
      bound.setState({ workflowOrigin: editing.workflowOrigin });
    } else if (current.activeVariant === before.activeVariant && current.parameters === before.parameters && current.intent === before.intent &&
      current.workflowOrigin?.id === before.workflowOrigin?.id) {
      loadDraft(variant, editing);
    }
    return id;
  }

  async function restoreSnapshot(nodeId: string) {
    const node = selected(nodeId);
    if (!node.canRestore) throw new Error('请选择已经保存或冻结的规格。');
    const snapshot = { ...nodeSnapshot(node), workflowOrigin: { task, id: nodeId } };
    const latest = await readRecords(task);
    const current = bound.getState(), variant = editableVariant(current, node);
    buildProject(asDraft(current, variant, snapshot), attempts, latest, images, true);
    loadDraft(variant, snapshot);
  }

  async function addImage(file: File, title?: string) {
    projectOnly();
    if (!file || !file.size) throw new Error('请选择图像文件。');
    const preview = new Image(), url = URL.createObjectURL(file);
    try { preview.src = url; await preview.decode(); }
    catch { throw new Error('浏览器无法读取这张图片。'); }
    finally { URL.revokeObjectURL(url); }
    const id = newWorkflowId('reference');
    setRecords(await updateRecords(task, latest => {
      latest.images.push({ id, file, title: title?.trim() || file.name, createdAt: new Date().toISOString() });
    }));
    return id;
  }

  async function copyHistoryImage(nodeId: string) {
    const origin = historyGraph.nodes.find(n => n.id === nodeId);
    if (!origin?.image) throw new Error('此历史节点没有归档图像。');
    let id = newWorkflowId('reference');
    const next = await updateRecords(task, latest => {
      const prior = latest.images.find(img => img.historyNodeId === nodeId);
      if (prior) { id = prior.id; return; }
      latest.images.push({ id, title: origin.title, historyNodeId: nodeId, createdAt: new Date().toISOString() });
    });
    setRecords(next);
    return id;
  }

  async function addReference(sourceId: string, targetId: string, label?: string) {
    projectOnly();
    const id = newWorkflowId('link');
    setRecords(await updateRecords(task, latest => {
      const g = buildProject(bound.getState(), attempts, latest, images);
      const problem = referenceProblem(g, sourceId, targetId);
      if (problem) throw new Error(problem);
      latest.references.push({ id, source: sourceId, target: targetId, label: label?.trim() || '手动引用',
        kind: 'manual', removable: true });
    }));
    return id;
  }
  async function removeReference(id: string) {
    projectOnly();
    setRecords(await updateRecords(task, latest => {
      if (!latest.references.some(e => e.id === id)) throw new Error('只能撤回这张画布中的手动引用。');
      latest.references = latest.references.filter(e => e.id !== id);
    }));
  }

  /** 把一张公开证据卡放到画布上，并连到指定节点（通常是设计目标）。 */
  async function pinEvidence(cardId: string, targetId: string) {
    projectOnly();
    const source = 'evidence-' + cardId, id = newWorkflowId('link');
    setRecords(await updateRecords(task, latest => {
      if (latest.references.some(e => e.source === source && e.target === targetId)) return;
      latest.references.push({ id, source, target: targetId, label: '参考依据', kind: 'manual', removable: true });
    }));
    return source;
  }
  async function removeImage(id: string) {
    projectOnly();
    setRecords(await updateRecords(task, latest => {
      latest.images = latest.images.filter(img => img.id !== id);
      latest.references = latest.references.filter(e => e.source !== id && e.target !== id);
      for (const step of latest.steps) if (step.parentNodeId === id) delete step.parentNodeId;
    }));
  }

  async function addNote(text = '') {
    projectOnly();
    const id = newWorkflowId('note');
    setRecords(await updateRecords(task, latest => { latest.notes.push({ id, text, createdAt: new Date().toISOString() }); }));
    return id;
  }
  async function updateNote(id: string, text: string) {
    projectOnly();
    setRecords(await updateRecords(task, latest => {
      const note = latest.notes.find(n => n.id === id);
      if (note) note.text = text.slice(0, 2000);
    }));
  }
  async function removeNote(id: string) {
    projectOnly();
    setRecords(await updateRecords(task, latest => {
      latest.notes = latest.notes.filter(n => n.id !== id);
      latest.references = latest.references.filter(e => e.source !== id && e.target !== id);
    }));
  }

  /** 在画布上放一个待生成步骤。提交前可以改这一轮的目标和参考图。 */
  async function addStep(variantKey: string, parentNodeId?: string) {
    projectOnly();
    const id = crypto.randomUUID();
    setRecords(await updateRecords(task, latest => {
      latest.steps.push({ id, variantKey, parentNodeId, goal: '', createdAt: new Date().toISOString() });
    }));
    return id;
  }
  async function updateStep(id: string, change: { goal?: string; parentNodeId?: string | null }) {
    projectOnly();
    setRecords(await updateRecords(task, latest => {
      const step = latest.steps.find(item => item.id === id);
      if (!step) return;
      if (change.goal !== undefined) step.goal = change.goal.slice(0, 1600);
      if (change.parentNodeId === null) delete step.parentNodeId;
      else if (change.parentNodeId) step.parentNodeId = change.parentNodeId;
    }));
  }
  async function removeStep(id: string) {
    projectOnly();
    setRecords(await updateRecords(task, latest => { latest.steps = latest.steps.filter(item => item.id !== id); }));
  }

  return { ...graph, full, attempts, records, loading, error, saveBranch, restoreSnapshot, addImage, copyHistoryImage, addReference, removeReference,
    pinEvidence, removeImage, addNote, updateNote, removeNote, addStep, updateStep, removeStep };
}
