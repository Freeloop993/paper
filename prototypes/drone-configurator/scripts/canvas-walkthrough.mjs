// 设计画布走查：在隔离的浏览器数据里，从空白项目把每一步都放到画布上做完。
// 目标（卡片上直接写）→ 依据卡上画布 → 造型（卡片里拖轴心）→ 生成 → 保留 → 以候选继续 → 参考图作输入 → 便签 → 新方向 → 研究记录 → B2 案例 → 手机宽度。
// 图像作业由软件夹具应答，证据检索用公开卡，不调用任何模型。运行前先执行 npm run build。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDesignService } from './design-chat.mjs';
import { createDesignServer } from './design-chat-server.mjs';
import { createImageJobs } from './image-jobs.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const capture = process.argv[2];
if (capture) await mkdir(capture, { recursive: true });
const jobDirectory = await mkdtemp(join(tmpdir(), 'canvas-walkthrough-'));
const sent = [];
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
const jobs = createImageJobs({ apiKey: 'fixture', directory: jobDirectory, fetchImpl: async (_url, init) => {
  const body = JSON.parse(init.body);
  sent.push({ prompt: body.prompt, images: body.images.length });
  return Response.json({ data: [{ b64_json: body.images[0].image_url.split(',')[1] }] }, { headers: { 'trace-id': 'software-fixture' } });
} });
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
  const card = id => page.locator(`[data-workflow-node="${id}"]`);
  const cards = kind => page.locator(`[data-step-kind="${kind}"]`);
  const action = id => page.locator(`[data-step-action="${id}"]`);
  const panel = page.getByTestId('step-panel');
  const mode = () => panel.getAttribute('data-panel-mode');
  const status = text => page.getByRole('status').filter({ hasText: text }).waitFor();
  // 选中卡片后画布可能平移；等它停稳再取坐标。
  async function settledBox(locator) {
    let last = await locator.boundingBox();
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(80);
      const next = await locator.boundingBox();
      if (Math.abs(next.x - last.x) < 0.5 && Math.abs(next.y - last.y) < 0.5) return next;
      last = next;
    }
    return last;
  }

  // 1. 一块画布：没有另外的页面，目标和造型已经是画布上的两张卡片。
  await page.goto(origin);
  await cards('goal').waitFor();
  assert.equal(await page.locator('nav.canvas-rail').count(), 0);
  assert.equal(await page.locator('[data-workflow-node]').count(), 2);
  assert.equal(await mode(), 'overview');
  await shot('01-空白项目.png');

  // 2. 目标直接在卡片上写；面板随之给出可参考的用户原话；一张证据卡放到画布上。
  const goal = page.getByTestId('goal-card-input');
  await goal.click();
  await goal.fill('折起来能放进小包');
  assert.equal(await mode(), 'goal');
  await page.locator('[data-testid=lookup-result][data-status=retrieve]').waitFor();
  assert.equal(await page.getByTestId('brief-input').inputValue(), '折起来能放进小包');
  await page.locator('[data-pin-card=E009]').first().click();
  await card('evidence-E009').waitFor();
  await page.getByTestId('accept-evidence').click();
  assert.equal(await page.getByTestId('confirmed-intent').textContent(), '折起来能放进小包');
  await cards('goal').getByText('已确认').waitFor();
  await shot('02-目标与依据.png');

  // 3. 造型在卡片里直接拖：轴心拖动改变轴距，右侧换成部件面板。
  await cards('design').locator('.cv-head').click();
  assert.equal(await mode(), 'design');
  const wheelbase = page.locator('[data-field="frame.wheelbase_mm"] input[type=number]');
  const before = Number(await wheelbase.inputValue());
  const hub = await settledBox(page.locator('[data-testid=top-view] [data-handle^="hub-"]').nth(1));
  await page.mouse.move(hub.x + hub.width / 2, hub.y + hub.height / 2);
  await page.mouse.down();
  await page.mouse.move(hub.x + hub.width / 2 + 34, hub.y + hub.height / 2 - 34, { steps: 6 });
  await page.mouse.up();
  const dragged = Number(await wheelbase.inputValue());
  assert.ok(dragged > before, `轴距 ${before} → ${dragged}`);
  await page.getByTestId('last-change').waitFor();
  await page.locator('[data-testid=top-view] [data-layer=body]').click();
  assert.equal(await page.locator('[data-tab][aria-selected=true]').getAttribute('data-tab'), 'fuselage');
  await shot('03-造型.png');

  // 4. 下一步出现在选中卡片的上方：生成步骤接在造型后面，在卡片上点「生成」。
  await action('generate').click();
  const waiting = page.locator('[data-step-kind=run].is-pending');
  await waiting.waitFor();
  assert.equal(await mode(), 'generate');
  await page.getByTestId('generation-goal').fill('让机鼻和相机的过渡更圆润');
  await page.getByTestId('generation-goal').blur();
  await shot('04-待生成.png');
  await page.getByTestId('canvas-run-step').click();
  await page.locator('[data-workflow-node^="candidate-"]').first().waitFor();
  assert.equal(await waiting.count(), 0);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].images, 1);
  assert.match(sent[0].prompt, /Design goal for this version: 让机鼻和相机的过渡更圆润/);
  await status('效果图已生成');
  assert.equal(await mode(), 'candidate');

  // 5. 候选图上取舍，并以它继续：新的生成步骤带着这张图。
  await action('keep').click();
  await page.locator('[data-workflow-node^="candidate-"]').first().getByText('已保留').waitFor();
  await page.locator('[data-kind=decision]').waitFor();
  await action('continue').click();
  await waiting.waitFor();
  const parent = await page.getByTestId('generation-parent').inputValue();
  assert.match(parent, /^candidate-/);
  await page.getByTestId('generate-current').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-workflow-node^="candidate-"]').length === 2);
  assert.equal(sent[1].images, 2);
  assert.match(sent[1].prompt, /Image 2 is the appearance parent to revise/);
  await shot('05-候选与继续.png');

  // 6. 参考图放到画布上，作为下一轮的输入（WebP 在浏览器里转成 PNG 再提交）。
  await page.getByLabel('导入参考图片').setInputFiles(fileURLToPath(new URL('../src/data/history/B2-no-window.webp', import.meta.url)));
  const reference = page.locator('[data-workflow-node^="reference-"]');
  await reference.waitFor();
  const referenceId = await reference.getAttribute('data-workflow-node');
  await reference.locator('img').evaluate(image => image.decode());
  await action('use').click();
  await waiting.waitFor();
  assert.equal(await page.getByTestId('generation-parent').inputValue(), referenceId);
  await page.getByTestId('generate-current').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-workflow-node^="candidate-"]').length === 3);
  assert.equal(sent[2].images, 2);
  assert.match(sent[2].prompt, /Image 2 is an appearance reference chosen by the designer/);
  await page.waitForFunction(id => !!document.querySelector(`.react-flow__edge[data-id^='["${id}","run-']`), referenceId);

  // 7. 便签随手写在画布上，刷新后仍在。
  await page.locator('[data-dock=note]').click();
  const sticky = page.getByLabel('便签内容');
  await sticky.fill('机鼻再收一点，和 B2 的下端相机对照');
  await sticky.blur();
  await page.waitForTimeout(300);
  await page.reload();
  await page.getByLabel('便签内容').waitFor();
  assert.equal(await page.getByLabel('便签内容').inputValue(), '机鼻再收一点，和 B2 的下端相机对照');
  assert.equal(await page.locator('[data-workflow-node^="candidate-"]').count(), 3);

  // 8. 另开一个方向：两个造型并排在画布上，点哪个编辑哪个。
  await page.locator('[data-dock=direction]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-step-kind=design]').length === 2);
  assert.equal(await page.locator('[data-testid=top-view]').count(), 1);
  assert.equal(await page.locator('[data-testid=top-view-static]').count(), 1);
  await page.locator('[data-frame="Wide X"]').click();
  const frames = await page.locator('[data-step-kind=design] .cv-tag:not(.is-plain)').allTextContents();
  assert.deepEqual([...frames].sort(), ['宽 X 型', '真 X 型']);
  await page.getByRole('button', { name: '适应全图' }).click();
  await page.locator('[data-step-kind=design]').filter({ has: page.locator('[data-testid=top-view-static]') }).locator('.cv-head').click();
  await page.waitForFunction(() => document.querySelector('[data-testid=studio]')?.dataset.frameName === '真 X 型');
  await shot('06-两个方向.png');

  // 9. 研究留档默认收起，需要时在同一块画布上展开；完整记录里能核对实发输入。
  assert.equal(await page.locator('.cv-card.is-research').count(), 0);
  await page.getByTestId('research-layer').click();
  await page.waitForFunction(() => document.querySelectorAll('.cv-card.is-research').length === 6);
  await page.getByTestId('research-layer').click();
  await page.getByTestId('open-research').click();
  await page.locator('[data-handoff-tab=candidates]').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export-attempt]').click()]);
  const record = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(record.parentId, referenceId);
  assert.equal(record.h3.traceId, 'software-fixture');
  assert.equal(record.candidates.length, 1);
  await page.locator('[data-step=canvas]').click();

  // 10. 历史案例用同一块画布呈现；图片可以引用到自己的项目。
  await page.locator('[data-board=history]').click();
  await page.locator('.react-flow__edge-path').first().waitFor({ state: 'attached' });
  assert.equal(await page.locator('[data-workflow-node]').count(), 6);
  await card('b2-original').click();
  await action('cite').click();
  await page.locator('[data-board-id=project]').waitFor();
  await page.getByTestId('graph-inspector').getByRole('heading', { name: 'B2 原始候选', exact: true }).waitFor();

  // 11. 手机宽度：面板在画布下方，页面不横向溢出。
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/#step=studio&tab=fuselage');
  await page.locator('[data-tab=fuselage][aria-selected=true]').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.ok(await page.evaluate(() => Math.max(...[...document.querySelectorAll('.canvas-topbar *')].map(e => e.getBoundingClientRect().right)) <= window.innerWidth));
  await shot('07-手机.png');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ canvasOnly: true, goalOnCard: true, evidencePinned: 'E009', hubDrag: [before, dragged], softwareRounds: sent.length,
    parentCandidate: true, referenceAsInput: true, stickyPersisted: true, directions: 2, researchNodes: 6, historyNodes: 6, mobileWidth: 390,
    realModelCalls: 0, errors }));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await rm(jobDirectory, { recursive: true, force: true });
}
