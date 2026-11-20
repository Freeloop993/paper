// b 版题面的软件走查：用一份合成作答走完 150 条，检查开始前的必答、自动保存后续做、漏答拦截、导出与载入草稿。
// 用法：node qa-form-b.mjs <输出目录>。合成答卷只用于检查软件，不是研究数据。
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../prototypes/drone-configurator/package.json'));
const { chromium } = require('playwright-core');
const out = path.resolve(process.argv[2]); fs.mkdirSync(out, { recursive: true });
const checks = [], ok = (name, cond, info) => checks.push({ name, ok: !!cond, info });
const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-gpu'] });
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1100, height: 900 } }); const page = await ctx.newPage();
await page.goto(pathToFileURL(path.join(here, 'S2-评论核查.html')).href);
ok('四题答完前不能开始', await page.isDisabled('#go'));
for (const [k, v] of [['role', '硕士研究生'], ['field', '设计类'], ['seen', '没有'], ['repo', '没有']]) await page.selectOption('#q-' + k, v);
await page.click('#go');
ok('进入第 1 条', (await page.textContent('#progress')).startsWith('S001'));
const answerOne = async (n) => { await page.locator('#scope label').nth(n % 3).click(); await page.locator('#tags label').nth(n % 10).click(); };
for (let n = 0; n < 60; n++) { await answerOne(n); if (n < 149) await page.click('#next'); }
await page.reload();
ok('刷新后接着第 61 条', (await page.textContent('#progress')).startsWith('S061'), await page.textContent('#progress'));
ok('刷新后已完成 60 条', (await page.textContent('#progress')).includes('已完成 60 条'));
await page.click('#finish'); ok('没答完不能导出完整答卷', (await page.textContent('#msg')).includes('未答项'));
const [dl1] = await Promise.all([page.waitForEvent('download'), page.click('#draft')]); const draft = path.join(out, 'S2-草稿.json'); await dl1.saveAs(draft);
ok('草稿含 60 条', Object.keys(JSON.parse(fs.readFileSync(draft, 'utf8')).answers).length >= 60);
for (let n = 60; n < 150; n++) { await answerOne(n); if (n < 149) await page.click('#next'); }
await page.click('#missing'); ok('全部完成', (await page.textContent('#msg')).includes('全部已完成'));
const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#finish')]); const full = path.join(out, 'S2-完整答卷.json'); await dl2.saveAs(full);
const d = JSON.parse(fs.readFileSync(full, 'utf8'));
ok('完整答卷 150 条', Object.keys(d.answers).length === 150 && d.complete === true, Object.keys(d.answers).length);
ok('记下了作答者情况', d.respondent.role === '硕士研究生' && d.respondent.seen === '没有', d.respondent);
ok('记下了起止时间和逐条用时', d.started_at && d.finished_at && Object.values(d.answers).every((r) => typeof r.ms === 'number'), [d.started_at, d.finished_at]);
ok('版本号', d.version === 'S2-20261120-b', d.version);
// 另开一个干净的页面载入草稿
const p2 = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage(); await p2.goto(pathToFileURL(path.join(here, 'S2-评论核查.html')).href);
for (const [k, v] of [['role', '其他'], ['field', '其他'], ['seen', '没有'], ['repo', '没有']]) await p2.selectOption('#q-' + k, v);
await p2.click('#go'); await p2.setInputFiles('#load', draft);
await p2.waitForFunction(() => /已载入|载入失败/.test(document.getElementById('msg').textContent), null, { timeout: 5000 });
ok('载入草稿后定位到第一条未完成', (await p2.textContent('#progress')).startsWith('S061'), await p2.textContent('#progress'));
await page.screenshot({ path: path.join(out, 's2-form.png') });
await browser.close();
const failed = checks.filter((c) => !c.ok); console.log(JSON.stringify({ checks: checks.length, failed })); process.exit(failed.length ? 1 : 0);
