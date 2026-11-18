import type { LookupResult } from '../../design/semantics/lookup.mjs';

export default function EvidenceGroups({ groups }: { groups: LookupResult['groups'] }) {
  if (!groups.length) return null;
  return <details className="knowledge-disclosure">
    <summary>查看原话与限制 · {groups.length} 个来源</summary>
    {groups.map(group => <div className="knowledge-source" key={group.source}>
      <div className="knowledge-id">{group.source}{group.cards.length > 1 && ' · 同一来源'}</div>
      {group.cards.map(card => <div key={card.id} data-card={card.id}>
        <blockquote><b>{card.id}</b> {card.quote}</blockquote>
        <p>{card.role === 'caution' ? '随附限制' : '适用限制'} · {card.limits}</p>
      </div>)}
    </div>)}
  </details>;
}
