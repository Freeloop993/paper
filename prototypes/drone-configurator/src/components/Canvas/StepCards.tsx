// 画布上的步骤卡片。每一类卡片就是设计过程里的一步：目标直接在卡片上写，造型直接在卡片上拖，生成直接在卡片上点。
import { createContext, memo, useContext, useEffect, useMemo, useState } from 'react';
import { Handle, NodeToolbar, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import {
  AlertCircle, Check, CheckCheck, FileText, Image as ImageIcon, LoaderCircle, PencilLine, Plus, Quote,
  ScanLine, SlidersHorizontal, Sparkles, StickyNote, type LucideIcon,
} from 'lucide-react';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import type { WorkflowNode } from '../../design/workflow/types';
import { computeLayout, frameRules, taskLabels } from '../../design/design';
import { chatContext, chatScopeKey } from '../../design/designChatAudit';
import { useDroneStore } from '../../store/droneStore';
import { useGoalEditor } from '../Insight/useGoalEditor';
import { GuideView, SideView, TopStage } from '../Studio/Stage';
import { useCanvasUi, type StageView } from './canvasUi';

export interface StepAction { id: string; label: string; icon: LucideIcon; primary?: boolean; disabled?: boolean; title?: string; run: () => void }
export interface BoardKit {
  editable: boolean;
  activeVariant: string;
  variantCount: number;
  starting: Set<string>;
  onSelect: (id: string) => void;
  onRun: (node: WorkflowNode) => void;
  onNoteChange: (id: string, text: string) => void;
  actionsFor: (node: WorkflowNode) => StepAction[];
}
export const BoardKitContext = createContext<BoardKit | null>(null);
function useKit() {
  const kit = useContext(BoardKitContext);
  if (!kit) throw new Error('步骤卡片只在画布内使用。');
  return kit;
}

export type Card = Node<{ item: WorkflowNode; input: boolean; output: boolean; proximity: 'adjacent' | 'distant' | '' }, 'card'>;
export interface Size { width: number; height: number }

export const kinds = {
  brief: { name: '目标', icon: FileText }, spec: { name: '造型', icon: SlidersHorizontal },
  evidence: { name: '用户依据', icon: Quote }, run: { name: '生成', icon: ScanLine }, image: { name: '图像', icon: ImageIcon },
  decision: { name: '取舍', icon: CheckCheck }, edit: { name: '人工编辑', icon: PencilLine }, note: { name: '笔记', icon: StickyNote },
} as const;
export function kindName(node: WorkflowNode) {
  if (node.kind === 'spec') return node.isDraft ? '造型' : node.research ? '冻结规格' : '保存的版本';
  if (node.kind === 'image') return node.candidateId ? '候选图' : node.removable ? '参考图' : '图像';
  if (node.kind === 'note') return node.editable ? '便签' : '对照问题';
  return kinds[node.kind].name;
}

export function nodeSize(node: WorkflowNode): Size {
  if (node.kind === 'brief') return { width: 300, height: 212 };
  if (node.kind === 'spec') return node.isDraft ? { width: 440, height: 526 } : { width: 216, height: 246 };
  if (node.kind === 'run') return { width: 240, height: node.pending ? 176 : 132 };
  if (node.image) return { width: 236, height: 268 };
  if (node.editable) return { width: 220, height: 168 };
  return { width: 228, height: 148 };
}

const views: { id: StageView; label: string }[] = [{ id: 'top', label: '顶视' }, { id: 'guide', label: '条件图' }, { id: 'side', label: '侧视' }];

/** 目标：卡片本身就是输入框。回车保存，右侧面板同时给出可参考的用户原话。 */
function GoalCard({ item, active }: { item: WorkflowNode; active: boolean }) {
  const kit = useKit();
  const mission = taskLabels[item.intent?.taskId ?? 'consumer_camera'];
  const cards = item.intent?.cards.length ?? 0;
  return <>
    <div className="cv-head"><span className="cv-kind"><FileText size={14}/>目标</span><span className="cv-tag">{mission}</span>
      {kit.variantCount > 1 && <span className="cv-tag is-plain">方案 {item.variantId}</span>}</div>
    {active ? <GoalEditor item={item}/> : <>
      <p className="cv-goal-text is-static">{item.intent?.note || '还没有写目标'}</p>
      <div className="cv-foot"><span>点一下，切换到这个方向</span>{cards > 0 && <span>依据 {cards}</span>}</div>
    </>}
  </>;
}
function GoalEditor({ item }: { item: WorkflowNode }) {
  const kit = useKit();
  const goal = useGoalEditor();
  const cards = item.intent?.cards.length ?? 0;
  const saved = item.intent?.note ?? '';
  const last = item.intent?.log[item.intent.log.length - 1];
  const reconfirm = !saved && last?.action === 'note' && !!last.value?.includes('原设计意图需重新确认');
  return <>
    <textarea className="cv-goal-text nodrag nopan nowheel" value={goal.text} aria-label="设计目标" data-testid="goal-card-input"
      placeholder="这次想设计或改变什么？例如：展开时希望机身显得紧凑"
      onFocus={() => kit.onSelect(item.id)} onChange={event => goal.setText(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && goal.inputText) { event.preventDefault(); goal.apply('custom'); }
      }}/>
    <div className="cv-foot">
      {goal.unsaved && goal.inputText
        ? <><span className="cv-unsaved">{reconfirm ? '用途或构型变了，请重新确认' : '未保存'}</span><button type="button" className="cv-mini nodrag" data-testid="goal-card-save" onClick={() => goal.apply('custom')}>{reconfirm ? '确认目标' : '保存目标'}</button></>
        : <span>{saved ? <><Check size={12}/>已确认</> : '写一句话，回车保存'}</span>}
      {cards > 0 && <span>依据 {cards}</span>}
    </div>
  </>;
}

