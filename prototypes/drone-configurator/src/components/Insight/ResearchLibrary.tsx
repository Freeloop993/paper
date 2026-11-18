import { useState } from 'react';
import { Search } from 'lucide-react';
import evidence from '../../data/evidenceCards.json';
import { corpus, themes } from '../../data/corpus';

export default function ResearchLibrary() {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const matches = evidence.cards.filter(card =>
    [card.id, card.quote, card.object, card.state, card.limits, card.polarity].join(' ').toLowerCase().includes(term));
  return <details className="panel mt-5 p-5">
    <summary className="cursor-pointer text-sm font-semibold">研究资料 · 评论与证据卡</summary>
    <p className="mt-4 text-sm leading-6 text-ink-soft">{corpus.styling} 个消费航拍造型表述簇用于统计主题。这里展示另外筛选的 {evidence.card_count} 张公开短引，来自 {evidence.source_count} 个来源。</p>
    <div className="my-3 flex flex-wrap gap-2">{themes.filter(t => t.count > 0).map(t => <span key={t.id} className="chip">{t.label} {t.count} 簇</span>)}</div>
    <label className="inline-flex w-full items-center gap-2 rounded-xl border border-line px-3"><Search size={16}/><input className="w-full py-2 text-sm outline-none" value={query} placeholder="搜索原句、部位或卡号" aria-label="搜索资料库" onChange={e=>setQuery(e.target.value)}/></label>
    <ul className="mt-3 max-h-72 divide-y divide-line overflow-auto">
      {matches.map(c=><li key={c.id} className="py-3 text-sm"><span className="num mr-2 text-xs text-ink-faint">{c.id}</span>{c.quote}<p className="mt-1 text-xs text-ink-soft">{c.limits}</p></li>)}
      {!matches.length && <li className="py-4 text-sm">没有找到相符的短引。</li>}
    </ul>
  </details>;
}
