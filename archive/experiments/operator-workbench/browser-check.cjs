/* Usage: node browser-check.cjs LOCAL_URL INITIAL_PNG REVISION_PNG NEW_OUTPUT_DIR */
const {chromium} = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

async function main() {
  const [url, original, revision, output] = process.argv.slice(2);
  assert.equal(new URL(url).hostname,"127.0.0.1");
  fs.mkdirSync(output);
  const sha = data => crypto.createHash("sha256").update(data).digest("hex");
  const [firstSha, secondSha] = [original,revision].map(p=>sha(fs.readFileSync(p)));
  assert.notEqual(firstSha,secondSha);
  const browser = await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER || undefined});
  const results=[], errors=[];
  try {
    for (const [task, method, route] of [
      ["A","D","parent"],["A","S","parent"],["B","D","text"],["B","S","text"],
      ["A","D","failed"],["B","S","unknown"],["A","S","stop_early"]]) {
      const size=method==="D"?{width:1280,height:820}:{width:390,height:844};
      const page=await browser.newPage({viewport:size});
      page.on("pageerror",err=>errors.push(err.message));
      const key=[task,method,route].join("-");
      async function click(id) {
        const ready=page.waitForResponse(r=>r.request().method()==="POST");
        await page.locator(id).click();
        const response=await ready;
        assert.equal(response.status(),200,await response.text());
        return response.json();
      }
      await page.goto(url);
      await page.selectOption("[name=task]",task);
      await page.selectOption("[name=method]",method);
      if (key==="A-D-parent") await page.screenshot({path:path.join(output,"desktop-start.png")});
      let s=await click("#start button");
      async function compile(text, ref=false) {
        const edit=method==="D"?{instruction:text}:{part:"前相机与臂根",change:text,keep:"保持四旋翼整体关系"};
        for(const [field,value] of Object.entries(edit)) await page.fill('[name="'+field+'"]',value);
        if(ref) await page.check("#ref");
        s=await click("#editor button");
        const v=s.versions.at(-1), graph=v.request.prompt;
        for (const literal of Object.values(edit)) assert.ok(graph["4"].inputs.prompt.includes(literal));
        assert.ok(graph["4"].inputs.prompt.includes(task==="A"?"integration of the front camera":"four arm roots"));
        assert.equal(graph["10"].inputs.steps,40);
        assert.equal(graph["4"].inputs.resolution,1024);
        assert.equal(graph["10"].inputs.seed,s.seed);
        assert.equal(v.parent_image_sha256,ref?firstSha:null);
        assert.equal(v.shape_control_image,null);
        assert.ok(!Object.values(graph).some(n=>/ControlNet|Canny/.test(n.class_type)));
        if(ref) {
          assert.deepEqual(graph["4"].inputs["images.image_1"],["15",0]);
          assert.equal(graph["15"].inputs.image,"parent-"+firstSha+".png");
        } else {
          assert.ok(!graph["15"] && !graph["4"].inputs["images.image_1"]);
        }
      }
      const endpoint=url+"/sessions/"+s.id;
      async function rejected(body) {
        const res=await page.request.post(endpoint,{headers:{Origin:url},data:body});
        assert.ok(res.status()>=400);
        const actual=await (await page.request.get(endpoint)).json();
        assert.deepEqual(actual,s);
      }
      await compile("改进相机与机身的衔接。");
      await rejected({revision:0,action:"stop"});
      if(route==="failed" || route==="unknown"){
        await page.locator("#result summary").click();
        await page.fill("#failureReason","软件演练的中断分支");
        s=await click("#"+route);
        assert.equal(s.phase,"stopped");
        assert.equal(s.versions[0].status,route);
        await rejected({revision:s.revision,action:"compile",edit:{instruction:"额外请求"},reference:false});
      } else {
        await page.setInputFiles("#file",original);s=await click("#attach");
        assert.equal(s.versions[0].image_sha256,firstSha);
        if(route!=="stop_early"){
          await compile("细化过渡，保留相机识别度。",route==="parent");
          assert.equal(s.versions[1].parent_version,1);
          await page.setInputFiles("#file",revision);s=await click("#attach");
          assert.equal(s.versions[1].image_sha256,secondSha);
          await rejected({revision:s.revision,action:"compile",edit:{instruction:"第三次"},reference:false});
        }
        s=await click("#stop");
      }
      const choice=route==="text"?2:route==="failed" || route==="unknown"?null:1;
      await page.selectOption("#choice",choice===null?"none":String(choice));
      await page.fill("#why","软件核验版本选择与原图一致。");
      s=await click("#finish button");
      assert.equal(s.final.version,choice);
      assert.equal(s.final.image_sha256,choice===1?firstSha:choice===2?secondSha:null);
      assert.equal(s.phase,"locked");assert.equal(s.model_calls,0);
      await rejected({action:"lock",revision:s.revision,choice:null,reason:"二次锁稿"});
      await page.reload();
      await page.locator("#locked h2").waitFor();
      assert.ok(await page.locator("#editor").isHidden());
      const width=await page.evaluate(()=>document.documentElement.scrollWidth);
      assert.ok(width<=size.width);
      if(key==="A-S-parent") await page.screenshot({path:path.join(output,"mobile-final.png"),fullPage:true});
      if(key==="A-D-parent") await page.screenshot({path:path.join(output,"desktop-final.png"),fullPage:true});
      const download=page.waitForEvent("download");await page.locator("#receipt").click();
      await (await download).saveAs(path.join(output,key+".zip"));
      results.push({case:key,versions:s.versions.length,choice,phase:s.phase,
                    graph_sha256:s.versions.map(v=>v.request_sha256),width});
      await page.close();
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,"browser-check.json"),JSON.stringify({
      scope:"offline browser exercise",model_calls:0,human_sessions:0,
      input_example_sha256:[firstSha,secondSha],page_errors:errors,results},null,2)+"\n");
    console.log(results.map(r=>r.case).join(", "));
  } finally {await browser.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;});

