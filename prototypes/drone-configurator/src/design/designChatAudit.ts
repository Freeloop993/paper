import { frameRules, layoutKey, taskLabels, type FrameType, type LayoutKey } from './design.ts';
import { sha256Text } from './sha256.ts';
import type { DesignIntent, DroneParameters, ParameterGroup, TaskId } from '../types/DroneParameters';

export interface DesignChatContext {
  task: TaskId;
  layout: LayoutKey;
  frame: FrameType;
  part: ParameterGroup;
  view: 'top' | 'guide' | 'side';
  widthMm: number;
  version: string;
  brief?: string;
  topic?: string;
  state?: string;
}
export interface WidthSuggestion { field: 'bodyWidthMm'; from: number; to: number; reason: string }
interface Source { id: string; quote: string; limits: string; role?: string; source?: string; cited?: boolean }
interface Branch { topic: string; state: string; status: string; reason: string; ids: string[] }
export interface ChatEvidence {
  sources: Source[];
  retrieval: { status: string; reason: string; sourceCount?: number; version?: string; corpus?: string; scope?: string; branches?: Branch[] };
}
export interface ChatAnswer extends ChatEvidence {
  answer: string; model: string; effort: string; suggestion: WidthSuggestion | null;
  citedIds?: string[]; requestId?: string | null; completionId?: string | null;
}
interface EventBase { turnId: string; at: string; askedAt?: string; scopeKey: string; conversation: string; context: DesignChatContext; question: string }
export type DesignChatEvent = EventBase & (
  { action: 'answer'; answer: ChatAnswer } |
  { action: 'error'; error: string; localEvidence?: ChatEvidence } |
  { action: 'decline'; field: 'bodyWidthMm'; from: number; to: number; reason: string } |
  { action: 'apply' | 'undo'; field: 'bodyWidthMm'; from: number; to: number; resultVersion?: string; previouslyTouched?: boolean }
);

export function redactChatText(value: string) {
  return value.replace(/\b(?:Bearer\s+[\w.+/=-]{12,}|sk-[\w.-]{12,})/gi, '[已隐藏凭据]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[已隐藏邮箱]')
    .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, '[已隐藏手机号]');
}
type Obj = Record<string, unknown>;
const record = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 2400): v is string => typeof v === 'string' && v.length <= max;
const optionalString = (v: unknown, max?: number) => v === undefined || str(v, max);
const ids = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 36 && v.every(id => typeof id === 'string' && /^E\d{3,}$/.test(id));
export const validWidth = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 30 && v <= 200;
export const isWidthTarget = (v: unknown): v is number => validWidth(v) && Number.isInteger(v) && v % 5 === 0;

export function isChatEvidence(v: unknown): v is ChatEvidence {
  if (!record(v) || !record(v.retrieval) || !Array.isArray(v.sources) || v.sources.length > 36) return false;
  const r = v.retrieval;
  return ['retrieve','clarify','abstain'].includes(String(r.status)) && str(r.reason) &&
    optionalString(r.version, 100) && optionalString(r.corpus, 100) && optionalString(r.scope) &&
    (r.sourceCount === undefined || (Number.isSafeInteger(r.sourceCount) && Number(r.sourceCount) >= 0 && Number(r.sourceCount) <= v.sources.length)) &&
    (r.branches === undefined || (Array.isArray(r.branches) && r.branches.length <= 8 && r.branches.every(b =>
      record(b) && str(b.topic, 100) && str(b.state, 100) && str(b.status, 32) && str(b.reason) && ids(b.ids)))) &&
    v.sources.every(s => record(s) && ids([s.id]) && str(s.quote) && str(s.limits) && optionalString(s.role, 32) &&
      optionalString(s.source, 100) && (s.cited === undefined || typeof s.cited === 'boolean'));
}
export function isChatAnswer(v: unknown): v is ChatAnswer {
  if (!record(v) || !isChatEvidence(v) || !str(v.answer, 2200) || !v.answer.trim() || !str(v.model, 128) || !str(v.effort, 32)) return false;
  const s = v.suggestion;
  return (v.citedIds === undefined || (ids(v.citedIds) && v.citedIds.every(id => v.sources.some(source => source.id === id)))) &&
    [v.requestId, v.completionId].every(id => id == null || str(id, 160)) &&
    (s === null || (record(s) && s.field === 'bodyWidthMm' && validWidth(s.from) && isWidthTarget(s.to) && s.from !== s.to && str(s.reason, 500)));
}

