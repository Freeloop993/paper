// 设计画布工作区：一块画布加一个跟随所选步骤变化的面板。目标、依据、造型、参考图、生成、候选和取舍都作为卡片放在画布上。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { XYPosition } from '@xyflow/react';
import {
  ArrowLeftRight, BookOpen, Check, GitBranch, ImagePlus, Link2, Maximize2, PanelRightOpen, SlidersHorizontal, Sparkles, StickyNote, Trash2, X,
} from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { useWorkflowGraph, type WorkflowNode } from '../../design/workflowGraph';
import { recordDecision } from '../../design/candidateRecords';
import { referencePng, startDesignGeneration } from '../../design/generation';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import { useCanvasUi } from './canvasUi';
import DesignBoard, { type BoardHandle } from './DesignBoard';
import StepPanel, { type PanelOps, type PanelTab } from './StepPanel';
import type { BoardKit, StepAction } from './StepCards';

export type BoardId = 'history' | 'project';
interface Props {
  board: BoardId;
  research: boolean;
  initialSelected?: string | null;
  initialFocus?: 'goal' | 'design';
  onBoard: (board: BoardId, id?: string) => void;
  onResearch: (entry?: { attemptId?: string }) => void;
}

function CompareImages({ pictures, initial, onClose }: { pictures: WorkflowNode[]; initial: [string, string]; onClose: () => void }) {
  const [ids, setIds] = useState(initial);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = dialog.current; d?.showModal(); return () => { d?.close(); }; }, []);
  return <dialog ref={dialog} className="canvas-dialog canvas-comparison" onCancel={onClose} aria-labelledby="compare-title">
    <header><h2 id="compare-title">图片对照</h2><button className="canvas-icon-button" onClick={onClose} aria-label="关闭图片对照"><X size={18}/></button></header>
    <div className="canvas-compare-grid">{ids.map((id, side) => {
      const item = pictures.find(n => n.id === id);
      return <div key={side} className="canvas-compare-item">
        <label><span>{side === 0 ? '左图' : '右图'}</span><select aria-label={side === 0 ? '选择左图' : '选择右图'} value={id} onChange={event => setIds(old => side === 0 ? [event.target.value, old[1]] : [old[0], event.target.value])}>
          {pictures.map(n => <option key={n.id} value={n.id} disabled={ids[1 - side] === n.id}>{n.title}</option>)}
        </select></label>
        {item && <><div className="canvas-comparison-image"><WorkflowImage node={item} alt={item.title}/></div><p>{item.subtitle ?? item.source ?? item.title}</p></>}
      </div>;
    })}</div>
  </dialog>;
}

