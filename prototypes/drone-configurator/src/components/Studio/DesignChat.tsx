import { useEffect, useId, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { stateLabels, suggestFields } from '../../design/semantics/brief';
import { canUndoChatWidth, isChatAnswer, isChatEvidence, redactChatText, safeChatAnswer, safeChatEvidence,
  type ChatEvidence, type DesignChatContext } from '../../design/designChatAudit';
import { useDroneStore } from '../../store/droneStore';
import { PinButton } from '../Insight/EvidenceGroups';
import type { EvidencePins } from '../Insight/InsightPage';

export interface WidthPreview { turnId: string; version: string; width: number }
const localServiceHint = '请在本机设计服务中打开工作台，再发送消息。';
const retrievalLabels: Record<string,string> = {retrieve:'找到参考', clarify:'需要澄清', abstain:'缺少直接依据'};
const roleLabels: Record<string,string> = {example:'参考原句', context:'澄清线索', caution:'限制或异例'};
const noEvents = [] as const;

function SourceList({ evidence, expanded = false, citedIds, pins }: { evidence: ChatEvidence; expanded?: boolean; citedIds?: string[]; pins?: EvidencePins }) {
  const { retrieval, sources } = evidence;
  const sourceCount = retrieval.sourceCount ?? (sources.every(s => s.source) ? new Set(sources.map(s => s.source)).size : undefined);
  return <details open={expanded} className="rounded-xl border border-line px-3 py-2 text-xs text-ink-soft">
    <summary className="cursor-pointer font-medium text-ink">{retrievalLabels[retrieval.status] ?? '检索依据'} · {sources.length} 条原句{sourceCount !== undefined && ' / ' + sourceCount + ' 个来源'}</summary>
    {retrieval.branches && retrieval.branches.length > 1 ?
      <ul className="mt-2 space-y-1">{retrieval.branches.map(b => <li key={b.state + b.topic}><strong>{stateLabels[b.state] ?? b.state}</strong> · {retrievalLabels[b.status]}。{b.reason}</li>)}</ul> :
      <p className="mt-2">{retrieval.reason}</p>}
    {retrieval.scope && <p className="mt-2">{retrieval.scope}</p>}
    {sources.map(source => <div key={source.id} className="mt-2 border-t border-line pt-2">
      <span className="font-mono font-medium text-primary-700">{source.id}</span>
      {source.role && roleLabels[source.role] && <span className="ml-2">{roleLabels[source.role]}</span>}
      {source.source && <span className="ml-2">来源 {source.source}</span>}
      {citedIds !== undefined && <b className="ml-2">{citedIds.includes(source.id) ? '答复已引用' : '仅检索到'}</b>}
      <blockquote className="my-1 break-words text-ink">{source.quote}</blockquote>
      <p className="break-words">适用限制：{source.limits}</p>
      <PinButton id={source.id} pins={pins}/>
    </div>)}
  </details>;
}

export default function DesignChat({ context, scopeKey, scopeLabel, preview, onPreview, onSelectBody, pins }: {
  context: DesignChatContext; scopeKey: string; scopeLabel: string; preview: WidthPreview | null;
  onPreview: (next: WidthPreview | null) => void; onSelectBody?: () => void;
  /** 检索到的原句可以放到画布上，连到当前目标。 */
  pins?: EvidencePins;
}) {
  const draft = useDroneStore();
  const {designChatAudit, recordChatEvent, applyChatWidth, declineChatWidth, undoChatWidth} = draft;
  const events = designChatAudit ?? noEvents;
  const conversation = JSON.stringify([scopeKey, context.task, context.frame]);
  const turns = events.filter(e => e.scopeKey === scopeKey && e.conversation === conversation && (e.action === 'answer' || e.action === 'error'));
  const [text, setText] = useState('');
  const [pending, setPending] = useState<{question:string; local:boolean} | null>(null);
  const [lookup, setLookup] = useState<{version:string; question:string; evidence?:ChatEvidence; error?:string} | null>(null);
  const [decline, setDecline] = useState<{turnId:string; reason:string} | null>(null);
  const input = useRef<HTMLTextAreaElement>(null), feed = useRef<HTMLDivElement>(null), inFlight = useRef(false);
  const messageId = useId();
  const offline = window.location.protocol === 'file:';
  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [designChatAudit, pending, lookup]);

  async function send(raw: string, local = false) {
    const question = redactChatText(raw.trim());
    if (!question || inFlight.current || offline) return;
    inFlight.current = true;
    setPending({question,local});
    setLookup(null);
    const history = turns.filter(e => e.action === 'answer' && e.context.version === context.version).slice(-4).flatMap(e => e.action === 'answer' ?
      [{role:'user',content:e.question},{role:'assistant',content:e.answer.answer}] : []);
    const stateText = question.replace(/顶视/g,'俯视');
    const inferred = suggestFields(stateText);
    const comparesStates = /展开|俯视|unfold|top view/i.test(stateText) && /折叠|折起|折好|\bfold(?:ed|ing)?\b/i.test(stateText);
    const query = {...context,topic:inferred.topic || context.topic || '',
      state:inferred.state === 'unspecified' && !comparesStates ? context.state || 'unspecified' : inferred.state};
    const base = {turnId:crypto.randomUUID(), askedAt:new Date().toISOString(), question, conversation, scopeKey, context:query};
    if (!local) setText(current => current.trim() === raw.trim() ? '' : current);
    onPreview(null);
    try {
      const response = await fetch(local ? '/api/design/evidence' : '/api/design/chat', {
        method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(105000),
        body:JSON.stringify({message:question,history,context:query}),
      });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(localServiceHint);
      const data = await response.json();
      if (!response.ok) {
        const error = redactChatText(typeof data?.error === 'string' ? data.error : '设计服务暂时无法回复，请重试。');
        const evidence = isChatEvidence(data) ? safeChatEvidence(data) : undefined;
        if (local) setLookup({version:context.version,question,error,evidence});
        else recordChatEvent({...base,at:new Date().toISOString(),action:'error',error,localEvidence:evidence});
      } else if (local && data?.mode === 'local_evidence' && isChatEvidence(data)) {
        setLookup({version:context.version,question,evidence:safeChatEvidence(data)});
      } else if (!local && isChatAnswer(data)) {
        if (data.suggestion && (query.part !== 'fuselage' || data.suggestion.from !== query.widthMm))
          throw new Error('建议的起点与本轮提交的机身状态不符，请重新询问。');
        recordChatEvent({...base,at:new Date().toISOString(),action:'answer',answer:safeChatAnswer(data)});
      } else throw new Error('回复格式不完整，请重试。');
    } catch (e) {
      const error = e instanceof TypeError ? '连接本机设计服务失败，请确认服务已启动。' :
        e instanceof Error && e.name === 'TimeoutError' ? '等待设计服务超时，请重试。' :
        e instanceof Error ? redactChatText(e.message) : '设计服务暂时无法回复，请重试。';
      if (local) setLookup({version:context.version,question,error});
      else recordChatEvent({...base,at:new Date().toISOString(),action:'error',error});
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }
  function compose(message: string, body = false) {
    if (body) onSelectBody?.();
    setText(message);
    input.current?.focus();
  }
  const disabled = !!pending || !text.trim() || offline;
  return <section aria-label="设计对话" data-testid="design-chat" className="panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
      <MessageCircle size={18} aria-hidden="true" className="shrink-0 text-primary-600"/>
      <div><h2 className="panel-title">设计对话</h2><p className="mt-0.5 text-xs text-ink-soft">{scopeLabel}</p></div>
    </header>
    {context.brief && <details className="border-b border-line bg-canvas/70 px-4 py-2 text-xs text-ink-soft">
      <summary className="cursor-pointer font-medium">当前设计目标</summary>
      <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">{context.brief}</p>
    </details>}
    <div ref={feed} role="log" aria-label="对话记录" aria-live="polite" className="scroll-thin max-h-[53vh] min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 min-[1180px]:max-h-none">
      {!turns.length && <div className="space-y-3"><p className="text-sm text-ink-soft">想比较哪种造型？可以从参考原句或一次尺寸试调开始。</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="chip" onClick={() => compose('折叠后装进小包，有哪些原句可以参考？')}>查折叠收纳依据</button>
          <button type="button" className="chip" onClick={() => compose('我想让顶视下的机身更窄，请试调机身宽度。',true)}>试调机身宽度</button>
        </div></div>}
      {turns.map(turn => {
        const answer = turn.action === 'answer' ? turn.answer : undefined;
        const suggestion = answer?.suggestion;
        const stale = turn.context.version !== context.version || (!!suggestion && (suggestion.from !== context.widthMm || context.part !== 'fuselage'));
        const decision = [...events].reverse().find(e => e.turnId === turn.turnId && ['apply','undo','decline'].includes(e.action));
        const showing = preview?.turnId === turn.turnId;
        return <article key={turn.turnId} className="space-y-3 text-sm leading-relaxed">
          <p className="ml-auto w-fit max-w-[94%] whitespace-pre-wrap break-words rounded-xl bg-canvas px-3 py-2"><span className="sr-only">你：</span>{turn.question}</p>
          {answer && <>
            <div className="text-[11px] text-ink-faint">{answer.model} · {answer.effort}</div>
            <p className="whitespace-pre-wrap break-words">{answer.answer}</p>
            <SourceList evidence={answer} citedIds={answer.citedIds} pins={pins}/>
            {suggestion && <div className="space-y-2 rounded-xl border border-teal-200 bg-teal-50/70 p-3" data-testid="width-suggestion">
              <span className="block text-xs font-medium text-teal-800">机身宽度试调</span>
              <p className="num text-base font-semibold">{suggestion.from} → {suggestion.to} mm</p>
              <p className="text-xs text-ink-soft">{suggestion.reason}</p>
              {!stale && !decision && <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-line !px-3 !text-xs" data-testid="chat-preview" aria-pressed={showing}
                  onClick={() => onPreview(showing ? null : {turnId:turn.turnId,version:context.version,width:suggestion.to})}>{showing ? '退出预览' : '预览'}</button>
                <button type="button" className="btn-dark !px-3 !text-xs" data-testid="chat-apply" onClick={() => {
                  if (applyChatWidth(turn.turnId,context)) onPreview(null);
                }}>应用到草稿</button>
                <button type="button" className="btn-line !px-3 !text-xs" data-testid="chat-decline" onClick={() => setDecline({turnId:turn.turnId,reason:''})}>驳回建议</button>
              </div>}
              {!decision && !stale && decline?.turnId === turn.turnId && <div className="space-y-2">
                <label className="block text-xs">驳回理由<textarea className="input-field mt-1 block w-full" maxLength={500}
                  value={decline.reason} onChange={e => setDecline({...decline,reason:e.target.value})}/></label>
                <button type="button" className="btn-line !text-xs" disabled={!decline.reason.trim()} onClick={() => {
                  if (declineChatWidth(turn.turnId,context,decline.reason)) {setDecline(null);onPreview(null);}
                }}>记录驳回</button>
                <button type="button" className="ml-2 text-xs underline" onClick={() => setDecline(null)}>取消</button>
              </div>}
              {decision && <p className="text-xs font-medium text-teal-800">{decision.action === 'undo' ? '已撤销此次采纳' :
                decision.action === 'decline' ? '已驳回 · ' + decision.reason : '已应用到当时的草稿'}</p>}
              {decision?.action === 'apply' && canUndoChatWidth(draft,turn.turnId) &&
                <button type="button" className="btn-line !text-xs" data-testid="chat-undo" onClick={() => undoChatWidth(turn.turnId)}>撤销此次采纳</button>}
            </div>}
            {stale && !decision && <div className="text-xs text-amber-800" role="status">回复所依据的方案或视图已变化。
              <button type="button" className="ml-1 underline" disabled={!!pending} onClick={() => void send(turn.question)}>按当前状态重新询问</button>
            </div>}
          </>}
          {turn.action === 'error' && <>
            {turn.localEvidence && <><p className="text-xs text-ink-soft">本地检索已完成，模型暂未回复</p><SourceList evidence={turn.localEvidence} expanded pins={pins}/></>}
            <p role="alert" className="text-xs text-red-700">{turn.error}<button type="button" disabled={!!pending} className="ml-1 underline" onClick={() => void send(turn.question)}>重试</button></p>
          </>}
        </article>;
      })}
      {pending && <p role="status" className="text-xs text-ink-soft">{pending.local ? '正在本地检索依据…' : '正在等待模型回复…'}</p>}
      {lookup?.version === context.version && <div data-testid="chat-local-result" className="space-y-2">
        <p className="text-xs text-ink-soft">本地依据 · 未调用模型</p><p className="text-sm">{lookup.question}</p>
        {lookup.error && <p role="alert" className="text-xs text-red-700">{lookup.error}</p>}
        {lookup.evidence && <SourceList evidence={lookup.evidence} expanded pins={pins}/>}
      </div>}
    </div>
    <form className="space-y-2 border-t border-line p-3" onSubmit={e => {e.preventDefault();void send(text);}}>
      <label className="sr-only" htmlFor={messageId}>给设计助手的消息</label>
      <textarea id={messageId} data-testid="chat-input" ref={input} rows={2} maxLength={1600} value={text} onChange={e => setText(e.target.value)}
        placeholder="描述你想比较的造型…" className="input-field block w-full resize-none"/>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {offline && <span className="w-full text-[11px] text-ink-soft">{localServiceHint}</span>}
        <button type="button" data-testid="chat-local" className="btn-line !text-xs" disabled={disabled} onClick={() => void send(text,true)}>只查依据</button>
        <button type="submit" data-testid="chat-send" disabled={disabled} className="btn-dark shrink-0 !text-xs disabled:opacity-45"><Send size={13} aria-hidden="true"/>发送给模型</button>
      </div>
    </form>
  </section>;
}
