// 设计画布：步骤卡片放在无限画布上，按来源关系自动排开，也可以随手拖动。
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent, MouseEvent } from 'react';
import {
  Background, BackgroundVariant, BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType, MiniMap, ReactFlow, ReactFlowProvider,
  useReactFlow, useViewport,
} from '@xyflow/react';
import type { Edge, EdgeProps, NodeChange, Viewport, XYPosition } from '@xyflow/react';
import { Hand, LayoutGrid, Map as MapIcon, Maximize, Minus, MousePointer2, Plus } from 'lucide-react';
import type { WorkflowBoard, WorkflowEdge, WorkflowNode } from '../../design/workflow/types';
import { BoardKitContext, StepCard, kindName, nodeSize, type BoardKit, type Card, type Size } from './StepCards';
import '@xyflow/react/dist/style.css';
import '../Graph/graph-board.css';
import './canvas.css';

export interface BoardHandle {
  /** 把一个节点放到画布坐标的指定位置（新加的便签、参考图）。给出尺寸时会避开已有的卡片。 */
  place: (id: string, position: XYPosition, avoid?: Size) => void;
  /** 当前视野中心对应的画布坐标。 */
  center: () => XYPosition;
  /** 把视野移到某个节点，必要时放大到能直接操作。 */
  focus: (id: string, zoomIn?: boolean) => void;
  fit: () => void;
  /** 平移到刚好能看见某张卡片。 */
  reveal: (id: string) => void;
}
interface BoardProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  boardId: WorkflowBoard;
  selectedId?: string | null;
  kit: BoardKit;
  showLabels: boolean;
  /** 本机记录还在读取时先不摆放镜头，避免后到的卡片落在视野外。 */
  loading?: boolean;
  onSelect: (id: string | null) => void;
  onConnect?: (source: string, target: string) => void;
  onOpen?: (id: string) => void;
  onAddAt?: (position: XYPosition, screen: { x: number; y: number }) => void;
  onDropFiles?: (files: File[], position: XYPosition) => void;
}
type Wire = Edge<{ kind: WorkflowEdge['kind']; emphasis: string; shared?: boolean; label: boolean }, 'wire'>;
type Positions = Record<string, XYPosition>;
const COLUMN_GAP = 92;
const ROW_GAP = 54;
const MIN_ZOOM = 0.12;
const MAX_ZOOM = 2.4;

function motionTime() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 190; }
function localKey(board: string) { return 'freeloop.canvas.positions.v2.' + board; }
function readPositions(board: string): Positions {
  try {
    const saved = JSON.parse(localStorage.getItem(localKey(board)) ?? '{}') as Positions;
    return Object.fromEntries(Object.entries(saved).filter(([, p]) => Number.isFinite(p?.x) && Number.isFinite(p?.y)));
  } catch { return {}; }
}
/** 依据卡、便签和参考图是给某一步作注的：它们排在所注步骤的左侧，不改变主线各列的位置。 */
const annotates = (n: WorkflowNode) => n.kind === 'evidence' || n.kind === 'note' || !!n.removable;

