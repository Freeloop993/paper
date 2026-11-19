// Exercise the existing design workspace in an isolated browser profile. No generation service is contacted.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_CORE||'playwright-core');
const origin=process.argv[2];
if(!origin)throw new Error('Supply the local workspace URL.');
const hash=v=>createHash('sha256').update(v).digest('hex');
const file=(name,x)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(x))});
import { tagPNG } from './fixture-png.mjs';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
try{
 const ctx=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}}),page=await ctx.newPage();
 let external=0;
 await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(u.protocol.startsWith('http')&&u.origin!==new URL(origin).origin){external++;return route.abort();}return route.continue();});
  // 旧入口落在同一块画布上：insight 选中目标卡片，studio 选中造型卡片，handoff 打开研究详情与导出。
  const go = async step => {
    if (step === 'handoff') { await page.locator('[data-step=handoff]').click(); await page.locator('[data-handoff-tab=candidates]').click(); return; }
    await page.evaluate(next => { location.hash = 'step=' + next + '&board=project&v=' + Date.now(); }, step);
    await page.locator('[data-testid=step-panel][data-panel-mode=' + (step === 'insight' ? 'goal' : 'design') + ']').waitFor();
  };
 async function open(){
  await page.goto(origin);await go('handoff');
 }
 async function exportSelected(){
   const download=page.waitForEvent('download');await page.locator('[data-export-attempt]').click();
   return JSON.parse(await readFile(await (await download).path(),'utf8'));
 }
 await open();
 await go('studio');
 await page.getByTestId('variant-add').click();
 await go('handoff');
 for(const key of ['quad','hex']){
   await page.locator('[data-history-case="'+key+'"]').click();const region=page.locator('[data-testid="history-replay"]');
   assert.ok(await region.locator('img').first().evaluate(async im=>{await im.decode();return im.naturalWidth>0;}));
   assert.ok((await region.textContent()).includes(key==='quad'?'倾向下端安装':'未登记'));
 }
 await page.locator('[data-attempt-goal]').fill('软件机制检查 · 无真实参与者');
 await page.locator('[data-freeze-attempt]').click();const frozen=await exportSelected();
 assert.equal(frozen.candidates.length,0);assert.equal(frozen.dispatch,null);
 const dispatch=page.getByTestId('model-dispatch');
 await dispatch.locator('summary').click();
 const exportedRequest=page.waitForEvent('download');
 await dispatch.getByTestId('model-request-download').click();
 const graph=JSON.parse(await readFile(await (await exportedRequest).path(),'utf8')).prompt;
 // A marked software sample uses the already generated local guide pixels to exercise PNG import and decisions.
 const image=Buffer.from(frozen.originals[frozen.guide.sha256].data.split(',')[1],'base64');
 const runId='SOFTWARE-CONTROL-'+frozen.id;
 function docs(graph){
   const embedded=structuredClone(graph);embedded['15'].is_changed=[frozen.guide.sha256];
   const png=tagPNG(image,embedded);
   return {request:file('request.json',{prompt:graph}),ack:file('ack.json',{prompt_id:runId,node_errors:{}}),
    history:file('history.json',{[runId]:{prompt:[1,runId,graph],status:{status_str:'success',completed:true},outputs:{'12':{images:[{filename:'software.png',type:'output'}]}}}}),
    outputs:{name:'software.png',mimeType:'image/png',buffer:png}};
 }
 await page.getByText('导入外部回执',{exact:true}).click();
 async function load(d){for(const [key,obj] of Object.entries(d)) await page.locator('[data-receipt-file="'+key+'"]').setInputFiles(obj);await page.locator('[data-attach-receipt]').click();}
 const wrong=structuredClone(graph);wrong['4'].inputs.prompt+=' changed';await load(docs(wrong));await page.getByText('实发提示词与本轮确认文本不一致。').waitFor();
 const disconnected=structuredClone(graph);delete disconnected['4'].inputs['images.image_1'];await load(docs(disconnected));await page.getByText('正向编码器实际接收的图像数量不符。').waitFor();
 const disconnectedOutput=structuredClone(graph);delete disconnectedOutput['12'].inputs.images;
 await load(docs(disconnectedOutput));await page.getByText('候选输出与本轮已核对的采样、解码链不一致。').waitFor();
 const otherCondition=structuredClone(graph);otherCondition['10'].inputs.positive=['4',1];
 await load(docs(otherCondition));await page.getByText('返回候选的采样器没有使用本轮已确认的文本与图像编码。').waitFor();
 const otherSink=structuredClone(graph);otherSink['13']=structuredClone(graph['12']);otherSink['12'].inputs.filename_prefix='other-output';
 await load(docs(otherSink));await page.getByText('回图来自未登记为本轮候选的输出节点。').waitFor();
 const d=docs(graph);await load(d);await page.locator('[data-show-candidate]').waitFor();await page.locator('[data-show-candidate]').click();
 const sel=page.locator('[data-decision-candidate]');await sel.locator('option').nth(1).waitFor({state:'attached'});await sel.selectOption({index:1});
 for(const kind of ['accept','reject','restore']){
   await page.locator('[data-decision-kind]').selectOption(kind);await page.locator('[data-decision-reason]').fill('software-check-'+kind);
   await page.locator('[data-save-decision]').click();await page.locator('ol').getByText('software-check-'+kind,{exact:false}).waitFor();
 }
 await open();const kept=await exportSelected();
 assert.equal(kept.id,frozen.id);assert.equal(kept.candidates.length,1);assert.equal(kept.receipt.runId,runId);assert.ok(kept.candidates[0].firstShown);
 assert.deepEqual(kept.decisions.map(d=>d.kind),['accept','reject','restore']);
 assert.equal(hash(d.outputs.buffer),kept.candidates[0].hash);
 assert.equal(Buffer.compare(d.outputs.buffer,Buffer.from(kept.originals[kept.candidates[0].hash].data.split(',')[1],'base64')),0);
 await sel.selectOption({index:1});await page.locator('[data-continue-candidate]').click();
 await go('studio');await go('handoff');
 await page.locator('[data-attempt-goal]').fill('软件检查 · 保留父图再修订');await page.locator('[data-freeze-attempt]').click();
 await page.waitForFunction(prior=>document.querySelector('[data-attempt]')?.value!==prior,kept.id);
 const child=await exportSelected();assert.equal(child.parentId,kept.candidates[0].id);assert.equal(child.parentImage.sha256,kept.candidates[0].hash);
 const swapped=structuredClone(graph);swapped['12'].inputs.filename_prefix='studio-'+child.id;
 swapped['15'].inputs.image='studio-'+child.parentImage.sha256+'.png';
 swapped['16']={class_type:'LoadImage',inputs:{image:'studio-'+child.guide.sha256+'.png'}};
 swapped['4'].inputs['images.image_2']=['16',0];const swapDocs=docs(swapped);
 await page.getByText('导入外部回执',{exact:true}).click();await load(swapDocs);
 await page.getByText('工作流内的输入图与本轮条件图或父图不符，或缺少可核的摘要。').waitFor();
 // Reuse the visible letter B in a different mission; it is a new design, with a new parent choice.
 await page.locator('[data-attempt]').selectOption(kept.id);
 await sel.selectOption({index:1});await page.locator('[data-continue-candidate]').click();
 await go('studio');await page.getByRole('button',{name:'删除这个方向'}).click();
 await go('insight');
 await page.locator('.goal-context > summary').click();
 await page.getByTestId('mission').selectOption('agricultural_spraying');
 await page.getByTestId('brief-frame').selectOption('Radial Hex');
 await go('studio');await page.getByTestId('variant-add').click();
 await go('handoff');
 await page.locator('[data-attempt-goal]').fill('软件检查 · 全新的农业六旋方案');
 await page.locator('[data-freeze-attempt]').click();
 await page.waitForFunction(goal=>document.querySelector('[data-attempt] option:checked')?.textContent.includes(goal),'全新的农业六旋');
 const fresh=await exportSelected();
 assert.equal(fresh.variantId,kept.variantId);assert.equal(fresh.config.task_id,'agricultural_spraying');
 assert.equal(fresh.config.topology.axis_count,6);assert.equal(fresh.parentId,undefined);assert.equal(fresh.parentImage,null);
 assert.equal(external,0);
 console.log(JSON.stringify({historicalCases:2,workspaceFrozen:true,wrongPromptRejected:true,disconnectedGuideRejected:true,
  disconnectedOutputRejected:true,wrongConditionRejected:true,unrelatedOutputRejected:true,reusedVariantClearsParent:true,
  importedSoftwareCandidates:1,presentations:1,decisionsAfterReload:3,originalBytesMatch:true,parentPersistsAcrossDesignEdits:true,swappedGuideAndParentRejected:true,modelCalls:0,humanSessions:0}));
} finally{await browser.close();}
