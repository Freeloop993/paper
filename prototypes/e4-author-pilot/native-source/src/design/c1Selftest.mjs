/* Run locally: node src/design/c1Selftest.mjs [path-to-Chrome-or-Edge].
   No app DB, server, model or GPU. All browser files live in an isolated temp dir. */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, copyFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const chrome=process.argv[2]||'C:/Program Files/Google/Chrome/Application/chrome.exe';
await access(chrome);
const root=new URL('../../public/c1-pilot/',import.meta.url), dir=await mkdtemp(join(tmpdir(),'c1-local-'));
let child,closed,ws,id=0;
const pending=new Map(),problems=[];
async function cdp(method,params={}){
  const seq=++id;
  const promise=new Promise((resolve,reject)=>pending.set(seq,{resolve,reject}));
  ws.send(JSON.stringify({id:seq,method,params}));return promise;
}
async function js(expression){
  const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,timeout:8000});
  if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value;
}
try{
  for(const name of ['selection.js','selection.css'])await copyFile(new URL(name,root),join(dir,name));
  const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'">
  <link rel="stylesheet" href="selection.css"><link rel="stylesheet" href="fixture.css"><script defer src="selection.js"></script><script defer src="fixture.js"></script>
  <form><main><section id="panel"></section><aside id="pv"></aside></main><div id="pt"></div></form><section hidden id="second"></section>
  </html>`;
  await writeFile(join(dir,'index.html'),html);
  await writeFile(join(dir,'fixture.css'),'body{font:16px/1.5 system-ui;margin:1rem;color:#253c38}main{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:1.5rem;align-items:start}aside{position:sticky;top:1rem}@media(max-width:650px){main{grid-template-columns:1fr}}');
  await writeFile(join(dir,'fixture.js'),`
    const $=id=>document.getElementById(id);
    let changes=0, latest;
    const ed=C1Selection.mount({panel:$('panel'),preview:$('pv'),prompt:$('pt'),onChange:s=>{latest=s;changes++}});
    const other=C1Selection.mount({panel:$('second')});
    `);
  const url=pathToFileURL(join(dir,'index.html')).href, profile=join(dir,'profile');
  child=spawn(chrome,['--headless=new','--disable-gpu','--disable-software-rasterizer','--disable-background-networking','--disable-component-update',
    '--disable-sync','--disable-extensions','--no-first-run','--no-default-browser-check','--host-resolver-rules=MAP * ~NOTFOUND',
    '--remote-debugging-port=0','--user-data-dir='+profile,url],{stdio:'ignore',windowsHide:true});
  closed=new Promise((res,rej)=>{child.once('exit',res);child.once('error',rej)});
  let tab;
  for(let i=0;i<100&&!tab;i++){
    try{const port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split(/\r?\n/)[0];
      tab=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(p=>p.url===url);
    }catch{/* browser starting */}if(!tab)await delay(100);
  }
  assert(tab,'file page did not start');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no});
  ws.onmessage=({data})=>{const r=JSON.parse(data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result);}
    if(r.method==='Runtime.exceptionThrown'||(r.method==='Log.entryAdded'&&r.params.entry.level==='error')||
       (r.method==='Network.requestWillBeSent'&&/^https?:/.test(r.params.request.url)))problems.push(r.params);};
  await cdp('Runtime.enable');await cdp('Log.enable');await cdp('Network.enable');
  for(let i=0;i<40&&!await js("typeof ed!=='undefined'");i++)await delay(100);
  assert(await js("changes===1 && latest.validation.ok && Object.keys(latest.selection).length===0 && !latest.prompt.includes('Camera gimbal fitted') && latest.prompt.includes('安装方式')"));
  const key=async(k,code)=>{for(const type of ['rawKeyDown','keyUp'])await cdp('Input.dispatchKeyEvent',{type,key:k,code:k,windowsVirtualKeyCode:code})};
  await js("document.querySelector('[role=tab]').focus()");await key('End',35);
  assert(await js("document.activeElement.textContent==='色材' && changes===1"));
  await js("document.querySelector('#panel input[value=\"#f97316\"]').click()");
  assert(await js("latest.selection.color==='#f97316' && latest.prompt.includes('#f97316')"));
  await js("document.querySelector('#panel [role=tab]').click();document.querySelector('#panel [data-c1-field=frame]:checked').focus()");
  await key('ArrowRight',39);
  assert(await js("latest.selection.frame==='Wide X' && latest.research.fields.frame.source==='selected'"));
  await js("document.querySelector('#panel input[type=range]').focus()");await key('ArrowRight',39);
  assert(await js("latest.selection.span===251 && document.querySelector('#panel input[type=number]').value==='251'"));
  const summary=await js(`(async()=>{
    const ok=(v,msg)=>{if(!v)throw Error(msg)};
    const original=other.getSnapshot();
    for(const f of ['True X','Wide X','Stretch X','H-Frame','Deadcat','+ Configuration']){
      const s=ed.setSelection({frame:f});ok(s.validation.ok && s.layout.hubs.length===4,f);
    }
    for(const preset of ['A','B','C']){
      const s=ed.setSelection({preset,frame:null});ok(s.research.fields.body.source==='preset' && !s.prompt.includes('支架'),preset);
    }
    for(const angles of ['90-90-90-90','75-105-75-105','60-120-60-120','45-135-45-135']){
      const s=ed.setSelection({angles});ok(s.layout.adjacent_deg.join('-')===angles,angles);
    }
    for(const patch of [{span:501},{span:250,angles:'custom',custom:'90,90,90,89'},{custom:'0,90,120,150'},{custom:''}]){
      ok(!ed.setSelection(patch).validation.ok && !latest.prompt && !document.querySelector('#pv svg'),'stale preview');
      try{await ed.exportVersion();throw Error('invalid version accepted')}catch(e){if(e.message==='invalid version accepted')throw e}
    }
    const s=ed.setSelection({span:321,angles:'custom',custom:'75,105,75,105',guide:'tips',root:'socket',camera:'inside',body:'Boxy Enclosure',finish:'open',color:'#f97316'});
    ok(s.validation.ok && s.layout.max_motor_distance_mm===321 && s.prompt.includes('横向接缝') && s.prompt.includes('机鼻前缘轮廓以内') && s.prompt.includes('#f97316') && !s.prompt.includes('细砂哑光聚合物'),'choices did not propagate');
    ok(document.querySelector('#pt').textContent===s.prompt && Object.keys(other.getSnapshot().selection).length===0,'mount isolation');
    const promise=ed.exportVersion();ed.setSelection({span:333});
    const v=await promise, req=v.request, guide=v.guide;
    const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
    ok(v.schema==='uav-configurator-e/2' && v.draft.inputs.c1Selection.selection.span===321 && v.layout.max_motor_distance_mm===321 && req.prompt===s.prompt,'freeze race');
    ok(v.draft.inputs.task==='quad'&&v.draft.inputs.method==='structured'&&v.draft.inputs.view==='top'&&req.route==='guide','S draft');
    ok(await digest(new TextEncoder().encode(s.prompt))===req.promptSha256,'prompt hash');
    ok(req.references.length===1&&req.references[0].role==='top-layout'&&req.references[0].sha256===guide.sha256&&guide.sha256===await digest(Uint8Array.from(atob(guide.dataUrl.split(',')[1]),c=>c.charCodeAt(0))),'guide hash');
    $('pv').querySelector('button').click();ed.setSelection({span:321});
    ok($('pv').querySelector('canvas').toDataURL()===guide.dataUrl && guide.width===1024 && guide.height===1024,'guide preview/export pixels');
    const host=document.createElement('div'),study=C1Selection.mount({panel:host,studyLayout:true,initialSelection:s.selection});
    const bad={frame:'Wide X',span:499,angles:'custom',custom:'bad',guide:'tips'};
    const locked=study.setSelection(bad),common=await study.exportVersion();
    for(const k of Object.keys(bad))ok(!(k in locked.selection)&&locked.research.fields[k].source==='task','task provenance '+k);
    ok(locked.validation.ok && locked.layout.max_motor_distance_mm===250 && locked.layout.adjacent_deg.every(a=>a===90) && locked.layout.bladeTips.length===0,'study layout');
    ok(host.querySelector('input[type=range]').matches(':disabled') && locked.selection.root==='socket','study controls');
    const expected='15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338';
    ok(common.guide.sha256===expected && common.request.references[0].sha256===expected &&
      (await digest(Uint8Array.from(atob(common.guide.dataUrl.split(',')[1]),c=>c.charCodeAt(0))))===expected,'pinned PNG bytes');
    const img=new Image();img.src=common.guide.dataUrl;await img.decode();
    const cv=document.createElement('canvas');cv.width=cv.height=1024;const ctx=cv.getContext('2d');ctx.drawImage(img,0,0);
    ok(common.layout.hubs.every(h=>ctx.getImageData(h.x_px,h.y_px,1,1).data.slice(0,3).join() === '255,0,0'),'common PNG hub coordinates');
    study.destroy();
    other.destroy();ok(!$('second').childNodes.length,'destroy');
    const restored=C1Selection.mount({panel:$('second'),initialSelection:s.selection});
    ok(restored.getSnapshot().prompt===s.prompt && original.prompt!==s.prompt,'restore');restored.destroy();
    $('pv').querySelector('button').click();ok([...document.querySelectorAll('form button')].every(b=>b.type==='button'),'form button');
    const wx=s.layout.hubs.map(h=>h.x_mm), wy=s.layout.hubs.map(h=>h.y_mm);
    const dim=(v)=> (Math.max(...v)-Math.min(...v)).toFixed(1);
    ok($('pv').querySelector('[data-dimension=W]').textContent==='W '+dim(wx)+' mm' && $('pv').querySelector('[data-dimension=L]').textContent==='L '+dim(wy)+' mm','measured dimensions');
    ok($('pv').querySelector('[data-adjacent-deg]').getAttribute('data-adjacent-deg')==='75','measured arc');
    return {span:v.layout.max_motor_distance_mm,angle:v.layout.adjacent_deg,commonSHA:common.guide.sha256,png:[guide.width,guide.height]};
  })()`);
  // Navigate the real current host in the disposable browser profile; no extraction of host code.
  await cdp('Page.navigate',{url:new URL('index.html',root).href});
  const waitFor=async(expr)=>{for(let i=0;i<100;i++){try{if(await js('Boolean('+expr+')'))return}catch{}await delay(60)}throw Error('host did not reach '+expr+'; '+await js("document.querySelector('#notice')?.textContent"))};
  await waitFor("document.querySelector('#selection [role=tab]')");
  await js(`document.querySelector('#selection input[value="Wide X"]').click()`);
  assert(await js("document.querySelector('#livePrompt').textContent.includes('Wide X')"));
  await cdp('Page.reload');await waitFor(`document.querySelector('#selection input[value="Wide X"]:checked')`);
  for(const width of [1100,390]){
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:false});
    assert(await js('document.documentElement.scrollWidth<=innerWidth'),'overflow at '+width);
    if(process.env.C1_TEST_SHOTS){
      const {data}=await cdp('Page.captureScreenshot',{format:'png'});
      await writeFile(join(process.env.C1_TEST_SHOTS,'c1-'+width+'.png'),Buffer.from(data,'base64'));
    }
  }
  await js("document.querySelector('#studyNav').click()");await waitFor("document.querySelector('form[data-form=start]')");
  await js("document.querySelector('#order').value='2';document.querySelector('form[data-form=start]').requestSubmit()");
  await waitFor("document.querySelector('#selection input[type=range]:disabled')");
  await js("document.querySelector('#selection [role=tab][aria-controls$=page1]').click();document.querySelector('#selection input[value=inside]').click();document.querySelector('form[data-form=freeze]').requestSubmit()");
  await waitFor("document.querySelector('[data-act=handoff]')");
  assert(await js("document.querySelector('#panel').textContent.includes('相机外壳收在机鼻前缘轮廓以内')"));
  assert.equal(problems.length,0,JSON.stringify(problems));console.log('PASS file:// / CSP / keyboard / choices / restore / PNG:',summary);
}finally{
  if(ws?.readyState===1)ws.close();
  if(child && child.exitCode===null)child.kill();
  if(closed)await closed;
  await rm(dir,{recursive:true,force:true,maxRetries:6,retryDelay:200});
}
