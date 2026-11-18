import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const origin = process.argv[2];
if (!origin) throw new Error('Supply the local workspace URL.');
const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true});
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && (url.origin !== new URL(origin).origin || url.pathname.startsWith('/api/'))) {
      errors.push('Unexpected network request: ' + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  const card = title => page.locator('.react-flow__node').filter({has: page.getByRole('heading', {name: title, exact: true})});
  const button = name => page.getByRole('button', {name, exact: true});
  const inspector = page.getByTestId('graph-inspector');
  const width = page.locator('[data-field="fuselage.fuselage_dimensions_mm.width"] input[type="number"]');
  const fit = () => button('适应全图').click();
  async function saveVersion(title) {
    await page.locator('.canvas-tools-menu summary').click();
    await button('保存草稿版本').click();
    await page.getByLabel('版本名称').fill(title);
    await button('保存版本').click();
    await inspector.getByRole('heading', {name: title, exact: true}).waitFor();
  }
  async function returnToBoard() {
    await button('返回画布').click();
    await page.getByTestId('workflow-graph').waitFor();
  }
  await page.goto(origin);
  await page.locator('[data-board="history"]').click();
  await page.locator('.react-flow__edge-path').first().waitFor({state: 'attached'});
  assert.equal(await page.locator('.react-flow__node').count(), 6);
  assert.equal(await page.locator('.react-flow__edge-path').count(), 6);
  await button('图片对照').click();
  assert.equal(await page.getByLabel('选择左图').inputValue(), 'b2-upper');
  assert.equal(await page.getByLabel('选择右图').inputValue(), 'b2-lower');
  await page.getByRole('dialog').locator('img').first().evaluate(image => image.decode());
  await button('关闭图片对照').click();
  await card('B2 原始候选').click();
  await button('引用到我的项目').click();
  await page.locator('[data-board-id="project"]').waitFor();
  await inspector.getByRole('heading', {name: 'B2 原始候选', exact: true}).waitFor();
  assert.equal(await page.getByTestId('workflow-workspace').getAttribute('data-board-id'), 'project');

  const imagePath = fileURLToPath(new URL('../src/data/history/B2-no-window.webp', import.meta.url));
  await page.getByLabel('导入参考图片').setInputFiles(imagePath);
  await inspector.getByRole('heading', {name: 'B2-no-window.webp', exact: true}).waitFor();
  await page.locator('.canvas-tools-menu summary').click();
  await button('连接参考').click();
  await fit();
  await card('当前规格草稿').click();
  await page.getByRole('status').filter({hasText: '已添加参考关系'}).waitFor();
  assert.equal(await page.locator('.gb-wire-label', {hasText: '手动引用'}).count(), 1);
  await saveVersion('原始宽度');
  await page.locator('nav [data-step="studio"]').click();
  await page.locator('[data-tab="fuselage"]').click();
  const initialWidth = Number(await width.inputValue());
  const changedWidth = initialWidth < 195 ? initialWidth + 10 : initialWidth - 10;
  await width.fill(String(changedWidth));
  await width.blur();
  await returnToBoard();
  await saveVersion('改宽机身');
  await page.reload();
  await card('改宽机身').waitFor({state: 'attached'});
  await fit();
  await card('原始宽度').click();
  await inspector.getByText('改宽机身', {exact: true}).waitFor();
  await button('从此版本继续编辑').click();
  await page.locator('[data-tab="fuselage"]').click();
  assert.equal(Number(await width.inputValue()), initialWidth);
  await returnToBoard();
  assert.equal(await card('改宽机身').count(), 1);
  await page.locator('.graph-status-bar').getByRole('button', {name: '查看生成记录'}).click();
  await page.locator('[data-testid="handoff-advanced"] > summary').click();
  await page.locator('[data-attempt-goal]').fill('软件检查 · 从原始宽度冻结');
  await page.locator('[data-freeze-attempt]').click();
  await page.locator('[data-attempt] option').first().waitFor({state: 'attached'});
  await returnToBoard();
  await card('软件检查 · 从原始宽度冻结').waitFor({state: 'attached'});
  assert.equal(await page.locator('.gb-wire-label', {hasText: '沿用分支编辑'}).count(), 1);
  assert.equal(await page.locator('.gb-wire-label', {hasText: '手动引用'}).count(), 1);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({historyNodes: 6, historicalComparison: true, projectImageImport: true,
    referencePersisted: true, restoredWidth: initialWidth, preservedWidthVersion: changedWidth, frozeFromRestoredVersion: true, modelCalls: 0}));
} finally {
  await browser.close();
}
