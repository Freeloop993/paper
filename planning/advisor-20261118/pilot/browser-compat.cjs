/* Independent compatibility probe. Runs in a fresh browser profile and makes no model calls. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');

async function probe(siteDir, legacyDir, out) {
  const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true, timeout: 25000});
  try {
    const ctx = await browser.newContext({acceptDownloads: true, viewport: {width:1440,height:950}});
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.setDefaultTimeout(8000);
    await p.goto(pathToFileURL(path.resolve(siteDir, 'index.html')).href, {waitUntil:'domcontentloaded'});
    await p.locator('[data-step=studio]').click();
    const studioText = await p.locator('[data-testid=studio]').innerText();
    await p.locator('[data-step=handoff]').click();
    const candidatesText = await p.getByTestId('candidates').innerText();
    const candidateInputs = await p.getByTestId('candidates').locator('input,button').count();
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByTestId('export-config').click()]);
    const bytes = await fs.readFile(await dl.path());
    const exported = JSON.parse(bytes);
    assert.equal(exported.schema, 'drone-configurator/config-v2');
    assert.equal(exported.layout.hubs.length, 4);
    assert.equal(exported.model_service.status, 'disabled');
    assert.equal(exported.reference_image.parent_image, null);
    assert.equal(candidateInputs, 0);
    const url = pathToFileURL(path.resolve(legacyDir, 'index.html'));
    url.searchParams.set('mode', 'study');
    await p.goto(url.href, {waitUntil:'domcontentloaded'});
    await p.locator('#order').selectOption('2'); // S first; artificial software test only.
    await p.locator('form[data-form=start] button[type=submit]').click();
    await p.locator('details.import summary').click();
    await p.locator('#spec').setInputFiles({name:dl.suggestedFilename(),mimeType:'application/json',buffer:bytes});
    await p.locator('form[data-form=freeze] button[type=submit]').click();
    await p.waitForFunction(() => document.getElementById('notice')?.textContent.includes('须导入'));
    const rejection = await p.locator('#notice').innerText();
    assert.equal(await p.locator('form[data-form=receipt]').count(), 0);
    await p.locator('#spec').setInputFiles([]);
    await p.locator('form[data-form=freeze] button[type=submit]').click();
    await p.locator('details.receipt > summary').click();
    const single = await p.locator('#picture').evaluate(el=>({type:el.type,multiple:el.multiple}));
    const action = async key => p.locator('[data-act="'+key+'"]').first().click();
    const submit = async form => p.locator('form[data-form="'+form+'"] button[type=submit]').click();
    const saveSuccess = async (id,op) => {
      await p.locator('#status').selectOption('success');
      await p.locator('#count').selectOption('1');
      await p.locator('#operation').selectOption(op);
      await p.locator('#rid').fill(id);
      await p.locator('#picture').setInputFiles(path.join(legacyDir,'reference.png'));
      await submit('receipt');
      await p.locator('form[data-form=lock]').waitFor();
    };
    const finish = async index => {
      await p.locator('#choice').selectOption(String(index));
      await p.locator('label:has(#lockReason-0)').first().click();
      await submit('lock');
      for (let i=0;i<4;i++) await p.locator('label:has(#q'+i+'-2)').click();
      await submit('survey');
    };
    await saveSuccess('synthetic-S1','guide');
    await action('revise');
    await submit('freeze');
    await p.locator('details.receipt > summary').click();
    await p.locator('#status').selectOption('failed');
    await p.locator('#count').selectOption('1');
    await p.locator('#operation').selectOption('guide');
    await p.locator('#notes').fill('software probe only');
    await submit('receipt');
    await finish(1);
    await action('next');
    await p.locator('#free').fill('software probe only');
    await submit('freeze');
    await p.locator('details.receipt > summary').click();
    await saveSuccess('synthetic-D1','text');
    await finish(1);
    const [pairDownload]=await Promise.all([p.waitForEvent('download'),action('export')]);
    const pair=JSON.parse(await fs.readFile(await pairDownload.path(),'utf8'));
    assert.deepEqual(pair.sessions.map(s=>s.condition),['S','D']);
    assert.deepEqual(pair.sessions.map(s=>s.summary.totalCalls),[2,1]);
    assert.deepEqual(pair.sessions.map(s=>s.decision.choice),['1','1']);
    assert.deepEqual(pair.sessions.map(s=>s.versions[0].input.references.length),[1,0]);
    assert.deepEqual(pair.sessions[0].versions.map(v=>v.receipt.status),['success','failed']);
    const validate = data => require('node:child_process').spawnSync(process.env.PYTHON || 'python',
      [path.join(__dirname,'audit-pair.py'), '-'], {input:JSON.stringify(data),encoding:'utf8',maxBuffer:4*1024*1024});
    const checked=validate(pair);
    assert.equal(checked.status,0,checked.stderr || checked.stdout);
    const audit=JSON.parse(checked.stdout);
    assert(audit.missing_evidence.some(i=>i.endsWith('actualRequest')));
    const broken=structuredClone(pair);
    broken.sessions[0].versions[0].input.prompt+='X';
    assert.equal(validate(broken).status,1);
    const log=pair.sessions.map(s=>({condition:s.condition,attempts:s.versions.length,statuses:s.versions.map(v=>v.receipt.status),
      selected:s.decision.choice,activePresent:Number.isFinite(s.summary.activeMs),waitPresent:Number.isFinite(s.summary.externalWaitMs),
      successServiceTimeMissing:s.versions[0].receipt.intervalsMs.model===null}));
    const result = {
      date:'2026-11-18', mode:'software_probe', browser:await browser.version(), model_calls:0, participant_sessions:0,
      pr:'d6dfb21', pr75NormalExport:{schema:exported.schema,axes:exported.layout.hubs.length,modelStatus:exported.model_service.status,parent:exported.reference_image.parent_image,candidateInputs,candidateArea:candidatesText,hexLabelInDefaultStudio:/径向六旋/.test(studioText)},
      legacyC1:{acceptedPR75:false, rejection, nativeStructuredReachedWaiting:true,returnedImageInput:single,syntheticPair:log}, pairExportQA:{integrity:audit.integrity_issues,missingCount:audit.missing_evidence.length,tamperedPromptRejected:true}, pageErrors:errors
    };
    assert.deepEqual(errors, []);
    if (out) await fs.writeFile(out, JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
  } finally { await browser.close(); }
}
if (process.argv.length < 4) {console.error('node browser-compat.cjs <PR75 offline site> <legacy C1 directory> [out.json]'); process.exitCode=1;}
else probe(...process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
