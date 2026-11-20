// 编码页面的软件走查：两个模拟的编码者各答完 40 条，检查必答、刷新后续做、各人顺序不同、导出，
// 再把两份回件交给 score_s6.py，核对算出的一致条数与模拟答案相符。
// 用法：node qa.mjs <输出目录>。这里产生的文件只用于检查软件，不是编码数据。
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url'; import { execFileSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '../../..');
const require = createRequire(path.join(root, 'prototypes/drone-configurator/package.json'));
const { chromium } = require('playwright-core');
const out = path.resolve(process.argv[2]); fs.mkdirSync(out, { recursive: true });
const cards = JSON.parse(fs.readFileSync(path.join(here, 'b-to-card.json'), 'utf8'));
const checks = [], ok = (name, cond, info) => checks.push({ name, ok: !!cond, info });
const url = pathToFileURL(path.join(here, '词对编码.html')).href, CODES = ['L', 'R', 'U', 'N'], KEYS = ['span', 'plain', 'whole', 'color'];
const html = fs.readFileSync(path.join(here, '词对编码.html'), 'utf8');
ok('页面里没有证据卡号和干扰项标记', !/E0\d\d|distractor|干扰/.test(html));
ok('页面里的手册含六条规则和六个例子', html.includes('六条规则') && html.includes('六个例子') && html.includes('荧光绿太扎眼了'));
// 模拟答案：由条目编号和编码者决定。乙在编号能被 4 整除的条目上把“紧凑—舒展”换成下一个答案，其余与甲相同。
const num = (id) => +id.slice(1);
const plan = (who, id) => { const n = num(id), a = { span: CODES[n % 4], plain: CODES[(n + 1) % 4], whole: 'N', color: CODES[(n * 3) % 4] }; if (who === 'B' && n % 4 === 0) a.span = CODES[(n + 1) % 4]; return a; };
const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-gpu'] }); const files = {}, orders = {}; const requests = [];
for (const who of ['A', 'B']) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true }), page = await ctx.newPage();
  page.on('request', (q) => { if (!/^(file|data|blob):/.test(q.url())) requests.push(q.url()); });
  await page.goto(url);
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('s6-recode-')))));
  const pick = (g, k, v) => page.click('button.opt[data-g="' + g + '"][data-k="' + k + '"][data-v="' + v + '"]');
  if (who === 'A') { ok('开始按钮在答完五题前不可点', await page.isDisabled('#go')); await page.screenshot({ path: path.join(out, 's6-intro.png'), fullPage: true }); }
  for (const [q, v] of [['q1', '硕士研究生'], ['q2', '设计类'], ['q3', '没有'], ['q4', '没有'], ['q5', '没有']]) await page.selectOption('#' + q, v);
  await page.click('#go'); const s0 = await state(); orders[who] = s0.order;
  if (who === 'A') {
    ok('顺序是 40 条的一个排列', s0.order.length === 40 && new Set(s0.order).size === 40 && s0.order.every((i) => cards[i]));
    ok('“下一条”起初不可点', await page.isDisabled('#next'));
    for (const k of KEYS) await pick('pair', k, 'N');
    ok('四个方面都选“没谈到”后可以进下一条', !(await page.isDisabled('#next')));
    await pick('pair', 'span', 'L'); const s1 = (await state()).answers[s0.order[0]];
    ok('改选以后记下的是新答案，一个方面只留一个答案', s1.span === 'L' && await page.locator('button.opt.on[data-k="span"]').count() === 1);
    ok('页面只问四个方面，没有别的问题', await page.locator('button.opt').count() === 16);
    await page.fill('#note', '走查备注'); await page.screenshot({ path: path.join(out, 's6-item.png'), fullPage: true });
    await page.click('#tog'); ok('做题时能打开编码手册', await page.locator('#book').isVisible()); await page.click('#tog');
    await page.reload(); ok('刷新后停在同一条、答案和备注还在', (await page.textContent('.mute')).startsWith('第 1 条') && (await state()).answers[s0.order[0]].note === '走查备注' && await page.inputValue('#note') === '走查备注');
  }
  for (let n = 0; n < 40; n++) { const id = (await state()).order[n], a = plan(who, id);
    for (const k of KEYS) await pick('pair', k, a[k]);
    await page.click('#next'); }
  if (who === 'A') { ok('40 条答完后进入结束页', (await page.textContent('h1')).includes('全部答完了')); await page.screenshot({ path: path.join(out, 's6-finish.png') }); }
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]); files[who] = path.join(out, 'coder-' + who + '.json'); await dl.saveAs(files[who]);
  const got = JSON.parse(fs.readFileSync(files[who], 'utf8'));
  ok('编码者' + who + '：导出的答案与点下去的一致', Object.keys(got.answers).length === 40 && Object.keys(got.answers).every((id) => KEYS.every((k) => got.answers[id][k] === plan(who, id)[k])));
  if (who === 'A') { ok('导出文件带上作答者自报、顺序、种子和每条用时', got.respondent.seen === '没有' && got.order.length === 40 && Number.isInteger(got.seed) && got.finished_at && Object.values(got.answers).every((v) => v.ms > 0));
    const code = await page.inputValue('#code'); fs.writeFileSync(path.join(out, 'coder-A-pasted.txt'), code);
    ok('粘贴用的那段文字解出来与文件内容相同', JSON.stringify(JSON.parse(Buffer.from(code.slice(5), 'base64').toString('utf8')).answers) === JSON.stringify(got.answers)); }
  await ctx.close();
}
await browser.close();
ok('两位编码者看到的顺序不同', JSON.stringify(orders.A) !== JSON.stringify(orders.B));
ok('页面没有发出任何网络请求', requests.length === 0, requests.slice(0, 3));
const src = Object.keys(cards).filter((i) => cards[i] !== 'distractor'), expect = src.filter((i) => plan('A', i).span === plan('B', i).span).length;
let md = ''; try { md = execFileSync('python3', [path.join(here, 'score_s6.py'), path.join(out, 'coder-A-pasted.txt'), files.B], { encoding: 'utf8' }); fs.writeFileSync(path.join(out, 's6-result-qa.md'), md); } catch (e) { md = String(e.stdout || '') + String(e.stderr || e); }
const first = (name) => { const m = md.split('### ' + name)[1] || ''; const x = m.match(/四类：一致 (\d+)\/35；κ = ([\d.-]+)/); return x ? [+x[1], +x[2]] : null; };
ok('评分脚本算出的“紧凑—舒展”一致条数与模拟答案相符', first('紧凑—舒展') && first('紧凑—舒展')[0] === expect, { got: first('紧凑—舒展'), expect });
ok('两人答案相同的方面一致 35/35、κ 为 1', first('简洁—繁复') && first('简洁—繁复')[0] === 35 && first('简洁—繁复')[1] === 1);
ok('评分页含混淆矩阵、干扰句、与第一编码的对照和分歧清单', ['甲 ＼ 乙', '5 条干扰句', '与第一编码的对照', '两人判得不一样的条目'].every((t) => md.includes(t)));
let refused = false; try { execFileSync('python3', [path.join(here, 'score_s6.py'), files.A, files.A], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { refused = /同一个人/.test(String(e.stderr)); }
ok('同一个人的两份回件被拒收', refused);
for (const c of checks) console.log((c.ok ? 'ok   ' : 'FAIL ') + c.name + (c.ok || c.info === undefined ? '' : ' :: ' + JSON.stringify(c.info)));
console.log(checks.filter((c) => c.ok).length + '/' + checks.length + ' 项通过'); process.exit(checks.every((c) => c.ok) ? 0 : 1);
