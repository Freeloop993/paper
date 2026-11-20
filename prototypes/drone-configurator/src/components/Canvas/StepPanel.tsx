// 右侧面板：跟着画布上选中的那一步变化。
// 目标 → 查依据与确认；造型 → 部件参数；生成 → 核对输入并提交；候选图 → 取舍与继续；没有选中时给出整体进度和下一步。
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Anchor, ArrowLeftRight, ArrowRight, Box, Camera, Check, ChevronDown, Eye, FileText, GitBranch, Image as ImageIcon,
  LoaderCircle, MessageCircle, PanelRightClose, Ruler, ScanLine, Settings, SlidersHorizontal, Sparkles, Trash2, Undo2, Video, Zap,
} from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, taskLabels } from '../../design/design';
import { compilePrompt } from '../../design/partPrompt';
import { chatContext, chatScopeKey } from '../../design/designChatAudit';
import { candidateRetained, type FrozenAttempt } from '../../design/candidateRecords';
import { generationStatus, retryCollection } from '../../design/generation';
import { useImageBackend } from '../../design/imageBackend';
import { aircraftParameters } from '../../data/aircraft';
import type { WorkflowBoard, WorkflowEdge, WorkflowNode } from '../../design/workflow/types';
import type { PendingStep } from '../../design/workflow/workspaceRecords';
import type { ParameterGroup } from '../../types/DroneParameters';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import GraphInspector, { Picture, Relations, Source } from '../Graph/GraphInspector';
import GoalPanel, { type EvidencePins } from '../Insight/InsightPage';
import ParameterEvidence from '../Insight/ParameterEvidence';
import FrameParameters from '../Parameters/FrameParameters';
import PropulsionParameters from '../Parameters/PropulsionParameters';
import FuselageParameters from '../Parameters/FuselageParameters';
import LandingGearParameters from '../Parameters/LandingGearParameters';
import AccessoriesParameters from '../Parameters/AccessoriesParameters';
import DesignChat from '../Studio/DesignChat';
import Hints from '../Studio/Hints';
import References from '../Studio/References';
import SpaceMap from '../Studio/SpaceMap';
import { GuideView, RatioHud } from '../Studio/Stage';
import { useCanvasUi } from './canvasUi';
import { kindName } from './StepCards';

export interface PanelOps {
  select: (id: string | null) => void;
  addGenerate: (parentNodeId?: string) => void;
  run: (node: WorkflowNode) => void;
  removeStep: (node: WorkflowNode) => void;
  setStepGoal: (recordId: string, goal: string) => void;
  setStepParent: (recordId: string, parentNodeId: string | null) => void;
  keep: (node: WorkflowNode) => void;
  compare: (node?: WorkflowNode) => void;
  saveVersion: (nodeId: string) => void;
  restore: (nodeId: string) => void;
  newDirection: () => void;
  removeNode: (node: WorkflowNode) => void;
  removeReference: (edgeId: string) => void;
  copyReference: (node: WorkflowNode) => void;
  openResearch: (node?: WorkflowNode) => void;
  report: (message: string) => void;
  pins: EvidencePins;
}
export type PanelTab = 'step' | 'chat';
interface Props {
  board: WorkflowBoard;
  node?: WorkflowNode;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  attempts: FrozenAttempt[];
  steps: PendingStep[];
  starting: Set<string>;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
  ops: PanelOps;
}

const parts: { id: ParameterGroup; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'frame', label: '机架', icon: Settings }, { id: 'propulsion', label: '动力', icon: Zap }, { id: 'fuselage', label: '机身', icon: Box },
  { id: 'landing_gear', label: '起落架', icon: Anchor }, { id: 'accessories', label: '配件', icon: Camera },
];
const viewNames = { top: '顶视', guide: '条件图', side: '侧视' };
const offline = () => !['http:', 'https:'].includes(window.location.protocol);
const stamp = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** 候选图按「候选 01 · 那一轮的目标」称呼，参考图用文件名。 */
function pictureName(node: WorkflowNode, attempts: FrozenAttempt[]) {
  if (!node.candidateId) return '参考 · ' + node.title;
  const goal = attempts.find(a => a.id === node.attemptId)?.goal;
  return '候选 ' + node.candidateId.split('/').pop()!.padStart(2, '0') + (goal ? ' · ' + goal : '');
}

