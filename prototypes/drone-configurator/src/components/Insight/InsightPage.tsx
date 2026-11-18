// 洞察：先看用户在说什么，再决定这次想要什么感觉。左边是评论依据，右边是正在成形的设计简报。
import React, { useMemo, useState } from 'react';
import { ArrowRight, Bookmark, BookmarkCheck, Search, X } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { wordPairs } from '../../design/fields';
import { corpus, themes } from '../../data/corpus';
import evidence from '../../data/evidenceCards.json';

type Card = (typeof evidence.cards)[number];
const text = (c: Card) => [c.id, c.quote, c.object, c.category, c.limits, c.relation].join(' ');
const pairName = Object.fromEntries(wordPairs.map(w => [w.id, `${w.left}—${w.right}`]));

const InsightPage: React.FC<{ wide: boolean; onNext: () => void; initialQuery?: string }> = ({ wide, onNext, initialQuery = '' }) => {
  const { intent, adoptCard, undoCard, setTarget, setNote } = useDroneStore();
  const [query, setQuery] = useState(initialQuery);
  const [theme, setTheme] = useState<string | null>(null);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const t = themes.find(x => x.id === theme);
    return evidence.cards.filter(c => (!t || t.match.test(text(c))) && (!q || text(c).toLowerCase().includes(q)));
  }, [query, theme]);
  const counted = themes.filter(t => t.count > 0);
  const max = Math.max(...counted.map(t => t.count));
  const pinned = evidence.cards.filter(c => intent.cards.includes(c.id));
  const chosen = wordPairs.filter(w => intent.targets[w.id]);

  const brief = (
    <aside className={`panel flex flex-col p-5 ${wide ? 'sticky top-3 max-h-[calc(100vh-5.5rem)]' : ''}`} aria-label="设计简报" data-testid="intent">
      <div className="eyebrow">Design brief</div>
      <h2 className="mt-1 text-xl font-semibold text-ink">设计简报</h2>
      <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-[13px] text-ink-soft"><span className="mr-2 font-medium text-ink">任务</span>日常随行航拍四旋翼 · 展开状态、正上方看</p>

      <h3 className="mt-5 text-[13px] font-semibold text-ink">想给人什么感觉</h3>
      <p className="text-xs text-ink-soft">每组选一端，或留在中间。</p>
      <div className="mt-2 space-y-2.5">
        {wordPairs.map(w => {
          const v = intent.targets[w.id] ?? null;
          const stop = (pole: 'left' | 'right' | null) => (
            <button type="button" role="radio" aria-checked={v === pole} aria-label={pole === 'left' ? w.left : pole === 'right' ? w.right : '不作要求'} data-target={`${w.id}:${pole ?? 'none'}`}
              onClick={() => setTarget(w.id, pole)} className="group relative z-10 flex h-6 w-6 items-center justify-center">
              <span className={`rounded-full transition-all ${v === pole ? (pole ? 'h-4 w-4 bg-primary-600 ring-4 ring-primary-100' : 'h-3 w-3 border-2 border-ink-faint bg-white') : 'h-2 w-2 bg-ink/20 group-hover:bg-ink/50'}`} />
            </button>
          );
          return (
            <div key={w.id} className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2" role="radiogroup" aria-label={`${w.left}—${w.right}`}>
              <button type="button" onClick={() => setTarget(w.id, v === 'left' ? null : 'left')} className={`text-right text-[13px] ${v === 'left' ? 'font-semibold text-primary-700' : 'text-ink-soft hover:text-ink'}`}>{w.left}</button>
              <div className="relative flex items-center justify-between">
                <span className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-line" />
                {stop('left')}{stop(null)}{stop('right')}
              </div>
              <button type="button" onClick={() => setTarget(w.id, v === 'right' ? null : 'right')} className={`text-left text-[13px] ${v === 'right' ? 'font-semibold text-primary-700' : 'text-ink-soft hover:text-ink'}`}>{w.right}</button>
            </div>
          );
        })}
      </div>
      {chosen.length > 0 && <p className="mt-2 text-xs leading-relaxed text-ink-soft">{chosen.map(w => w.hint).slice(0, 1)}</p>}

      <h3 className="mt-5 text-[13px] font-semibold text-ink">依据</h3>
      <div className={`scroll-thin mt-1 space-y-1.5 ${wide ? 'min-h-0 overflow-y-auto' : ''}`}>
        {pinned.length === 0 && <p className="text-xs text-ink-soft">还没有采纳评论。可以不采纳，直接凭自己的判断；也可以从左边挑几条支持你的想法。</p>}
        {pinned.map(c => (
          <div key={c.id} data-adopted={c.id} className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink">“{c.quote}”<span className="num ml-1 text-[11px] text-ink-faint">{c.id}</span></p>
            <button type="button" onClick={() => undoCard(c.id)} aria-label={`取消采纳 ${c.id}`} className="text-ink-faint hover:text-ink"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      <h3 className="mt-5 text-[13px] font-semibold text-ink">用自己的话补一句</h3>
      <textarea value={intent.note} onChange={e => setNote(e.target.value)} rows={2} data-testid="intent-note" aria-label="补充意图"
        placeholder="例如：机臂到机身的过渡要连续。" className="input-field mt-1 w-full resize-none" />

      <button type="button" onClick={onNext} data-testid="to-studio" className="btn-dark mt-5 w-full py-2.5">进入造型<ArrowRight className="h-4 w-4" /></button>
    </aside>
  );

  return (
    <div className={`mx-auto max-w-[1400px] p-3 sm:p-5 ${wide ? 'grid grid-cols-[minmax(0,1fr)_360px] gap-5' : 'space-y-4'}`} data-testid="insight">
      <div className="min-w-0">
        <div className="eyebrow">Voice of users</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">用户谈到外形时，说得最多的是小巧。</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
          从 <b className="num font-semibold text-ink">{corpus.searched.toLocaleString()}</b> 条评论里，属于消费航拍机的有 <b className="num font-semibold text-ink">{corpus.consumer.toLocaleString()}</b> 条；
          其中谈到机体外形的 <b className="num font-semibold text-ink">{corpus.styling}</b> 条。评论里大多在说飞行和拍摄，谈外形的很少。
        </p>

        <div className="panel mt-4 p-4" data-testid="themes">
          <div className="flex items-baseline gap-2">
            <h2 className="panel-title">{corpus.styling} 条外形评论的主题</h2>
            <span className="text-[11px] text-ink-faint">点一条，只看相关的评论</span>
            {theme && <button type="button" onClick={() => setTheme(null)} className="ml-auto text-xs text-primary-600 hover:underline">看全部</button>}
          </div>
          <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {counted.map(t => (
              <button key={t.id} type="button" onClick={() => setTheme(theme === t.id ? null : t.id)} aria-pressed={theme === t.id} data-theme={t.id}
                className={`group grid grid-cols-[3rem_minmax(0,1fr)_4.6rem] items-center gap-2 rounded-lg px-1.5 py-1 text-left ${theme === t.id ? 'bg-ink/5' : 'hover:bg-ink/[0.03]'}`}>
                <span className={`text-[13px] ${theme === t.id ? 'font-semibold text-ink' : 'text-ink'}`}>{t.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-line"><span className={`block h-full rounded-full ${theme === t.id ? 'bg-primary-600' : 'bg-ink/70 group-hover:bg-ink'}`} style={{ width: `${(t.count / max) * 100}%` }} /></span>
                <span className="num whitespace-nowrap text-right text-xs text-ink-soft">{t.count} · {Math.round((t.count / corpus.styling) * 100)}%</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">{corpus.caveat}这些计数说明大家在谈什么，给不出具体尺寸。</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-full border border-line bg-white px-3 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/25">
            <Search className="h-4 w-4 shrink-0 text-ink-faint" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜原话，例如：小巧、pocket、橙色" data-testid="evidence-search" aria-label="搜索评论依据"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm focus:outline-none" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="清空"><X className="h-4 w-4 text-ink-faint" /></button>}
          </label>
          {themes.filter(t => t.count === 0).map(t => (
            <button key={t.id} type="button" onClick={() => setTheme(theme === t.id ? null : t.id)} aria-pressed={theme === t.id} data-theme={t.id}
              className={`chip ${theme === t.id ? '!border-ink !bg-ink !text-white' : 'hover:border-ink/40'}`}>{t.label}</button>
          ))}
          <span className="text-xs text-ink-soft" data-testid="evidence-count">{results.length} / {evidence.card_count} 条短引文</span>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">目前公开可用的短引文只有 {evidence.card_count} 条，是按既定方向挑选的示例，不是全部 {corpus.styling} 条。</p>

        {results.length === 0 ? (
          <div className="mt-4 rounded-xl2 border border-dashed border-ink/20 px-6 py-10 text-center" data-testid="evidence-empty">
            <p className="text-base font-medium text-ink">没有找到相关的评论</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">没关系。在右边的简报里直接选想要的感觉，或用自己的话写一句，会记为设计者自己的判断。</p>
          </div>
        ) : (
          <ul className="mt-4 columns-1 gap-3 sm:columns-2 xl:columns-3" data-testid="evidence-list">
            {results.map(c => {
              const on = intent.cards.includes(c.id);
              const pair = themes.find(t => t.pair && t.match.test(text(c)))?.pair;
              return (
                <li key={c.id} data-card={c.id} data-adopted={on ? 'yes' : 'no'}
                  className={`mb-3 break-inside-avoid rounded-xl2 border p-4 transition-colors ${on ? 'border-emerald-400 bg-emerald-50/70' : 'border-line bg-white hover:border-ink/25'}`}>
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-ink">“{c.quote}”</p>
                    <button type="button" onClick={() => (on ? undoCard(c.id) : adoptCard(c.id))} data-action={on ? 'undo' : 'adopt'} aria-pressed={on} title={on ? '取消采纳' : '采纳为依据（不改任何参数）'}
                      className={`shrink-0 rounded-full p-1.5 ${on ? 'bg-emerald-600 text-white' : 'text-ink-faint hover:bg-ink/5 hover:text-ink'}`}>
                      {on ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">{c.object}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-faint">注意：{c.limits}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="num text-[10px] text-ink-faint">{c.id}</span>
                    {pair && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] text-primary-700">可支持：{pairName[pair]}</span>}
                    {c.relation.startsWith('反例') && <span className="rounded-full bg-signal-50 px-2 py-0.5 text-[10px] text-signal-600">反例或取舍</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {brief}
    </div>
  );
};

export default InsightPage;