export default function CanvasWorkspace({ board, research, initialSelected, initialFocus, onBoard, onResearch }: Props) {
  const graph = useWorkflowGraph(board, research);
  const store = useDroneStore();
  const { task, activeVariant, variants, switchVariant, addVariant } = store;
  const ui = useCanvasUi();
  const historical = board === 'history';
  const [selectedId, setSelected] = useState<string | null>(initialSelected ?? null);
  const [panelOpen, setPanelOpen] = useState(() => window.matchMedia('(min-width: 900px)').matches || Boolean(initialSelected || initialFocus));
  const [tab, setTab] = useState<PanelTab>('step');
  const [compare, setCompare] = useState<[string, string] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [versionOf, setVersionOf] = useState<WorkflowNode | null>(null);
  const [versionName, setVersionName] = useState('');
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState<{ position: XYPosition; x: number; y: number } | null>(null);
  const [focusOnce, setFocusOnce] = useState(initialFocus);
  const [reveal, setReveal] = useState<string | null>(null);
  const [awaiting, setAwaiting] = useState<string | null>(null);
  const boardRef = useRef<BoardHandle>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const dropAt = useRef<XYPosition | null>(null);
  const selected = graph.nodes.find(node => node.id === selectedId);
  const brief = graph.nodes.find(node => node.kind === 'brief' && node.variantId === activeVariant);
  const draft = graph.nodes.find(node => node.isDraft && node.variantId === activeVariant);
  const variantKey = (id: string) => { const v = variants.find(item => item.id === id); return v?.workflowKey ?? v?.id ?? id; };
  const pictures = graph.nodes.filter(n => n.image);
  const fail = (e: unknown, fallback: string) => setError(e instanceof Error ? e.message : fallback);

  useEffect(() => { if (!message) return; const id = setTimeout(() => setMessage(''), 4500); return () => clearTimeout(id); }, [message]);
  useEffect(() => {
    if (!versionOf) return;
    const d = dialog.current; d?.showModal(); return () => d?.close();
  }, [versionOf]);
  // 从旧入口（#step=insight、#step=studio）进来时，直接选中对应的卡片。
  useEffect(() => {
    if (!focusOnce || historical) return;
    const target = focusOnce === 'goal' ? brief : draft;
    if (target) { setSelected(target.id); setPanelOpen(true); setFocusOnce(undefined); }
  }, [focusOnce, historical, brief, draft]);
  // 新放到画布上的卡片（例如证据卡）排好位置后，平移到能看见它。
  useEffect(() => {
    if (!reveal || !graph.nodes.some(n => n.id === reveal)) return;
    const id = requestAnimationFrame(() => { boardRef.current?.reveal(reveal); setReveal(null); });
    return () => cancelAnimationFrame(id);
  }, [reveal, graph.nodes]);
  // 刚提交的那一轮回图后，把候选图移进视野；设计者正在别处操作时不打扰。
  useEffect(() => {
    if (!awaiting) return;
    const output = graph.nodes.find(n => n.candidateId && n.attemptId === awaiting);
    const round = graph.nodes.find(n => n.id === 'run-' + awaiting);
    if (output) {
      if (!selectedId || selectedId === round?.id) { setSelected(output.id); setPanelOpen(true); setTab('step'); }
      setMessage('效果图已生成，放在这一轮的后面。'); setAwaiting(null);
    } else if (round?.progress === 'issue') setAwaiting(null);
  }, [awaiting, graph.nodes, selectedId]);
  // 关闭的添加菜单不挡住画布。
  useEffect(() => {
    if (!adding) return;
    const close = (event: Event) => { if (!(event.target as HTMLElement).closest?.('.cv-add-menu')) setAdding(null); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setAdding(null); };
    window.addEventListener('pointerdown', close, true); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('pointerdown', close, true); window.removeEventListener('keydown', key); };
  }, [adding]);

  const select = useCallback((id: string | null) => {
    setError('');
    // 再点一下已选中的卡片（例如在造型卡片里切视图、点部件）不打断正在进行的对话。
    if (id && id === selectedId) { setPanelOpen(true); return; }
    setSelected(id);
    if (!id) return;
    setPanelOpen(true); setTab('step');
    const node = graph.nodes.find(n => n.id === id);
    // 点另一个方向的目标、造型或待生成步骤，就切换到那个方向编辑。
    if (!historical && node && (node.isDraft || node.kind === 'brief' || node.pending) && node.variantId && node.variantId !== activeVariant) switchVariant(node.variantId);
  }, [graph.nodes, historical, activeVariant, switchVariant, selectedId]);

  /** 设计者指定了位置（双击空白处、拖入图片）就放在那里；从底部工具条添加时放在视野中央。有来源的卡片由画布自动放在来源旁边。 */
  function settle(id: string, size: { width: number; height: number }, at?: XYPosition) {
    if (at) { boardRef.current?.place(id, at); return; }
    const c = boardRef.current?.center() ?? { x: 0, y: 0 };
    boardRef.current?.place(id, { x: c.x - size.width / 2, y: c.y - size.height / 2 }, size);
    setReveal(id);
  }
  async function addGenerate(parentNodeId?: string) {
    if (!draft) return;
    try {
      const id = await graph.addStep(variantKey(activeVariant), parentNodeId);
      setSelected('run-' + id); setPanelOpen(true); setTab('step');
    } catch (e) { fail(e, '无法添加生成步骤。'); }
  }
  async function run(node: WorkflowNode) {
    const step = graph.records.steps.find(item => item.id === node.recordId);
    if (!step || starting.has(step.id)) return;
    if (!['http:', 'https:'].includes(window.location.protocol)) { setError('在线生成需要从本机工作台服务打开页面。离线包可以继续编辑、保存版本和导出规格。'); return; }
    setStarting(current => new Set(current).add(step.id)); setError('');
    try {
      if (node.variantId && node.variantId !== activeVariant) switchVariant(node.variantId);
      const parent = step.parentNodeId ? graph.full.nodes.find(n => n.id === step.parentNodeId) : undefined;
      let reference: { id: string; file: Blob } | undefined;
      if (parent && !parent.candidateId) {
        if (!parent.image) throw new Error('参考图还没有读取完成，请稍后再试。');
        reference = { id: parent.id, file: await referencePng(await (await fetch(parent.image)).blob()) };
      }
      const goal = (node.detail ?? step.goal).trim();
      await startDesignGeneration({ id: step.id, task, goal, parentCandidateId: parent?.candidateId, reference });
      await graph.removeStep(step.id);
      setAwaiting(step.id);
      setMessage('已提交生成。可以继续调整造型，回图会出现在这张卡片后面。');
    } catch (e) { fail(e, '生成未能开始。'); }
    finally { setStarting(current => { const next = new Set(current); next.delete(step.id); return next; }); }
  }
  async function addNote(at?: XYPosition) {
    try {
      const id = await graph.addNote();
      settle(id, { width: 220, height: 168 }, at);
      setSelected(id);
    } catch (e) { fail(e, '便签没有保存。'); }
  }
  async function addImages(files: File[], at?: XYPosition) {
    let position = at;
    for (const file of files) {
      try {
        const id = await graph.addImage(file);
        settle(id, { width: 236, height: 268 }, position);
        if (position) position = { x: position.x + 28, y: position.y + 28 };
        setSelected(id); setPanelOpen(true); setMessage('参考图已放到画布上。把它连到「生成」卡片，就随那一轮提交。');
      } catch (e) { fail(e, '图片导入失败。'); }
    }
  }
  function newDirection() {
    if (variants.length >= 6) { setError('画布上最多并排六个方向。'); return; }
    addVariant();
    setSelected(null); setMessage('已把当前方向复制为新方向，并排放在画布上。');
    // 新方向的卡片在下一次渲染后出现。
    setFocusOnce('design');
  }
  async function pin(cardId: string) {
    if (!brief) return;
    try { setReveal(await graph.pinEvidence(cardId, brief.id)); setMessage('证据卡 ' + cardId + ' 已放到画布上，连着当前目标。'); }
    catch (e) { fail(e, '无法放置这张证据卡。'); }
  }
  async function connect(from: string, to: string) {
    const target = graph.nodes.find(n => n.id === to), source = graph.nodes.find(n => n.id === from);
    try {
      if (target?.pending && target.recordId && source?.image) {
        await graph.updateStep(target.recordId, { parentNodeId: from });
        setSelected(to); setMessage('这张图将随这一轮生成一起提交。');
      } else {
        await graph.addReference(from, to);
        setMessage('已添加参考关系'); setSelected(to);
      }
      setError('');
    } catch (e) { fail(e, '无法添加这条关联。'); }
  }
  function openVersion(nodeId: string) {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node?.canBranch) return;
    setVersionName(''); setVersionOf(node); setError('');
  }
  async function saveVersion() {
    if (!versionOf || busy) return;
    setBusy(true);
    try {
      const id = await graph.saveBranch(versionOf.id, versionName.trim() || undefined);
      // 从造型草稿存版本后留在造型上继续改；从旧版本另存分支时选中新分支。
      if (!versionOf.isDraft) setSelected(id);
      setVersionOf(null); setMessage(versionOf.isDraft ? '版本已保存在造型卡片下方，可以继续改造型。' : '分支已保存。');
    } catch (e) { fail(e, '版本保存失败。'); }
    finally { setBusy(false); }
  }
  async function restore(id: string) {
    try {
      await graph.restoreSnapshot(id);
      setError(''); setMessage('已载入所选版本，继续在「造型」卡片上修改。');
      setFocusOnce('design');
    } catch (e) { fail(e, '无法从此版本继续。'); }
  }
  async function keep(node: WorkflowNode) {
    if (!node.attemptId || !node.candidateId) return;
    try { await recordDecision(node.attemptId, 'accept', '设计者选择保留此方案。', node.candidateId, undefined, true); setMessage('已保留这张候选。'); }
    catch (e) { fail(e, '取舍没有保存。'); }
  }
  async function removeNode(node: WorkflowNode) {
    try {
      if (node.pending && node.recordId) await graph.removeStep(node.recordId);
      else if (node.editable && node.recordId) await graph.removeNote(node.recordId);
      else if (node.removable) await graph.removeImage(node.id);
      else return;
      setSelected(null);
    } catch (e) { fail(e, '无法移除。'); }
  }
  function startCompare(node?: WorkflowNode) {
    if (pictures.length < 2) { setError('画布上至少要有两张图才能对照。'); return; }
    const upper = historical && pictures.find(n => n.id === 'b2-upper');
    const lower = historical && pictures.find(n => n.id === 'b2-lower');
    const left = upper || (node?.image ? node : undefined) || pictures.find(n => n.id === selectedId) || pictures[0];
    const right = lower && lower.id !== left.id ? lower : pictures.find(n => n.id !== left.id)!;
    setCompare([left.id, right.id]);
  }
  async function copyReference(node: WorkflowNode) {
    if (busy) return;
    setBusy(true);
    try { const id = await graph.copyHistoryImage(node.id); onBoard('project', id); }
    catch (e) { fail(e, '无法复制这张参考图。'); }
    finally { setBusy(false); }
  }

  /** 选中卡片后出现在它上方的下一步。点一下，新卡片自动接在后面。 */
  function actionsFor(node: WorkflowNode): StepAction[] {
    if (historical) return node.image ? [{ id: 'cite', label: '引用到我的项目', icon: Link2, primary: true, run: () => void copyReference(node) }] : [];
    const mine = node.variantId === activeVariant;
    const zoom: StepAction = { id: 'focus', label: '放大', icon: Maximize2, title: '把这张卡片放大到便于操作', run: () => boardRef.current?.focus(node.id, true) };
    if (node.kind === 'brief' && mine) return [
      { id: 'evidence', label: '查用户依据', icon: BookOpen, title: '在右侧检索全部公开短引，把合适的卡放到画布上', run: () => {
        setPanelOpen(true); setTab('step');
        requestAnimationFrame(() => {
          const library = document.querySelector<HTMLDetailsElement>('[data-testid=research-library]');
          if (library) { library.open = true; library.scrollIntoView({ block: 'start' }); library.querySelector('input')?.focus({ preventScroll: true }); }
        });
      } },
      { id: 'to-design', label: '去定造型', icon: SlidersHorizontal, primary: true, run: () => draft && select(draft.id) },
    ];
    if (node.isDraft && mine) return [
      { id: 'generate', label: '生成效果图', icon: Sparkles, primary: true, run: () => void addGenerate() },
      { id: 'branch', label: '另开方向', icon: GitBranch, title: '把当前方向复制一份，并排放在画布上', disabled: variants.length >= 6, run: newDirection },
      { id: 'version', label: '存为版本', icon: Check, run: () => openVersion(node.id) },
      zoom,
    ];
    if (node.kind === 'run' && node.pending) return [{ id: 'remove', label: '移除这一步', icon: Trash2, run: () => void removeNode(node) }];
    if (node.kind === 'run') return [{ id: 'again', label: '再生成一轮', icon: Sparkles, primary: true, run: () => void addGenerate() }];
    if (node.candidateId) return [
      { id: 'keep', label: node.retained ? '已保留' : '保留', icon: Check, primary: !node.retained, disabled: node.retained || !node.firstShown, run: () => void keep(node) },
      { id: 'continue', label: '以此图继续', icon: Sparkles, primary: !!node.retained, disabled: !node.firstShown, run: () => void addGenerate(node.id) },
      { id: 'compare', label: '对照', icon: ArrowLeftRight, run: () => startCompare(node) },
    ];
    if (node.kind === 'spec' && node.canRestore) return [
      { id: 'restore', label: '从此版本继续', icon: Check, primary: true, run: () => void restore(node.id) },
      { id: 'version', label: '存为分支', icon: GitBranch, run: () => openVersion(node.id) },
    ];
    if (node.image && node.removable) return [
      { id: 'use', label: '以此图生成', icon: Sparkles, primary: true, run: () => void addGenerate(node.id) },
      { id: 'compare', label: '对照', icon: ArrowLeftRight, run: () => startCompare(node) },
      { id: 'remove', label: '移除', icon: Trash2, run: () => void removeNode(node) },
    ];
    if (node.editable) return [{ id: 'remove', label: '移除', icon: Trash2, run: () => void removeNode(node) }];
    return [];
  }

  const kit: BoardKit = {
    editable: !historical, activeVariant, variantCount: variants.length, starting,
    onSelect: select,
    onRun: node => void run(node),
    onNoteChange: (id, text) => void graph.updateNote(id, text).catch(e => fail(e, '便签没有保存。')),
    actionsFor,
  };
  const pinned = useMemo(() => new Set(graph.nodes.filter(n => n.kind === 'evidence').map(n => n.id.replace(/^evidence-/, ''))), [graph.nodes]);
  const ops: PanelOps = {
    select, addGenerate: parent => void addGenerate(parent), run: node => void run(node), removeStep: node => void removeNode(node),
    setStepGoal: (id, goal) => void graph.updateStep(id, { goal }).catch(e => fail(e, '这一轮的目标没有保存。')),
    setStepParent: (id, parentNodeId) => void graph.updateStep(id, { parentNodeId }).catch(e => fail(e, '参考图没有更新。')),
    keep: node => void keep(node), compare: startCompare, saveVersion: openVersion, restore: id => void restore(id), newDirection,
    removeNode: node => void removeNode(node),
    removeReference: id => void graph.removeReference(id).then(() => setMessage('已移除参考关系')).catch(e => fail(e, '无法移除关联。')),
    copyReference: node => void copyReference(node),
    openResearch: node => onResearch(node?.attemptId ? { attemptId: node.attemptId } : undefined),
    report: setMessage, pins: { pinned, onPin: id => void pin(id) },
  };
  const dock = [
    { id: 'goal', label: '目标', icon: BookOpen, title: '写下或修改这次的设计目标，查用户依据', run: () => brief && select(brief.id) },
    { id: 'image', label: '参考图', icon: ImagePlus, title: '把一张图片放到画布上作参考', run: () => { dropAt.current = null; upload.current?.click(); } },
    { id: 'note', label: '便签', icon: StickyNote, title: '在画布上记一条想法', run: () => void addNote() },
    { id: 'direction', label: '新方向', icon: GitBranch, title: '把当前方向复制一份，并排继续改', run: newDirection },
  ];

  return <section className="cv-workspace" aria-label="设计画布" data-testid="workflow-workspace" data-board-id={board}>
    <input className="sr-only" ref={upload} type="file" accept="image/png,image/jpeg,image/webp" multiple aria-label="导入参考图片" tabIndex={-1} onChange={event => {
      const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = '';
      if (files.length) void addImages(files, dropAt.current ?? undefined);
    }}/>
    <div className={"cv-layout" + (panelOpen ? " has-panel" : "")}>
      <div className="cv-stage-area">
        <DesignBoard ref={boardRef} nodes={graph.nodes} edges={graph.edges} boardId={board} selectedId={selectedId} kit={kit} showLabels={historical || research} loading={graph.loading}
          onSelect={select} onOpen={id => boardRef.current?.focus(id, true)} onConnect={historical ? undefined : (from, to) => void connect(from, to)}
          onAddAt={historical ? undefined : (position, screen) => setAdding({ position, ...screen })}
          onDropFiles={historical ? undefined : (files, position) => void addImages(files, position)}/>
        {!historical && <nav className="cv-dock" aria-label="添加到画布" data-testid="canvas-dock">
          {dock.map(item => <button key={item.id} type="button" title={item.title} data-dock={item.id} onClick={item.run}><item.icon size={16}/><span>{item.label}</span></button>)}
          <i/>
          <button type="button" className="is-primary" data-dock="generate" data-testid="canvas-generate" disabled={!draft} title="在当前造型后面加一个生成步骤" onClick={() => void addGenerate()}><Sparkles size={16}/><span>生成效果图</span></button>
        </nav>}
        {historical && <nav className="cv-dock" aria-label="案例操作">
          {pictures.length >= 2 && <button type="button" data-testid="compare-images" onClick={() => startCompare()}><ArrowLeftRight size={16}/><span>图片对照</span></button>}
          <i/><button type="button" className="is-primary" onClick={() => onBoard('project')}><span>进入我的项目</span></button>
        </nav>}
        {adding && <div className="cv-add-menu" role="menu" aria-label="添加到这里" style={{ left: adding.x, top: adding.y }}>
          <button type="button" role="menuitem" onClick={() => { const at = adding.position; setAdding(null); void addNote(at); }}><StickyNote size={15}/>便签</button>
          <button type="button" role="menuitem" onClick={() => { dropAt.current = adding.position; setAdding(null); upload.current?.click(); }}><ImagePlus size={15}/>参考图</button>
          <button type="button" role="menuitem" onClick={() => { setAdding(null); newDirection(); }}><GitBranch size={15}/>新方向</button>
          <button type="button" role="menuitem" onClick={() => { setAdding(null); void addGenerate(); }}><Sparkles size={15}/>生成效果图</button>
        </div>}
        {!panelOpen && <button type="button" className="cv-panel-open" onClick={() => setPanelOpen(true)} aria-label="展开步骤面板" data-testid="panel-open"><PanelRightOpen size={16}/><span>{selected ? '编辑这一步' : '步骤与对话'}</span></button>}
        {(error || graph.error) && !versionOf && <div className="graph-feedback issue" role="alert">{error || graph.error}{error && <button aria-label="关闭提示" onClick={() => setError('')}><X size={13}/></button>}</div>}
        {!error && message && <div className="graph-feedback" role="status"><Check size={14}/>{message}</div>}
        {graph.loading && graph.nodes.length === 0 && <div role="status" className="graph-loading">正在读取本机设计记录…</div>}
      </div>
      {panelOpen && <StepPanel board={board} node={selected} nodes={graph.nodes} edges={graph.edges} attempts={graph.attempts} steps={graph.records.steps} starting={starting}
        tab={tab} onTab={setTab} onClose={() => { setPanelOpen(false); ui.setPreview(null); }} ops={ops}/>}
    </div>
    {compare && <CompareImages pictures={pictures} initial={compare} onClose={() => setCompare(null)}/>}
    {versionOf && <dialog className="canvas-dialog branch-dialog" ref={dialog} onCancel={event => { if (busy) event.preventDefault(); else setVersionOf(null); }} aria-labelledby="branch-title">
      <header><h2 id="branch-title">保存方案版本</h2><button disabled={busy} className="canvas-icon-button" onClick={() => setVersionOf(null)} aria-label="关闭"><X size={17}/></button></header>
      <form onSubmit={event => { event.preventDefault(); void saveVersion(); }}>
        <p>来源 · {versionOf.title}</p><label>版本名称<input autoFocus value={versionName} maxLength={90} placeholder="例如，保留轴位，增加机身宽度" onChange={event => setVersionName(event.target.value)}/></label>
        {error && <p role="alert">{error}</p>}<div><button type="button" disabled={busy} className="canvas-action" onClick={() => setVersionOf(null)}>取消</button><button className="canvas-action primary" disabled={busy}>{busy ? '正在保存' : '保存版本'}</button></div>
      </form>
    </dialog>}
  </section>;
}
