import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Background, BackgroundVariant, BaseEdge, EdgeLabelRenderer, getBezierPath, Handle,
  MarkerType, MiniMap, Position, ReactFlow, ReactFlowProvider, useReactFlow, useViewport,
} from '@xyflow/react';
import type { Edge, EdgeProps, Node, NodeChange, NodeProps, Viewport, XYPosition } from '@xyflow/react';
import {
  ArrowUpRight, CheckCheck, FileText, Hand, Image as ImageIcon, Map as MapIcon, Maximize,
  Minus, MousePointer2, PencilLine, Plus, ScanLine, SlidersHorizontal, StickyNote,
} from 'lucide-react';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import type { WorkflowBoard, WorkflowEdge, WorkflowNode } from '../../design/workflow/types';
import { computeLayout } from '../../design/design';
import { GuideView } from '../Studio/Stage';
import '@xyflow/react/dist/style.css';
import './graph-board.css';

interface BoardProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  boardId: WorkflowBoard;
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  onConnect?: (source: string, target: string) => void;
  onOpen?: (id: string) => void;
}
type Card = Node<{
  item: WorkflowNode;
  onOpen?: BoardProps['onOpen'];
  input: boolean;
  output: boolean;
  proximity: 'adjacent' | 'distant' | '';
}, 'card'>;
type Wire = Edge<{ kind: WorkflowEdge['kind']; emphasis: string }, 'wire'>;
type Positions = Record<string, XYPosition>;
type Size = { width: number; height: number };
const CARD_WIDTH = 216;
const COLUMN_GAP = 83;
const ROW_GAP = 30;
const MIN_ZOOM = 0.12;
const MAX_ZOOM = 2.1;
const cards = {
  brief: { name: '设计简报', icon: FileText }, spec: { name: '参数方案', icon: SlidersHorizontal },
  run: { name: '生成记录', icon: ScanLine }, image: { name: '图像', icon: ImageIcon },
  decision: { name: '设计取舍', icon: CheckCheck }, edit: { name: '图像编辑', icon: PencilLine },
  note: { name: '笔记', icon: StickyNote },
};

function cardHeight(node: WorkflowNode) { return node.image || (node.kind === 'spec' && node.parameters) ? 246 : 143; }
function motionTime() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 190; }
function localKey(board: string) { return 'freeloop.workflow.positions.v1.' + board; }
function readPositions(board: string): Positions {
  try {
    const saved = JSON.parse(localStorage.getItem(localKey(board)) ?? '{}') as Positions;
    return Object.fromEntries(Object.entries(saved).filter(([, p]) => Number.isFinite(p?.x) && Number.isFinite(p?.y)));
  } catch { return {}; }
}

// Automatic columns follow the design lineage. New manual references do not move existing branches.
function layout(nodes: WorkflowNode[], edges: WorkflowEdge[]): Positions {
  const incoming = new Map<string, number>(nodes.map(n => [n.id, 0]));
  const next = new Map<string, string[]>(nodes.map(n => [n.id, []]));
  const parents = new Map<string, string[]>(nodes.map(n => [n.id, []]));
  for (const edge of edges) {
    if (edge.kind === 'manual' || !incoming.has(edge.source) || !incoming.has(edge.target)) continue;
    next.get(edge.source)!.push(edge.target);
    parents.get(edge.target)!.push(edge.source);
    incoming.set(edge.target, incoming.get(edge.target)! + 1);
  }
  const depth = new Map<string, number>();
  const queue = nodes.filter(n => !incoming.get(n.id)).map(n => n.id);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const child of next.get(id)!) {
      depth.set(child, Math.max(depth.get(child) ?? 0, (depth.get(id) ?? 0) + 1));
      incoming.set(child, incoming.get(child)! - 1);
      if (!incoming.get(child)) queue.push(child);
    }
  }
  const columns: WorkflowNode[][] = [];
  for (const n of nodes) (columns[depth.get(n.id) ?? 0] ??= []).push(n);
  const positions: Positions = {};
  const midpoints = new Map<string, number>();
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const anchor = (n: WorkflowNode) => {
      const ys = (parents.get(n.id) ?? []).flatMap(id => midpoints.has(id) ? [midpoints.get(id)!] : []);
      return ys.length ? ys.reduce((sum, y) => sum + y, 0) / ys.length : 0;
    };
    column.sort((a, b) => anchor(a) - anchor(b));
    let y = -(column.reduce((sum, n) => sum + cardHeight(n), 0) + (column.length - 1) * ROW_GAP) / 2;
    for (const n of column) {
      positions[n.id] = { x: i * (CARD_WIDTH + COLUMN_GAP), y };
      midpoints.set(n.id, y + cardHeight(n) / 2);
      y += cardHeight(n) + ROW_GAP;
    }
  }
  return positions;
}

