// 设计任务与目标：任务固定条件、由设计者提出的目标、可查看／采纳／撤销的离线公开证据卡。
// 证据卡只作为提出目标的依据：采纳或撤销都不会改动任何参数，也不给出毫米数或比例。
import React, { useMemo, useRef, useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { wordPairs } from '../../design/fields';
import evidence from '../../data/evidenceCards.json';
import { BookOpen, ChevronDown, ChevronUp, PenLine, Search, Undo2 } from 'lucide-react';

const quick = [
  { label: '小巧 · 便携', re: /小巧|便携|携带|大小|fit|pocket|bag|small|pack|seize|huge/i },
  { label: '简洁', re: /简洁|简约/ },
  { label: '护圈 · 保护罩', re: /保护罩|桨保|包裹|guard|cage/i },
  { label: '颜色 · 辨识', re: /颜色|橙|orange|gray|pink|reflective|辨识|鲜艳|skin|wrap/i },
  { label: '折叠 · 收纳', re: /折叠|fold/i },
  { label: '集成 · 质感', re: /集成|质感|材料/ },
];
type Card = (typeof evidence.cards)[number];
const haystack = (c: Card) => [c.id, c.quote, c.object, c.category, c.polarity, c.limits, c.relation, c.state].join(' ');

const EvidencePanel: React.FC<{ open: boolean; onToggle: (open: boolean) => void; initialQuery?: string }> = ({ open, onToggle, initialQuery = '' }) => {
  const { intent, adoptCard, undoCard, setTarget, setNote } = useDroneStore();
  const [query, setQuery] = useState(initialQuery);
  const [chip, setChip] = useState<number | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return evidence.cards.filter(c => (chip === null || quick[chip].re.test(haystack(c))) && (!q || haystack(c).toLowerCase().includes(q)));
  }, [query, chip]);
  const adopted = evidence.cards.filter(c => intent.cards.includes(c.id));
  const targets = wordPairs.filter(w => intent.targets[w.id]);
  const writeOwn = () => { onToggle(true); setTimeout(() => noteRef.current?.focus(), 0); };

  return (
    <section className="card !p-3 sm:!p-4" aria-label="设计任务与目标" data-testid="intent">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="text-base font-semibold text-slate-900">设计任务与目标</h2>
        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">任务固定</span>
        <span className="text-xs text-slate-600">日常随行航拍四旋翼 · 展开正交顶视</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs" data-testid="intent-summary">
        <span className="text-slate-500">你的目标：</span>
        {targets.length === 0 && !intent.note.trim() && <span className="text-slate-500">尚未提出（可以不提，直接调参数）</span>}
        {targets.map(w => (
          <span key={w.id} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 font-medium text-white">
            {intent.targets[w.id] === 'left' ? w.left : w.right}
            <button type="button" onClick={() => setTarget(w.id, null)} aria-label="取消这个目标" className="opacity-80 hover:opacity-100">×</button>
          </span>
        ))}
        {intent.note.trim() && <span className="max-w-full truncate rounded-md bg-violet-600 px-1.5 py-0.5 text-white" title={intent.note}>自写：{intent.note}</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs" data-testid="adopted-summary">
        <span className="text-slate-500">依据：</span>
        {adopted.length === 0 && <span className="text-slate-500">未采纳证据卡{(targets.length > 0 || intent.note.trim()) && '（记为设计者自定）'}</span>}
        {adopted.map(c => (
          <span key={c.id} className="inline-flex items-center gap-1 rounded-md border border-emerald-600 bg-emerald-50 px-1.5 py-0.5 text-emerald-800" title={c.quote}>
            {c.id}
            <button type="button" onClick={() => undoCard(c.id)} aria-label={`撤销 ${c.id}`} className="hover:text-emerald-950">×</button>
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onToggle(!open)} aria-expanded={open} data-testid="evidence-toggle"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:border-primary-500">
          <BookOpen className="h-4 w-4" />查看需求依据（{evidence.card_count} 张公开证据卡）{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button type="button" onClick={writeOwn} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:border-primary-500">
          <PenLine className="h-4 w-4" />自己写意图
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">① 由你提出目标</h3>
            <p className="text-xs text-slate-500">每组词对选一极，或不作要求。目标会作为“采纳的意图”写入提示词；它不改任何参数。</p>
            <div className="mt-1.5 space-y-1.5">
              {wordPairs.map(w => {
                const v = intent.targets[w.id] ?? null;
                const btn = (pole: 'left' | 'right' | null, label: string) => (
                  <button type="button" role="radio" aria-checked={v === pole} onClick={() => setTarget(w.id, pole)} data-target={`${w.id}:${pole ?? 'none'}`}
                    className={`rounded-md border px-2 py-1 text-sm ${v === pole ? (pole ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-500 bg-slate-100 text-slate-800') : 'border-slate-300 bg-white text-slate-600 hover:border-primary-500'}`}>
                    {label}
                  </button>
                );
                return (
                  <div key={w.id}>
                    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={`${w.left}—${w.right}`}>
                      {btn('left', w.left)}{btn(null, '不作要求')}{btn('right', w.right)}
                    </div>
                    {v && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{w.hint}</p>}
                  </div>
                );
              })}
            </div>
            <label className="mt-2 block text-xs text-slate-600">
              自己写的意图（没有合适的证据卡时，只填这里即可）
              <textarea ref={noteRef} value={intent.note} onChange={e => setNote(e.target.value)} rows={2} data-testid="intent-note"
                placeholder="例如：展开时从正上方看显得紧凑，机臂到机身的过渡连续。"
                className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none" />
            </label>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">② 查看需求依据</h3>
            <p className="text-xs leading-relaxed text-slate-500">
              离线公开证据卡 {evidence.card_count} 张、{evidence.source_count} 个来源，取自 <code>{evidence.source}</code>。卡数不代表需求权重；证据卡不给出毫米数或比例。
              采纳只是把卡号记为依据并随配置导出，<b className="font-medium text-slate-700">不会改动任何参数</b>。
            </p>
            <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-slate-300 px-2 focus-within:border-primary-500">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜原话、对象或卡号，例如：小巧、pocket、E016" data-testid="evidence-search"
                className="min-w-0 flex-1 py-1.5 text-sm focus:outline-none" aria-label="搜索证据卡" />
              {(query || chip !== null) && <button type="button" onClick={() => { setQuery(''); setChip(null); }} className="text-xs text-slate-500 hover:text-slate-800">清除筛选</button>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {quick.map((q, i) => (
                <button key={q.label} type="button" onClick={() => setChip(chip === i ? null : i)} aria-pressed={chip === i}
                  className={`rounded-full border px-2 py-0.5 text-xs ${chip === i ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-600 hover:border-primary-500'}`}>{q.label}</button>
              ))}
              <span className="ml-auto text-xs text-slate-500" data-testid="evidence-count">匹配 {results.length} 张</span>
            </div>

            {results.length === 0 ? (
              <div className="mt-2 rounded-lg border border-dashed border-slate-300 p-4 text-center" data-testid="evidence-empty">
                <p className="text-sm font-medium text-slate-800">没有匹配的证据卡</p>
                <p className="mt-1 text-xs text-slate-500">现有 {evidence.card_count} 张卡里没有这方面的依据。你可以不依赖证据卡，自己写设计意图；导出时会记为“设计者自定（未采纳证据卡）”。</p>
                <button type="button" onClick={writeOwn} className="btn-primary mt-2 inline-flex items-center gap-1.5 !px-3 !py-1.5 text-sm"><PenLine className="h-4 w-4" />自己写意图</button>
              </div>
            ) : (
              <ul className="mt-2 max-h-[22rem] space-y-1.5 overflow-y-auto pr-1" data-testid="evidence-list">
                {results.map(c => {
                  const on = intent.cards.includes(c.id);
                  return (
                    <li key={c.id} data-card={c.id} data-adopted={on ? 'yes' : 'no'} className={`rounded-lg border p-2 text-xs ${on ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{c.id}</span>
                        <span className="rounded bg-slate-100 px-1 text-slate-600">{c.category}</span>
                        <span className="rounded bg-slate-100 px-1 text-slate-600">极性：{c.polarity}</span>
                        <span className="rounded bg-slate-100 px-1 text-slate-600">{c.relation}</span>
                        {on ? (
                          <button type="button" onClick={() => undoCard(c.id)} data-action="undo"
                            className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-600 bg-white px-2 py-0.5 font-medium text-emerald-800"><Undo2 className="h-3 w-3" />撤销采纳</button>
                        ) : (
                          <button type="button" onClick={() => adoptCard(c.id)} data-action="adopt"
                            className="ml-auto rounded-md border border-primary-600 px-2 py-0.5 font-medium text-primary-700 hover:bg-primary-50">采纳为依据</button>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-900">“{c.quote}”</p>
                      <dl className="mt-1 grid grid-cols-[3.2rem_minmax(0,1fr)] gap-x-1.5 gap-y-0.5 text-slate-600">
                        <dt className="text-slate-400">对象</dt><dd>{c.object}</dd>
                        <dt className="text-slate-400">状态</dt><dd>展开或折叠：{c.state}</dd>
                        <dt className="text-slate-400">限定</dt><dd>{c.limits}</dd>
                      </dl>
                      {on && <p className="mt-1 text-emerald-800">已记为依据，参数未变。请在上面“由你提出目标”里选出它支持你提出的目标。</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default EvidencePanel;
