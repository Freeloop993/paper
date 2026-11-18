import { useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowDownRight, ArrowRight, ArrowUpLeft, CheckCheck, ChevronRight, ExternalLink,
  FileText, GitBranch, Image as ImageIcon, Layers, Link2, LockKeyhole, Maximize2,
  PanelRight, Pencil, Quote, SlidersHorizontal, Sparkles, StickyNote, Trash2, Unlink, Workflow, X,
} from 'lucide-react';
import { computeLayout } from '../../design/design';
import { fields, fieldStatus, isRelevant, statusLabel } from '../../design/fields';
import type { WorkflowBoard, WorkflowEdge, WorkflowNode } from '../../design/workflowGraph';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import { GuideView } from '../Studio/Stage';
import './graph-inspector.css';

interface GraphInspectorProps {
  node?: WorkflowNode | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  boardId: WorkflowBoard;
  onSelect: (nodeId: string) => void;
  onBranch: (sourceId: string) => void;
  onRestore: (nodeId: string) => void;
  onHandoff: (node?: WorkflowNode) => void;
  onGenerateFrom?: (node: WorkflowNode) => void;
  onRemove?: (node: WorkflowNode) => void;
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

export function Picture({ node }: { node: WorkflowNode }) {
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

export function Relations({ node, nodes, edges, onSelect, onRemoveReference }: Pick<GraphInspectorProps, 'nodes'|'edges'|'onSelect'|'onRemoveReference'> & { node: WorkflowNode }) {
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

export function Source({ node }: { node: WorkflowNode }) {
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

/** 画布上没有专用面板的卡片（证据、保存的版本、参考图、取舍、历史档案）的通用详情。 */
export default function GraphInspector({ node, nodes, edges, boardId, onSelect, onBranch, onRestore, onHandoff, onGenerateFrom, onRemove, onRemoveReference, onCopyReference }: GraphInspectorProps) {
  const title = useRef<HTMLHeadingElement>(null);
  const followingRelation = useRef(false);
  useLayoutEffect(() => {
    if (followingRelation.current) title.current?.focus({ preventScroll: true });
    followingRelation.current = false;
  }, [node?.id]);
  const project = boardId === 'project';
  const KindIcon = node ? kinds[node.kind].icon : PanelRight;
  return <aside className="graph-inspector" aria-label="所选节点" data-testid="graph-inspector">
    {!node ? <div className="gi-empty"><Layers size={25}/><p>选择一张卡片查看详情</p></div> : <>
      <header className="gi-node-heading">
        <div className="gi-kind"><KindIcon size={13}/>{kinds[node.kind].title}{!project && <small><LockKeyhole size={10}/>只读档案</small>}</div>
        <h2 ref={title} tabIndex={-1}>{node.title}</h2>
        {node.subtitle && node.subtitle !== node.title && <p>{node.subtitle}</p>}
      </header>
      <div key={node.id} className="gi-scroll">
        <Picture node={node}/>
        {node.detail && node.detail !== node.subtitle && !node.editable && <p className="gi-description">{node.detail}</p>}
        <Parameters node={node}/>
        {node.kind === 'evidence' && <Source node={node}/>}
        {!project && node.image && onCopyReference && <div className="gi-actions">
          <button type="button" onClick={() => onCopyReference(node)}><Link2 size={14}/>引用到我的项目</button>
        </div>}
        {project && <div className="gi-actions">
          {node.canRestore && <button type="button" className="gi-primary" onClick={() => onRestore(node.id)}><Pencil size={14}/>从此版本继续编辑</button>}
          {node.canBranch && <button type="button" onClick={() => onBranch(node.id)}><GitBranch size={14}/>存为分支</button>}
          {node.image && node.removable && onGenerateFrom && <button type="button" className="gi-primary" onClick={() => onGenerateFrom(node)}><Sparkles size={14}/>以此图生成</button>}
          {node.attemptId && <button type="button" onClick={() => onHandoff(node)}><ArrowRight size={14}/>查看轮次记录</button>}
          {(node.removable || node.editable) && onRemove && <button type="button" onClick={() => onRemove(node)}><Trash2 size={14}/>从画布移除</button>}
        </div>}
        <Relations node={node} edges={edges} nodes={nodes} onSelect={next => {
          followingRelation.current = true;
          onSelect(next);
        }} onRemoveReference={project ? onRemoveReference : undefined}/>
        {node.kind !== 'evidence' && <Source node={node}/>}
      </div>
    </>}
  </aside>;
}
