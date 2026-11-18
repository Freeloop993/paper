import { useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowDownRight, ArrowRight, ArrowUpLeft, CheckCheck, ChevronRight, ExternalLink,
  FileText, GitBranch, Image as ImageIcon, Layers, Link2, LockKeyhole, Maximize2,
  MessageCircle, PanelRight, Pencil, Quote, SlidersHorizontal, StickyNote, Unlink, Workflow, X,
} from 'lucide-react';
import { computeLayout, layoutKey } from '../../design/design';
import { fields, fieldStatus, isRelevant, statusLabel } from '../../design/fields';
import type { WorkflowBoard, WorkflowEdge, WorkflowNode } from '../../design/workflowGraph';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import { DroneStoreContext, useDroneStore } from '../../store/droneStore';
import { GuideView } from '../Studio/Stage';
import DesignChat, { type DesignChatContext, type WidthPreview } from '../Studio/DesignChat';
import './graph-inspector.css';

interface GraphInspectorProps {
  node?: WorkflowNode | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  boardId: WorkflowBoard;
  onSelect: (nodeId: string) => void;
  onBranch: (sourceId: string) => void;
  onRestore: (nodeId: string) => void;
  onEdit: () => void;
  onEditBrief?: () => void;
  onHandoff: (node?: WorkflowNode) => void;
  onContinueCandidate?: (node: WorkflowNode) => void;
  onRemoveReference?: (edgeId: string) => void;
  onCopyReference?: (node: WorkflowNode) => void;
}

const kinds = {
  brief: { title: '设计目标', icon: FileText },
  evidence: { title: '证据卡', icon: Quote },
  spec: { title: '参数规格', icon: SlidersHorizontal },
  run: { title: '生成轮次', icon: Workflow },
  image: { title: '图像', icon: ImageIcon },
  decision: { title: '取舍记录', icon: CheckCheck },
  edit: { title: '人工编辑', icon: Pencil },
  note: { title: '笔记', icon: StickyNote },
} as const;