// 主线按来源关系分列：目标 → 造型 → 生成 → 候选 → 取舍。手动连线不移动已有分支。
function layout(nodes: WorkflowNode[], edges: WorkflowEdge[]): Positions {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const side = new Set(nodes.filter(annotates).map(n => n.id));
  const incoming = new Map<string, number>(), next = new Map<string, string[]>(), parents = new Map<string, string[]>(), targets = new Map<string, string[]>();
  for (const n of nodes) { incoming.set(n.id, 0); next.set(n.id, []); parents.set(n.id, []); targets.set(n.id, []); }
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    if (side.has(edge.source)) { targets.get(edge.source)!.push(edge.target); continue; }
    if (edge.kind === 'manual' || side.has(edge.target)) continue;
    next.get(edge.source)!.push(edge.target);
    parents.get(edge.target)!.push(edge.source);
    incoming.set(edge.target, incoming.get(edge.target)! + 1);
  }
  const depth = new Map<string, number>();
  const queue = nodes.filter(n => !side.has(n.id) && !incoming.get(n.id)).map(n => n.id);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const child of next.get(id)!) {
      depth.set(child, Math.max(depth.get(child) ?? 0, (depth.get(id) ?? 0) + 1));
      incoming.set(child, incoming.get(child)! - 1);
      if (!incoming.get(child)) queue.push(child);
    }
  }
  const column = (n: WorkflowNode) => {
    if (!side.has(n.id)) return depth.get(n.id) ?? 0;
    const to = targets.get(n.id)!.filter(id => !side.has(id)).map(id => depth.get(id) ?? 0);
    return to.length ? Math.min(...to) - 1 : -1;
  };
  const columns = new Map<number, WorkflowNode[]>();
  for (const n of nodes) { const c = column(n); columns.set(c, [...columns.get(c) ?? [], n]); }
  const order = [...columns.keys()].sort((a, b) => a - b);
  const left = new Map<number, number>();
  let x = 0;
  for (const c of order.filter(c => c >= 0)) { left.set(c, x); x += Math.max(...columns.get(c)!.map(n => nodeSize(n).width)) + COLUMN_GAP; }
  x = 0;
  for (const c of order.filter(c => c < 0).reverse()) { x -= Math.max(...columns.get(c)!.map(n => nodeSize(n).width)) + COLUMN_GAP; left.set(c, x); }

  const positions: Positions = {};
  const mid = new Map<string, number>();
  const stack = (items: WorkflowNode[], c: number, anchor: (n: WorkflowNode) => number, from?: number) => {
    items.sort((a, b) => anchor(a) - anchor(b));
    const total = items.reduce((sum, n) => sum + nodeSize(n).height, 0) + (items.length - 1) * ROW_GAP;
    let y = from ?? (items.length ? items.reduce((sum, n) => sum + anchor(n), 0) / items.length : 0) - total / 2;
    for (const n of items) {
      positions[n.id] = { x: left.get(c)!, y };
      mid.set(n.id, y + nodeSize(n).height / 2);
      y += nodeSize(n).height + ROW_GAP;
    }
    return y;
  };
  const average = (ids: string[]) => {
    const ys = ids.flatMap(id => mid.has(id) ? [mid.get(id)!] : []);
    return ys.length ? ys.reduce((sum, y) => sum + y, 0) / ys.length : 0;
  };
  const bottom = new Map<number, number>();
  for (const c of order) {
    const main = columns.get(c)!.filter(n => !side.has(n.id));
    if (!main.length) continue;
    const total = main.reduce((sum, n) => sum + nodeSize(n).height, 0) + (main.length - 1) * ROW_GAP;
    bottom.set(c, stack(main, c, n => average(parents.get(n.id)!), -total / 2));
  }
  for (const c of order) {
    const notes = columns.get(c)!.filter(n => side.has(n.id));
    if (!notes.length) continue;
    // 与主线同列时排在主线下方，独占一列时对齐到所注的步骤。
    bottom.set(c, stack(notes, c, n => average(targets.get(n.id)!), bottom.get(c)));
  }
  return positions;
}

/**
 * 新出现的卡片只安放一次：有来源就放在来源右侧，给某一步作注的放在那一步左侧，都放不了才用整体排布的位置。
 * 已经在画布上的卡片不动，设计者拖过的位置也不动。
 */