/** 造型：当前方向的顶视图就在卡片里，轴心、机身和桨盘可以直接拖。其他方向静态显示，点一下即可切换过去编辑。 */
function DesignCard({ item, active }: { item: WorkflowNode; active: boolean }) {
  const kit = useKit();
  const ui = useCanvasUi();
  const draft = useDroneStore();
  const parameters = item.parameters!;
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const version = active ? chatContext(draft, chatScopeKey(draft), ui.part, ui.view).version : '';
  const preview = active && ui.preview?.version === version ? ui.preview : null;
  const view = preview ? 'top' : ui.view;
  const stats: [string, number][] = [['W/L', layout.W_over_L], ['桨径 ÷ 轴距', layout.d_over_reference_span], ['机身宽 ÷ 轴距', layout.body_width_over_D]];
  return <>
    <div className="cv-head">
      <span className="cv-kind"><SlidersHorizontal size={14}/>造型</span>
      <span className="cv-tag">{frameRules[parameters.frame.frame_type].zh}</span>
      {kit.variantCount > 1 && <span className="cv-tag is-plain">{item.facts?.find(f => f.label === '方案')?.value}</span>}
      {active && <div className="cv-views nodrag" role="tablist" aria-label="视图">{views.map(v =>
        <button key={v.id} type="button" role="tab" aria-selected={view === v.id} data-view={v.id}
          onClick={() => { ui.setPreview(null); ui.setView(v.id); kit.onSelect(item.id); }}>{v.label}</button>)}</div>}
    </div>
    {active ? <div className={'cv-stage dot-grid nodrag nopan' + (view === 'guide' ? ' is-guide' : '')} data-testid="preview"
      onPointerDownCapture={() => kit.onSelect(item.id)}>
      {view === 'top' && <TopStage active={ui.part} onSelect={part => { ui.setPart(part); kit.onSelect(item.id); }} overlays={ui.overlays} previewWidth={preview?.width}/>}
      {view === 'guide' && <GuideView layout={layout} className="cv-guide"/>}
      {view === 'side' && <SideView parameters={parameters} layout={layout} className="h-full w-full"/>}
      {preview && <span className="cv-stage-note" data-testid="width-preview-caption">试调轮廓 · {parameters.fuselage.fuselage_dimensions_mm.width} → {preview.width} mm</span>}
    </div> : <div className="cv-stage dot-grid is-static">
      <TopStage active="frame" onSelect={() => {}} overlays={{ dims: false, fov: false, hidden: false }} interactive={false} source={parameters}/>
      <span className="cv-stage-note">点一下，切换到这个方向继续改</span>
    </div>}
    <div className="cv-stats">{stats.map(([label, value]) =>
      <span key={label}><small>{label}</small><b>{value.toFixed(2)}</b></span>)}</div>
  </>;
}

/** 生成：放到画布上时还没有提交；点「生成」才把布局图、文字和参考图发给模型。 */
function RunCard({ item }: { item: WorkflowNode }) {
  const kit = useKit();
  const starting = !!item.recordId && kit.starting.has(item.recordId);
  const progress = starting ? 'running' : item.progress;
  return <>
    <div className="cv-head"><span className="cv-kind"><ScanLine size={14}/>生成</span>
      <span className={'cv-progress is-' + progress}>
        {progress === 'running' ? <><LoaderCircle size={12} className="animate-spin"/>生成中</> : progress === 'done' ? <><Check size={12}/>已回图</>
          : progress === 'issue' ? <><AlertCircle size={12}/>需处理</> : '待生成'}
      </span>
    </div>
    <div className="cv-content">
      {item.pending ? <p className="cv-text">{item.detail || '按当前造型和目标生成一张效果图。'}</p> : <h3 title={item.title}>{item.title}</h3>}
      {!item.pending && <p className="cv-sub">{item.subtitle}</p>}
    </div>
    {item.pending && kit.editable && <button type="button" className="cv-run nodrag" disabled={starting} data-testid="canvas-run-step"
      onClick={event => { event.stopPropagation(); kit.onRun(item); }}>
      {starting ? <LoaderCircle size={15} className="animate-spin"/> : <Sparkles size={15}/>}{starting ? '正在提交' : '生成'}
    </button>}
  </>;
}

