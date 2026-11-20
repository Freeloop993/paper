// 取点页面的软件走查：拿 a3/points.csv 和 guide-pixels.csv 里已有的坐标当“已知答案”去点 H1 页面的 24 张图，
// 检查导出的坐标、吸附到横线、位置名称对不上时的拦截、定不了要写原因、电机不全时左右缘自动留空、方向键、撤销、刷新后续做，
// 再把导出的文件转成 response.csv，连同模拟的 AI、H2 两份表交给原评分程序跑一遍。
// 用法：node qa.mjs <输出目录>。这里产生的文件只用于检查软件，不是判读数据。
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url'; import { execFileSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '../../..');
const require = createRequire(path.join(root, 'prototypes/drone-configurator/package.json'));
const { chromium } = require('playwright-core');
const out = path.resolve(process.argv[2]); fs.mkdirSync(out, { recursive: true });
const csv = (f) => { const rows = fs.readFileSync(f, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).map((l) => l.split(',')); return rows.slice(1).map((r) => Object.fromEntries(rows[0].map((h, i) => [h, r[i]]))); };
const off = path.join(root, 'archive/paper-reading-room/studies/20261117-offline');
const key = Object.fromEntries(csv(path.join(off, 'researcher/a8/PRIVATE-key.csv')).filter((r) => r.reader === 'H1').map((r) => [r.token, r.file]));
const known = Object.fromEntries(csv(path.join(here, '../a3/points.csv')).map((r) => [r.image_id + '.png', r]));
const guide = {}; for (const r of csv(path.join(here, '../a3/guide-pixels.csv'))) (guide[r.file] ||= {})[r.hub] = [Math.round(r.sum_x / r.red_pixels), Math.round(r.sum_y / r.red_pixels)];
const HUBS = ['tl', 'tr', 'br', 'bl'], SHELL = ['upper', 'lower', 'left', 'right'];
const answer = (file) => guide[file] ? guide[file] : Object.fromEntries(HUBS.concat(SHELL).map((k) => [k, known[file][k + '_x'] === '' ? null : [+known[file][k + '_x'], +known[file][k + '_y']]]));
const checks = [], ok = (name, cond, info) => checks.push({ name, ok: !!cond, info });
const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 }, acceptDownloads: true });   // 这个窗口下画布按原图 1:1 显示，点哪个像素就是哪个像素
const page = await ctx.newPage(); const requests = []; page.on('request', (q) => { if (!/^(file|data|blob):/.test(q.url())) requests.push(q.url()); });
await page.goto(pathToFileURL(path.join(here, 'dist/四旋翼取点-H1.html')).href);
const items = await page.evaluate(() => PACK.items);
ok('页面里是 24 张图，其中 4 张点线示意图', items.length === 24 && items.filter((i) => i.kind === 'diagram').length === 4);
ok('页面标的示意图与对应键一致', items.every((i) => (i.kind === 'diagram') === !!guide[key[i.id]]));
ok('开始按钮在答完两题前不可点', await page.isDisabled('#go'));

