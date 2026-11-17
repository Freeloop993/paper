// 提示词：按固定顺序编译的全文。刚改动的句子标黄；需要时可展开逐句来源。
import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, ListTree } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout } from '../../design/design';
import { openDecisions } from '../../design/fields';
import { auditPrompt, compilePrompt, diffSentences, sourceLabel, type SentenceSource } from '../../design/partPrompt';
import { download, fileNames, fileStamp } from '../../design/exporters';

const tag: Record<SentenceSource, string> = {
  fixed: 'bg-ink/10 text-ink', default: 'bg-white text-ink-soft ring-1 ring-line', chosen: 'bg-primary-100 text-primary-700',
  adopted: 'bg-emerald-100 text-emerald-800', custom: 'bg-violet-100 text-violet-800',
};

const PromptGenerator: React.FC = () => {
  const { parameters, touched, intent, lastChange } = useDroneStore();
  const [detail, setDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const prompt = useMemo(() => compilePrompt(parameters, touched, intent, layout), [parameters, touched, intent, layout]);
  const fresh = useMemo(() => {
    if (!lastChange) return new Set<string>();
    const b = lastChange.before;
    const d = diffSentences(compilePrompt(b.parameters, b.touched, b.intent, computeLayout(b.parameters)).sentences, prompt.sentences);
    return new Set([...d.changed.map(c => c.id), ...d.added]);
  }, [lastChange, prompt]);
  const open = openDecisions(parameters);
  const audit = auditPrompt(parameters, prompt.sentences);
  const clean = audit.every(a => a.status !== 'unexpected');

  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt.text); } catch {
      const area = document.createElement('textarea'); area.value = prompt.text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="panel flex min-h-0 flex-col p-5" aria-label="提示词" data-testid="prompt-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-ink">提示词</h3>
        <span className="eyebrow">Prompt</span>
        <span className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setDetail(v => !v)} aria-pressed={detail} data-testid="prompt-detail"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${detail ? 'bg-ink text-white' : 'text-ink-soft hover:bg-ink/5'}`}>
            <ListTree className="h-4 w-4" />逐句来源
          </button>
          <button type="button" onClick={copy} title="复制全文" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-ink-soft hover:bg-ink/5">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}{copied ? '已复制' : '复制'}
          </button>
          <button type="button" onClick={() => download(fileNames(fileStamp()).prompt, prompt.text, 'text/plain;charset=utf-8')} title="下载提示词"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-ink-soft hover:bg-ink/5"><Download className="h-4 w-4" />下载</button>
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-soft">由你的选择自动写成，随条件图一起发给模型。{fresh.size > 0 && <span className="rounded bg-yellow-100 px-1 text-ink">标黄的是刚才改动的句子</span>}</p>

      {detail ? (
        <ol className="scroll-thin mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto" data-testid="sentences">
          {prompt.sentences.map((s, i) => (
            <li key={s.id} data-sentence={s.id} data-fresh={fresh.has(s.id) ? 'yes' : 'no'} className={`rounded-lg border px-3 py-2 ${fresh.has(s.id) ? 'border-yellow-300 bg-yellow-50' : 'border-line'}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="tabular-nums text-ink-faint">{i + 1}</span>
                <span className={`rounded px-1.5 py-0.5 font-medium ${tag[s.source]}`}>{sourceLabel[s.source]}</span>
                <span className="text-ink-soft">{s.zh}</span>
              </div>
              <p className="font-mono text-[13px] leading-relaxed text-ink">{s.text}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="scroll-thin mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-xl bg-canvas p-4 font-mono text-[13px] leading-relaxed text-ink" data-testid="sentences">
          {prompt.sentences.map(s => (
            <p key={s.id} data-sentence={s.id} data-fresh={fresh.has(s.id) ? 'yes' : 'no'} className={fresh.has(s.id) ? '-mx-1 rounded bg-yellow-100 px-1' : ''}>{s.text}</p>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-soft" data-testid="open-note">
        {open.length > 0
          ? <>没有写进提示词、留给后续设计的造型：<span className="text-ink">{open.map(f => f.label).join('、')}</span>。</>
          : '所有造型项都已指定，全部写进了提示词。'}
      </p>
      {detail && (
        <p className={`mt-1 flex items-center gap-1 text-xs ${clean ? 'text-emerald-700' : 'text-rose-700'}`} data-testid="audit" data-clean={clean ? 'yes' : 'no'}>
          <Check className="h-3.5 w-3.5" />
          {audit.map(a => `${a.label}：${a.detail}`).join('；')}。
        </p>
      )}
    </section>
  );
};

export default PromptGenerator;