/** 没有选中卡片时：整条设计线索的进度，以及建议的下一步。 */
function Overview({ nodes, ops }: Pick<Props, 'nodes' | 'ops'>) {
  const { activeVariant, parameters, intent, variants } = useDroneStore();
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const brief = nodes.find(n => n.kind === 'brief' && n.variantId === activeVariant);
  const design = nodes.find(n => n.isDraft && n.variantId === activeVariant);
  const runs = nodes.filter(n => n.kind === 'run' && n.variantId === activeVariant);
  const waiting = runs.find(n => n.pending);
  const pictures = nodes.filter(n => n.candidateId);
  const kept = pictures.filter(n => n.retained);
  const next = !intent.note ? 'goal' : !runs.length ? 'generate' : waiting ? 'run' : pictures.length && !kept.length ? 'keep' : 'generate';
  const rows = [
    { id: 'goal', icon: FileText, name: '目标', value: intent.note || '写一句这次想要的变化', done: !!intent.note, open: () => brief && ops.select(brief.id) },
    { id: 'design', icon: SlidersHorizontal, name: '造型', value: `${frameRules[parameters.frame.frame_type].zh} · W/L ${layout.W_over_L.toFixed(2)} · 轴距 ${parameters.frame.wheelbase_mm} mm`, done: true, open: () => design && ops.select(design.id) },
    { id: 'generate', icon: ScanLine, name: '生成', value: runs.length ? `${runs.length} 轮${waiting ? '，1 轮待提交' : ''}` : '还没有生成', done: runs.some(n => n.progress === 'done'),
      open: () => waiting ? ops.select(waiting.id) : runs.length ? ops.select(runs[0].id) : ops.addGenerate() },
    { id: 'keep', icon: ImageIcon, name: '取舍', value: pictures.length ? `${pictures.length} 张候选，已保留 ${kept.length} 张` : '回图后在这里取舍', done: kept.length > 0,
      open: () => pictures.length ? ops.select((kept[0] ?? pictures[0]).id) : undefined },
  ];
  return <div className="cv-overview" data-testid="canvas-overview">
    <h2>在画布上设计</h2>
    <p>每一步都是画布上的一张卡片。点卡片直接改，这里会换成那一步需要的内容；选中卡片后，上方会出现可以接着做的下一步。</p>
    <ol className="cv-steps">{rows.map((row, index) => <li key={row.id}>
      <button type="button" data-overview-step={row.id} data-next={next === row.id || (next === 'run' && row.id === 'generate') ? 'yes' : undefined} onClick={row.open}>
        <span className={'cv-step-mark' + (row.done ? ' is-done' : '')}>{row.done ? <Check size={13}/> : index + 1}</span>
        <span className="cv-step-text"><strong>{row.name}</strong><small>{row.value}</small></span>
        {(next === row.id || (next === 'run' && row.id === 'generate')) && <em>下一步</em>}
      </button>
    </li>)}</ol>
    {variants.length > 1 && <p className="cv-muted">画布上并排着 {variants.length} 个方向，当前编辑的是{variants.find(v => v.id === activeVariant)?.name}。点另一个方向的卡片即可切换。</p>}
    <ul className="cv-tips">
      <li>双击画布空白处，或用底部的工具条，添加便签、参考图、新方向和生成步骤。</li>
      <li>把图片直接拖进画布，就是一张参考图；把它连到「生成」卡片，就随这一轮一起提交。</li>
      <li>在「造型」卡片里直接拖橙色轴心、机身边缘和桨盘。</li>
    </ul>
  </div>;
}

