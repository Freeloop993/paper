// 取点页面的软件走查：用 points.csv 里的坐标当“已知答案”去点，检查导出的坐标是否一致，以及撤销、看不清、方向键微调、刷新后续做。
// 用法：node annotator/qa.mjs <输出目录>。这里产生的文件只用于检查软件，不是判读数据。
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../prototypes/drone-configurator/package.json'));
const { chromium } = require('playwright-core');
const out = path.resolve(process.argv[2]); fs.mkdirSync(out, { recursive: true });
const order = JSON.parse(fs.readFileSync(path.join(here, 'order.json'), 'utf8')).order;
const rows = fs.readFileSync(path.join(here, '../points.csv'), 'utf8').replace(/^﻿/, '').trim().split('\n').map((l) => l.split(','));
const head = rows[0], pts = Object.fromEntries(rows.slice(1).map((r) => [r[0], Object.fromEntries(head.map((h, i) => [h, r[i]]))]));
const checks = [], ok = (name, cond, info) => checks.push({ name, ok: !!cond, info });
const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(pathToFileURL(path.join(here, '无人机取点.html')).href);
ok('开始按钮在答完两题前不可点', await page.isDisabled('#go'));
await page.selectOption('#q1', '没有'); await page.selectOption('#q2', '有'); await page.click('#go');
const click = async (x, y) => { const b = await page.locator('#stage').boundingBox(); await page.mouse.click(b.x + x / 1024 * b.width, b.y + y / 1024 * b.height); };
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('s5-geometry-')))));
const expected = {};
// 第 1 张：全部按已知坐标点
{ const it = order[0], p = pts[it.name.split(' ')[0]], e = { hubs: [] };
  ok('第一张“下一张”起初不可点', await page.isDisabled('#next'));
  for (let i = 1; i <= it.rotors; i++) { const xy = [+p['hub' + i + '_x'], +p['hub' + i + '_y']]; await click(...xy); e.hubs.push(xy); }
  e.front = [+p.midline_x, +p.body_top_y]; e.rear = [+p.midline_x, +p.body_bottom_y]; e.left = [+p.body_left_x, +p.row_y]; e.right = [+p.body_right_x, +p.row_y];
  for (const k of ['front', 'rear', 'left', 'right']) await click(...e[k]);
  await click(700, 200); e.tip = [700, 200]; expected[it.id] = e;
  await page.screenshot({ path: path.join(out, 'annotator-work.png') });
  ok('标完后可以点下一张', !(await page.isDisabled('#next'))); await page.click('#next'); }
// 第 2 张：电机按坐标点，机壳和桨尖都“看不清”
{ const it = order[1], p = pts[it.name.split(' ')[0]], e = { hubs: [], front: null, rear: null, left: null, right: null, tip: null };
  for (let i = 1; i <= it.rotors; i++) { const xy = [+p['hub' + i + '_x'], +p['hub' + i + '_y']]; await click(...xy); e.hubs.push(xy); }
  await page.keyboard.press('n'); await page.keyboard.press('n'); expected[it.id] = e;
  ok('看不清两次后可以点下一张', !(await page.isDisabled('#next'))); await page.click('#next'); }
// 第 3 张：撤销与方向键
{ const it = order[2]; await click(300, 300); await page.keyboard.press('z'); let s = await state(); ok('撤销后电机点为 0', s.images[it.id].hubs.length === 0);
  await click(300, 300); s = await state(); const h0 = s.images[it.id].hubs[0].slice(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); s = await state(); const h = s.images[it.id].hubs[0];
  ok('方向键各挪一个像素', h[0] - h0[0] === 1 && h[1] - h0[1] === 1, [h0, h]); }
await page.reload(); ok('刷新后回到第 3 张', (await page.textContent('#prog')).includes('第 3 张'));
await page.click('#exp'); const code = await page.inputValue('#code'); ok('导出串以 S5G1: 开头', code.startsWith('S5G1:'));
const got = JSON.parse(Buffer.from(code.slice(5), 'base64').toString('utf8')); let worst = 0;
// 页面按嵌入图的原始像素记坐标（嵌入的是 720 像素的 JPEG），points.csv 是 1024 像素的坐标，比较前先换算
const f = got.images[order[0].id].natural[0] / 1024; for (const e of Object.values(expected)) { e.hubs = e.hubs.map((p) => [p[0] * f, p[1] * f]); for (const k of ['front', 'rear', 'left', 'right', 'tip']) if (e[k]) e[k] = [e[k][0] * f, e[k][1] * f]; }
for (const [id, e] of Object.entries(expected)) { const g = got.images[id];
  e.hubs.forEach((p, i) => { worst = Math.max(worst, Math.abs(p[0] - g.hubs[i][0]), Math.abs(p[1] - g.hubs[i][1])); });
  for (const k of ['front', 'rear', 'left', 'right', 'tip']) { if (e[k] === null) ok(id + ' ' + k + ' 记为看不清', g[k] === null); else worst = Math.max(worst, Math.abs(e[k][0] - g[k][0]), Math.abs(e[k][1] - g[k][1])); } }
ok('导出坐标与点下的位置相差不超过 1 像素', worst <= 1, worst); ok('记下了图的原始尺寸', got.images[order[0].id].natural[0] > 0, got.images[order[0].id].natural);
ok('导出里有已完成张数', got.complete === 2, got.complete);
fs.writeFileSync(path.join(out, 'qa-points.json'), JSON.stringify(got));
await browser.close();
const failed = checks.filter((c) => !c.ok); console.log(JSON.stringify({ checks: checks.length, failed, natural: got.images[order[0].id].natural, worst_px: worst }));
process.exit(failed.length ? 1 : 0);
