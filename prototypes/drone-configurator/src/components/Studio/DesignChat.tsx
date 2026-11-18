import { useEffect, useId, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { suggestFields } from '../../design/semantics/brief';
import type { FrameType, LayoutKey } from '../../design/design';
import type { ParameterGroup } from '../../types/DroneParameters';

export interface DesignChatContext {
  task: string;
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

interface WidthSuggestion {
  field: 'bodyWidthMm';
  from: number;
  to: number;
  reason: string;
}

interface Answer {
  answer: string;
  model: string;
  effort: string;
  sources: { id: string; quote: string; limits: string; role?: string }[];
  retrieval: { status: string; reason: string };
  suggestion: WidthSuggestion | null;
}

interface Turn {
  id: number;
  message: string;
  version: string;
  conversation: string;
  answer?: Answer;
  error?: string;
  localEvidence?: Evidence;
  applied?: boolean;
  needsRefresh?: boolean;
}

export interface WidthPreview {
  turnId: number;
  version: string;
  width: number;
}

const localServiceHint = '请在本机设计服务中打开工作台，再发送消息。';
const retrievalLabels: Record<string, string> = { retrieve: '找到参考', clarify: '需要澄清', abstain: '缺少直接依据' };
const roleLabels: Record<string, string> = { example: '参考原句', context: '澄清线索', caution: '限制或异例' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type Evidence = Pick<Answer, 'retrieval' | 'sources'>;

function hasEvidence(value: unknown): value is Evidence & Record<string, unknown> {
  return isRecord(value) && isRecord(value.retrieval) && typeof value.retrieval.status === 'string'
    && typeof value.retrieval.reason === 'string' && Array.isArray(value.sources)
    && value.sources.every(s => isRecord(s) && typeof s.id === 'string' && typeof s.quote === 'string' && typeof s.limits === 'string'
      && (s.role === undefined || typeof s.role === 'string'));
}

function SourceList({ evidence, expanded = false }: { evidence: Evidence; expanded?: boolean }) {
  return <details open={expanded} className="rounded-xl border border-line px-3 py-2 text-xs text-ink-soft">
    <summary className="cursor-pointer font-medium text-ink">{retrievalLabels[evidence.retrieval.status] ?? '检索依据'} · {evidence.sources.length} 条原句</summary>
    <p className="mt-2">{evidence.retrieval.reason}</p>
    {evidence.sources.map(source => <div key={source.id} className="mt-2 border-t border-line pt-2">
      <span className="font-mono font-medium text-primary-700">{source.id}</span>
      {source.role && roleLabels[source.role] && <span className="ml-2">{roleLabels[source.role]}</span>}
      <blockquote className="my-1 break-words text-ink">{source.quote}</blockquote>
      <p className="break-words">适用限制：{source.limits}</p>
    </div>)}
  </details>;
}

function isAnswer(value: unknown): value is Answer {
  if (!isRecord(value) || typeof value.answer !== 'string' || !value.answer.trim()
    || typeof value.model !== 'string' || typeof value.effort !== 'string' || !hasEvidence(value)) return false;
  const action = value.suggestion;
  return action === null || (isRecord(action) && action.field === 'bodyWidthMm'
    && typeof action.from === 'number' && Number.isFinite(action.from)
    && typeof action.to === 'number' && Number.isFinite(action.to) && action.to >= 30 && action.to <= 200
    && action.from !== action.to && typeof action.reason === 'string');
}

export default function DesignChat({ context, variant, scopeLabel, preview, onPreview, onApply, onSelectBody }: {
  context: DesignChatContext;
  variant: string;
  scopeLabel: string;
  preview: WidthPreview | null;
  onPreview: (next: WidthPreview | null) => void;
  onApply: (version: string, suggestion: WidthSuggestion) => boolean;
  onSelectBody?: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const messageId = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const serial = useRef(0);
  const offline = window.location.protocol === 'file:';
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [turns, busy]);

  const send = async (message: string) => {
    message = message.trim();
    if (!message || offline || controller.current) return;
    const request = new AbortController();
    controller.current = request;
    const id = ++serial.current;
    const conversation = JSON.stringify([variant, context.task, context.frame]);
    const history = turns.filter(turn => turn.answer && turn.conversation === conversation).slice(-4).flatMap(turn => [
      { role: 'user', content: turn.message },
      { role: 'assistant', content: turn.answer!.answer.slice(0, 2200) },
    ]);
    const stateText = message.replace(/顶视/g, '俯视');
    const inferred = suggestFields(stateText);
    const comparesStates = /展开|俯视|unfold|top view/i.test(stateText)
      && /折叠|折起|折好|\bfold(?:ed|ing)?\b/i.test(stateText);
    const query = {
      ...context, topic: inferred.topic || context.topic || '',
      state: inferred.state === 'unspecified' && !comparesStates ? context.state || 'unspecified' : inferred.state,
    };
    setBusy(true);
    setTurns(previous => [...previous, { id, message, version: context.version, conversation }]);
    setText(current => current.trim() === message ? '' : current);
    onPreview(null);
    const finish = (result: Partial<Turn>) => setTurns(previous => previous.map(turn => turn.id === id ? { ...turn, ...result } : turn));
    try {
      const response = await fetch('/api/design/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: request.signal,
        body: JSON.stringify({ message, history, context: query }),
      });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(localServiceHint);
      const data: unknown = await response.json();
      if (!response.ok) {
        if (!request.signal.aborted) finish({
          error: isRecord(data) && typeof data.error === 'string' ? data.error : '设计服务暂时无法回复，请重试。',
          localEvidence: hasEvidence(data) ? data : undefined,
        });
        return;
      }
      if (!isAnswer(data)) throw new Error('回复格式不完整，请重试。');
      if (!request.signal.aborted) finish({ answer: data });
    } catch (error) {
      if (!request.signal.aborted) finish({ error: error instanceof TypeError ? '连接本机设计服务失败，请确认服务已启动。'
        : error instanceof Error ? error.message : '设计服务暂时无法回复，请重试。' });
    } finally {
      controller.current = null;
      if (!request.signal.aborted) setBusy(false);
    }
  };

  const compose = (message: string, body = false) => {
    if (body) onSelectBody?.();
    setText(message);
    input.current?.focus();
  };

  return (
    <section aria-label="设计对话" data-testid="design-chat" className="panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <MessageCircle size={18} aria-hidden="true" className="shrink-0 text-primary-600" />
        <div><h2 className="panel-title">设计对话</h2><p className="mt-0.5 text-xs text-ink-soft">{scopeLabel}</p></div>
      </header>
      {context.brief && <details className="border-b border-line bg-canvas/70 px-4 py-2 text-xs text-ink-soft">
        <summary className="cursor-pointer font-medium">已确认的设计简报</summary>
        <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">{context.brief}</p>
      </details>}
      <div ref={feed} role="log" aria-label="对话记录" aria-live="polite" className="scroll-thin max-h-[53vh] min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 min-[1180px]:max-h-none">
        {!turns.length && <div className="space-y-3">
          <p className="text-sm leading-relaxed text-ink-soft">想比较哪种造型？可以从参考原句或一次尺寸试调开始。</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip hover:border-ink/30" onClick={() => compose('折叠后装进小包，有哪些原句可以参考？')}>查折叠收纳依据</button>
            <button type="button" className="chip hover:border-ink/30" onClick={() => compose('我想让顶视下的机身更窄，请试调机身宽度。', true)}>试调机身宽度</button>
          </div>
        </div>}
        {turns.map(turn => {
          const answer = turn.answer, suggestion = answer?.suggestion;
          const stale = turn.needsRefresh || turn.version !== context.version
            || (!!suggestion && (suggestion.from !== context.widthMm || context.part !== 'fuselage'));
          const showing = preview?.turnId === turn.id;
          return <article key={turn.id} className="space-y-3 text-sm leading-relaxed">
            <p className="ml-auto w-fit max-w-[94%] whitespace-pre-wrap break-words rounded-xl bg-canvas px-3 py-2">
              <span className="sr-only">你：</span>{turn.message}
            </p>
            {answer && <>
              <div className="text-[11px] text-ink-faint">{answer.model} · {answer.effort}</div>
              <p className="whitespace-pre-wrap break-words">{answer.answer}</p>
              <SourceList evidence={answer} />
              {suggestion && <div className="space-y-2 rounded-xl border border-teal-200 bg-teal-50/70 p-3" data-testid="width-suggestion">
                <span className="block text-xs font-medium text-teal-800">机身宽度试调</span>
                <p className="num text-base font-semibold">{suggestion.from} → {suggestion.to} mm</p>
                <p className="break-words text-xs text-ink-soft">{suggestion.reason}</p>
                {!stale && !turn.applied && <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-line !px-3 !text-xs" aria-pressed={showing} data-testid="chat-preview"
                    onClick={() => onPreview(showing ? null : { turnId: turn.id, version: turn.version, width: suggestion.to })}>{showing ? '退出预览' : '预览'}</button>
                  <button type="button" className="btn-dark !px-3 !text-xs" data-testid="chat-apply" onClick={() => {
                    const applied = onApply(turn.version, suggestion);
                    setTurns(previous => previous.map(item => item.id === turn.id ? { ...item, applied, needsRefresh: !applied } : item));
                  }}>应用到草稿</button>
                </div>}
                {turn.applied && <p className="text-xs font-medium text-teal-800">已应用到当时的草稿</p>}
              </div>}
              {stale && !turn.applied && <div className="text-xs text-amber-800" role="status">回复所依据的方案或视图已变化。
                <button type="button" className="ml-1 font-medium underline" disabled={busy} onClick={() => void send(turn.message)}>按当前状态重新询问</button>
              </div>}
            </>}
            {turn.localEvidence && <div className="space-y-2">
              <p className="text-xs font-medium text-ink-soft">本地检索已完成，模型暂未回复</p>
              <SourceList evidence={turn.localEvidence} expanded />
            </div>}
            {turn.error && <p role="alert" className="text-xs text-red-700">{turn.error}
              <button type="button" disabled={busy} className="ml-1 font-medium underline" onClick={() => void send(turn.message)}>重试</button>
            </p>}
            {!answer && !turn.error && <p role="status" className="text-xs text-ink-soft">正在检索依据并等待模型回复…</p>}
          </article>;
        })}
      </div>
      <form className="space-y-2 border-t border-line p-3" onSubmit={event => { event.preventDefault(); void send(text); }}>
        <label className="sr-only" htmlFor={messageId}>给设计助手的消息</label>
        <textarea id={messageId} data-testid="chat-input" ref={input} rows={2} maxLength={1600} value={text}
          onChange={event => setText(event.target.value)} placeholder="描述你想比较的造型…" className="input-field block w-full resize-none" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink-soft">{offline ? localServiceHint : '建议由你确认后应用'}</span>
          <button type="submit" data-testid="chat-send" disabled={busy || !text.trim() || offline} className="btn-dark shrink-0 !text-xs disabled:opacity-45">
            <Send size={13} aria-hidden="true" />{busy ? '等待回复' : '发送'}</button>
        </div>
      </form>
    </section>
  );
}
