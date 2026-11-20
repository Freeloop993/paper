// 核对回件是不是页面原样产出的。用法：node qa/verify_returns.mjs responses/2026-11-19
// 页面用答卷里记下的种子决定出图顺序和每个词对的左右对调，所以拿同一个种子重算一遍，
// 就能看出文件里的顺序和对调是否与页面一致，以及页面用的是哪一份图单。
// 它能证明文件出自页面，不能证明作答的是谁。
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(path.dirname(fileURLToPath(import.meta.url))), dir = process.argv[2];
const PAGE = 'participant/无人机外观评议.html', PRIOR = { '9e157f56cc97': 'a19250a' };   // 旧包 → 当时的提交
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(list, r){ const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pack = (html) => JSON.parse(html.split('\n').find((l) => l.startsWith('const PACK = ')).slice(13).replace(/;\s*$/, ''));
const cur = pack(fs.readFileSync(path.join(here, PAGE), 'utf8')), packs = { [cur.pack]: cur };
for (const [id, commit] of Object.entries(PRIOR)) packs[id] = pack(execFileSync('git', ['show', `${commit}:experiments/s5-compactness-pilot/${PAGE}`], { cwd: here, maxBuffer: 1 << 26 }).toString('utf8'));
const expect = (P, list, seed) => { const r = rng(seed); return shuffle(list, r).map((image) => ({ image, flip: Object.fromEntries(P.terms.map((t) => [t.id, r() < 0.5])) })); };
const same = (P, got, exp) => got.length === exp.length && got.every((g, i) => g.image === exp[i].image && P.terms.every((t) => g.flip[t.id] === exp[i].flip[t.id]));
const browser = (ua) => { const m = (re) => (ua.match(re) || [])[1]; if (m(/MiniMax\/([\d.]+)/)) return `MiniMax ${m(/MiniMax\/([\d.]+)/)} 桌面应用（Electron ${m(/Electron\/(\d+)/)}）`; if (m(/Edg\/(\d+)/)) return `Edge ${m(/Edg\/(\d+)/)}`; return `Chrome ${m(/Chrome\/(\d+)/)}`; };
console.log('| 文件 | 编号 | 页面 | 图数 | 文件修补 | 顺序和对调与种子 | 开始–完成（UTC） | 各页用时相加 | 窗口 | 浏览器 |\n| --- | --- | --- | ---: | --- | --- | --- | ---: | --- | --- |');
const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8').trim(); let d, fixed = '无';
  try { d = JSON.parse(raw); } catch (e) { d = JSON.parse(raw + '}'); fixed = '补结尾的 }'; }
  const P = packs[d.pack]; if (!P) { rows.push([d.started_at, `| ${f} | ${d.response_id} | 未知的包 ${d.pack} | | | | | | | |`]); continue; }
  const full = same(P, d.singles, expect(P, P.singles, d.seed));
  const subset = P.singles.filter((id) => d.singles.some((g) => g.image === id));
  const verdict = full ? '一致（发布的页面）' : same(P, d.singles, expect(P, subset, d.seed)) ? `一致，但图单只有这 ${subset.length} 张（改过的页面）` : '不一致';
  rows.push([d.started_at, `| ${f} | ${d.response_id} | ${P.version} | ${d.singles.length} | ${fixed} | ${verdict} | ${d.started_at.slice(11, 19)}–${d.finished_at.slice(11, 23)} | ${(d.singles.reduce((s, x) => s + x.ms, 0) / 60000).toFixed(1)} 分 | ${d.device.w}×${d.device.h} @${d.device.dpr} | ${browser(d.device.ua)} |`]);
}
rows.sort((a, b) => a[0] < b[0] ? -1 : 1).forEach((r) => console.log(r[1]));
