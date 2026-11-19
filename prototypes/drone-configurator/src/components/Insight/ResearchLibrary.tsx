import { useId, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import evidence from '../../data/evidenceCards.json';
import { corpus, themes } from '../../data/corpus';
import { useEvidenceLibrary } from '../../design/semantics/evidenceLibrary';
import { type TopicTag } from '../../design/semantics/lookup.mjs';
import { PinButton } from './EvidenceGroups';
import type { EvidencePins } from './InsightPage';
import './knowledge.css';

export default function ResearchLibrary({ onTopic, pins }: { onTopic: (topic: TopicTag) => void; pins?: EvidencePins }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(5);
  const { library, error } = useEvidenceLibrary();
  const id = useId();
  const matches = library?.search(query) ?? [];
  const related = query.trim() ? library?.relatedTopics(matches) ?? [] : [];
  function search(value: string) { setQuery(value); setLimit(5); }
  return <details className="goal-card research-library" data-testid="research-library">
    <summary><BookOpen size={17}/> 查找用户反馈 <span>{evidence.card_count} 张卡 · {evidence.source_count} 个来源</span></summary>
    <div className="research-body">
      <label htmlFor={id} className="knowledge-field">检索公开短引</label>
      <div className="research-search"><Search size={16}/><input id={id} value={query} placeholder="搜「衣兜」「反光贴纸」、卡号或来源编号" aria-label="搜索资料库" onChange={e => search(e.target.value)}/></div>
      <p className="research-count" role="status">{error ? '公开卡校验失败。' : !library ? '正在读取公开卡…'
        : query.trim() ? '找到 ' + matches.length + ' 个来源，按相关度排列。' : '按卡号浏览全部来源。'}</p>
      {related.length > 0 && <div className="research-topics"><span>用相关话题核对目标</span>{related.map(topic =>
        <button type="button" key={topic.id} onClick={() => onTopic(topic)} data-search-topic={topic.id}>{topic.label}</button>)}</div>}
      <div className="research-results">
        {matches.slice(0, limit).map(group => <article key={group.source} data-search-source={group.source}>
          <div className="knowledge-id">{group.source}{group.cards.length > 1 && ' · 同一来源的 ' + group.cards.length + ' 张卡'}</div>
          {group.cards.map(({card, matched}) => <section key={card.id} data-search-card={card.id}>
            <blockquote><b>{card.id}</b> {card.quote}</blockquote>
            {!matched && <p>此句补充同一来源的语境。</p>}
            <details><summary>对象与适用限制</summary><p>{card.object} · {card.state}</p><p>{card.limits}</p></details>
            <PinButton id={card.id} pins={pins}/>
          </section>)}
        </article>)}
      </div>
      {library && !matches.length && <p className="research-empty">没有找到相符的短引。可换用一个部件名，或把想法保存为自定目标。</p>}
      {matches.length > limit && <button className="knowledge-button" type="button" onClick={() => setLimit(n => n + 5)}>再看 {Math.min(5,matches.length-limit)} 个来源</button>}
      <details className="knowledge-disclosure research-scope"><summary>资料范围与主题统计</summary>
        <p>卡库收录消费航拍相关的 {evidence.card_count} 张公开短引，按 {evidence.source_count} 个来源归组。检索会匹配原话、对象、话题和限制。一个来源可能有多张卡。</p>
        <p>另有 {corpus.styling} 个消费航拍造型表述簇用于主题统计。{corpus.caveat}</p>
        <ul>{themes.filter(t => t.count > 0).map(t => <li key={t.id}>{t.label} {t.count} 簇</li>)}</ul>
      </details>
    </div>
  </details>;
}
