// Open a fresh, extracted package in Chrome; verify real DOM controls and downloaded originals.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './cdp.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(),'multirotor-package-'));
const captures = process.argv.includes('--capture') ? mkdtempSync(join(tmpdir(),'multirotor-walkthrough-')) : null;
let browser;
try {
  execFileSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
    ['-m','zipfile','-e',join(root,'configurator-offline.zip'),join(work,'package')]);
  browser = await launch({port:9341});
  const page = await browser.open(pathToFileURL(join(work,'package','index.html')).href);
  assert.equal(await page.evaluate("document.querySelector('#drone-configurator-app').dataset.stepActive"),'canvas');
  // 只有一块画布：目标和造型是画布上的卡片，底部工具条用来添加步骤。
  assert.equal(await page.evaluate("document.querySelectorAll('nav.canvas-rail').length"),0);
  assert.deepEqual(await page.evaluate("[...document.querySelectorAll('[data-testid=canvas-dock] [data-dock]')].map(x=>x.dataset.dock)"),
    ['goal','image','note','direction','generate']);
  assert.equal(await page.evaluate("document.querySelector('[data-testid=workflow-workspace]').dataset.boardId"),'project');
  assert.deepEqual(await page.evaluate("[...document.querySelectorAll('[data-workflow-node]')].map(x=>x.dataset.stepKind).sort()"),['design','goal']);
  await page.click('[data-board=history]');
  const canvas = await page.evaluate(`(async () => {
    const cards = [...document.querySelectorAll('[data-workflow-node]')];
    const images = cards.flatMap(card => [...card.querySelectorAll('img')]);
    await Promise.all(images.map(image => image.decode()));
    return {
      cards: cards.map(card => card.dataset.workflowNode),
      edges: [...document.querySelectorAll('path.gb-wire')].filter(path => path.getTotalLength() > 0).map(path => path.id),
      images: images.filter(image => image.naturalWidth > 0).length,
    };
  })()`);
  for(const id of ['b2-original','b2-clean','b2-upper','b2-lower','b2-choice']) assert.ok(canvas.cards.includes(id), id);
  for(const [from,to] of [['b2-original','b2-clean'],['b2-clean','b2-upper'],['b2-clean','b2-lower'],['b2-lower','b2-choice']])
    assert.ok(canvas.edges.includes(JSON.stringify([from,to])), from + ' → ' + to);
  assert.ok(canvas.images >= 4);
  if(captures) await page.screenshot(join(captures,'canvas.png'));
  // 旧入口 #step=insight 选中画布上的目标卡片，右侧出现目标面板。
  const go = async hash => { await page.evaluate(`location.hash=${JSON.stringify(hash)}`); await page.sleep(700); };
  await go('step=insight&board=project');
  assert.equal(await page.evaluate("document.querySelector('[data-testid=step-panel]').dataset.panelMode"),'goal');
  const set = async (testId,value) => {
    await page.evaluate(`(() => {const s=document.querySelector('[data-testid="${testId}"]');s.value=${JSON.stringify(value)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  };
  if(captures) await page.screenshot(join(captures,'brief.png'));
  await page.type('[data-testid=brief-input]','折起来放进小包');
  assert.equal(await page.evaluate("document.querySelector('[data-testid=lookup-result]').dataset.status"),'retrieve');
  await page.click('[data-testid=accept-evidence]');
  await page.click('.goal-context > summary');
  await set('mission','agricultural_spraying');
  await set('brief-frame','Radial Hex');
  await page.type('[data-testid=brief-input]','展开时希望机身显得紧凑');
  assert.equal(await page.evaluate("document.querySelector('[data-testid=lookup-result]').dataset.status"),'abstain');
  await page.click('[data-testid=confirm-intent]');
  await go('step=studio&board=project');
  assert.equal(await page.evaluate("document.querySelector('[data-testid=step-panel]').dataset.panelMode"),'design');
  const axes = () => page.evaluate("document.querySelectorAll('[data-testid=top-view] [data-layer=hub]').length");
  assert.equal(await axes(),6);
  if(captures) await page.screenshot(join(captures,'agricultural-hex.png'));
  await page.click('[data-step=handoff]');
  const downloads = join(work,'downloads');
  mkdirSync(downloads);
  await page.setDownloadDir(downloads);
  await page.click('[data-testid=export-all]');
  let names = [];
  for(let i=0;i<40;i++){
    names=readdirSync(downloads).filter(n=>n.startsWith('drone-')&&!n.endsWith('.crdownload'));
    if(names.length===3)break;
    await page.sleep(100);
  }
  assert.equal(names.length,3);
  const config=JSON.parse(readFileSync(join(downloads,names.find(n=>n.endsWith('.json')))));
  const prompt=readFileSync(join(downloads,config.files.prompt),'utf8');
  const png=readFileSync(join(downloads,config.files.guide));
  assert.equal(config.task_id,'agricultural_spraying');
  assert.equal(config.layout.hubs.length,6);
  assert.equal(createHash('sha256').update(png).digest('hex'),config.reference_image.png_sha256);
  assert.equal(prompt,config.prompt.text);
  assert.match(prompt,/hexacopter/i);
  assert.match(prompt,/agricultur/i);
  assert.doesNotMatch(prompt,/quadcopter|everyday carry-along aerial photography/i);
  if(captures) for(const name of names) copyFileSync(join(downloads,name),join(captures,name));
  await page.click('[data-handoff-tab=candidates]');
  for(const id of ['quad','hex']){
    await page.click('[data-history-case='+id+']');
    assert.ok(await page.evaluate("document.querySelector('[data-testid=history-replay] img').naturalWidth > 0"));
  }
  assert.equal(page.errors().length,0);
  assert.equal(page.requests().filter(x=>/^https?:/.test(x)).length,0);
  console.log(JSON.stringify({offline:true,canvas:{nodes:canvas.cards.length,edges:canvas.edges.length,images:canvas.images},
    geometry:config.topology,task:config.task_id,files:names,
    semanticQueries:2,historyCases:2,modelCalls:0,humanSessions:0,captures},null,2));
} finally {
  if(browser) await browser.quit();
  rmSync(work,{recursive:true,force:true,maxRetries:4,retryDelay:250});
}
