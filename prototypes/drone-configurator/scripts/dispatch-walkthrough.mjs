// Observe the browser requests at a controlled ComfyUI boundary. No model is loaded.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tagPNG } from './fixture-png.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const url=process.argv[2] || pathToFileURL(resolve('dist/index.html')).href;
const fixture='http://127.0.0.1:47489';
const hash=b=>createHash('sha256').update(b).digest('hex');
const chromiumClient=await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome',headless:true});
try {
 const ctx=await chromiumClient.newContext({acceptDownloads:true});
 const page=await ctx.newPage(), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const uploads=new Map(),jobs=new Map(),packets=[];
 let extraNetwork=0;
 await ctx.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==fixture) {
     if(/^https?:$/.test(u.protocol)&&u.origin!==new URL(url).origin) { extraNetwork++;return route.abort(); }
     return route.continue();
   }
   const headers={'access-control-allow-origin':'*','access-control-allow-methods':'POST,GET,OPTIONS','access-control-allow-headers':'content-type','access-control-allow-private-network':'true'};
   const reply=body=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(body)});
   if(req.method()==='OPTIONS') return reply({});
   if(u.pathname==='/upload/image'){
     const form=await new Response(req.postDataBuffer(),{headers:{'content-type':req.headers()['content-type']}}).formData();
     const img=form.get('image'),bytes=Buffer.from(await img.arrayBuffer());
     assert.equal(img.name,'studio-'+hash(bytes)+'.png');uploads.set(img.name,bytes);
     return reply({name:img.name,subfolder:'',type:'input'});
   }
   if(u.pathname==='/prompt'){
     const payload=req.postDataJSON(),job='SOFTWARE-CONTROL-'+(jobs.size+1);
     jobs.set(job,payload.prompt);packets.push(payload);return reply({prompt_id:job,node_errors:{}});
   }
   if(u.pathname.startsWith('/history/')){
     const job=u.pathname.split('/').at(-1);assert.ok(jobs.has(job));
     const success=job.endsWith('-1');
     return reply({[job]:{prompt:[0,job,jobs.get(job)],status:{status_str:success?'success':'error',completed:success},
       outputs:success?{'12':{images:[{filename:'software-result.png',type:'output'}]}}:{}}});
   }
   if(u.pathname==='/view'){
     const graph=structuredClone(jobs.get('SOFTWARE-CONTROL-1'));
     const input=uploads.get(graph['15'].inputs.image);
     assert.equal(u.searchParams.get('filename'),'software-result.png');
     graph['15'].is_changed=[hash(input)];
     return route.fulfill({status:200,headers,contentType:'image/png',body:tagPNG(input,graph)});
   }
   throw new Error('Unexpected network path '+u.pathname);
 });
 await page.goto(url);
  // 旧入口落在同一块画布上：insight 选中目标卡片，studio 选中造型卡片，handoff 打开研究详情与导出。
  const go = async step => {
    if (step === 'handoff') { await page.locator('[data-step=handoff]').click(); await page.locator('[data-handoff-tab=candidates]').click(); return; }
    await page.evaluate(next => { location.hash = 'step=' + next + '&board=project&v=' + Date.now(); }, step);
    await page.locator('[data-testid=step-panel][data-panel-mode=' + (step === 'insight' ? 'goal' : 'design') + ']').waitFor();
  };
 await go('insight');
 await page.locator('.goal-context > summary').click();
 await page.locator('[data-testid=mission]').selectOption('agricultural_spraying');
 await page.locator('[data-testid=brief-frame]').selectOption('Radial Hex');
 await go('handoff');
 for (const condition of ['structured','free']){
   await page.locator('[data-attempt-goal]').fill('软件验收 · 农业六旋外观');
   await page.getByLabel('输入方式').selectOption(condition);
   const free='自由条件软件验证：农业六旋外观。';
   if(condition==='free') await page.locator('[data-free-prompt]').fill(free);
   await page.locator('[data-freeze-attempt]').click();
   const model=page.locator('[data-testid=model-dispatch]');
   await model.locator('summary').click();
   await model.locator('[data-testid=model-url]').fill(fixture);
   const getFile=async (action)=>{
     const event=page.waitForEvent('download');await action();const d=await event;return JSON.parse(await readFile(await d.path(),'utf8'));
   };
   const offline=await getFile(()=>model.locator('[data-testid=model-request-download]').click());
   assert.equal(jobs.size,condition==='structured'?0:1);
   await model.locator('[data-testid=model-submit]').click();
   await model.getByText(/已入队/).waitFor();
   const sent=packets.at(-1);
   assert.deepEqual(offline,sent);
   const graph=sent.prompt, text=graph['4'].inputs.prompt;
   if(condition==='structured'){
     assert.match(text,/hexacopter/i);assert.match(text,/agricultur/i);assert.doesNotMatch(text,/quadcopter|everyday carry-along/i);
     assert.ok(uploads.has(graph['15'].inputs.image));assert.deepEqual(graph['4'].inputs['images.image_1'],['15',0]);
   }else{assert.equal(text,free);assert.equal(graph['15'],undefined);}
   await model.locator('[data-testid=model-collect]').click();
   if(condition==='structured') await page.locator('[data-show-candidate]').waitFor();
   else await page.getByText(/后端已确认失败或中止/).waitFor();
   const record=await getFile(()=>page.locator('[data-export-attempt]').click());
   assert.equal((condition==='structured'?record.receipt:record.failure).runId,'SOFTWARE-CONTROL-'+jobs.size);
   assert.equal(record.candidates.length,condition==='structured'?1:0);
   assert.equal(record.config.topology.axis_count,6);
   assert.equal(record.dispatch.server,fixture);
   assert.equal(record.dispatch.request.sha256,hash(Buffer.from(JSON.stringify(sent))));
 }
 assert.equal(uploads.size,1);assert.equal(jobs.size,2);assert.equal(extraNetwork,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({realBrowser:true,scope:'local software fixture',submittedModes:['structured','free'],hexAxes:6,
   postedRequests:2,guideUploads:1,confirmedSoftwareReturns:1,failureHistoriesRetained:1,otherNetwork:extraNetwork,realModelCalls:0,people:0}));
}finally{await chromiumClient.close();}
