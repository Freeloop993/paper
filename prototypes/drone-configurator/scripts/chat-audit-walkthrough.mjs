// Browser regression for shared design conversations. Requests use the actual local lookup and a software response fixture.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createDesignService } from './design-chat.mjs';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const origin = process.argv[2];
if (!origin) throw new Error('Supply a local workspace URL.');
const service = await createDesignService();
const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome', headless:true, args:['--disable-gpu']});
try {
  const browserContext = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page = await browserContext.newPage(), packets = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let delayed = null, release = null, target = 95;
  await browserContext.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!url.protocol.startsWith('http')) return route.continue();
    if (url.origin !== new URL(origin).origin) {errors.push('external request');return route.abort();}
    if (!url.pathname.startsWith('/api/design/')) return route.continue();
    const body = request.postDataJSON();
    const evidence = service.evidence(body);
    if (url.pathname.endsWith('/evidence')) return route.fulfill({json:evidence});
    packets.push(body);
    const data = {...evidence, model:'fixture-model',effort:'fixture',requestId:'software-receipt',citedIds:[],
      answer:'软件夹具的机身宽度试调建议。',suggestion:{field:'bodyWidthMm',from:body.context.widthMm,to:target,reason:'比较轮廓比例。'}};
    if (delayed) {delayed();await new Promise(resolve => {release=resolve;});}
    return route.fulfill({json:data});
  });
  const boot = new URL(origin);boot.hash='step=studio&board=project&tab=fuselage';
  await page.goto(boot.href);
  const chat = page.getByTestId('design-chat').filter({visible:true});
  const width = page.locator('[data-field="fuselage.fuselage_dimensions_mm.width"] input[type=number]');
  const send = async question => {await chat.getByTestId('chat-input').fill(question);await chat.getByTestId('chat-send').click();};
  const draft = () => page.evaluate(() => JSON.parse(localStorage.getItem('multirotor-studio/draft-v1/quad')));
  await chat.getByTestId('chat-input').fill('装进小包有哪些依据？');
  await chat.getByTestId('chat-local').click();
  await chat.getByTestId('chat-local-result').waitFor();
  assert.equal(packets.length,0);
  assert.equal((await draft())?.designChatAudit?.length ?? 0,0);

  await width.fill('85');await width.blur();
  await send('第一轮，给机身试调宽度。');
  const first = chat.locator('article').filter({hasText:'第一轮'});
  await first.getByTestId('chat-preview').click();
  assert.equal(await width.inputValue(),'85');
  assert.equal(await page.locator('[data-layer=width-preview]').getAttribute('data-width-mm'),'95');
  await first.getByTestId('chat-apply').click();
  assert.equal(await width.inputValue(),'95');
  await page.getByTestId('last-change').getByRole('button',{name:'撤销'}).click();
  assert.equal(await width.inputValue(),'85');
  await first.getByText('已撤销此次采纳').waitFor();
  assert.deepEqual((await draft()).designChatAudit.map(e=>e.action),['answer','apply','undo']);

  const pending = new Promise(resolve=>{delayed=resolve;});
  await send('第二轮，比较另一种机身宽度。');await pending;
  await page.getByTestId('variant-add').click();
  assert.equal(await chat.locator('article').count(),0);
  release();delayed=null;
  await page.locator('[data-variant=A] button').first().click();
  const second = chat.locator('article').filter({hasText:'第二轮'});
  await second.getByTestId('chat-decline').click();
  await second.getByLabel('驳回理由').fill('保留作者已选机身比例');
  await second.getByRole('button',{name:'记录驳回'}).click();
  assert.equal(await width.inputValue(),'85');
  assert.equal((await draft()).designChatAudit.at(-1).action,'decline');

  await page.locator('[data-view=side]').click();
  await send('第三轮，侧视下试调宽度。');
  const third = chat.locator('article').filter({hasText:'第三轮'});
  await third.getByTestId('chat-preview').waitFor();
  assert.equal(packets.at(-1).history.length,0);
  await page.locator('[data-view=top]').click();
  assert.equal(await third.getByTestId('chat-apply').count(),0);
  await page.reload();
  await chat.getByText('已驳回 · 保留作者已选机身比例').waitFor();
  assert.equal(await chat.locator('article').count(),3);
  await page.getByRole('button',{name:'返回画布',exact:true}).click();
  await page.locator('.react-flow__node').filter({has:page.getByRole('heading',{name:'当前规格草稿',exact:true})}).click();
  await page.getByTestId('graph-chat-tab').click();
  assert.equal(await chat.locator('article').count(),3);
  await chat.getByText('已撤销此次采纳').waitFor();

  target=92;
  await send('第四轮，请试调不在步长上的值。');
  await chat.getByRole('alert').filter({hasText:'回复格式不完整'}).waitFor();
  assert.equal((await draft()).designChatAudit.at(-1).action,'error');
  target=100;
  await send('第五轮，再试一个宽度。');
  const fifth = chat.locator('article').filter({hasText:'第五轮'});
  await fifth.getByTestId('chat-apply').click();
  await page.goto(boot.href);
  await page.reload();
  assert.equal(await width.inputValue(),'100');
  await fifth.getByTestId('chat-undo').click();
  assert.equal(await width.inputValue(),'85');
  assert.equal((await draft()).designChatAudit.at(-1).action,'undo');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({localEvidenceOnly:true,sharedAcrossViews:true,scopedLateReply:true,manualValueAfterUndo:85,
    declinePersisted:true,staleApplyHidden:true,staleModelHistoryExcluded:true,invalidIncrementRejected:true,refreshRestored:true,undoAfterReload:true,realModelCalls:0}));
} finally {await browser.close();}
