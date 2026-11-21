// 两种方式的走查：同一块画布、同一个 Qwen 后端（软件夹具冒充 ComfyUI），先做一场自由提示，再做一场结构化，核对
// （1）起始值取自真实产品，登记的实验条件要另行载入；（2）自由提示发出去的只有设计者的原文；
// （3）两种方式的生成设置逐项相同，原始请求、回执、历史都存了盘；（4）一场只用一种方式时，另一种方式的卡片不出现。
// 图像作业由软件夹具应答，不调用任何模型。运行前先执行 npm run build。可加一个目录参数保存截图。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDesignService } from './design-chat.mjs';
import { createDesignServer } from './design-chat-server.mjs';
import { createImageJobs } from './image-jobs.mjs';
import { tagPNGFront as tagPNG } from './fixture-png.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const capture = process.argv[2];
if (capture) await mkdir(capture, { recursive: true });
// 第二个参数：把三轮的作业文件和结构化那一轮导出的三件套留在这个目录里，供主持人的登记工具试收。
const keep = process.argv[3];
if (keep) await mkdir(join(keep, 'exports'), { recursive: true });
const jobDirectory = await mkdtemp(join(tmpdir(), 'methods-walkthrough-'));
const plain = await readFile(new URL('../src/data/history/quad-guide.png', import.meta.url));
const historyOf = (id, graph) => ({ [id]: { prompt: [1, id, graph, { client_id: 'fixture' }, ['12']],
  outputs: { 12: { images: [{ filename: graph['12'].inputs.filename_prefix + '_00001_.png', subfolder: '', type: 'output' }] } },
  status: { status_str: 'success', completed: true, messages: [['execution_start', { prompt_id: id, timestamp: Date.now() - 20 }], ['execution_success', { prompt_id: id, timestamp: Date.now() }]] } } });
