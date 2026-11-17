// 由公开证据卡 CSV 生成界面内置的离线数据。运行：node scripts/build-evidence.mjs
// 只读取仓库内已公开的短引文与限制字段，不接触私有原评论。
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(here, '../../../evidence/semantic-cards/cards.csv');
const raw = readFileSync(sourcePath);
const text = raw.toString('utf8').replace(/^﻿/, '');

function parseCsv(input) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const [header, ...body] = parseCsv(text);
const expected = ['卡号', '匿名来源键', '数据集', '记录编号（公开替代码）', '原文片段', '对象', '展开或折叠状态', '类别', '极性', '历史解释与限制', '与候选方向的关系'];
if (JSON.stringify(header) !== JSON.stringify(expected)) throw new Error('cards.csv 表头与预期不符：' + header.join('|'));
const cards = body.filter(r => r.length === expected.length).map(r => ({
  id: r[0], source_key: r[1], dataset: r[2], record: r[3], quote: r[4], object: r[5],
  state: r[6], category: r[7], polarity: r[8], limits: r[9], relation: r[10],
}));
const out = {
  source: 'evidence/semantic-cards/cards.csv',
  sha256: createHash('sha256').update(raw).digest('hex'),
  card_count: cards.length,
  source_count: new Set(cards.map(c => c.source_key)).size,
  note: '离线公开证据卡。卡数、来源数与人次是不同单位；卡数不代表需求权重。证据卡不给出毫米数或比例。',
  cards,
};
writeFileSync(resolve(here, '../src/data/evidenceCards.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`evidenceCards.json: ${out.card_count} 张卡，${out.source_count} 个来源，sha256 ${out.sha256}`);