/** 造型：部件页签与参数。选中画布上的部件，这里就切到对应页签。 */
function DesignPanel({ node, ops }: { node: WorkflowNode; ops: PanelOps }) {
  const draft = useDroneStore();
  const { parameters, pinned, setGhost, lastChange, undo, history, resetToDefaults, variants, activeVariant, removeVariant } = draft;
  const ui = useCanvasUi();
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const tool = (on: boolean) => 'cv-toggle' + (on ? ' is-on' : '');
  return <div className="cv-design" data-testid="studio" data-frame-name={frameRules[parameters.frame.frame_type].zh}>
    <div className="cv-toolrow">
      <button type="button" className="cv-toggle" data-testid="undo" onClick={undo} disabled={!history.length} title="撤销上一步"><Undo2 size={13}/>撤销</button>
      <span className="cv-toolrow-gap"/>
      <button type="button" className={tool(ui.overlays.dims)} aria-pressed={ui.overlays.dims} onClick={() => ui.toggleOverlay('dims')} title="尺寸标注"><Ruler size={13}/>标注</button>
      <button type="button" className={tool(ui.overlays.fov)} aria-pressed={ui.overlays.fov} onClick={() => ui.toggleOverlay('fov')} title="相机视野（俯视近似）"><Video size={13}/>视野</button>
      <button type="button" className={tool(ui.overlays.hidden)} aria-pressed={ui.overlays.hidden} onClick={() => ui.toggleOverlay('hidden')} title="显示被机身挡住的相机与起落架"><Eye size={13}/>透视</button>
    </div>
    {lastChange && <p className="cv-change" data-testid="last-change">{lastChange.label}{lastChange.from && `：${lastChange.from}`} → <b>{lastChange.to}</b></p>}
    {pinned && <p className="cv-compare" data-testid="compare-line"><span/>对比：{pinned.label}<b className="num">W/L {computeLayout(pinned.parameters).W_over_L.toFixed(2)}</b>
      <button type="button" onClick={() => setGhost('', null)}>结束</button></p>}
    <section className="cv-parts" aria-label="部件参数" data-testid="inspector">
      <div className="cv-part-tabs" role="tablist" aria-label="部件">{parts.map(t => <button key={t.id} type="button" role="tab" aria-selected={ui.part === t.id} data-tab={t.id}
        onClick={() => ui.setPart(t.id)}><t.icon className="h-4 w-4"/>{t.label}</button>)}</div>
      <div className="cv-part-body" role="tabpanel">
        <ParameterEvidence part={ui.part}/>
        {ui.part === 'frame' && <FrameParameters />}
        {ui.part === 'propulsion' && <PropulsionParameters />}
        {ui.part === 'fuselage' && <FuselageParameters />}
        {ui.part === 'landing_gear' && <LandingGearParameters />}
        {ui.part === 'accessories' && <AccessoriesParameters />}
      </div>
    </section>
    <RatioHud layout={layout} compact/>
    <details className="cv-fold">
      <summary>布局空间、设计提示与参考机型<ChevronDown size={15}/></summary>
      <div className="cv-fold-body">
        <SpaceMap layout={layout} onGhost={a => setGhost(a.name, pinned?.label === a.name ? null : aircraftParameters(a, parameters))} />
        <Hints parameters={parameters} layout={layout} onSelect={ui.setPart} />
        <References />
      </div>
    </details>
    <div className="cv-panel-actions">
      <button type="button" className="cv-primary" data-testid="studio-generate" onClick={() => ops.addGenerate()}><Sparkles size={15}/>生成效果图</button>
      <button type="button" onClick={ops.newDirection} disabled={variants.length >= 6} data-testid="variant-add" title="把当前方向复制一份，并排放在画布上继续改"><GitBranch size={14}/>另开一个方向</button>
      <button type="button" onClick={() => ops.saveVersion(node.id)}><Check size={14}/>存为版本</button>
      <button type="button" data-testid="reset" onClick={resetToDefaults}>重置参数</button>
      {variants.length > 1 && <button type="button" onClick={() => removeVariant(activeVariant)}><Trash2 size={14}/>删除这个方向</button>}
    </div>
  </div>;
}

