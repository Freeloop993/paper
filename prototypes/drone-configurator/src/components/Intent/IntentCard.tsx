// ① 设计意图：这架飞机想给人什么感觉。四组词对各选一端或不选；依据可以是证据卡，也可以是设计者自己的判断。
import React, { useState } from 'react';
import { MessageSquareQuote } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { wordPairs } from '../../design/fields';
import evidence from '../../data/evidenceCards.json';
import EvidenceDrawer from './EvidenceDrawer';
import { StepTitle } from '../Layout/StepTitle';

const IntentCard: React.FC<{ initialQuery?: string; initiallyOpen?: boolean }> = ({ initialQuery = '', initiallyOpen = false }) => {
  const { intent, setTarget, setNote, undoCard } = useDroneStore();
  const [drawer, setDrawer] = useState(initiallyOpen);
  const chosen = wordPairs.filter(w => intent.targets[w.id]);
  return (
    <section className="card" aria-label="设计意图" data-testid="intent">
      <StepTitle n={1} title="设计意图" en="Design Intent">这架飞机想给人什么感觉？每组选一端，也可以都不选。</StepTitle>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {wordPairs.map(w => {
          const v = intent.targets[w.id];
          const side = (pole: 'left' | 'right', label: string) => (
            <button type="button" role="radio" aria-checked={v === pole} data-target={`${w.id}:${pole}`} onClick={() => setTarget(w.id, v === pole ? null : pole)}
              className={`flex-1 px-2 py-2 text-sm ${v === pole ? 'bg-primary-600 font-medium text-white' : 'text-slate-700 hover:bg-slate-50'}`}>{label}</button>
          );
          return (
            <div key={w.id} className="flex overflow-hidden rounded-lg border border-slate-300 bg-white" role="radiogroup" aria-label={`${w.left}—${w.right}`}>
              {side('left', w.left)}<span className="w-px bg-slate-300" />{side('right', w.right)}
            </div>
          );
        })}
      </div>
      {chosen.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {chosen.map(w => `「${intent.targets[w.id] === 'left' ? w.left : w.right}」`).join('')}会作为设计意图写进提示词。
          {intent.targets.compact === 'left' && '「紧凑」指展开俯视时的观感，可在「机身」页调机身与轴距的比例来尝试。'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setDrawer(true)} data-testid="evidence-open"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-primary-500 hover:text-primary-700">
          <MessageSquareQuote className="h-4 w-4" />看看用户怎么说
          <span className="text-slate-400">{evidence.card_count} 条评论依据</span>
        </button>
        {intent.cards.length > 0 && <span className="text-sm text-slate-500">依据：</span>}
        {intent.cards.map(id => (
          <span key={id} data-adopted={id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-sm text-emerald-800 ring-1 ring-emerald-600/30">
            {id}
            <button type="button" onClick={() => undoCard(id)} aria-label={`取消采纳 ${id}`} className="text-emerald-600 hover:text-emerald-900">×</button>
          </span>
        ))}
      </div>

      <input value={intent.note} onChange={e => setNote(e.target.value)} data-testid="intent-note" aria-label="补充意图"
        placeholder="还想补充一句意图？例如：机臂到机身的过渡要连续（可不填）"
        className="input-field mt-3 w-full text-sm" />

      {drawer && <EvidenceDrawer onClose={() => setDrawer(false)} initialQuery={initialQuery} />}
    </section>
  );
};

export default IntentCard;