export function chatScopeKey(state: { task: string; activeVariant: string; variants: {id: string; workflowKey?: string}[] }) {
  const variant = state.variants.find(v => v.id === state.activeVariant);
  return state.task + '/' + (variant?.workflowKey ?? state.activeVariant);
}

export function chatContext(
  state: {parameters: DroneParameters; intent: DesignIntent; touched: Record<string, boolean>; workflowOrigin?: {id: string; task: string}},
  scopeKey: string, part: ParameterGroup, view: DesignChatContext['view'],
): DesignChatContext {
  const { parameters, intent } = state;
  const task = intent.taskId ?? 'consumer_camera';
  const frame = parameters.frame.frame_type, layout = layoutKey(frame);
  const approved = [...intent.log].reverse().find(i =>
    i.brief && ['accept','custom'].includes(i.brief.action) && i.brief.text === intent.note &&
    i.brief.query.task === task && i.brief.query.layout === layout)?.brief;
  const version = sha256Text(JSON.stringify([scopeKey, parameters, state.touched, intent, state.workflowOrigin, part, view]));
  return {task, frame, layout, part, view, widthMm: parameters.fuselage.fuselage_dimensions_mm.width, version,
    brief: redactChatText(intent.note.trim().slice(0, 600)) || undefined, topic: approved?.query.topic, state: approved?.query.state};
}

export function canUndoChatWidth(state: Parameters<typeof chatContext>[0] & {
  activeVariant:string; task:string; variants:{id:string;workflowKey?:string}[]; history:{undoChatTurnId?:string}[]; designChatAudit?:DesignChatEvent[];
}, turnId: string) {
  const scope = chatScopeKey(state);
  const last = [...(state.designChatAudit ?? [])].reverse().find(e => e.turnId === turnId && e.scopeKey === scope);
  if (last?.action !== 'apply' || !last.resultVersion || last.previouslyTouched === undefined) return false;
  const step = state.history[state.history.length - 1];
  return (!step || step.undoChatTurnId === turnId) &&
    chatContext(state,scope,last.context.part,last.context.view).version === last.resultVersion;
}

// Project permitted research fields. Provider headers, secrets and extra input keys never enter the local transcript.
function evidenceFields(e: ChatEvidence): ChatEvidence {
  const {status, reason, sourceCount, version, corpus, scope, branches} = e.retrieval;
  return {sources: e.sources.map(({id,quote,limits,role,source,cited}) => ({id,quote:redactChatText(quote),limits:redactChatText(limits),
      role:role && redactChatText(role),source:source && redactChatText(source),cited})),
    retrieval: {status, reason:redactChatText(reason), sourceCount, version:version && redactChatText(version), corpus:corpus && redactChatText(corpus),
      scope:scope && redactChatText(scope),
      branches: branches?.map(({topic,state,status,reason,ids}) => ({topic:redactChatText(topic),state:redactChatText(state),status,reason:redactChatText(reason),ids}))}};
}
export function safeChatAnswer(a: ChatAnswer): ChatAnswer {
  const {answer, model, effort, citedIds, completionId, requestId, suggestion} = a;
  return {...evidenceFields(a), answer: redactChatText(answer), model:redactChatText(model), effort:redactChatText(effort), citedIds,
    completionId:completionId && redactChatText(completionId), requestId:requestId && redactChatText(requestId),
    suggestion: suggestion && {field: 'bodyWidthMm', from: suggestion.from, to: suggestion.to, reason: redactChatText(suggestion.reason)}};
}
export const safeChatEvidence = evidenceFields;