const uploads = new Map(), graphs = [], runs = new Map(); let output = null;
const comfy = async (url, init = {}) => {
  const { pathname } = new URL(url);
  if (pathname === '/upload/image') { const file = init.body.get('image'); uploads.set(file.name, Buffer.from(await file.arrayBuffer())); return Response.json({ name: file.name, subfolder: '', type: 'input' }); }
  if (pathname === '/prompt') { const graph = JSON.parse(init.body).prompt; graphs.push(graph); output = tagPNG(graph['15'] ? uploads.get(graph['15'].inputs.image) : plain, graph); runs.set('fixture-' + graphs.length, graph); return Response.json({ prompt_id: 'fixture-' + graphs.length, node_errors: {} }); }
  if (pathname.startsWith('/history/')) { const id = decodeURIComponent(pathname.slice(9)); return Response.json(historyOf(id, runs.get(id))); }
  if (pathname === '/view') return new Response(output, { headers: { 'Content-Type': 'image/png' } });
  return new Response('not found', { status: 404 });
};
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
const jobs = createImageJobs({ backend: { provider: 'qwen-comfy', url: 'http://comfy.fixture', pollMs: 30 }, fetchImpl: comfy, directory: jobDirectory });
const server = createDesignServer(chat, evidence, jobs);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--disable-gpu'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && url.origin !== origin) { errors.push('unexpected external request ' + url.origin); return route.abort(); }
    return route.continue();
  });
  const shot = name => capture ? page.screenshot({ path: join(capture, name) }) : Promise.resolve();
  const cards = kind => page.locator(`[data-step-kind="${kind}"]`);
  const dock = () => page.locator('[data-dock]').evaluateAll(items => items.map(item => item.dataset.dock));
  const blank = async () => { await page.keyboard.press('Escape'); await page.locator('.react-flow__pane').click({ position: { x: 40, y: 120 } }); await page.getByTestId('canvas-overview').waitFor(); };
  const setup = async () => { await blank(); const box = page.getByTestId('session-setup'); if (!await box.evaluate(d => d.open)) await box.locator('summary').click(); return box; };
  const attempts = () => page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const q = indexedDB.open('multirotor-studio-design-records-v1'); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); });
    const rows = await new Promise(resolve => { const q = db.transaction('attempts').objectStore('attempts').getAll(); q.onsuccess = () => resolve(q.result); });
    db.close();
    return Promise.all(rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(async a => ({
      id: a.id, condition: a.condition, text: a.confirmedText, status: a.h3?.status, model: a.h3?.model, candidates: a.candidates.length, parent: !!a.parentImage,
      request: (await (await fetch('/api/h3/jobs/' + a.id)).json()).evidence.request })));
  });
  const done = n => page.waitForFunction(count => document.querySelectorAll('[data-step-kind=picture], .cv-card.is-picture, [data-kind=image]').length >= count, n);

  // 1. 起始值取自真实产品；它不是登记的实验条件
  await page.goto(origin);
  await cards('goal').waitFor();
  await cards('design').locator('.cv-head').first().click();
  const stats = await cards('design').locator('.cv-stats b').allTextContents();
  assert.deepEqual(stats, ['1.35', '0.51', '0.22']);
  assert.equal(await cards('design').locator('.cv-tag:not(.is-plain)').first().textContent(), '宽 X 型');
  let box = await setup();
  const condition = box.locator('[data-condition=c2-pilot]');
  assert.equal(await condition.getAttribute('data-met'), 'no');
  await shot('01-起始值与场次设置.png');
  await box.getByTestId('load-condition').click();
  await page.waitForFunction(() => document.querySelector('[data-condition=c2-pilot]')?.dataset.met === 'yes');
  assert.deepEqual(await cards('design').locator('.cv-stats b').allTextContents(), ['1.00', '0.51', '0.22']);

  // 2. 自由提示场次：目标、造型、设计对话都收起，只剩自由提示
  await box.locator('[data-session-method=free]').click();
  await page.waitForFunction(() => !document.querySelector('[data-step-kind=goal]') && !document.querySelector('[data-step-kind=design]'));
  assert.deepEqual(await dock(), ['image', 'note', 'free']);
  assert.equal(await page.locator('[data-panel-tab=chat]').count(), 0);
  await page.getByTestId('canvas-free').click();
  const panel = page.getByTestId('free-panel');
  await panel.waitFor();
  assert.equal(await panel.getByTestId('generate-current').isDisabled(), true);
  assert.match(await panel.getByTestId('generation-model').textContent(), /Qwen-Image 2\.1/);
  const words = '一架日常携带的四旋翼无人机，正上方俯视，机身显得紧凑。\n前向相机与机鼻衔接协调，四处臂根保持连接。';
  await panel.getByTestId('free-text').fill(words);
  await shot('02-自由提示.png');
  await panel.getByTestId('generate-current').click();
  await page.getByTestId('candidate-panel').waitFor({ timeout: 20000 });
  await shot('03-自由提示回图.png');
  // 以这张回图继续：仍是自由提示，带上这一张图，不带布局条件图
  await page.locator('[data-generate-from]').click();
  await panel.waitFor();
  assert.notEqual(await panel.getByTestId('generation-parent').inputValue(), '');
  await panel.getByTestId('free-text').fill('机身再窄一些');
  await panel.getByTestId('generate-current').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=candidate-panel]').length === 1 && document.querySelectorAll('.cv-card[data-kind=image]').length === 2, null, { timeout: 20000 });

  // 3. 结构化场次：自由提示的卡片不出现；照登记条件生成一轮
  box = await setup();
  await box.locator('[data-session-method=structured]').click();
  await cards('design').waitFor();
  assert.equal(await page.locator('.cv-card[data-kind=image]').count(), 0);
  assert.deepEqual(await dock(), ['goal', 'image', 'note', 'direction', 'generate']);
  await page.getByTestId('canvas-generate').click();
  // 面板上显示的文字，就是这一轮要发出去的全文
  const shown = await page.getByTestId('generate-panel').getByTestId('generation-text').evaluate(node => node.textContent);
  await page.getByTestId('generate-panel').getByTestId('generate-current').click();
  await page.getByTestId('candidate-panel').waitFor({ timeout: 20000 });
  await shot('04-结构化回图.png');
  if (keep) {
    // 导出这一轮所用规格的三件套：规格 JSON、提示词 TXT、条件图 PNG
    await page.getByTestId('open-research').click();
    const saved = [];
    page.on('download', download => saved.push(download.saveAs(join(keep, 'exports', download.suggestedFilename()))));
    await page.getByTestId('export-all').click();
    for (let i = 0; i < 50 && saved.length < 3; i++) await page.waitForTimeout(100);
    await Promise.all(saved);
    assert.equal(saved.length, 3);
    await page.locator('[data-step=canvas]').click();
  }

  // 4. 记录：三轮都在；两种方式的生成设置逐项相同，差别只在文字和图
  const rows = await attempts();
  assert.deepEqual(rows.map(r => [r.condition, r.status, r.model, r.candidates]), [['free', 'succeeded', 'Qwen-Image-2.1', 1], ['free', 'succeeded', 'Qwen-Image-2.1', 1], ['structured', 'succeeded', 'Qwen-Image-2.1', 1]]);
  const [first, second, third] = rows;
  assert.equal(first.text, words);
  assert.equal(first.request.prompt, words);
  assert.deepEqual(first.request.images, []);
  assert.deepEqual(second.request.images.map(i => i.role), ['parent']);
  assert.deepEqual(third.request.images.map(i => i.role), ['layout']);
  assert.match(third.request.prompt, /W\/L 1\.00/);
  assert.equal(third.request.prompt, shown);
  assert.equal(await readFile(join(jobDirectory, third.id + '.prompt.txt'), 'utf8'), shown);
  const settings = ({ prompt, images, seed, condition, ...rest }) => { void prompt; void images; void seed; void condition; return rest; };
  assert.deepEqual(settings(first.request), settings(third.request));
  assert.deepEqual(settings(second.request), settings(third.request));
  assert.equal(new Set(rows.map(r => r.request.seed)).size, 3);
  // 发给后端的工作流：不带图的那一轮没有 LoadImage；采样节点除种子外相同
  assert.equal(graphs.length, 3);
  assert.equal(graphs[0]['15'], undefined);
  assert.equal(graphs[0]['4'].inputs.prompt, words);
  const sampler = g => { const { seed, ...rest } = g['10'].inputs; void seed; return rest; };
  assert.deepEqual(sampler(graphs[0]), sampler(graphs[2]));
  // 每一轮的原始请求、入队回执、运行历史和回图都存了盘，文件名带轮次编号
  const files = await readdir(jobDirectory);
  for (const row of rows) for (const suffix of ['.json', '.prompt.txt', '.comfy-request.json', '.comfy-ack.json', '.comfy-history.json'])
    assert.ok(files.includes(row.id + suffix), '缺少 ' + suffix);
  assert.equal(files.filter(name => name.startsWith('QWEN-')).length, 3);
  for (const row of rows) assert.ok(files.includes('studio-' + row.id + '_00001_.png'), '缺少按后端原名保存的回图');
  assert.equal(await readFile(join(jobDirectory, first.id + '.prompt.txt'), 'utf8'), words);
  if (keep) {
    await cp(jobDirectory, join(keep, 'jobs'), { recursive: true });
    await writeFile(join(keep, 'rounds.json'), JSON.stringify(rows.map(r => ({ id: r.id, condition: r.condition, parent: r.parent })), null, 1));
  }

  // 5. 回到「不限」：三轮都在画布上
  box = await setup();
  await box.locator('[data-session-method=open]').click();
  await page.waitForFunction(() => document.querySelectorAll('.cv-card[data-kind=image]').length === 3);
  await shot('05-两种方式都在.png');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ startFromRealProducts: true, pilotConditionLoaded: true, freeRounds: 2, structuredRounds: 1, sameSettings: true,
    rawReceiptsSaved: files.length, realModelCalls: 0, errors }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await rm(jobDirectory, { recursive: true, force: true });
}