function camera(nodes: WorkflowNode[], positions: Positions, size: Size, full: boolean, focus?: string | null): Viewport {
  if (!nodes.length) return { x: size.width / 2, y: size.height / 2, zoom: 1 };
  const bounds = (items: WorkflowNode[]) => {
    const xs = items.map(n => positions[n.id].x);
    const top = Math.min(...items.map(n => positions[n.id].y));
    const bottom = Math.max(...items.map(n => positions[n.id].y + cardHeight(n)));
    return { x: Math.min(...xs), y: top, width: Math.max(...xs) - Math.min(...xs) + CARD_WIDTH, height: bottom - top };
  };
  const availableW = Math.max(100, size.width - (size.width < 520 ? 40 : 72));
  const availableH = Math.max(100, size.height - 84);
  const bbox = bounds(nodes);
  const fit = (b: typeof bbox) => Math.min(availableW / b.width, availableH / b.height, 1.06);
  let frame = bbox;
  let peek = 0;
  if (!full && fit(bbox) < 0.86) {
    const anchor = nodes.find(n => n.id === focus) ?? nodes.find(n => n.id === 'b2-original') ??
      nodes.find(n => n.isDraft && n.title === '当前规格草稿') ?? nodes.find(n => n.isDraft) ?? nodes[0];
    const start = positions[anchor.id].x;
    const columns = size.width < 560 ? 1 : size.width < 750 ? 2 : 3;
    const nearby = nodes.filter(n => positions[n.id].x >= start - 1 && positions[n.id].x <= start + (columns - 1) * (CARD_WIDTH + COLUMN_GAP) + 1);
    frame = bounds(columns === 1 ? [anchor] : nearby);
    if (columns === 1) {
      const hasNext = nodes.some(n => positions[n.id].x > start);
      peek = Math.min(48, size.width * 0.12) * (hasNext ? 1 : -1);
    }
  }
  const zoom = Math.max(MIN_ZOOM, fit(frame));
  return { x: (size.width - frame.width * zoom) / 2 - frame.x * zoom - peek,
    y: (size.height - 26 - frame.height * zoom) / 2 - frame.y * zoom, zoom };
}

const GraphCard = memo(function GraphCard({ data, selected, isConnectable }: NodeProps<Card>) {
  const { item, input, output, onOpen } = data;
  const meta = cards[item.kind];
  const Icon = meta.icon;
  const guide = useMemo(() => !item.image && item.kind === 'spec' && item.parameters ? computeLayout(item.parameters) : null,
    [item.image, item.kind, item.parameters]);
  const preview = Boolean(item.image || guide);
  const subtitle = guide ? [item.subtitle, '布局条件图'].filter(Boolean).join(' · ') : item.subtitle;
  return <article className={`gb-card ${data.proximity}${selected ? ' is-selected' : ''}${preview ? ' has-image' : ' is-text'}`} data-workflow-node={item.id}>
    <Handle type="target" position={Position.Left} isConnectable={isConnectable} className={`gb-port${input || isConnectable ? '' : ' is-unused'}`} />
    <div className="gb-card-heading"><span className="gb-kind"><Icon size={14} strokeWidth={1.75}/>{meta.name}</span>
      {selected && onOpen && <button type="button" className="gb-card-open nodrag nopan" aria-label={'查看' + item.title} title="查看节点（Enter）"
        onClick={event => { event.stopPropagation(); onOpen(item.id); }}><ArrowUpRight size={15} /></button>}
    </div>
    {item.image && <div className="gb-image"><WorkflowImage node={item} alt={item.title} draggable={false}/></div>}
    {guide && <div className="gb-image gb-guide"><GuideView layout={guide} /></div>}
    <div className="gb-card-content"><h3 title={item.title}>{item.title}</h3>
      {subtitle && <p className="gb-subtitle" title={subtitle}>{subtitle}</p>}
      {!preview && item.detail && <p className="gb-detail">{item.detail}</p>}
    </div>
    <Handle type="source" position={Position.Right} isConnectable={isConnectable} className={`gb-port${output || isConnectable ? '' : ' is-unused'}`}/>
  </article>;
});