function placeNew(nodes: WorkflowNode[], edges: WorkflowEdge[], known: Positions): Positions {
  const placed: Positions = { ...known }, added: Positions = {};
  const byId = new Map(nodes.map(n => [n.id, n]));
  const free = (x: number, y: number, size: Size) => {
    const blocks = Object.entries(placed).flatMap(([id, p]) => byId.has(id) ? [{ ...p, ...nodeSize(byId.get(id)!) }] : [])
      .filter(o => o.x < x + size.width + 16 && o.x + o.width + 16 > x).sort((a, b) => a.y - b.y);
    for (const o of blocks) if (o.y < y + size.height + 20 && o.y + o.height + 20 > y) y = o.y + o.height + ROW_GAP;
    return { x, y };
  };
  let waiting = nodes.filter(n => !placed[n.id]);
  while (waiting.length) {
    const before = waiting.length;
    for (const n of waiting) {
      const size = nodeSize(n);
      const from = annotates(n) ? [] : edges.filter(e => e.target === n.id && placed[e.source] && byId.has(e.source) && !annotates(byId.get(e.source)!));
      // 「以此图继续」的生成步骤接在那张图的右边，其余卡片接在主线来源的右边。
      const picture = n.kind === 'run' ? edges.find(e => e.target === n.id && e.kind === 'reference' && placed[e.source] && byId.get(e.source)?.image) : undefined;
      const source = picture ?? from.find(e => e.kind !== 'manual' && e.kind !== 'reference') ?? from.find(e => e.kind !== 'manual') ?? from[0];
      const to = edges.find(e => e.source === n.id && placed[e.target] && byId.has(e.target));
      // 从造型草稿存下的版本是它的一份快照：放在造型卡片的正下方，并列的方案纵向对齐。
      const snapshotOf = n.kind === 'spec' && !n.isDraft && !n.research && !source && to && byId.get(to.target)?.isDraft ? to : undefined;
      if (snapshotOf) {
        const p = placed[snapshotOf.target], s = nodeSize(byId.get(snapshotOf.target)!);
        added[n.id] = placed[n.id] = free(p.x, p.y + s.height + ROW_GAP, size);
      } else if (source) {
        const p = placed[source.source], s = nodeSize(byId.get(source.source)!);
        added[n.id] = placed[n.id] = free(p.x + s.width + COLUMN_GAP, p.y, size);
      } else if (to) {
        const p = placed[to.target];
        added[n.id] = placed[n.id] = free(p.x - size.width - COLUMN_GAP, p.y, size);
      }
    }
    waiting = waiting.filter(n => !placed[n.id]);
    if (waiting.length === before) {
      // 没有来源可依的卡片（例如新开的方向）：排在同类卡片的正下方，后续卡片再接在它右边。
      const n = waiting.shift()!, size = nodeSize(n);
      const all = Object.entries(placed).flatMap(([id, p]) => byId.has(id) ? [{ ...p, ...nodeSize(byId.get(id)!), node: byId.get(id)! }] : []);
      const peers = all.filter(o => o.node.kind === n.kind && !!o.node.isDraft === !!n.isDraft).sort((x, y) => y.y - x.y);
      const below = all.length ? Math.max(...all.map(o => o.y + o.height)) + ROW_GAP : 0;
      added[n.id] = placed[n.id] = peers.length ? free(peers[0].x, peers[0].y + peers[0].height + ROW_GAP * 1.5, size)
        : { x: all.length ? Math.min(...all.map(o => o.x)) : 0, y: below };
    }
  }
  return added;
}

function camera(nodes: WorkflowNode[], positions: Positions, size: Size, full: boolean, focus?: string | null): Viewport {
  if (!nodes.length) return { x: size.width / 2, y: size.height / 2, zoom: 1 };
  const bounds = (items: WorkflowNode[]) => {
    const l = Math.min(...items.map(n => positions[n.id].x)), t = Math.min(...items.map(n => positions[n.id].y));
    const r = Math.max(...items.map(n => positions[n.id].x + nodeSize(n).width)), b = Math.max(...items.map(n => positions[n.id].y + nodeSize(n).height));
    return { x: l, y: t, width: r - l, height: b - t };
  };
  const availableW = Math.max(100, size.width - (size.width < 520 ? 28 : 96));
  const availableH = Math.max(100, size.height - 150);
  const fit = (b: ReturnType<typeof bounds>) => Math.min(availableW / b.width, availableH / b.height, 1);
  let frame = bounds(nodes);
  if (!full && fit(frame) < 0.62) {
    // 全图放不下时，先看当前正在做的那一步及其前后。
    const anchor = nodes.find(n => n.id === focus) ?? nodes.find(n => n.isDraft && n.title === '当前规格草稿') ?? nodes.find(n => n.id === 'b2-original') ?? nodes[0];
    // 设计往右推进：左边带上紧邻的上一步，右边多看一些后续步骤。
    const a = positions[anchor.id], before = size.width < 560 ? 0 : 420, after = size.width < 560 ? 0 : 720;
    const nearby = nodes.filter(n => positions[n.id].x + nodeSize(n).width >= a.x - before && positions[n.id].x + nodeSize(n).width <= a.x + nodeSize(anchor).width + after
      && Math.abs(positions[n.id].y - a.y) < 900);
    frame = bounds(nearby.length ? nearby : [anchor]);
  }
  const zoom = Math.max(MIN_ZOOM, fit(frame));
  return { x: (size.width - frame.width * zoom) / 2 - frame.x * zoom, y: (size.height - 34 - frame.height * zoom) / 2 - frame.y * zoom + 18, zoom };
}