await page.screenshot({ path: path.join(out, 'a8-intro.png'), fullPage: true });
await page.selectOption('#q1', '没有'); await page.selectOption('#q2', '有'); await page.click('#go');
ok('大窗口下画布按原图 1:1 显示', (await page.locator('#stage').boundingBox()).width === 1026);
const click = async (x, y) => { const b = await page.locator('#stage').boundingBox(); await page.mouse.click(b.x + 1 + (x + .5) / 1024 * (b.width - 2), b.y + 1 + (y + .5) / 1024 * (b.height - 2)); };
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('a8-click-')))));
const skip = async (why) => { await page.click('#na'); await page.fill('#whytext', why); await page.click('#whyok'); };
const expected = {}; const firstDesign = items.findIndex((i) => i.kind === 'design'), firstDiagram = items.findIndex((i) => i.kind === 'diagram');
const special = { swap: items.findIndex((i, n) => i.kind === 'design' && n > firstDesign), };
special.skiphub = items.findIndex((i, n) => i.kind === 'design' && n > special.swap); special.skipside = items.findIndex((i, n) => i.kind === 'design' && n > special.skiphub);
for (let n = 0; n < items.length; n++) {
  const it = items[n], a = answer(key[it.id]), steps = it.kind === 'diagram' ? HUBS : HUBS.concat(SHELL), e = { pts: {}, why: {} };
  if (n === 0) ok('“下一张”起初不可点', await page.isDisabled('#next'));
  if (n === special.swap) { // 把左上、右上点反：应当拦住
    await click(...a.tr); await click(...a.tl); await click(...a.br); await click(...a.bl);
    ok('左上右上点反时出现提示', (await page.textContent('#warn')).includes('对不上'));
    for (const k of SHELL) { if (a[k]) await click(...a[k]); else await skip('走查'); }
    ok('位置名称对不上时不能进下一张', await page.isDisabled('#next'));
    for (let i = 0; i < 8; i++) await page.keyboard.press('z');
    ok('撤销八次后回到第一步', (await state()).images[it.id].pts.tl === undefined && (await page.textContent('#ask')).includes('左上'));
  }
  if (n === special.skiphub) { // 左上电机定不了：左右缘应当自动留空
    await page.click('#na'); await page.click('#whyok');
    ok('不写原因不能留空', (await state()).images[it.id].pts.tl === undefined);
    await page.fill('#whytext', '走查：桨帽偏心'); await page.click('#whyok'); e.pts.tl = null; e.why.tl = '走查：桨帽偏心';
    for (const k of ['tr', 'br', 'bl', 'upper', 'lower']) { await click(...a[k]); e.pts[k] = a[k]; }
    const s = (await state()).images[it.id];
    ok('电机不全时左右缘自动留空并写明原因', s.pts.left === null && s.pts.right === null && /定不出横线/.test(s.why.left) && /定不出横线/.test(s.why.right));
    e.pts.left = e.pts.right = null; e.why.left = e.why.right = s.why.left;
    await page.keyboard.press('z'); const u = (await state()).images[it.id];
    ok('撤销自动留空会退回到机壳下端那一步', u.pts.left === undefined && u.pts.right === undefined && u.pts.lower === undefined && u.pts.upper !== undefined);
    await click(...a.lower); expected[it.id] = e; await page.click('#next'); continue;
  }
  for (const k of steps) {
    if (!a[k]) { await skip('走查：原表这一项就是空的'); e.pts[k] = null; e.why[k] = '走查：原表这一项就是空的'; continue; }
    if (n === special.skipside && k === 'right') { await skip('走查：右缘和机臂分不开'); e.pts[k] = null; e.why[k] = '走查：右缘和机臂分不开'; continue; }
    if (k === 'left' || k === 'right') { // 故意点在横线外 9 个像素，应当被吸到横线上
      const ly = Math.round(HUBS.reduce((s, h) => s + a[h][1], 0) / 4); await click(a[k][0], ly + 9); e.pts[k] = [a[k][0], ly];
    } else { await click(...a[k]); e.pts[k] = a[k]; }
    if (n === firstDesign && k === 'tl') { await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
      ok('方向键把刚点的点挪一个像素', JSON.stringify((await state()).images[it.id].pts.tl) === JSON.stringify([a.tl[0] - 1, a.tl[1] + 1])); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp'); }
    if (n === firstDesign && k === 'left') { await page.keyboard.press('ArrowDown'); ok('左右缘不能用方向键挪出横线', (await state()).images[it.id].pts.left[1] === e.pts.left[1]); }
    if (n === firstDesign && k === 'lower') { // 把下端点到上端上面：应当提示；撤销重点
      await page.keyboard.press('z'); await click(a.upper[0], Math.max(0, a.upper[1] - 20)); ok('下端点在上端上面时出现提示', (await page.textContent('#warn')).includes('下端')); await page.keyboard.press('z'); await click(...a.lower); }
  }
  expected[it.id] = e;
  if (n === firstDesign) { await page.screenshot({ path: path.join(out, 'a8-work-design.png') }); await page.reload(); ok('刷新后停在同一张、点还在', (await page.textContent('#prog')).startsWith('第 ' + (n + 1) + ' 张') && Object.keys((await state()).images[it.id].pts).length === 8); }
  if (n === firstDiagram) { await page.screenshot({ path: path.join(out, 'a8-work-diagram.png') }); ok('示意图点完四个点就算完成', !(await page.isDisabled('#next')) && Object.keys((await state()).images[it.id].pts).length === 4); }
  ok('第 ' + (n + 1) + ' 张点完后可以进下一张', !(await page.isDisabled('#next'))); await page.click('#next');
}
ok('24 张点完后进入结束页', (await page.textContent('h1')).includes('全部点完了'));
await page.fill('#notes', '走查备注'); await page.screenshot({ path: path.join(out, 'a8-finish.png') });
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]); const file = path.join(out, dl.suggestedFilename()); await dl.saveAs(file);
const got = JSON.parse(fs.readFileSync(file, 'utf8'));
const same = items.every((it) => { const g = got.images[it.id], e = expected[it.id]; return Object.keys(e.pts).every((k) => JSON.stringify(g.pts[k]) === JSON.stringify(e.pts[k]) && (e.pts[k] !== null || g.why[k] === e.why[k])) && Object.keys(g.pts).length === Object.keys(e.pts).length; });
ok('导出的坐标与点下去的一致（24 张，含吸附和留空）', same);
ok('导出文件带上作答者自报、备注、页面版本和每张用时', got.background.exposure === '没有' && got.notes === '走查备注' && got.tool === 'a8-click 1.0' && got.finished_at && items.every((it) => got.images[it.id].ms > 0));
const code = await page.inputValue('#code'); fs.writeFileSync(path.join(out, 'pasted.txt'), code);
ok('粘贴用的那段文字解出来与文件内容相同', JSON.stringify(JSON.parse(Buffer.from(code.slice(5), 'base64').toString('utf8')).images) === JSON.stringify(got.images));
ok('页面没有发出任何网络请求', requests.length === 0, requests.slice(0, 3));
{ const small = await browser.newContext({ viewport: { width: 1366, height: 768 } }), p2 = await small.newPage(); await p2.goto(pathToFileURL(path.join(here, 'dist/四旋翼取点-H1.html')).href);
  await p2.selectOption('#q1', '没有'); await p2.selectOption('#q2', '有'); await p2.click('#go'); const b = await p2.locator('#stage').boundingBox(); let worst = 0;
  const st = () => p2.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('a8-click-')))));
  for (const [x, y] of [[101, 97], [903, 121], [899, 803], [97, 801]]) { await p2.mouse.click(b.x + 1 + (x + .5) / 1024 * (b.width - 2), b.y + 1 + (y + .5) / 1024 * (b.height - 2)); const pts = Object.values(Object.values((await st()).images)[0].pts), g = pts[pts.length - 1]; worst = Math.max(worst, Math.abs(g[0] - x), Math.abs(g[1] - y)); }
  ok('笔记本大小的窗口（1366×768）：画布缩小显示，点击落点与目标相差不超过 1 个像素', b.width < 1026 && worst <= 1, { stage: b.width, worst });
  await p2.screenshot({ path: path.join(out, 'a8-work-laptop.png') }); await small.close(); }
await browser.close();
// 转成 response.csv，交给原评分程序
try { const log = execFileSync('python3', [path.join(here, 'qa_score.py'), file, path.join(out, 'pasted.txt'), path.join(out, 'score')], { encoding: 'utf8' }); ok('转出的表被原评分程序接受，三组对照都算出来了', /SCORED/.test(log), log.trim().split('\n').slice(-6)); }
catch (err) { ok('转出的表被原评分程序接受，三组对照都算出来了', false, String(err.stdout || '') + String(err.stderr || err)); }
for (const c of checks) console.log((c.ok ? 'ok   ' : 'FAIL ') + c.name + (c.ok || c.info === undefined ? '' : ' :: ' + JSON.stringify(c.info)));
const info = checks.find((c) => c.name.startsWith('转出的表')); if (info && info.ok) console.log(info.info.join('\n'));
console.log(checks.filter((c) => c.ok).length + '/' + checks.length + ' 项通过'); process.exit(checks.every((c) => c.ok) ? 0 : 1);