const GraphWire = memo(function GraphWire(props: EdgeProps<Wire>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, label } = props;
  const [path, x, y] = getBezierPath({ sourceX, sourceY, targetX: targetX - 2, targetY, sourcePosition, targetPosition, curvature: 0.4 });
  const reference = data?.kind === 'reference' || data?.kind === 'manual';
  const tone = (reference ? ' is-reference ' : ' ') + (data?.emphasis ?? '');
  return <>
    <BaseEdge id={id} path={path} markerEnd={props.markerEnd} className={'gb-wire' + tone} interactionWidth={0} />
    {label && <EdgeLabelRenderer><span className={'gb-wire-label' + tone}
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}>{label}</span></EdgeLabelRenderer>}
  </>;
});
const nodeTypes = { card: GraphCard };
const edgeTypes = { wire: GraphWire };
const ariaLabels = {
  'node.a11yDescription.default': '按空格选中节点，回车查看。方向键移动选中节点，按住 Shift 加大步长。',
  'node.a11yDescription.ariaLiveMessage': ({ x, y }: { x: number; y: number }) => `节点已移动到 ${x}，${y}。`,
  'minimap.ariaLabel': '画布缩略图', 'handle.ariaLabel': '节点连线端口',
};

function ZoomNumber() {
  const { zoom } = useViewport();
  return <>{Math.round(zoom * 100)}%</>;
}