/** 生成：提交前核对将要发给模型的三样东西——布局条件图、文字、参考图。 */
function GeneratePanel({ node, nodes, attempts, steps, starting, ops }: Pick<Props, 'nodes' | 'attempts' | 'steps' | 'starting' | 'ops'> & { node: WorkflowNode }) {
  const { parameters, touched, intent } = useDroneStore();
  const step = node.pending ? steps.find(s => s.id === node.recordId) : undefined;
  const attempt = node.attemptId ? attempts.find(a => a.id === node.attemptId) : undefined;
  const [goal, setGoal] = useState(step?.goal ?? '');
  const backend = useImageBackend();
  useEffect(() => { setGoal(step?.goal ?? ''); }, [step?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const [error, setError] = useState('');
  if (step) {
    const text = compilePrompt(parameters, touched, intent, layout).text;
    const parent = step.parentNodeId ? nodes.find(n => n.id === step.parentNodeId) : undefined;
    const choices = nodes.filter(n => n.image && (n.candidateId || n.removable));
    const busy = starting.has(step.id);
    return <div className="cv-generate" data-testid="generate-panel">
      <h2>生成效果图</h2>
      <p className="cv-muted">点「生成」后，下面三样内容会发给 {backend.label}，返回一张 1024 × 1024 的效果图。提交前可以继续改造型和目标。</p>
      <label className="cv-field">这一轮想改变什么<span>选填</span>
        <textarea rows={2} value={goal} data-testid="generation-goal" placeholder={intent.note.trim() || '例如，让机鼻和相机的过渡更圆润'}
          onChange={event => setGoal(event.target.value)} onBlur={() => { if (goal !== step.goal) ops.setStepGoal(step.id, goal); }}/>
      </label>
      <h3>将要提交的内容</h3>
      <div className="cv-input-row"><GuideView layout={layout} className="cv-input-thumb"/>
        <div><strong>布局条件图</strong><p>{frameRules[parameters.frame.frame_type].zh} · {layout.hubs.length} 个轴位。红点是电机轴心，蓝线是机架连接。</p></div></div>
      <div className="cv-input-row">
        {parent?.image ? <WorkflowImage node={parent} alt={parent.title} className="cv-input-thumb"/> : <span className="cv-input-thumb is-empty"><ImageIcon size={18}/></span>}
        <div><strong>参考图</strong>
          <p>{parent ? (parent.candidateId ? '以这张候选图为父图继续修订。' : '借用这张参考图的造型语言。') : '可不接。把候选图或参考图连到这张卡片，或在下面选一张。'}</p>
          <select aria-label="选择参考图" value={parent?.id ?? ''} data-testid="generation-parent" onChange={event => ops.setStepParent(step.id, event.target.value || null)}>
            <option value="">不使用参考图</option>
            {choices.map(n => <option key={n.id} value={n.id}>{pictureName(n, attempts)}</option>)}
          </select>
        </div>
      </div>
      <details className="cv-fold is-plain"><summary>文字 · 由造型和目标编译<ChevronDown size={15}/></summary>
        <p className="cv-prompt" lang="en">{text}</p>
        <p className="cv-muted">未指定的造型项不写入文字，留给模型和后续修订。逐句来源见「研究详情与导出」。</p>
      </details>
      {offline() && <p className="cv-warning"><AlertCircle size={14}/>在线生成需要从本机工作台服务打开页面。离线包可以继续编辑、保存版本和导出规格。</p>}
      <div className="cv-panel-actions">
        <button type="button" className="cv-primary" disabled={busy} data-testid="generate-current" onClick={() => { if (goal !== step.goal) ops.setStepGoal(step.id, goal); ops.run({ ...node, detail: goal }); }}>
          {busy ? <LoaderCircle size={15} className="animate-spin"/> : <Sparkles size={15}/>}{busy ? '正在提交' : '生成'}</button>
        <button type="button" onClick={() => ops.removeStep(node)} disabled={busy}><Trash2 size={14}/>移除这一步</button>
      </div>
      <p className="cv-provider" data-testid="generation-model">{backend.label}{backend.provider === 'minimax' ? ' · 开发用，不计入论文数据' : ''}</p>
    </div>;
  }
  const status = attempt && generationStatus(attempt);
  const issue = attempt?.h3?.issue || attempt?.failure;
  const done = attempt?.h3?.status === 'succeeded' || !!attempt?.receipt;
  const outputs = nodes.filter(n => n.candidateId && n.attemptId === node.attemptId);
  return <div className="cv-generate" data-testid="generate-panel">
    <h2>{node.title}</h2>
    <p className="cv-muted">{stamp(node.createdAt)}{attempt && ' · ' + frameRules[attempt.config.parameters.frame.frame_type].zh + ' · ' + taskLabels[attempt.config.task_id]}</p>
    {status && <div className={'cv-status' + (issue ? ' is-issue' : '')} data-testid="generation-status" role="status">
      {issue ? <AlertCircle size={16}/> : done ? <Check size={16}/> : <LoaderCircle size={16} className="animate-spin"/>}
      <div><strong>{status.title}</strong><p>{status.detail}</p>
        {attempt?.h3?.issue && attempt.h3.status !== 'failed' && <button type="button" onClick={() => void retryCollection(attempt.id).catch(e => setError(String(e)))}>恢复本轮生成</button>}
      </div>
    </div>}
    {outputs.length > 0 && <div className="cv-outputs">{outputs.map(output => <button type="button" key={output.id} data-testid="generation-result" onClick={() => ops.select(output.id)}>
      <WorkflowImage node={output} alt={output.title}/><span>{output.retained ? '已保留 · ' : ''}查看这张候选</span></button>)}</div>}
    {error && <p className="cv-warning" role="alert">{error}</p>}
    <div className="cv-panel-actions">
      <button type="button" className="cv-primary" onClick={() => ops.addGenerate()}><Sparkles size={15}/>按当前造型再生成一轮</button>
      <button type="button" onClick={() => ops.openResearch(node)}><ArrowRight size={14}/>查看轮次记录</button>
    </div>
    <details className="cv-fold is-plain"><summary>这一轮实际提交的文字<ChevronDown size={15}/></summary><p className="cv-prompt" lang="en">{node.detail}</p></details>
  </div>;
}

/** 候选图：保留、以它继续，或与另一张并排对照。 */
function CandidatePanel({ node, nodes, edges, attempts, ops }: Pick<Props, 'nodes' | 'edges' | 'attempts' | 'ops'> & { node: WorkflowNode }) {
  const attempt = attempts.find(a => a.id === node.attemptId);
  const retained = !!attempt && !!node.candidateId && candidateRetained(attempt, node.candidateId);
  const decisions = attempt?.decisions.filter(d => d.candidate === node.candidateId) ?? [];
  return <div className="cv-candidate" data-testid="candidate-panel">
    <h2>候选图 {node.candidateId?.split('/').pop()?.padStart(2, '0')}</h2>
    <p className="cv-muted">{attempt?.goal}{node.createdAt && ' · ' + stamp(node.createdAt)}</p>
    <Picture node={node}/>
    <div className="cv-panel-actions">
      <button type="button" className="cv-primary" disabled={!node.firstShown || retained} data-retain-candidate={node.candidateId} onClick={() => ops.keep(node)}>
        <Check size={15}/>{retained ? '已保留' : '保留此方案'}</button>
      <button type="button" disabled={!node.firstShown} data-generate-from={node.candidateId} onClick={() => ops.addGenerate(node.id)}><Sparkles size={14}/>以此图继续生成</button>
      <button type="button" onClick={() => ops.compare(node)} data-testid="compare-images"><ArrowLeftRight size={14}/>图片对照</button>
      <button type="button" onClick={() => ops.openResearch(node)}><ArrowRight size={14}/>驳回、回选与轮次记录</button>
    </div>
    {decisions.length > 0 && <ol className="cv-decisions">{decisions.map(d => <li key={d.id}><b>{{ accept: '保留', reject: '驳回', restore: '回选', manual: '人工深化', stop: '结束' }[d.kind]}</b> · {stamp(d.at)} · {d.reason}</li>)}</ol>}
    <Relations node={node} nodes={nodes} edges={edges} onSelect={ops.select}/>
    <Source node={node}/>
  </div>;
}

/** 设计对话：围绕当前方向和正在看的部件；建议先预览，由设计者决定是否应用。 */
function ChatTab({ pins }: { pins: EvidencePins }) {
  const draft = useDroneStore();
  const ui = useCanvasUi();
  const scopeKey = chatScopeKey(draft);
  const context = chatContext(draft, scopeKey, ui.part, ui.view);
  const visible = ui.preview?.version === context.version ? ui.preview : null;
  return <DesignChat key={JSON.stringify([scopeKey, context.task, context.frame])} context={context} scopeKey={scopeKey} preview={visible}
    scopeLabel={[frameRules[context.frame].zh, parts.find(t => t.id === ui.part)?.label, viewNames[ui.view]].join(' · ')}
    onSelectBody={() => ui.setPart('fuselage')} onPreview={ui.setPreview} pins={pins}/>;
}

export default function StepPanel({ board, node, nodes, edges, attempts, steps, starting, tab, onTab, onClose, ops }: Props) {
  const { activeVariant } = useDroneStore();
  const project = board === 'project';
  const mine = project && node?.variantId === activeVariant;
  const mode = !node ? 'overview' : project && node.kind === 'brief' && mine ? 'goal' : project && node.isDraft && mine ? 'design'
    : project && node.kind === 'run' ? 'generate' : project && node.candidateId ? 'candidate' : 'detail';
  const title = !node ? (project ? '开始' : '案例') : mode === 'detail' ? kindName(node) : { goal: '目标', design: '造型', generate: '生成', candidate: '候选图' }[mode as 'goal'];
  const showing = project ? tab : 'step';
  return <aside className="cv-panel" aria-label="步骤面板" data-testid="step-panel" data-panel-mode={mode}>
    <header className="cv-panel-head">
      <div className="cv-panel-tabs" role="tablist" aria-label="面板内容">
        <button type="button" role="tab" aria-selected={showing === 'step'} data-panel-tab="step" onClick={() => onTab('step')}>{title}</button>
        {project && <button type="button" role="tab" aria-selected={showing === 'chat'} data-panel-tab="chat" data-testid="graph-chat-tab" onClick={() => onTab('chat')}><MessageCircle size={14}/>设计对话</button>}
      </div>
      <button type="button" className="canvas-icon-button" onClick={onClose} aria-label="收起面板"><PanelRightClose size={16}/></button>
    </header>
    <div key={mode + (node?.id ?? '')} className="cv-panel-scroll scroll-thin" hidden={showing !== 'step'}>
      {mode === 'overview' && (project ? <Overview nodes={nodes} ops={ops}/> : <div className="cv-overview"><h2>B2 · 四旋翼外观深化</h2>
        <p>这是一份只读的历史档案：从原始候选追踪相机安装位置的两条人工深化分支。点任一张卡片查看来源和记录；图片可以引用到「我的项目」。</p></div>)}
      {mode === 'goal' && <GoalPanel pins={ops.pins}/>}
      {mode === 'design' && node && <DesignPanel node={node} ops={ops}/>}
      {mode === 'generate' && node && <GeneratePanel key={node.id} node={node} nodes={nodes} attempts={attempts} steps={steps} starting={starting} ops={ops}/>}
      {mode === 'candidate' && node && <CandidatePanel node={node} nodes={nodes} edges={edges} attempts={attempts} ops={ops}/>}
      {mode === 'detail' && node && <GraphInspector node={node} nodes={nodes} edges={edges} boardId={board} onSelect={ops.select} onBranch={ops.saveVersion} onRestore={ops.restore}
        onHandoff={ops.openResearch} onGenerateFrom={n => ops.addGenerate(n.id)} onRemove={ops.removeNode} onRemoveReference={ops.removeReference} onCopyReference={ops.copyReference}/>}
    </div>
    {project && showing === 'chat' && <div className="cv-panel-chat"><ChatTab pins={ops.pins}/></div>}
  </aside>;
}