export function readDesignChatAudit(raw: unknown): DesignChatEvent[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error('设计对话记录格式无效。');
  const events: DesignChatEvent[] = raw.map((e: unknown) => {
    const invalid = () => { throw new Error('设计对话记录含有无效事件。'); };
    if (!record(e) || !record(e.context)) return invalid();
    const c = e.context;
    if (!str(e.turnId, 128) || !e.turnId || !str(e.at, 64) || !Number.isFinite(Date.parse(e.at)) ||
        (e.askedAt !== undefined && (!str(e.askedAt,64) || !Number.isFinite(Date.parse(e.askedAt)))) ||
        !str(e.scopeKey, 128) || !e.scopeKey || !str(e.conversation, 512) || !str(e.question, 1600) ||
        !str(c.task) || !Object.prototype.hasOwnProperty.call(taskLabels, c.task) || !str(c.frame) || !Object.prototype.hasOwnProperty.call(frameRules, c.frame) ||
        c.layout !== layoutKey(c.frame as FrameType) || !['top','side','guide'].includes(String(c.view)) ||
        !['frame','fuselage','landing_gear','propulsion','accessories'].includes(String(c.part)) || !validWidth(c.widthMm) ||
        !str(c.version, 100) || !optionalString(c.brief, 600) || !optionalString(c.topic, 100) || !optionalString(c.state, 100)) return invalid();
    const context = {task:c.task,frame:c.frame,layout:c.layout,part:c.part,view:c.view,widthMm:c.widthMm,version:c.version,
      brief:c.brief ? redactChatText(String(c.brief)) : undefined, topic:c.topic, state:c.state} as DesignChatContext;
    const base = {turnId:e.turnId,at:e.at,askedAt:e.askedAt,scopeKey:e.scopeKey,conversation:e.conversation,context,question:redactChatText(e.question)};
    if (e.action === 'answer' && isChatAnswer(e.answer)) {
      const s = e.answer.suggestion;
      if (s && (context.part !== 'fuselage' || s.from !== context.widthMm)) return invalid();
      return {...base, action:e.action, answer:safeChatAnswer(e.answer)};
    }
    if (e.action === 'error' && str(e.error) && (e.localEvidence === undefined || isChatEvidence(e.localEvidence)))
      return {...base,action:e.action,error:redactChatText(e.error),localEvidence:e.localEvidence && evidenceFields(e.localEvidence)};
    if (e.action === 'decline' && e.field === 'bodyWidthMm' && validWidth(e.from) && isWidthTarget(e.to) && e.from !== e.to && str(e.reason, 500) && e.reason.trim())
      return {...base,action:e.action,field:e.field,from:e.from,to:e.to,reason:redactChatText(e.reason)};
    if ((e.action === 'apply' || e.action === 'undo') && e.field === 'bodyWidthMm' && validWidth(e.from) && validWidth(e.to)
        && e.from !== e.to && (e.action === 'apply' ? isWidthTarget(e.to) : isWidthTarget(e.from)) &&
        (e.resultVersion === undefined || (str(e.resultVersion) && /^[0-9a-f]{64}$/.test(e.resultVersion))) &&
        (e.previouslyTouched === undefined || typeof e.previouslyTouched === 'boolean'))
      return {...base,action:e.action,field:e.field,from:e.from,to:e.to,resultVersion:e.resultVersion,previouslyTouched:e.previouslyTouched};
    return invalid();
  });
  const answers = new Map<string, DesignChatEvent>();
  const decisions = new Map<string, string>();
  for (const e of events) {
    const parent = answers.get(e.turnId);
    if (e.action === 'answer' || e.action === 'error') {
      if (parent) throw new Error('设计对话含有重复的答复编号。');
      answers.set(e.turnId,e);
      continue;
    }
    const suggestion = parent?.action === 'answer' && parent.answer.suggestion;
    if (!parent || !suggestion || parent.scopeKey !== e.scopeKey || parent.context.version !== e.context.version ||
        parent.question !== e.question || parent.conversation !== e.conversation) throw new Error('设计取舍无法对应到原始建议。');
    const undo = e.action === 'undo';
    if (decisions.get(e.turnId) !== (undo ? 'apply' : undefined) ||
        suggestion.from !== (undo ? e.to : e.from) || suggestion.to !== (undo ? e.from : e.to))
      throw new Error('设计取舍的数值或先后顺序无效。');
    decisions.set(e.turnId,e.action);
  }
  return events;
}