function BoardCanvas({ nodes, edges, boardId, selectedId, onSelect, onConnect, onOpen }: BoardProps) {
  const container = useRef<HTMLDivElement>(null);
  const flow = useReactFlow<Card, Wire>();
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [manual, setManual] = useState(() => readPositions(boardId));
  const manualRef = useRef(manual);
  const [hand, setHand] = useState(false);
  const [map, setMap] = useState(false);
  const computed = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const positions = useMemo(() => ({ ...computed, ...manual }), [computed, manual]);
  const previousFrame = useRef({ id: selectedId, width: 0, height: 0 });
  const graphEditable = boardId === 'project' && Boolean(onConnect);
  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const resize = () => {
      const width = el.clientWidth, height = el.clientHeight;
      if (width && height) setSize(current => current.width === width && current.height === height ? current : { width, height });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const cardsOnBoard = useMemo<Card[]>(() => {
    const inputs = new Set(edges.map(e => e.target)), outputs = new Set(edges.map(e => e.source));
    const adjacent = new Set<string>();
    for (const e of edges) {
      if (e.target === selectedId) adjacent.add(e.source);
      if (e.source === selectedId) adjacent.add(e.target);
    }
    return nodes.map(item => ({ id: item.id, type: 'card', width: CARD_WIDTH, height: cardHeight(item),
      position: positions[item.id], selected: selectedId === item.id, ariaLabel: cards[item.kind].name + '，' + item.title,
      data: { item, input: inputs.has(item.id), output: outputs.has(item.id), onOpen,
        proximity: adjacent.has(item.id) ? 'adjacent' : selectedId && selectedId !== item.id ? 'distant' : '' } }));
  }, [nodes, edges, positions, selectedId, onOpen]);
  const wires = useMemo<Wire[]>(() => edges.map(e => {
    const active = selectedId === e.source || selectedId === e.target;
    const reference = e.kind === 'reference' || e.kind === 'manual';
    const color = reference ? (active ? '#9b6f27' : '#a58349') : (active ? '#25775e' : '#537e68');
    return { ...e, type: 'wire', data: { kind: e.kind, emphasis: active ? 'adjacent' : selectedId ? 'distant' : '' }, selectable: false,
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 25, height: 22, markerUnits: 'userSpaceOnUse' } };
  }), [edges, selectedId]);
  const changeNodes = useCallback((changes: NodeChange<Card>[]) => {
    const moved = changes.filter(change => change.type === 'position' && change.position);
    if (!moved.length) return;
    const changed = { ...manualRef.current };
    for (const m of moved) if (m.type === 'position' && m.position) changed[m.id] = m.position;
    manualRef.current = changed;
    setManual(changed);
    if (moved.some(m => m.type === 'position' && !m.dragging)) {
      try { localStorage.setItem(localKey(boardId), JSON.stringify(changed)); } catch { /* Position is still available in this session. */ }
    }
  }, [boardId]);
  const startCamera = useMemo(() => camera(nodes, positions, size, false, selectedId), [nodes, positions, size, selectedId]);
  const fitAll = () => void flow.setViewport(camera(nodes, positions, size, true), { duration: motionTime() });
  // Selecting an off-screen item from the inspector or after an import also locates it on the board.
  useEffect(() => {
    if (!flow.viewportInitialized || !size.width || !size.height) return;
    const prior = previousFrame.current;
    if (prior.id === selectedId && prior.width === size.width && prior.height === size.height) return;
    if (!selectedId) { previousFrame.current = { id: selectedId, ...size }; return; }
    const n = nodes.find(item => item.id === selectedId);
    if (!n) return;
    previousFrame.current = { id: selectedId, ...size };
    const p = positions[n.id], v = flow.getViewport();
    const left = p.x * v.zoom + v.x, top = p.y * v.zoom + v.y;
    const right = left + CARD_WIDTH * v.zoom, bottom = top + cardHeight(n) * v.zoom;
    if (left < 8 || top < 8 || right > size.width - 8 || bottom > size.height - 8)
      void flow.setCenter(p.x + CARD_WIDTH / 2, p.y + cardHeight(n) / 2, { zoom: v.zoom, duration: motionTime() });
  }, [selectedId, nodes, positions, flow, size]);

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (event.altKey || event.ctrlKey || event.metaKey || target.closest('button,input,textarea,select,[contenteditable="true"]')) return;
    const id = target.closest<HTMLElement>('.react-flow__node')?.dataset.id;
    const key = event.key.toLowerCase();
    if (key === 'enter' && id) { onSelect(id); onOpen?.(id); }
    else if (key === ' ' && id) onSelect(id);
    else if (key === 'escape') onSelect(null);
    else if (key === 'f') fitAll();
    else if (key === '+' || key === '=') void flow.zoomIn({ duration: motionTime() });
    else if (key === '-') void flow.zoomOut({ duration: motionTime() });
    else if (key === '0') void flow.zoomTo(1, { duration: motionTime() });
    else if (key === 'h') setHand(true);
    else if (key === 'v') setHand(false);
    else if (!id && key.startsWith('arrow')) {
      const v = flow.getViewport(), step = event.shiftKey ? 112 : 42;
      void flow.setViewport({ ...v, x: v.x + (key === 'arrowleft' ? step : key === 'arrowright' ? -step : 0),
        y: v.y + (key === 'arrowup' ? step : key === 'arrowdown' ? -step : 0) });
    } else return;
    event.preventDefault();
    event.stopPropagation();
  }
  return <div ref={container} className={`gb-board${hand ? ' gb-hand' : ''}`} data-testid="workflow-graph"
    role="region" aria-label="节点画布" tabIndex={0} onKeyDownCapture={keyDown}>
    {size.width > 0 && nodes.length > 0 && <ReactFlow<Card, Wire>
      nodes={cardsOnBoard} edges={wires} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
      onNodesChange={changeNodes} onNodeClick={(_, n) => onSelect(n.id)}
      onNodeDoubleClick={(_, n) => onOpen?.(n.id)} onPaneClick={() => onSelect(null)}
      onConnect={graphEditable ? connection => onConnect?.(connection.source, connection.target) : undefined}
      defaultViewport={startCamera} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM} nodesConnectable={graphEditable && !hand}
      nodesDraggable={!hand} elementsSelectable={!hand} edgesFocusable={false} edgesReconnectable={false}
      selectNodesOnDrag={false} nodesFocusable deleteKeyCode={null} multiSelectionKeyCode={null} selectionKeyCode={null}
      preventScrolling zoomOnPinch zoomOnDoubleClick={false} panOnDrag panOnScroll
      ariaLabelConfig={ariaLabels} connectionLineStyle={{ stroke: '#b78440', strokeWidth: 2, strokeDasharray: '5 3' }}>
      <Background variant={BackgroundVariant.Dots} size={1.05} gap={18} color="#c9cdc4"/>
      {map && <MiniMap className="gb-minimap" pannable zoomable nodeBorderRadius={3}
        nodeColor={n => n.id === selectedId ? '#478c79' : '#cbd6cd'} maskColor="rgba(240, 239, 232, .7)" />}
    </ReactFlow>}
    {nodes.length > 0 && <div className="gb-tools" role="toolbar" aria-label="画布工具">
      <button type="button" aria-label="选择工具" title="选择（V）" aria-pressed={!hand} onClick={() => setHand(false)}><MousePointer2 /></button>
      <button type="button" aria-label="平移工具" title="平移（H）" aria-pressed={hand} onClick={() => setHand(true)}><Hand /></button>
      <i/><button type="button" aria-label="缩小画布" title="缩小（−）" onClick={() => void flow.zoomOut({ duration: motionTime() })}><Minus /></button>
      <button type="button" className="gb-zoom" aria-label="重置缩放为百分之百" title="恢复 100%（0）" onClick={() => void flow.zoomTo(1, { duration: motionTime() })}><ZoomNumber /></button>
      <button type="button" aria-label="放大画布" title="放大（+）" onClick={() => void flow.zoomIn({ duration: motionTime() })}><Plus /></button>
      <i/><button type="button" aria-label="适应全图" title="适应全图（F）" onClick={fitAll}><Maximize /></button>
      <button type="button" aria-label="缩略图" title="缩略图" aria-pressed={map} onClick={() => setMap(s => !s)}><MapIcon /></button>
    </div>}
  </div>;
}

export default function GraphBoard(props: BoardProps) {
  return <ReactFlowProvider key={props.boardId}><BoardCanvas {...props} /></ReactFlowProvider>;
}