function Picture({ node }: { node: WorkflowNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  if (!node.image && !node.parameters) return null;
  const isGuide = !node.image;
  const label = isGuide ? '参数布局条件图' : node.title;
  const renderPicture = () => node.image
    ? <WorkflowImage node={node} alt={label} className="gi-picture-image" />
    : <GuideView layout={computeLayout(node.parameters!)} className="gi-picture-image" />;
  return <>
    <button type="button" className={'gi-picture' + (isGuide ? ' gi-guide' : '')} aria-label={'放大查看' + label} onClick={() => {
      setOpen(true);
      dialog.current?.showModal();
    }}>
      {renderPicture()}
      <span className="gi-picture-zoom" aria-hidden="true"><Maximize2 size={13}/></span>
      {isGuide && <span className="gi-picture-label">{label}</span>}
    </button>
    <dialog ref={dialog} aria-label={label} className="gi-lightbox" onClose={() => setOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {open && <div className="gi-lightbox-inner">
        <header><strong>{label}</strong><button type="button" aria-label="关闭大图" onClick={() => dialog.current?.close()}><X size={19}/></button></header>
        {renderPicture()}
      </div>}
    </dialog>
  </>;
}

function Relations({ node, nodes, edges, onSelect, onRemoveReference }: Pick<GraphInspectorProps, 'nodes'|'edges'|'onSelect'|'onRemoveReference'> & { node: WorkflowNode }) {
  const linked = new Map(nodes.map(item => [item.id, item]));
  const connections = edges.filter(edge => (edge.source === node.id && linked.has(edge.target)) || (edge.target === node.id && linked.has(edge.source)));
  return <section className="gi-section" aria-label="节点关系">
    <h3><GitBranch size={15}/>节点关系<span className="gi-count">{connections.length}</span></h3>
    {connections.length ? ['in', 'out'].map(direction => {
      const incoming = direction === 'in';
      const group = connections.filter(edge => (incoming ? edge.target : edge.source) === node.id);
      if (group.length === 0) return null;
      const Icon = incoming ? ArrowUpLeft : ArrowDownRight;
      return <div className="gi-relation-group" key={direction}>
        <h4><Icon size={13}/>{incoming ? '上游' : '下游'}</h4>
        <ul>{group.map(edge => {
          const other = linked.get(incoming ? edge.source : edge.target)!;
          const KindIcon = kinds[other.kind].icon;
          return <li key={edge.id}>
            <button type="button" className="gi-relation" onClick={() => onSelect(other.id)} data-related-node={other.id}>
              <span className={'gi-type-icon gi-type-' + other.kind}><KindIcon size={15}/></span>
              <span className="gi-relation-text"><strong>{other.title}</strong><small>{edge.label}</small></span>
              <ChevronRight size={14} className="gi-chevron"/>
            </button>
            {edge.removable && onRemoveReference && <button type="button" className="gi-unlink" onClick={() => onRemoveReference(edge.id)}
              aria-label={'移除与' + other.title + '的参考关系'} title="移除参考关系"><Unlink size={14}/></button>}
          </li>;
        })}</ul>
      </div>;
    }) : <p className="gi-muted">尚无关联节点。</p>}
  </section>;
}

function WidthDiagram({ current, preview, length }: { current: number; preview: number; length: number }) {
  const w = Math.max(current, preview);
  const pad = Math.max(w, length) * .1;
  return <figure className="gi-width-preview" data-testid="graph-width-preview">
    <svg viewBox={[-w/2-pad, -length/2-pad, w+2*pad, length+2*pad].join(' ')}
      role="img" aria-label={'机身顶视包络宽度由 ' + current + ' 毫米试调至 ' + preview + ' 毫米'}>
      <rect x={-current/2} y={-length/2} width={current} height={length} fill="#e0e7e5" stroke="#7b8e87" vectorEffect="non-scaling-stroke"/>
      <rect x={-preview/2} y={-length/2} width={preview} height={length} fill="#107c6822" stroke="#087663" strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke"/>
    </svg>
    <figcaption><strong>机身顶视包络</strong><span>实线 {current} mm · 虚线 {preview} mm</span></figcaption>
  </figure>;
}

function DraftChat({ node }: { node: WorkflowNode }) {
  const store = useContext(DroneStoreContext);
  const { parameters, intent, touched, activeVariant } = useDroneStore();
  const [scope, setScope] = useState({ parameters, intent, touched, revision: 1 });
  if (scope.parameters !== parameters || scope.intent !== intent || scope.touched !== touched) {
    setScope({ parameters, intent, touched, revision: scope.revision + 1 });
  }
  const [preview, setPreview] = useState<WidthPreview | null>(null);
  const task = intent.taskId ?? 'consumer_camera';
  const frame = parameters.frame.frame_type;
  const layout = layoutKey(frame);
  const approved = [...intent.log].reverse().find(item => item.brief && ['accept', 'custom'].includes(item.brief.action)
    && item.brief.text === intent.note && item.brief.query.task === task && item.brief.query.layout === layout)?.brief;
  const { width, length } = parameters.fuselage.fuselage_dimensions_mm;
  const context: DesignChatContext = {
    task, layout, frame, part: 'fuselage', view: 'top', widthMm: width, version: activeVariant + '-' + scope.revision,
    brief: intent.note.trim().slice(0, 600) || undefined, topic: approved?.query.topic, state: approved?.query.state,
  };
  const visible = preview?.version === context.version ? preview : null;
  return <div className="gi-chat">
    {visible && <WidthDiagram current={width} preview={visible.width} length={length}/>}
    <DesignChat context={context} variant={activeVariant} scopeLabel={'机身顶视 · 当前宽度 ' + width + ' mm'}
      preview={visible} onPreview={setPreview}
      onApply={(version, suggestion) => {
        const current = store.getState();
        if (version !== context.version || current.activeVariant !== node.variantId || current.parameters !== parameters
          || current.intent !== intent || current.touched !== touched || suggestion.from !== width) return false;
        current.setField('fuselage.fuselage_dimensions_mm.width', suggestion.to);
        setPreview(null);
        return true;
      }}/>
  </div>;
}

function Source({ node }: { node: WorkflowNode }) {
  const facts = node.facts ?? [];
  if (!node.source && !node.sourceUrl && !facts.length && !node.createdAt) return null;
  const stamp = node.createdAt && new Date(node.createdAt);
  const created = stamp && Number.isFinite(stamp.getTime())
    ? stamp.toLocaleString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : node.createdAt;
  return <section className="gi-section gi-source" aria-label="来源与记录">
    <h3><Link2 size={15}/>来源与记录</h3>
    {node.source && <p className="gi-source-name">{node.source}</p>}
    {created && <p className="gi-muted">{created}</p>}
    {node.sourceUrl && <a className="gi-source-link" href={node.sourceUrl} target="_blank" rel="noreferrer">查看来源<ExternalLink size={12}/></a>}
    {facts.length > 0 && <details className="gi-facts">
      <summary>{node.kind === 'evidence' ? '查看原卡' : '查看记录字段'}<span>{facts.length} 项</span></summary>
      <dl>{facts.map(({ label, value }, i) => <div key={label + i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </details>}
  </section>;
}

function Parameters({ node }: { node: WorkflowNode }) {
  const { parameters, touched } = node;
  if (!parameters) return null;
  const visibleFields = fields.filter(field => isRelevant(field, parameters));
  return <details className="gi-facts gi-parameters">
    <summary>查看参数规格<span>{visibleFields.length} 项</span></summary>
    <dl>{visibleFields.map(field => <div key={field.path}>
      <dt>{field.label}</dt>
      <dd>{field.format(parameters)}<small>{statusLabel[fieldStatus(field, parameters, touched ?? {})]}</small></dd>
    </div>)}</dl>
  </details>;
}

export default function GraphInspector({ node, nodes, edges, boardId, onSelect, onBranch, onRestore, onEdit, onEditBrief, onHandoff, onContinueCandidate, onRemoveReference, onCopyReference }: GraphInspectorProps) {
  const { activeVariant } = useDroneStore();
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const id = useId();
  const title = useRef<HTMLHeadingElement>(null);
  const followingRelation = useRef(false);
  useLayoutEffect(() => {
    if (followingRelation.current) title.current?.focus({ preventScroll: true });
    followingRelation.current = false;
  }, [node?.id]);
  const project = boardId === 'project';
  const currentDraft = project ? nodes.find(item => item.isDraft && item.variantId === activeVariant) : undefined;
  const canChat = !!node && node.id === currentDraft?.id;
  const chatting = canChat && showChat && chatFor === node?.id;
  const KindIcon = node ? kinds[node.kind].icon : PanelRight;
  const canContinue = project && node?.kind === 'image' && node.candidateId && node.attemptId && onContinueCandidate;
  return <aside className="graph-inspector" aria-label="所选节点" data-testid="graph-inspector">
    {!node ? <div className="gi-empty"><Layers size={25}/><p>选择一个节点查看详情</p></div> : <>
      <header className="gi-node-heading">
        <div className="gi-kind"><KindIcon size={13}/>{kinds[node.kind].title}{!project && <small><LockKeyhole size={10}/>只读档案</small>}</div>
        <h2 ref={title} tabIndex={-1}>{node.title}</h2>
        {node.subtitle && node.subtitle !== node.title && <p>{node.subtitle}</p>}
      </header>
      {canChat && <div className="gi-tabs" aria-label="节点视图">
        <button type="button" data-testid="graph-detail-tab" aria-controls={id + '-details'} aria-pressed={!chatting} onClick={() => setShowChat(false)}><Layers size={14}/>详情</button>
        <button type="button" data-testid="graph-chat-tab" aria-controls={id + '-chat'} aria-pressed={chatting} onClick={() => { setChatFor(node.id); setShowChat(true); }}><MessageCircle size={14}/>设计对话</button>
      </div>}
      <div key={node.id} id={id + '-details'} className="gi-scroll" hidden={chatting}>
        <Picture node={node}/>
        {node.detail && node.detail !== node.subtitle && <p className="gi-description">{node.detail}</p>}
        <Parameters node={node}/>
        {node.kind === 'evidence' && <Source node={node}/>}
        {!project && node.image && onCopyReference && <div className="gi-actions">
          <button type="button" onClick={() => onCopyReference(node)}><Link2 size={14}/>引用到我的项目</button>
        </div>}
        {project && <div className="gi-actions">
          {node.kind === 'brief' && node.variantId === activeVariant && onEditBrief && <button type="button" className="gi-primary" onClick={onEditBrief}><Pencil size={14}/>编辑设计目标</button>}
          {canChat && <button type="button" className="gi-primary" onClick={onEdit}><SlidersHorizontal size={14}/>编辑参数</button>}
          {node.canRestore && <button type="button" className="gi-primary" onClick={() => onRestore(node.id)}><Pencil size={14}/>从此版本继续编辑</button>}
          {node.canBranch && <button type="button" onClick={() => onBranch(node.id)}><GitBranch size={14}/>存为分支</button>}
          {canContinue && <button type="button" className="gi-primary" onClick={() => onContinueCandidate(node)}><GitBranch size={14}/>以此图修订</button>}
          {canChat && <button type="button" onClick={() => onHandoff(node)}><ArrowRight size={14}/>生成候选图</button>}
          {node.attemptId && <button type="button" onClick={() => onHandoff(node)}><ArrowRight size={14}/>查看轮次记录</button>}
        </div>}
        <Relations node={node} edges={edges} nodes={nodes} onSelect={next => {
          followingRelation.current = true;
          onSelect(next);
        }} onRemoveReference={project ? onRemoveReference : undefined}/>
        {node.kind !== 'evidence' && <Source node={node}/>}
      </div>
    </>}
    {currentDraft && chatFor === currentDraft.id && <div id={id + '-chat'} className="gi-chat-wrap" hidden={!chatting}>
      <DraftChat key={currentDraft.id} node={currentDraft}/>
    </div>}
  </aside>;
}
