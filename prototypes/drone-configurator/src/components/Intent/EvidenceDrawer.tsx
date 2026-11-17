// 评论依据：36 张公开证据卡，可搜索、采纳、取消采纳。采纳只是把卡号记为依据，不会改动任何参数。
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import evidence from '../../data/evidenceCards.json';

const topics = [
  { label: '小巧 · 便携', re: /小巧|便携|携带|大小|fit|pocket|bag|small|pack|seize|huge/i },
  { label: '简洁', re: /简洁|简约/ },
  { label: '护圈 · 保护罩', re: /保护罩|桨保|包裹|guard|cage/i },
  { label: '颜色 · 辨识', re: /颜色|橙|orange|gray|pink|reflective|辨识|鲜艳|skin|wrap/i },
  { label: '折叠', re: /折叠|fold/i },
  { label: '集成 · 质感', re: /集成|质感|材料/ },
];
type Card = (typeof evidence.cards)[number];
const text = (c: Card) => [c.id, c.quote, c.object, c.category, c.polarity, c.limits, c.relation, c.state].join(' ');

const EvidenceDrawer: React.FC<{ onClose: () => void; initialQuery?: string }> = ({ onClose, initialQuery = '' }) => {
  const { intent, adoptCard, undoCard } = useDroneStore();
  const [query, setQuery] = useState(initialQuery);
  const [topic, setTopic] = useState<number | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return evidence.cards.filter(c => (topic === null || topics[topic].re.test(text(c))) && (!q || text(c).toLowerCase().includes(q)));
  }, [query, topic]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="用户评论依据" data-testid="evidence-drawer">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 bg-slate-900/30" />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900">用户评论依据</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {evidence.card_count} 条整理过的评论短引文。觉得哪条支持你的意图，就采纳为依据；采纳不会改动任何参数。
            </p>
          </div>
          <button type="button" onClick={onClose} data-testid="evidence-close" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3 border-b border-slate-200 px-5 py-3">
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/30">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜原话、对象或卡号，例如：小巧、pocket" data-testid="evidence-search"
              aria-label="搜索评论依据" className="min-w-0 flex-1 py-2 text-sm focus:outline-none" />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t, i) => (
              <button key={t.label} type="button" onClick={() => setTopic(topic === i ? null : i)} aria-pressed={topic === i}
                className={`rounded-full border px-2.5 py-1 text-xs ${topic === i ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-300 text-slate-600 hover:border-primary-500'}`}>{t.label}</button>
            ))}
            <span className="ml-auto self-center text-xs text-slate-500" data-testid="evidence-count">共 {results.length} 条</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center" data-testid="evidence-empty">
              <p className="font-medium text-slate-800">没有找到相关的评论</p>
              <p className="mt-1 text-sm text-slate-500">没关系。关掉这里，直接在「设计意图」里选词或写一句自己的想法就行，会记为设计者自己的判断。</p>
              <button type="button" onClick={onClose} className="btn-primary mt-4 text-sm">回去自己写</button>
            </div>
          ) : (
            <ul className="space-y-3" data-testid="evidence-list">
              {results.map(c => {
                const on = intent.cards.includes(c.id);
                return (
                  <li key={c.id} data-card={c.id} data-adopted={on ? 'yes' : 'no'} className={`rounded-xl border p-4 ${on ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-3">
                      <p className="min-w-0 flex-1 text-base leading-relaxed text-slate-900">“{c.quote}”</p>
                      {on ? (
                        <button type="button" onClick={() => undoCard(c.id)} data-action="undo"
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-600 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                          <Check className="h-4 w-4" />已采纳
                        </button>
                      ) : (
                        <button type="button" onClick={() => adoptCard(c.id)} data-action="adopt"
                          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-primary-500 hover:text-primary-700">采纳</button>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-600"><span className="text-slate-400">{c.id} · 说的是：</span>{c.object}</p>
                    <p className="mt-1 text-sm text-slate-600"><span className="text-slate-400">注意：</span>{c.limits}</p>
                    {on && <p className="mt-2 text-xs text-emerald-700">已记为依据，再点一次可取消。</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="border-t border-slate-200 px-5 py-2 text-xs text-slate-500">来源：{evidence.source}。条数不代表需求的轻重，评论也给不出具体尺寸。</p>
      </div>
    </div>
  );
};

export default EvidenceDrawer;