function ImageCard({ item }: { item: WorkflowNode }) {
  const guide = useMemo(() => !item.image && item.kind === 'spec' && item.parameters ? computeLayout(item.parameters) : null, [item.image, item.kind, item.parameters]);
  const Icon = kinds[item.kind].icon;
  return <>
    <div className="cv-head"><span className="cv-kind"><Icon size={14}/>{kindName(item)}</span>
      {item.retained && <span className="cv-progress is-done"><Check size={12}/>已保留</span>}</div>
    {item.image && <div className="cv-image"><WorkflowImage node={item} alt={item.title} draggable={false}/></div>}
    {guide && <div className="cv-image is-guide"><GuideView layout={guide}/></div>}
    <div className="cv-content is-tight"><h3 title={item.title}>{item.candidateId ? '候选 ' + item.candidateId.split('/').pop()!.padStart(2, '0') : item.title}</h3>
      <p className="cv-sub">{guide ? [item.subtitle, '布局条件图'].filter(Boolean).join(' · ') : item.subtitle}</p></div>
  </>;
}

/** 便签：设计者随手写在画布上的想法，失去焦点时保存。 */
function StickyCard({ item }: { item: WorkflowNode }) {
  const kit = useKit();
  const [text, setText] = useState(item.detail ?? '');
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(item.detail ?? ''); }, [item.detail, editing]);
  return <>
    <div className="cv-head"><span className="cv-kind"><StickyNote size={14}/>便签</span></div>
    <textarea className="cv-sticky-text nodrag nopan nowheel" value={text} readOnly={!kit.editable} aria-label="便签内容" placeholder="随手记下想法、疑问或待比较的方向…"
      onFocus={() => { setEditing(true); kit.onSelect(item.id); }} onChange={event => setText(event.target.value)}
      onBlur={() => { setEditing(false); if (text !== (item.detail ?? '') && item.recordId) kit.onNoteChange(item.recordId, text); }}/>
  </>;
}

function TextCard({ item }: { item: WorkflowNode }) {
  const Icon = kinds[item.kind].icon;
  return <>
    <div className="cv-head"><span className="cv-kind"><Icon size={14}/>{kindName(item)}</span></div>
    <div className="cv-content"><h3 title={item.title}>{item.title}</h3>
      {item.subtitle && <p className="cv-sub">{item.subtitle}</p>}
      {item.detail && item.detail !== item.subtitle && <p className="cv-text">{item.detail}</p>}</div>
  </>;
}

export const StepCard = memo(function StepCard({ data, selected, isConnectable }: NodeProps<Card>) {
  const kit = useKit();
  const { item, input, output } = data;
  const active = kit.editable && item.variantId === kit.activeVariant;
  const actions = selected ? kit.actionsFor(item) : [];
  const variant = item.kind === 'brief' ? 'goal' : item.kind === 'spec' && item.isDraft ? 'design' : item.kind === 'run' ? 'run'
    : item.image || (item.kind === 'spec' && item.parameters) ? 'picture' : item.editable ? 'sticky' : 'text';
  return <article className={`cv-card is-${variant} ${data.proximity}${selected ? ' is-selected' : ''}${item.pending ? ' is-pending' : ''}${item.research ? ' is-research' : ''}`}
    data-workflow-node={item.id} data-kind={item.kind} data-step-kind={variant}>
    <NodeToolbar isVisible={selected && actions.length > 0} position={Position.Top} offset={10} className="cv-actions">
      {actions.map(action => { const Icon = action.icon; return <button key={action.id} type="button" className={action.primary ? 'is-primary' : ''}
        disabled={action.disabled} title={action.title} data-step-action={action.id} onClick={action.run}><Icon size={14}/>{action.label}</button>; })}
    </NodeToolbar>
    <Handle type="target" position={Position.Left} isConnectable={isConnectable} className={`cv-port${input || isConnectable ? '' : ' is-unused'}`} />
    {variant === 'goal' && <GoalCard item={item} active={active}/>}
    {variant === 'design' && <DesignCard item={item} active={active}/>}
    {variant === 'run' && <RunCard item={item}/>}
    {variant === 'picture' && <ImageCard item={item}/>}
    {variant === 'sticky' && <StickyCard item={item}/>}
    {variant === 'text' && <TextCard item={item}/>}
    <Handle type="source" position={Position.Right} isConnectable={isConnectable} onClick={() => kit.onSelect(item.id)}
      title={kit.editable ? '点一下看接下来能做什么；拖到另一张卡片上建立关联' : undefined}
      className={`cv-port is-out${output || isConnectable ? '' : ' is-unused'}${kit.editable ? ' is-plus' : ''}`}>{kit.editable && <Plus size={11} aria-hidden="true"/>}</Handle>
  </article>;
});
