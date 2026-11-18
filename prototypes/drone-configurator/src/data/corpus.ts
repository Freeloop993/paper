// 评论语料的公开汇总（不含原评论）。数字取自 evidence/semantic-cards/early-crawl/claude-review-20261117/README.md。
export const corpus = {
  searched: 7443,
  consumer: 1318,
  styling: 228,
  cards: 36,
  caveat: '主题计数来自模型筛查加逐条审读，人工抽样核对尚未回收；一条评论可以属于多个主题。',
  source: 'evidence/semantic-cards/early-crawl/claude-review-20261117/README.md',
};

export interface Theme {
  id: string;
  label: string;
  count: number;
  /** 在已公开的短引文卡里找这一主题用的关键词。 */
  match: RegExp;
  /** 研究者把这一主题转译到的词对（论文表3.4）；没有对应时为空。 */
  pair?: 'compact' | 'simple' | 'integrated' | 'visible';
}

export const themes: Theme[] = [
  { id: 'small', label: '小巧', count: 99, match: /小巧|大小|小|small|size|seize|huge|大了一圈|显得挺大|更大/i, pair: 'compact' },
  { id: 'carry', label: '便携', count: 67, match: /便携|携带|bag|pocket|pack|fit/i, pair: 'compact' },
  { id: 'look', label: '好看', count: 61, match: /外观|好看|大气|大方|灵性|pretty/i },
  { id: 'light', label: '轻', count: 49, match: /轻/ },
  { id: 'fold', label: '折叠', count: 12, match: /折叠|fold/i, pair: 'compact' },
  { id: 'simple', label: '简洁', count: 12, match: /简洁|简约/, pair: 'simple' },
  { id: 'premium', label: '质感', count: 10, match: /质感|高级/ },
  { id: 'material', label: '材料', count: 4, match: /材料|贴膜|skin|wrap|reflective/i },
  { id: 'colour', label: '配色', count: 4, match: /颜色|橙|orange|gray|pink|鲜艳|辨识/i, pair: 'visible' },
  { id: 'guard', label: '护圈', count: 0, match: /保护罩|桨保|包裹|guard|cage/i },
  { id: 'integrate', label: '集成', count: 0, match: /集成/, pair: 'integrated' },
];
