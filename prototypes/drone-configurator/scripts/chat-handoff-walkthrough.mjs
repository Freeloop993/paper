// Review the evidence -> designer decision -> saved version -> frozen round using isolated browser data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createImageJobs } from './image-jobs.mjs';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const origin = process.argv[2];
if (!origin || !['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Supply the local design server URL.');
const capture = process.argv[3];
if (capture) await mkdir(capture,{recursive:true});
const browser = await chromium.launch({channel:'chrome',args:['--disable-gpu']});
const jobDirectory=await mkdtemp(join(tmpdir(),'h3-handoff-'));
try {
  const ctx = await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true,reducedMotion:'reduce'});
  const page = await ctx.newPage();
  const errors = [];
  let simulatedReplies = 0, h3Id;
  const jobs = createImageJobs({apiKey:'fixture', directory:jobDirectory, fetchImpl:async (_url, init)=>{
    const body = JSON.parse(init.body);
    const guide = body.images[0].image_url;
    return Response.json({data:[{b64_json:guide.split(',')[1]}]}, {headers:{'trace-id':'software-control'}});
  }});
  page.on('pageerror', error => errors.push(error.message));
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && url.origin !== new URL(origin).origin) {
      errors.push('unexpected external origin'); return route.abort();
    }
    if (url.pathname === '/api/h3/jobs') {
      const body=route.request().postDataJSON();
      h3Id=body.attemptId;
      return route.fulfill({status:202,json:await jobs.submit(body)});
    }
    if (url.pathname.startsWith('/api/h3/jobs/')) return route.fulfill({json:await jobs.get(url.pathname.split('/').at(-1))});
    if (url.pathname !== '/api/design/chat') return route.continue();
    simulatedReplies++;
    const body=route.request().postDataJSON();
    assert.equal(body.context.widthMm,80);
    await route.fulfill({json:{answer:'软件对照：可预览 90 mm，轴位保持。',model:'software-control',effort:'fixture',
      requestId:'fixture-01',citedIds:[],sources:[],retrieval:{status:'abstain',reason:'没有直接支持所提尺寸的语料',sourceCount:0},
      suggestion:{field:'bodyWidthMm',from:80,to:90,reason:'来自本次设计者明确给定的尺寸'}}});
  });
  // 旧入口落在同一块画布上：insight 选中目标卡片，studio 选中造型卡片，handoff 打开研究详情与导出。
  const go = async step => {
    if (step === 'handoff') { await page.locator('[data-step=handoff]').click(); await page.locator('[data-handoff-tab=candidates]').click(); return; }
    await page.evaluate(next => { location.hash = 'step=' + next + '&board=project&v=' + Date.now(); }, step);
    await page.locator('[data-testid=step-panel][data-panel-mode=' + (step === 'insight' ? 'goal' : 'design') + ']').waitFor();
  };
  const chatTab = () => page.getByTestId('graph-chat-tab').click();
  const shot = name => capture ? page.screenshot({path:join(capture,name)}) : Promise.resolve();
  const button = name => page.getByRole('button',{name,exact:true});
  const text = page.getByTestId('chat-input');
  const width = page.locator('[data-field="fuselage.fuselage_dimensions_mm.width"] input[type=number]');
  async function readExport(selector) {
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);
    return JSON.parse(await readFile(await download.path(),'utf8'));
  }
  await page.goto(origin+'/#step=studio&tab=fuselage');
  await chatTab();
  await text.fill('折叠后装进小包，有哪些原句可以参考？');
  await page.getByTestId('chat-local').click();
  const local=page.getByTestId('chat-local-result');
  if(!await local.locator('details').evaluate(el=>el.open)) await local.locator('summary').click();
  assert.match(await local.textContent(),/E009/); assert.match(await local.textContent(),/E008/);
  assert.equal(simulatedReplies,0);
  await shot('工作台-桌面-本地依据.png');
  await text.fill('将展开顶视的机身宽度从 80 mm 试调至 90 mm');
  await page.getByTestId('chat-send').click();
  await page.getByTestId('chat-preview').click();
  assert.equal(await width.inputValue(),'80');
  await page.getByTestId('chat-apply').click();
  assert.equal(await width.inputValue(),'90');
  await page.getByTestId('top-undo').click();
  assert.equal(await width.inputValue(),'80');
  await page.locator('[data-step-action=version]').click();
  await page.getByLabel('版本名称').fill('软件验收 · 保留撤销');
  await button('保存版本').click();
  const inspector=page.getByTestId('graph-inspector');
  await page.locator('.react-flow__node').filter({has:page.getByRole('heading',{name:'软件验收 · 保留撤销',exact:true})}).click();
  await inspector.getByRole('heading',{name:'软件验收 · 保留撤销',exact:true}).waitFor();
  await button('从此版本继续编辑').click();
  await page.locator('[data-testid=step-panel][data-panel-mode=design]').waitFor();
  await go('handoff');
  await page.locator('[data-attempt-goal]').fill('软件验收 · 冻结记录');
  await page.locator('[data-freeze-attempt]').click();
  await page.getByTestId('frozen-design-chat').locator('summary').click();
  const frozen=await readExport('[data-export-attempt]');
  const events=frozen.config.design_chat_audit;
  assert.deepEqual(events.map(e=>e.action),['answer','apply','undo']);
  assert.deepEqual(events,frozen.snapshot.designChatAudit);
  assert.equal(new Set(events.map(e=>e.turnId)).size,1);
  assert.deepEqual(events.slice(1).map(({from,to})=>[from,to]),[[80,90],[90,80]]);
  assert.equal(frozen.config.parameters.fuselage.fuselage_dimensions_mm.width,80);
  assert.equal(frozen.candidates.length,0); assert.equal(frozen.dispatch,null);
  assert.ok(frozen.workflowOrigin.id);
  await page.reload(); await page.locator('[data-handoff-tab=candidates]').click();
  assert.deepEqual((await readExport('[data-export-attempt]')).config.design_chat_audit,events);
  // 在画布上加一个生成步骤并提交；回图作为候选卡片接在后面。
  await page.locator('[data-step=canvas]').click();
  await page.locator('[data-dock=generate]').click();
  await page.getByTestId('generation-goal').fill('软件对照 · 核对设计决定与 H3 回图');
  await page.getByTestId('generate-current').click();
  await page.locator('[data-workflow-node^="candidate-"]').waitFor();
  await go('handoff');
  await page.locator('[data-attempt]').selectOption(h3Id);
  const rendered=await readExport('[data-export-attempt]');
  assert.deepEqual(rendered.config.design_chat_audit,events);
  assert.equal(rendered.h3.traceId,'software-control');
  assert.equal(rendered.candidates.length,1);
  assert.equal(rendered.receipt,null);
  assert.equal(rendered.variantScope,'quad/A');
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/#step=studio&tab=fuselage&v=mobile');
  await page.locator('[data-tab=fuselage][aria-selected=true]').waitFor();
  await chatTab();
  await text.fill('折叠后装进小包，有哪些原句可以参考？');
  await page.getByTestId('chat-local').click(); await local.waitFor();
  await local.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await shot('工作台-手机-本地依据.png');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({localEvidence:['E009','E008'],softwareReplies:simulatedReplies,realModelCalls:0,
    softwareH3RoundWithAudit:true,savedAndRestoredVersion:true,frozenEvents:events.map(e=>e.action),reopened:true,mobileWidth:390,errors}));
} finally { await browser.close(); await rm(jobDirectory,{recursive:true,force:true}); }
