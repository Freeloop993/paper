const assert=require("node:assert/strict");
const path=require("node:path"),fs=require("node:fs/promises"),os=require("node:os");
const {pathToFileURL}=require("node:url");
const {chromium}=require(process.env.PLAYWRIGHT_CORE||"playwright-core");
(async()=>{
 const root=path.resolve(process.argv[2]||__dirname), url=pathToFileURL(path.join(root,"index.html")).href;
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),"c1-study-"));
 const browser=await chromium.launch({channel:"msedge",headless:true}), errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1280,height:860},acceptDownloads:true});
  const p=await context.newPage();p.setDefaultTimeout(6500);
  p.on("pageerror",e=>errors.push(e.message));
  async function download(act){const wait=p.waitForEvent("download");await click(act);return fs.readFile(await (await wait).path(),"utf8");}
  const click=id=>p.locator('[data-act="'+id+'"]').first().click(), submit=()=>p.locator('form[data-form] button[type="submit"]:visible').click();
  const choose=async(id,v)=>p.locator("#"+id).selectOption(v);
  const wait=phase=>p.waitForFunction(phase=>active()?.phase===phase,phase);
  await p.goto(url);await p.locator('#preview-host svg').waitFor();
  if(process.env.C1_QA_DIR){await fs.mkdir(process.env.C1_QA_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.C1_QA_DIR,"desktop.png")});}
  await p.getByRole("button",{name:"查看导出定位图"}).click();
  await p.locator("#preview-host canvas").waitFor();
  let spec=JSON.parse(await download("downloadSpec"));const raw=await download("downloadText");
  assert.equal(raw,spec.request.prompt);assert.equal(spec.layout.hubs.length,4);
  const baseline=await p.evaluate(async()=>{selector.setSelection({guide:"axes"});return selector.exportVersion();});
  await fs.writeFile(path.join(temp,"spec.json"),JSON.stringify(baseline));
  await p.evaluate(()=>selector.setSelection({angles:"custom",custom:"45,135,45,45"}));
  assert.equal(await p.locator('[data-act="downloadSpec"]').isDisabled(),true);
  await p.evaluate(()=>selector.setSelection({angles:"75-105-75-105",custom:null,span:320}));
  await p.reload();await p.locator("#preview-host svg").waitFor();
  spec=JSON.parse(await download("downloadSpec"));assert.equal(spec.layout.max_motor_distance_mm,320);
  assert.deepEqual(spec.layout.adjacent_deg.map(Math.round),[75,105,75,105]);
  await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(process.env.C1_QA_DIR)await p.screenshot({path:path.join(process.env.C1_QA_DIR,"mobile.png")});
  await p.setViewportSize({width:1280,height:860});await click("study");await choose("order","0");await submit();await wait("draft");
  assert.equal(await p.locator("#selection").count(),0);assert(await p.locator("#labNav").isDisabled());
  async function openReceipt(){await wait("waiting");await p.locator("details.receipt > summary").click();}
  async function receipt(success,n,op){
   await openReceipt();await choose("status",success?"success":"failed");await choose("count","1");await choose("operation",op);
   if(success){await p.locator("#rid").fill("synthetic-"+n);await p.locator("#picture").setInputFiles(path.join(root,"reference.png"));}
   else await p.locator("#notes").fill("Synthetic QA failure");
   await submit();await wait("decide");
  }
  async function lock(v){
   await choose("choice",v);await p.locator('label[for="lockReason-0"],label:has(#lockReason-0)').first().click();await submit();await wait("survey");
   for(let i=0;i<4;i++)await p.locator("label:has(#q"+i+"-2)").click();await submit();await wait("done");
  }
  for(let i=1;i<=9;i++){
   await p.locator("#free").fill("设计者原话 "+i);
   if(i===1){await click("pause");await p.locator('[data-act="resume"]').waitFor();await p.reload();await click("resume");assert.equal(await p.locator("#free").inputValue(),"设计者原话 1");}
   await submit();await wait("waiting");let pkg=JSON.parse(await download("handoff"));assert.equal(pkg.prompt,"设计者原话 "+i);assert.deepEqual(pkg.references,[]);
   await receipt(i>1,i,"text");if(i<9){await click("revise");await wait("revision");}
  }
  assert.equal(await p.locator('[data-act="revise"]').count(),0);await lock("2");await click("next");await wait("draft");await p.locator('#preview-host svg').waitFor();
  const compare=await p.evaluate(async()=>{const v=await selector.exportVersion();return [v.guide.sha256,v.layout.max_motor_distance_mm,v.request.promptSha256];});
  await submit();await wait("waiting");let guide=JSON.parse(await download("handoff"));assert.equal(guide.references.length,1);
  assert.equal(compare[0],guide.references[0].sha256);assert.equal(compare[0],"15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338");assert.equal(compare[1],250);assert.equal(guide.promptSha256,compare[2]);await receipt(true,10,"guide");
  await click("revise");await wait("revision");await p.locator("details.import summary").click();await p.locator("#spec").setInputFiles(path.join(temp,"spec.json"));
  await submit();await wait("waiting");await receipt(true,11,"guide");await lock("1");
  const log=JSON.parse(await download("export"));assert.deepEqual(log.sessions.map(s=>s.summary.totalCalls),[9,2]);
  assert.equal(log.sessions[0].decision.choice,"2");assert.equal(log.sessions[1].versions[0].input.source,"inline-selector");
  assert.equal(log.sessions[1].versions[1].input.source,"imported-configurator");
  assert.equal(log.sessions[0].versions[0].input.target,null);assert(log.settings.exploredInterface);
  const t=await p.evaluate(()=>{const ts=n=>new Date(n*60000).toISOString();return totals({started:ts(0),versions:[{sealed:ts(3),receipt:{recorded:ts(23),calls:1}}],pauses:[{start:ts(24),end:ts(26)}]},ts(30));});
  assert.equal(t.activeMs,480000);assert.equal(t.externalWaitMs,1200000);assert.equal(t.technicalPauseMs,120000);
  const clean=await browser.newContext();const pure=await clean.newPage();await pure.goto(url+"?mode=study");await pure.locator("#order").waitFor();
  assert(await pure.locator("#labNav").isDisabled());assert.equal(await pure.locator("#selection").count(),0);
  assert.deepEqual(errors,[]);console.log("PASS desktop/mobile file URL, guide/prompt exports, invalid angle, resume, S inline, S import, D text, 9 attempts, failure, rollback, pair export and clocks; synthetic receipts only.");
 }finally{await browser.close();await fs.rm(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});