const StepWire = memo(function StepWire(props: EdgeProps<Wire>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, label } = props;
  const [path, x, y] = getBezierPath({ sourceX, sourceY, targetX: targetX - 2, targetY, sourcePosition, targetPosition, curvature: 0.4 });
  const reference = data?.kind === 'reference' || data?.kind === 'manual';
  const tone = (reference ? ' is-reference ' : ' ') + (data?.kind === 'manual' ? 'is-manual ' : '') + (data?.emphasis ?? '');
  return <>
    <BaseEdge id={id} path={path} markerEnd={props.markerEnd} className={'gb-wire' + tone} interactionWidth={0} />
    {label && data?.label && <EdgeLabelRenderer><span className={'gb-wire-label' + tone}
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y + (data?.shared ? 19 : 0)}px)` }}>{label}</span></EdgeLabelRenderer>}
  </>;
});
const nodeTypes = { card: StepCard };
const edgeTypes = { wire: StepWire };
const ariaLabels = {
  'node.a11yDescription.default': '按空格选中这一步，回车放大。方向键移动选中的卡片，按住 Shift 加大步长。',
  'node.a11yDescription.ariaLiveMessage': ({ x, y }: { x: number; y: number }) => `卡片已移动到 ${x}，${y}。`,
  'minimap.ariaLabel': '画布缩略图', 'handle.ariaLabel': '连线端口',
};

function ZoomNumber() {
  const { zoom } = useViewport();
  return <>{Math.round(zoom * 100)}%</>;
}

const BoardCanvas = forwardRef<BoardHandle, BoardProps>(function BoardCanvas(
  { nodes, edges, boardId, selectedId, kit, showLabels, loading, onSelect, onConnect, onOpen, onAddAt, onDropFiles }, handle) {
  const container = useRef<HTMLDivElement>(null);
  const flow = useReactFlow<Card, Wire>();
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [manual, setManual] = useState(() => readPositions(boardId));
  const manualRef = useRef(manual);
  const [measured, setMeasured] = useState<Record<string, Size>>({});
  const [hand, setHand] = useState(false);
  const [map, setMap] = useState(false);
  // 第一次打开时整体排布；之后每张新卡片只在出现时安放一次，其余卡片保持原位。
  const positions = useMemo<Positions>(() => {
    const missing = nodes.filter(n => !manual[n.id]);
    if (!missing.length) return manual;
    return { ...manual, ...(nodes.some(n => manual[n.id]) ? placeNew(nodes, edges, manual) : layout(nodes, edges)) };
  }, [nodes, edges, manual]);
  const latest = useRef({ nodes, positions, size });
  latest.current = { nodes, positions, size };
  const previousFrame = useRef({ id: selectedId, width: 0, height: 0 });
  const editable = boardId === 'project' && Boolean(onConnect);
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
  const store = useCallback((changed: Positions) => {
    manualRef.current = changed;
    setManual(changed);
    try { localStorage.setItem(localKey(boardId), JSON.stringify(changed)); } catch { /* 位置在本次会话内仍然有效。 */ }
  }, [boardId]);
  useEffect(() => {
    if (loading || !nodes.length || nodes.every(n => manualRef.current[n.id])) return;
    store({ ...manualRef.current, ...Object.fromEntries(nodes.map(n => [n.id, positions[n.id]])) });
  }, [loading, nodes, positions, store]);
  const tidy = useCallback(() => {
    // 重新按来源关系整体排布，放弃手动摆放的位置。
    const fresh = layout(latest.current.nodes, edges);
    store(fresh);
    void flow.setViewport(camera(latest.current.nodes, fresh, latest.current.size, true), { duration: motionTime() });
  }, [edges, flow, store]);
  const cardsOnBoard = useMemo<Card[]>(() => {
    const inputs = new Set(edges.map(e => e.target)), outputs = new Set(edges.map(e => e.source));
    const adjacent = new Set<string>();
    for (const e of edges) {
      if (e.target === selectedId) adjacent.add(e.source);
      if (e.source === selectedId) adjacent.add(e.target);
    }
    return nodes.map(item => ({ id: item.id, type: 'card', ...nodeSize(item), measured: measured[item.id],
      position: positions[item.id], selected: selectedId === item.id, ariaLabel: kindName(item) + '，' + item.title,
      data: { item, input: inputs.has(item.id), output: outputs.has(item.id),
        proximity: adjacent.has(item.id) ? 'adjacent' : selectedId && selectedId !== item.id ? 'distant' : '' } }));
  }, [nodes, edges, positions, selectedId, measured]);
  const wires = useMemo<Wire[]>(() => {
    const automatic = new Set(edges.filter(e => e.kind !== 'manual').map(e => JSON.stringify([e.source, e.target])));
    return edges.map(e => {
      const active = selectedId === e.source || selectedId === e.target;
      const reference = e.kind === 'reference' || e.kind === 'manual';
      const color = e.kind === 'manual' ? '#576e8a' : reference ? (active ? '#9b6f27' : '#a58349') : (active ? '#25775e' : '#537e68');
      const shared = e.kind === 'manual' && automatic.has(JSON.stringify([e.source, e.target]));
      return { ...e, type: 'wire', data: { kind: e.kind, emphasis: active ? 'adjacent' : selectedId ? 'distant' : '', shared, label: showLabels || active },
        selectable: false, markerEnd: { type: MarkerType.ArrowClosed, color, width: 25, height: 22, markerUnits: 'userSpaceOnUse' } };
    });
  }, [edges, selectedId, showLabels]);
  const changeNodes = useCallback((changes: NodeChange<Card>[]) => {
    // 把量得的卡片尺寸留在节点上。否则每次重建节点都会丢掉端口位置，连续更新时连线可能整体消失。
    const sized = changes.flatMap(change => change.type === 'dimensions' && change.dimensions ? [[change.id, change.dimensions] as const] : []);
    if (sized.length) setMeasured(current => sized.every(([id, d]) => current[id]?.width === d.width && current[id]?.height === d.height)
      ? current : { ...current, ...Object.fromEntries(sized) });
    const moved = changes.filter(change => change.type === 'position' && change.position);
    if (!moved.length) return;
    const changed = { ...manualRef.current };
    for (const m of moved) if (m.type === 'position' && m.position) changed[m.id] = m.position;
    if (moved.some(m => m.type === 'position' && !m.dragging)) store(changed);
    else { manualRef.current = changed; setManual(changed); }
  }, [store]);
  const startCamera = useMemo(() => camera(nodes, positions, size, false, selectedId), [nodes, positions, size, selectedId]);
  const fitAll = useCallback(() => {
    const now = latest.current;
    void flow.setViewport(camera(now.nodes, now.positions, now.size, true), { duration: motionTime() });
  }, [flow]);
  const focus = useCallback((id: string, zoomIn = false) => {
    const now = latest.current, n = now.nodes.find(item => item.id === id), p = now.positions[id];
    if (!n || !p || !now.size.width) return;
    const s = nodeSize(n), v = flow.getViewport();
    // 放大到这张卡片占满视野的大部分，便于直接在卡片上拖动和输入。
    const target = Math.min(MAX_ZOOM, (now.size.width - 48) / s.width, (now.size.height - 150) / s.height);
    void flow.setCenter(p.x + s.width / 2, p.y + s.height / 2 - 10 / v.zoom, { zoom: zoomIn ? Math.max(v.zoom, Math.min(target, 1.5)) : v.zoom, duration: motionTime() });
  }, [flow]);
  /** 只平移到刚好能看见这张卡片，尽量保留原来的上下文。 */
  const reveal = useCallback((id: string) => {
    const now = latest.current, n = now.nodes.find(item => item.id === id), p = now.positions[id];
    if (!n || !p || !now.size.width || !flow.viewportInitialized) return;
    const v = flow.getViewport(), s = nodeSize(n);
    const left = p.x * v.zoom + v.x, top = p.y * v.zoom + v.y, w = s.width * v.zoom, h = s.height * v.zoom;
    // 上方留出下一步按钮的位置，下方留出工具条的位置。
    const pad = { l: 64, t: 64, r: 64, b: 84 };
    if (w > now.size.width - pad.l - pad.r || h > now.size.height - pad.t - pad.b) {
      // 视野比卡片小（窄屏或面板占去一半）：缩到整张卡片都看得见。
      const fit = Math.min((now.size.width - 24) / s.width, (now.size.height - 70) / s.height);
      if (fit < v.zoom || left + w < 80 || top + h < 80 || left > now.size.width - 80 || top > now.size.height - 80)
        void flow.setCenter(p.x + s.width / 2, p.y + s.height / 2 - 14 / Math.min(v.zoom, fit), { zoom: Math.max(MIN_ZOOM, Math.min(v.zoom, fit)), duration: motionTime() });
      return;
    }
    const dx = left < pad.l ? pad.l - left : left + w > now.size.width - pad.r ? now.size.width - pad.r - left - w : 0;
    const dy = top < pad.t ? pad.t - top : top + h > now.size.height - pad.b ? now.size.height - pad.b - top - h : 0;
    if (dx || dy) void flow.setViewport({ x: v.x + dx, y: v.y + dy, zoom: v.zoom }, { duration: motionTime() });
  }, [flow]);
  useImperativeHandle(handle, () => ({
    place: (id, position, size) => {
      let spot = position;
      if (size) {
        // 放在视野中央时避开已有的卡片：被挡住就往下挪。
        const now = latest.current;
        const taken = now.nodes.filter(n => now.positions[n.id]).map(n => ({ ...now.positions[n.id], ...nodeSize(n) }));
        for (let i = 0; i < 40; i++) {
          const hit = taken.find(o => o.x < spot.x + size.width + 20 && o.x + o.width + 20 > spot.x && o.y < spot.y + size.height + 20 && o.y + o.height + 20 > spot.y);
          if (!hit) break;
          spot = { x: spot.x, y: hit.y + hit.height + 36 };
        }
      }
      store({ ...manualRef.current, [id]: spot });
    },
    center: () => {
      const box = container.current?.getBoundingClientRect();
      return box ? flow.screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 }) : { x: 0, y: 0 };
    },
    focus, fit: fitAll, reveal,
  }), [flow, focus, fitAll, reveal, store]);

  // 从面板或新建步骤选中一个不在视野里的卡片时，把它移到视野内。
  useEffect(() => {
    if (!flow.viewportInitialized || !size.width || !size.height) return;
    const prior = previousFrame.current;
    if (prior.id === selectedId && prior.width === size.width && prior.height === size.height) return;
    if (!selectedId) { previousFrame.current = { id: selectedId, ...size }; return; }
    if (!nodes.some(item => item.id === selectedId) || !positions[selectedId]) return;
    previousFrame.current = { id: selectedId, ...size };
    reveal(selectedId);
  }, [selectedId, nodes, positions, flow, size, reveal]);

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
  function doubleClick(event: MouseEvent<HTMLDivElement>) {
    if (!onAddAt || !(event.target as HTMLElement).classList.contains('react-flow__pane')) return;
    onAddAt(flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }), { x: event.clientX, y: event.clientY });
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    const files = Array.from(event.dataTransfer.files).filter(file => /^image\/(png|jpeg|webp)$/.test(file.type));
    if (!onDropFiles || !files.length) return;
    event.preventDefault();
    onDropFiles(files, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }
  return <div ref={container} className={`gb-board cv-board${hand ? ' gb-hand' : ''}`} data-testid="workflow-graph"
    role="region" aria-label="设计画布" tabIndex={0} onKeyDownCapture={keyDown} onDoubleClick={doubleClick}
    onDragOver={event => { if (onDropFiles && event.dataTransfer.types.includes('Files')) event.preventDefault(); }} onDrop={drop}>
    <BoardKitContext.Provider value={kit}>
      {size.width > 0 && nodes.length > 0 && !loading && <ReactFlow<Card, Wire>
        nodes={cardsOnBoard} edges={wires} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onNodesChange={changeNodes} onNodeClick={(_, n) => onSelect(n.id)}
        onNodeDoubleClick={(event, n) => { if (!(event.target as HTMLElement).closest('textarea,input,button,.cv-stage')) onOpen?.(n.id); }}
        onPaneClick={() => onSelect(null)}
        onConnect={editable ? connection => onConnect?.(connection.source, connection.target) : undefined}
        defaultViewport={startCamera} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM} nodesConnectable={editable && !hand}
        nodesDraggable={!hand} elementsSelectable={!hand} edgesFocusable={false} edgesReconnectable={false}
        selectNodesOnDrag={false} nodesFocusable deleteKeyCode={null} multiSelectionKeyCode={null} selectionKeyCode={null}
        preventScrolling zoomOnPinch zoomOnDoubleClick={false} panOnDrag panOnScroll
        ariaLabelConfig={ariaLabels} connectionLineStyle={{ stroke: '#b78440', strokeWidth: 2, strokeDasharray: '5 3' }}>
        <Background variant={BackgroundVariant.Dots} size={1.05} gap={18} color="#c9cdc4"/>
        {map && <MiniMap className="gb-minimap" pannable zoomable nodeBorderRadius={3}
          nodeColor={n => n.id === selectedId ? '#478c79' : '#cbd6cd'} maskColor="rgba(240, 239, 232, .7)" />}
      </ReactFlow>}
    </BoardKitContext.Provider>
    {nodes.length > 0 && <div className="gb-tools" role="toolbar" aria-label="画布视图">
      <button type="button" aria-label="选择工具" title="选择（V）" aria-pressed={!hand} onClick={() => setHand(false)}><MousePointer2 /></button>
      <button type="button" aria-label="平移工具" title="平移（H）" aria-pressed={hand} onClick={() => setHand(true)}><Hand /></button>
      <i/><button type="button" aria-label="缩小画布" title="缩小（−）" onClick={() => void flow.zoomOut({ duration: motionTime() })}><Minus /></button>
      <button type="button" className="gb-zoom" aria-label="重置缩放为百分之百" title="恢复 100%（0）" onClick={() => void flow.zoomTo(1, { duration: motionTime() })}><ZoomNumber /></button>
      <button type="button" aria-label="放大画布" title="放大（+）" onClick={() => void flow.zoomIn({ duration: motionTime() })}><Plus /></button>
      <i/><button type="button" aria-label="适应全图" title="适应全图（F）" onClick={fitAll}><Maximize /></button>
      <button type="button" aria-label="整理画布" title="按来源关系重新排布全部卡片" data-testid="canvas-tidy" onClick={tidy}><LayoutGrid /></button>
      <button type="button" aria-label="缩略图" title="缩略图" aria-pressed={map} onClick={() => setMap(s => !s)}><MapIcon /></button>
    </div>}
  </div>;
});

const DesignBoard = forwardRef<BoardHandle, BoardProps>(function DesignBoard(props, ref) {
  return <ReactFlowProvider key={props.boardId}><BoardCanvas ref={ref} {...props} /></ReactFlowProvider>;
});
export default DesignBoard;
