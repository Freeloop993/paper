// 软件走查：用三个合成评议者把页面从头做到尾，检查必答拦截、刷新后续答、下载与复制结果一致。
// 用法：node qa/walkthrough.mjs <输出目录>。合成答卷只用于检查软件和汇总脚本，不是研究数据。
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../prototypes/drone-configurator/package.json'));
const { chromium } = require('playwright-core');
const key = JSON.parse(fs.readFileSync(path.join(here, '../researcher-key.json'), 'utf8'));
const page_url = pathToFileURL(path.join(here, '../participant/无人机外观评议.html')).href;
const out = path.resolve(process.argv[2] || path.join(here, 'out')); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
const checks = [];
const ok = (name, cond) => { checks.push({ name, pass: !!cond }); if (!cond) console.error('FAIL', name); };
// 合成评议者：0 号认为 d/D 越大越紧凑、W/L 没差别；1 号同向但有一题反选；2 号在手机宽度上作答，部分题选“无法判断”。
for (const who of [0, 1, 2]) {
  const ctx = await browser.newContext({ viewport: who === 2 ? { width: 390, height: 780 } : { width: 1200, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(page_url);
  const state = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), 's5pilot/' + key.pack);
  const next = () => page.click('#next');
  ok('同意前不能继续', await page.isDisabled('#next'));
  await page.click('#agree'); await next();
  ok('背景未答不能继续', await page.isDisabled('#next'));
  for (const [name, v] of [['design', ['没有', '设计专业学生', '从事设计工作'][who]], ['years', ['不适用', '2 到 5 年', '5 年以上'][who]], ['drone', '见过或用过几次'], ['relation', who ? '不认识' : '认识'], ['exposure', '没有']])
    await page.click(`.opts[data-name="${name}"] button[data-v="${v}"]`);
  await next(); await next();
  let s = await state();
  for (let i = 0; i < s.singles.length; i++) {
    const item = s.singles[i], m = key.images[item.image];
    if (i === 0) ok('单图未评不能继续', await page.isDisabled('#next'));
    for (const t of key.terms) {
      let v = 4;   // 换算后的值：1 = 左极
      if (t.id === 'span' && m.factor === 'd/D') v = { 0.4: 6, 0.5: 4, 0.6: 2 }[m.level] + (who === 1 ? 1 : 0);
      const raw = item.flip[t.id] ? 8 - v : v;
      await page.click(`.scale[data-t="${t.id}"] button[data-v="${who === 2 && t.id === 'whole' && i % 4 === 0 ? 'na' : raw}"]`);
    }
    if (i === 3) { await page.reload(); ok('刷新后停在原页并保留已答', await page.locator('.scale button.on').count() === 3); }
    await next();
  }
  await next(); s = await state();
  if (who === 2) await page.screenshot({ path: path.join(out, 'mobile-pair.png') });
  if (who === 0) await page.screenshot({ path: path.join(out, 'desktop-pair.png') });
  for (let i = 0; i < s.pairs.length; i++) {
    const item = s.pairs[i], k = key.pairs[item.pair];
    if (i === 0) ok('成对题未选不能继续', await page.isDisabled('#next'));
    let c = 'same';
    if (k.factor === 'd/D') c = (item.left === k.higher) ? 'left' : 'right';
    if (who === 1 && item.pair === 'p02') c = (item.left === k.lower) ? 'left' : 'right';
    if (who === 2 && k.kind === 'low-mid') c = 'na';
    await page.click(`.choice button[data-v="${c}"]`);
    if (i === 1) await page.fill('#why', '桨和机身之间的空隙');
    await next();
  }
  await page.click('.opts[data-name="alone"] button[data-v="是"]'); await next();
  const code = await page.inputValue('#code');
  const decoded = JSON.parse(Buffer.from(code.slice(5), 'base64').toString('utf8'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const file = path.join(out, `synthetic-${who}.json`); await dl.saveAs(file);
  const downloaded = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok('下载文件与复制结果一致', JSON.stringify(downloaded) === JSON.stringify(decoded));
  ok('答卷完整', downloaded.pairs.every((x) => x.choice) && downloaded.singles.every((x) => Object.keys(x.ratings).length === 3) && downloaded.finished_at);
  ok('重复题左右对调', key && Object.entries(key.pairs).filter(([, v]) => v.kind === 'repeat').every(([id, v]) => { const a = downloaded.pairs.find((x) => x.pair === id), b = downloaded.pairs.find((x) => x.pair === v.repeat_of); return a.left === b.right && a.right === b.left; }));
  ok('页面没有脚本错误', errors.length === 0);
  if (who === 2) fs.writeFileSync(path.join(out, 'synthetic-2.txt'), code);
  await ctx.close();
}
await browser.close();
const failed = checks.filter((c) => !c.pass);
console.log(JSON.stringify({ checks: checks.length, failed: failed.map((c) => c.name) }));
process.exit(failed.length ? 1 : 0);
