const fs=require("node:fs"), path=require("node:path"), assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const folder=process.argv[2], out=fs.mkdtempSync(path.join(require("node:os").tmpdir(),"e4-pilot-test-"));
const server=require("node:http").createServer((req,res)=>{
  const name=decodeURIComponent(req.url.split("?")[0]), target=path.join(folder,name.endsWith("/")?name+"index.html":name);
  if(!fs.existsSync(target)){res.writeHead(404).end();return;}
  res.setHeader("Content-Type",({".js":"text/javascript",".css":"text/css",".png":"image/png",".html":"text/html; charset=utf-8"})[path.extname(target)]||"application/octet-stream");
  fs.createReadStream(target).pipe(res);
});
(async()=>{await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const b=await chromium.launch({channel:"msedge",headless:true});
  try{
    const p=await b.newPage();p.setDefaultTimeout(9000);
    const err=[];p.on("pageerror",e=>err.push(e.message));
    await p.goto("http://127.0.0.1:"+server.address().port+"/");
    const gap=p.getByLabel("自定义顺时针相邻夹角（°）").first();
    await gap.fill("45,135,45,45");await p.getByRole("alert").first().waitFor();
    await gap.fill("90,-90,90,90");await p.getByRole("alert").first().waitFor();
    await gap.fill("75-105-75-105");await p.getByLabel("最终生成文本").first().waitFor();
    await gap.fill("");await p.getByText("标出每副双叶桨的两个等距叶尖",{exact:true}).uncheck();
    await p.getByRole("button",{name:"确认并保存版本",exact:true}).first().click();
    const dlPromise=p.waitForEvent("download");await p.getByRole("button",{name:"导出请求 JSON",exact:true}).first().click();
    const dl=await dlPromise,specFile=path.join(out,"qa-export.local.json");await dl.saveAs(specFile);
    const target=p.getByRole("link",{name:"两种方法作者预试"});const href=await target.getAttribute("href");
    await p.goto(new URL(href,p.url()).href);
    const fill=(id,value)=>p.locator("#"+id).fill(value),click=id=>p.locator('[data-act="'+id+'"]').click();
    const submit=()=>p.locator("form button[type=submit]").click();
    await fill("code","QA-synthetic");await fill("backend","simulated");await submit();
    async function notes(){await fill("target","测试目标");await fill("keep","测试保持");await fill("basis","测试依据");}
    async function fail(){await p.locator("#status").selectOption("failed");await p.locator("#count").selectOption("1");await p.locator("#operation").selectOption("text");await fill("notes","合成失败回执");await submit();}
    async function success(number,op){
      await p.locator("#status").selectOption("success");await p.locator("#count").selectOption("1");await p.locator("#operation").selectOption(op);await fill("rid","synthetic-"+number);
      await p.locator("#picture").setInputFiles(path.join(folder,"c1-pilot/reference.png"));await submit();
    }
    async function lock(choice){await p.locator("#choice").selectOption(choice);await fill("reason","离线测试");await submit();
      for(let i=0;i<4;i++)await fill("q"+i,"测试");await submit();}
    for(let i=1;i<=9;i++){await fill("free","D 原句 "+i);await notes();
      if(i===1){await click("pause");await p.reload();await click("resume");assert.equal(await p.locator("#free").inputValue(),"D 原句 1");}
      await submit();await p.locator("#status").waitFor();
      const pkg=await p.evaluate(()=>latest(active()).input);assert.equal(pkg.prompt,"D 原句 "+i);assert.deepEqual(pkg.references,[]);
      if(i===1){await p.reload();await p.locator("#status").waitFor();await fail();}else await success(i,"text");
      if(i<9)await click("revise");}
    assert.equal(await p.locator('[data-act="revise"]').count(),0);await lock("2");await click("next");
    await p.locator("#spec").setInputFiles(specFile);await notes();await submit();await p.locator("#status").waitFor();
    const spec=JSON.parse(fs.readFileSync(specFile));const received=await p.evaluate(()=>latest(active()).input);
    assert.equal(spec.request.promptSha256,received.promptSha256);assert.equal(received.references[0].sha256,spec.guide.sha256);
    await success(10,"guide");await lock("1");
    const file=p.waitForEvent("download");await click("export");const exported=JSON.parse(fs.readFileSync(await (await file).path()));
    assert.equal(exported.sessions.length,2);assert.equal(exported.sessions[0].summary.totalCalls,9);
    assert.equal(exported.sessions[0].decision.choice,"2");assert.equal(exported.sessions[1].summary.totalCalls,1);
    const timed=await p.evaluate(()=>{const t=n=>new Date(n*60000).toISOString();
      const sim={started:t(0),versions:[{sealed:t(3),receipt:{recorded:t(23),calls:1}}],pauses:[{start:t(24),end:t(26)}]};
      return totals(sim,t(30));});
    assert.equal(timed.wallMs,1800000);assert.equal(timed.externalWaitMs,1200000);assert.equal(timed.activeMs,480000);assert.equal(timed.technicalPauseMs,120000);
    assert.deepEqual(err,[]);console.log("PASS native export, angle validation, D-only payload, S image hash, 9 slots, pause/reload, failed slot, return to v2, two-session export, clock accounting");
  }finally{await b.close();server.close();fs.rmSync(out,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});