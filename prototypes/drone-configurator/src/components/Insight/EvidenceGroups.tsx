import { Check, Pin } from 'lucide-react';
import type { LookupResult } from '../../design/semantics/lookup.mjs';
import type { EvidencePins } from './InsightPage';

/** 把一张证据卡放到画布上，连到当前的设计目标。 */
export function PinButton({ id, pins }: { id: string; pins?: EvidencePins }) {
  if (!pins) return null;
  const done = pins.pinned.has(id);
  return <button type="button" className="knowledge-pin" disabled={done} data-pin-card={id} onClick={() => pins.onPin(id)}
    title={done ? '这张卡已在画布上' : '把这张卡放到画布上，连到当前目标'}>
    {done ? <><Check size={12}/>已在画布</> : <><Pin size={12}/>放到画布</>}
  </button>;
}

export default function EvidenceGroups({ groups, pins, open }: { groups: LookupResult['groups']; pins?: EvidencePins; open?: boolean }) {
  if (!groups.length) return null;
  return <details className="knowledge-disclosure" open={open}>
    <summary>查看原话与限制 · {groups.length} 个来源</summary>
    {groups.map(group => <div className="knowledge-source" key={group.source}>
      <div className="knowledge-id">{group.source}{group.cards.length > 1 && ' · 同一来源'}</div>
      {group.cards.map(card => <div key={card.id} data-card={card.id}>
        <blockquote><b>{card.id}</b> {card.quote}</blockquote>
        <p>{card.role === 'caution' ? '随附限制' : '适用限制'} · {card.limits}</p>
        <PinButton id={card.id} pins={pins}/>
      </div>)}
    </div>)}
  </details>;
}
