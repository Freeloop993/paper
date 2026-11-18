import { cardTopics, type Card, type TopicTag } from './lookup.mjs';

export interface PublicCard extends Omit<Card, 'role'> {
  category: string;
  polarity: string;
}

export interface SearchGroup {
  source: string;
  cards: { card: PublicCard; matched: boolean }[];
  score: number;
}

// Search vocabulary only. A word match can suggest a topic, never establish that a claim applies.
const aliases = [
  ['收纳', '装包', '放进包', '背包', '小包', '书包', 'bag', 'pack', 'backpack'],
  ['口袋', '衣兜', '裤兜', 'pocket'],
  ['折叠', '折好', '折起', '收起', 'fold', 'folds', 'folded', 'folding'],
  ['护圈', '护桨', '桨保', '桨叶防护', '保护笼', 'prop guard', 'prop guards', 'cage'],
  ['简洁', '简约', '干净', '清爽', '利落', 'minimal', 'simple'],
  ['鲜艳', '醒目', '辨识', '识别', '认出', '显眼'],
  ['配色', '颜色', '色彩', 'colour', 'color'],
  ['贴皮', '贴纸', '贴膜', '覆膜', 'wrap', 'skin'],
  ['反光', 'reflective'], ['橙色', '橘色', 'orange'], ['灰色', 'gray', 'grey'],
  ['集成', '内置', '内嵌', '内藏'], ['便携', '便于携带', '随身携带'],
];
const stop = new Set(['希望', '我想', '是否', '一个', '可以', '如果', '怎么', '比较', '无人', '人机',
  '整体', '看起', '起来', '看着', '上去', '觉得', '感觉', '想要', '显得',
  'with', 'from', 'that', 'the', 'and', 'for', 'how', 'can']);
const normalize = (s: string) => s.normalize('NFKC').trim().toLowerCase();

function tokens(value: string) {
  const text = normalize(value);
  const words = text.match(/[a-z0-9]+/g) ?? [];
  const english = new Set(words);
  const result = words.filter(word => word.length > 1 && !stop.has(word));
  for (const run of text.match(/\p{Script=Han}+/gu) ?? []) {
    for (let i = 1; i < run.length; i++) {
      const pair = run.slice(i - 1, i + 1);
      if (!stop.has(pair)) result.push(pair);
    }
  }
  for (const [i, group] of aliases.entries()) {
    if (group.some(word => /^[a-z]+$/.test(word) ? english.has(word) : text.includes(word))) result.push('@' + i);
  }
  return result;
}

export function createEvidenceSearch(cards: PublicCard[]) {
  const tags = cardTopics();
  const frequencies = new Map<string, number>();
  const sources = new Map<string, PublicCard[]>();
  const documents = cards.map(card => {
    const current = sources.get(card.source_key) ?? [];
    current.push(card);
    sources.set(card.source_key, current);
    const terms = new Map<string, number>();
    let length = 0;
    // The original quote carries more weight than a match in cataloguing or limitations.
    for (const [value, weight] of [
      [card.quote, 5], [card.object, 3], [card.state, 2],
      [(tags.get(card.id) ?? []).map(tag => tag.label).join(' '), 1.5],
      [[card.category, card.polarity, card.limits].join(' '), 1],
    ] as const) {
      for (const term of tokens(value)) {
        terms.set(term, (terms.get(term) ?? 0) + weight);
        length += weight;
      }
    }
    for (const term of terms.keys()) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    return { card, terms, length };
  });
  const average = documents.reduce((sum, doc) => sum + doc.length, 0) / Math.max(documents.length, 1);

  function search(input: string): SearchGroup[] {
    const query = normalize(input);
    const terms = new Set(tokens(query));
    const identifier = /^(?:e\d+|s-[\da-z-]+)$/i.test(query);
    const weighted = new Map<string, number>();
    for (const { card, terms: document, length } of documents) {
      let score = 0;
      if (!query) score = 1;
      else if (identifier) score = [card.id, card.source_key].some(key => normalize(key) === query) ? 100 : 0;
      else {
        for (const term of terms) {
          const tf = document.get(term) ?? 0;
          if (!tf) continue;
          const df = frequencies.get(term)!;
          const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5));
          score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * length / average));
        }
        if (normalize(card.quote).includes(query)) score += 10;
        else if (normalize(card.object).includes(query)) score += 4;
      }
      if (score > 0) weighted.set(card.id, score);
    }
    const groups: SearchGroup[] = [];
    for (const [source, siblings] of sources) {
      const score = Math.max(...siblings.map(card => weighted.get(card.id) ?? 0));
      if (score > 0) groups.push({ source, score, cards: siblings.map(card => ({card, matched: weighted.has(card.id)})) });
    }
    return groups.sort((a, b) => b.score - a.score || a.cards[0].card.id.localeCompare(b.cards[0].card.id));
  }

  function relatedTopics(groups: SearchGroup[]): TopicTag[] {
    const candidates = new Map<string, { tag: TopicTag; score: number }>();
    for (const group of groups.slice(0, 4)) {
      // Multiple quotes by one source still contribute only once to a topic's rank.
      const sourceTags = new Map(group.cards.filter(item => item.matched)
        .flatMap(({ card }) => (tags.get(card.id) ?? []).map(tag => [tag.id, tag] as const)));
      for (const [id, tag] of sourceTags) {
        candidates.set(id, {tag, score: group.score + (candidates.get(id)?.score ?? 0)});
      }
    }
    return [...candidates.values()].sort((a,b) => b.score - a.score).slice(0, 3).map(item => item.tag);
  }
  return { search, relatedTopics };
}
