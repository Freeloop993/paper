"use strict";
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const now = () => new Date().toISOString();
const reference = {file:"reference.png", sha256:"15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338"};
const cards = {A:"请让机鼻相机舱的前缘与机身轮廓衔接清楚，同时保住臂根连接。", B:"请让机身到机臂的轮廓过渡连贯，同时保住机鼻前缘。"};
const orders = [["AD","BS"],["BD","AS"],["AS","BD"],["BS","AD"]];
const questions = ["你的设计意图表达到了什么程度？","你对修改有多大控制感？","完成任务的负担多大？","下次是否愿意再用？","还有什么想补充？"];
const MAX_ATTEMPTS = 9;
const ACTIVE_MINUTES = 15;
const main = $("panel");
let db, state, busy = false;
const active = () => state?.sessions.at(-1);
const latest = s => s.versions.at(-1);
const val = id => $(id).value.trim();
function select(id, label, options, current, required = true) {
  const items = Object.entries(options).map(([k,v]) => `<option value="${esc(k)}"${k === current ? " selected" : ""}>${esc(v)}</option>`).join("");
  return `<label>${esc(label)}<select id="${id}" ${required ? "required" : ""}>${items}</select></label>`;
}
function area(id, label, value = "", required = true) {
  return `<label>${esc(label)}<textarea id="${id}" ${required ? "required" : ""}>${esc(value)}</textarea></label>`;
}
const input = (id,label,attrs="required") => `<label>${esc(label)}<input id="${id}" ${attrs}></label>`;
const submit = label => `<div class="buttons"><button type="submit">${label}</button></div>`;
const action = (id,label) => `<button type="button" class="secondary" data-act="${id}">${label}</button>`;
const detail = (label, value) => `<details><summary>${esc(label)}</summary><pre>${esc(value)}</pre></details>`;
const message = text => { $("notice").textContent = text; };
const time = date => new Date(date).toLocaleTimeString("zh-CN",{hour12:false});
function startDB() {
  return new Promise((resolve,reject) => {
    const req = indexedDB.open("e4-e-configurator-author-pilot-v2",1);
    req.onupgradeneeded = () => req.result.createObjectStore("records");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db=req.result; resolve(); };
  });
}
function read() {
  return new Promise((resolve,reject) => {
    const req = db.transaction("records").objectStore("records").get("active");
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
// Compare revisions inside the same transaction, including writes from another tab.
function commit(next) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction("records","readwrite");
    const store=tx.objectStore("records");
    const req=store.get("active");
    let conflict=false;
    req.onsuccess=()=>{
      if((req.result?.rev ?? 0)!==(state?.rev ?? 0)){ conflict=true; tx.abort(); return; }
      if(state && state.id !== next.id) store.put(state,state.id);
      next.rev=(state?.rev ?? 0)+1;
      store.put(next,"active");
    };
    tx.oncomplete=()=>{state=next;resolve();};
    tx.onabort=()=>reject(new Error(conflict?"其他标签页已更新记录，请刷新后继续。":"本地保存失败，请检查磁盘空间或浏览器权限。"));
    tx.onerror=()=>{};
  });
}
function addEvent(s,type,at=now(),more={}) {s.events.push({type,at,...more});}
function newSession(code,minutes) {
  const started=now();
  const s={task:code[0],condition:code[1],started,limitMs:minutes*60000,pauses:[],phase:"draft",versions:[],events:[],decision:null,survey:null};
  addEvent(s,"session_started",started);
  return s;
}
const STUDY_ENTRY = new URLSearchParams(location.search).get("mode") === "study";
let pageMode = STUDY_ENTRY ? "study" : "lab";
let selector = null;
const standardScale = ["1", "2", "3", "4", "5"];
const anchors = [["完全未表达","充分表达"],["很低","很高"],["很轻","很重"],["完全不愿意","非常愿意"]];
const orderNames = {"0":"A 自由文字 → B 参数点选","1":"B 自由文字 → A 参数点选","2":"A 参数点选 → B 自由文字","3":"B 参数点选 → A 自由文字"};
function choiceSet(key, label, choices, current="", required=false) {
  return '<fieldset class="picks"><legend>'+esc(label)+'</legend><div class="pickset">'+choices.map(([value,text],i)=>
    '<label class="pick"><input type="radio" name="'+key+'" id="'+key+'-'+i+'" value="'+esc(value)+'"'+
    (current===value?' checked':'')+(required?' required':'')+'><span>'+esc(text)+'</span></label>').join("")+'</div></fieldset>';
}
function selected(key){return main.querySelector('input[name="'+key+'"]:checked')?.value||"";}
function pairOpen(){return Boolean(state && (state.sessions.length<2 || active()?.phase!=="done"));}
function setWorkspace(preview, title){
  $("common").hidden=preview;$("preview-host").hidden=!preview;$("promptCard").hidden=!preview;
  $("viewTitle").textContent=preview?"布局与尺寸":"共同布局";
  $("labNav").setAttribute("aria-current",pageMode==="lab"?"page":"false");
  $("studyNav").setAttribute("aria-current",pageMode==="study"?"page":"false");
  $("title").textContent=title;$("sessionFooter").hidden=pageMode==="lab"||!state;
  $("labNav").disabled=STUDY_ENTRY||pairOpen();
  if(!preview){$("preview-host").replaceChildren();$("livePrompt").textContent="";}
}
function stopSelector(){if(selector){selector.destroy?.();selector=null;}}
function freeLab(){
  stopSelector();setWorkspace(true,"航拍四旋翼试配");
  $("context").textContent="设计工作台 / 参数试配";$("task").textContent="";
  $("brief").hidden=true;$("clock").textContent="";$("actions").replaceChildren();message("");
  main.innerHTML='<div id="selection"></div><div class="buttons"><button type="button" data-act="downloadSpec">导出设计规格</button><button type="button" class="secondary" data-act="downloadText">下载提示词</button></div>';
  attachSelector("c1-independent-playground");
}
function setup(){
  stopSelector();pageMode="study";setWorkspace(false,"配对预试");$("sessionFooter").hidden=true;
  $("context").textContent="设计工作台 / 作者预试";$("clock").textContent="";$("task").textContent="两场分别调整相机衔接和臂根过渡。";$("brief").hidden=false;
  const code="C1-"+crypto.randomUUID().slice(0,6);
  main.innerHTML='<form data-form="start"><h2>两场设计任务</h2><div class="methods"><div class="methodrow"><strong>参数点选</strong><small>选择规格，查看布局与提示词</small></div><div class="methodrow"><strong>自由文字</strong><small>按自己的方式描述方案</small></div></div>'+
    select("order","两场顺序",orderNames,"2")+
    '<p class="hint">每场 15 分钟主动操作，最多 9 次。等待回图单独计时。</p>'+
    '<details class="admin"><summary>主持人设置</summary>'+
    input("code","匿名场次编号",'required maxlength="60" value="'+code+'"')+
    input("backend","共同后端及版本",'value="离线流程演练" required')+
    input("scale","自定义量尺（可选）",'placeholder="默认五级。不同档位用 | 分隔"')+
    '</details>'+submit("开始第一场")+'</form>';
}
const noteChoices={
 target:["按任务简报","机鼻与相机","机身与机臂","整机布局","另写"],
 keep:["按任务简报","轴位和机臂","机鼻前缘","外观配色","另写"],
 basis:["设计简报","布局参照","上一稿观察","我的设计判断","另写"]
};
function notePick(key,label,previous){
  const options=noteChoices[key],current=previous?.noteSelections?.[key]||"";
  return choiceSet(key,label,options.map(v=>[v,v]),current)+
    '<div id="'+key+'-other"'+(current==="另写"?'':' hidden')+'>'+area(key+"Custom","补充"+label,previous?.noteSelections?.[key]==="另写"?previous[key]:"",false)+'</div>';
}
function designNotes(s){
  const vals={},picks={};
  for(const key of Object.keys(noteChoices)){
    const value=selected(key);
    picks[key]=value||null;
    vals[key]=value==="另写"?val(key+"Custom"):value||null;
    if(value==="另写"&&!vals[key])throw Error("请写下补充内容，或选择现成选项。");
  }
  return {...vals,noteSelections:picks,assignedBrief:cards[s.task]};
}
function edit(s){
  const prev=latest(s)?.input,structured=s.condition==="S";
  const params=structured?'<div id="selection"></div><details class="import"><summary>使用已有配置器文件</summary>'+
    input("spec","已导出的规格 JSON",'type="file" accept=".json"')+'<p id="importNotice" class="hint">沿用文件中的规格与提示词，本场统一使用共同轴位图。</p></details>':
    area("free","你会怎样向模型描述这个方案？",prev?.prompt||"");
  return '<form data-form="freeze"><div class="panelhead"><h2>'+(structured?"参数点选":"自由提示词")+'</h2><small>第 '+(s.versions.length+1)+' 次设计</small></div>'+params+
    '<details class="memo"><summary>本次设计记录（选填）</summary>'+
    notePick("target","希望改变",prev)+notePick("keep","希望保留",prev)+notePick("basis","选择依据",prev)+'</details>'+
    submit("确认本次设计，准备交接")+'</form>'+(s.versions.length?action("cancelRevision","返回版本选择"):"");
}
function mountStudyEditor(s){
  if(!paused(s)&&["draft","revision"].includes(s.phase)&&s.condition==="S")attachSelector(draftKey(s)+"/parameters",latest(s)?.input?.selectionState);
}
function attachSelector(key, previous = {}) {
  let initial = previous || {};
  try { initial = JSON.parse(sessionStorage.getItem(key) || "null") || initial; } catch {}
  const lab = pageMode === "lab";
  if (lab) sessionStorage.setItem("c1-lab-interacted", "yes");
  selector = C1Selection.mount({
    panel: $("selection"), preview: $("preview-host"), prompt: $("livePrompt"),
    initialSelection: initial, studyLayout: !lab,
    onChange(snapshot) {
      sessionStorage.setItem(key, JSON.stringify(snapshot.selection));
      for (const b of main.querySelectorAll('[data-act="downloadText"],[data-act="downloadSpec"]')) b.disabled = !snapshot.validation.ok;
    }
  });
}
function selectorState() {return selector.getSnapshot().selection;}
async function selectionRecord() {if(!selector)throw Error("请选择本次设计参数。");return selector.exportVersion();}
function downloadText(content) {
  const url=URL.createObjectURL(new Blob([content],{type:"text/plain;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="四旋翼-当前提示词.txt";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function digest(bytes) {
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
}
async function collect(s) {
  const notes=designNotes(s);
  if(s.condition==="D"){
    const prompt=val("free");
    if(!prompt)throw Error("请填写本次自由提示词。");
    return {...notes,prompt,promptSha256:await digest(new TextEncoder().encode(prompt)),references:[]};
  }
  const file=$("spec").files[0];
  const v=file?JSON.parse(await file.text()):await selectionRecord();
  const req=v.request;
  if(v.schema!=="uav-configurator-e/2"||v.draft?.inputs?.task!=="quad"||v.draft.inputs.view!=="top"||
    v.draft.inputs.method!=="structured"||req?.route!=="guide"||!v.id||!req.prompt?.trim()||
    !Array.isArray(req.references)||![1,2].includes(req.references.length))
    throw Error("本场 S 条件须导入正俯视四旋、部位规格 S、带布局图的已确认版本。");
  const hubs=v.layout?.adjacent_deg;
  if(state.settings.interfaceVersion==="select-20261117" && (v.draft.parameters?.frame?.frame_type!=="True X"||v.layout?.max_motor_distance_mm!==250||
    !Array.isArray(hubs)||hubs.length!==4||hubs.some(a=>Math.abs(a-90)>1e-5)||
    !v.draft.inputs.guideLines||v.draft.inputs.guideTips||v.draft.inputs.guideNose||v.draft.inputs.guideBladeLines))
    throw Error("本场沿用 250 mm 等角 X 布局和仅轴位连线的参照。可在参数试配中自由改变这些设置。");
  if(await digest(new TextEncoder().encode(req.prompt))!==req.promptSha256)throw Error("提示词摘要不符。");
  const references=[];
  for(const [i,r] of req.references.entries()){
    const asset=i===0?v.guide:v.parent,role=i===0?"top-layout":"appearance-parent";
    if(r.role!==role||!asset||r.sha256!==asset.sha256||!/^data:image\/(png|jpeg);base64,/.test(asset.dataUrl))
      throw Error("图像角色或摘要不符。");
    const bytes=Uint8Array.from(atob(asset.dataUrl.split(",")[1]),c=>c.charCodeAt(0));
    if(await digest(bytes)!==r.sha256)throw Error("参考图内容与摘要不符。");
    if(i>0&&!s.versions.some(old=>old.receipt?.image?.sha256===r.sha256))
      throw Error("研究场次的外观父图限用本场已登记返回图。");
    references.push({role,sha256:r.sha256,dataUrl:asset.dataUrl});
  }
  const importedLayoutSha=file?references[0].sha256:null;
  if(state.settings.interfaceVersion==="select-20261117"){
    if(file && references[0].sha256!==reference.sha256){
      const canonical=(await selectionRecord()).guide;
      if(canonical.sha256!==reference.sha256||await digest(Uint8Array.from(atob(canonical.dataUrl.split(",")[1]),c=>c.charCodeAt(0)))!==reference.sha256)throw Error("共同参照校验失败。");
      references[0]={role:"top-layout",sha256:canonical.sha256,dataUrl:canonical.dataUrl};
    }
    if(references[0].sha256!==reference.sha256)throw Error("当前场次的布局图与共同参照不一致。");
  }
  return {...notes,importedLayoutSha,prompt:req.prompt,promptSha256:req.promptSha256,references,configuratorId:v.id,
    parameters:v.draft.parameters,inputs:v.draft.inputs,layout:v.layout,
    source:file?"imported-configurator":"inline-selector",selectionState:file?null:selectorState()};
}

function receiptForm(s) {
  const v=latest(s);
  return `<h2>设计已封存</h2><p class="hint">将输入交给主持人，回图后继续。</p><div class="buttons">${action("handoff","下载本次输入")}</div><details class="admin receipt"><summary>主持人 · 登记运行与返回图</summary><form data-form="receipt"><p class="hint">${esc(state.settings.backend)} · 输入已封存。仅按外部运行实际发生的情况登记。</p>
  ${detail("查看已封存输入",v.input.prompt)}
  ${select("status","运行结果",{"":"请选择",success:"成功",failed:"失败",unknown:"结果未知",unsent:"确认未调用"},"")}
  ${input("rid","实际回执编号或原件定位",'placeholder="无回执可留空；有原件请填可复核位置"')}
  ${select("count","本机会实际调用次数",{"":"请选择","0":"0 次","1":"1 次","unknown":"未知"},"")}
  ${select("operation","实际执行方式",{"":"请选择",text:"仅文字生成",guide:"布局图生成",parent:"以上一稿作参考",local:"局部编辑",resample:"重新采样",none:"无",unknown:"未知"},"")}
  ${area("notes","外部回执原文或事实说明（请先脱敏）","",false)}
  <details><summary>实发请求与服务时间（有记录时填写）</summary>
  ${input("actualBackend","回执记载的后端及版本",'placeholder="按原件抄录，缺失时留空"')}
  ${input("actualRequest","实发请求原件定位",'placeholder="外部运行器的文件编号或相对路径"')}
  ${input("submitted","实际提交（本地时间）",'type="datetime-local" step="1"')}
  <div class="row">${input("runStart","模型开始（本地时间）",'type="datetime-local" step="1"')}${input("runEnd","模型结束（本地时间）",'type="datetime-local" step="1"')}</div></details>
  ${input("picture","外部返回的 PNG（成功时必选）",'type="file" accept="image/png"')}
  ${submit("保存实际回执")}</form></details>`;
}
function outcomes(s) {
  return '<div class="version-list">'+s.versions.map(v=>{
    const r=v.receipt;
    const label="第 "+v.number+" 稿";
    return `<div class="group"><b>${label}</b>　<span class="meta">${esc(({success:"成功",failed:"失败",unknown:"结果未知",unsent:"确认未调用"})[r?.status]??"待登记")}${r?.backendMatches===false?" · 实际后端标识与约定不同":""}</span>
    ${r?.image?`<div><img class="result" src="${esc(r.image.data)}" alt="${label}外部返回图"></div>`:""}</div>`;
  }).join("")+'</div>';
}
function decision(s) {
  const opts={"":"请选择"};
  for(const v of s.versions) if(v.receipt?.status==="success") opts[v.number]="锁定第 "+v.number+" 稿";
  opts.none="均不提交";
  return `<h2>检查版本</h2>${outcomes(s)}${s.versions.length<MAX_ATTEMPTS && latest(s).receipt?.status!=="unknown"?action("revise","继续下一次尝试"):""}
  <hr><form data-form="lock">${select("choice","最终选择",opts,"")}${choiceSet("lockReason","选择理由",[["符合本次目标","符合本次目标"],["整体更协调","整体更协调"],["其他部位保持较好","其他部位保持较好"],["仍有明显问题","仍有明显问题"],["另写","另写"]],"",true)}<div id="lockReason-other" hidden>${area("reason","补充理由","",false)}</div>${submit("确认选择，进入五题")}</form>`;
}
function survey() {
  const scale=state.settings.scale;
  return `<form data-form="survey"><h2>场后五题</h2><p class="hint">${scale.length?"前四题按本场预设量尺逐项作答。":"量尺未登记，请保留原始回答。"}第五题可留空。</p>${questions.map((q,i)=>{
    if(i===4)return area("q4",q,"",false);
    if(!scale.length)return input("q"+i,q);
    const label=state.settings.defaultScale?q+"（1＝"+anchors[i][0]+"，5＝"+anchors[i][1]+"）":q;
    return '<div class="surveyItem rate">'+choiceSet("q"+i,label,scale.map((v,j)=>["v"+j,v]),"",true)+'</div>';
  }).join("")}${submit("保存答卷，结束本场")}</form>`;
}
function totals(s, end=s.decision?.at??now()) {
  const receipts=s.versions.map(v=>v.receipt);
  const known=receipts.reduce((n,r)=>n+(r?.calls??0),0);
  const incomplete=receipts.some(r=>!r||r.calls===null);
  const until=Date.parse(end), wall=Math.max(0,until-Date.parse(s.started));
  function span(a,b){return Math.max(0,Math.min(until,Date.parse(b??end))-Date.parse(a));}
  const wait=s.versions.reduce((n,v)=>n+span(v.sealed,v.receipt?.recorded),0);
  const tech=s.pauses.reduce((n,p)=>n+span(p.start,p.end),0);
  return {knownCalls:known,unknownOrPending:incomplete,totalCalls:incomplete?null:known,
    wallMs:wall,externalWaitMs:wait,technicalPauseMs:tech,activeMs:wall-wait-tech};
}
function paused(s){return Boolean(s.pauses.length && !s.pauses.at(-1).end);}

function render() {
  $("actions").innerHTML=""; message("");
  stopSelector();
  if(pageMode==="lab"){freeLab();return;}
  if(!state){setup();return;}
  const s=active();
  const structured=!paused(s)&&s.condition==="S"&&["draft","revision"].includes(s.phase);
  setWorkspace(structured,({draft:"准备初稿",revision:"调整方案",waiting:"等待回图",decide:"审看与取舍",survey:"场后反馈",done:"本场已结束"})[s.phase]);$("brief").hidden=false;$("sessionFooter").hidden=false;
  $("context").textContent=`场次 ${state.sessions.length} / 2　·　任务 ${s.task}　·　条件 ${s.condition}`;
  $("title").textContent=({draft:"准备初稿",revision:"准备修订",waiting:"等待外部回执",decide:"查看与取舍",survey:"记录本场反馈",done:"本场已结束"})[s.phase];
  $("task").textContent="任务 "+s.task+"　"+cards[s.task];
  const t=totals(s);
  $("progress").textContent=`封存 ${s.versions.length}/${MAX_ATTEMPTS}　·　已确认调用 ${t.knownCalls} 次${t.unknownOrPending?"（另有待核）":""}`;
  $("actions").innerHTML=action("export","导出场次 JSON");

  if(s.phase==="draft"||s.phase==="revision") main.innerHTML=edit(s);
  if(s.phase==="waiting") main.innerHTML=receiptForm(s);
  if(s.phase==="decide") main.innerHTML=decision(s);
  if(s.phase==="survey") main.innerHTML=survey();
  if(s.phase==="done") main.innerHTML=`<h2>${s.decision.choice==="timeout"?"超时未锁定":"场后记录已保存"}</h2>
    <p class="hint">已保留本场输入、步骤时间、外部回执及五题原答。</p>${detail("查看步骤时间",s.events.map(e=>time(e.at)+"　"+e.type).join("\n"))}
    <div class="buttons">${state.sessions.length===1?action("next","开始第二场"):action("another","准备另一组演练")}</div>`;
  if(!s.decision && s.phase!=="waiting"){
    $("actions").insertAdjacentHTML("afterbegin",action(paused(s)?"resume":"pause",paused(s)?"恢复场次":"技术暂停"));
    if(paused(s))main.innerHTML="<h2>技术暂停中</h2>";
  }
  const key=draftKey(s);
  const draft=JSON.parse(sessionStorage.getItem(key)??"{}");
  for(const el of main.querySelectorAll("textarea[id],input[id]:not([type=file]),select[id]")){
    if(!Object.hasOwn(draft,el.id))continue;
    if(el.type==="radio")el.checked=draft[el.id]===true;else el.value=draft[el.id];
  }
  for(const other of ["target","keep","basis","lockReason"]){
    const field=$(other+"-other");if(field)field.hidden=selected(other)!=="另写";
  }
  mountStudyEditor(s);updateClock();
}
function due(s){return !s.decision&&totals(s).activeMs>=s.limitMs;}
function timeout(s){
  if(s.decision)return;
  const at=new Date(Date.now()-Math.max(0,totals(s).activeMs-s.limitMs)).toISOString();
  s.decision={choice:"timeout",reason:"冻结时限内未锁定",at};
  addEvent(s,"timeout_unlocked",at);
  if(s.phase!=="waiting")s.phase="survey";
}
function updateClock(){
  const s=active();if(!s||pageMode!=="study")return;
  const end=s.decision?.at??now();
  const sec=Math.max(0,Math.floor((totals(s,end).activeMs)/1000));
  $("clock").textContent=`主动用时 ${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")} / ${state.settings.minutes} 分钟`;
  if(due(s)&&!busy) dispatch("expire");
}
function download(name,obj){
  const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function png(file){
  if(!file)return null;
  const bytes=await file.arrayBuffer();
  if(new Uint8Array(bytes).slice(0,8).join(",")!=="137,80,78,71,13,10,26,10")throw Error("请选择有效的 PNG 原件。");
  const bitmap=await createImageBitmap(file);const width=bitmap.width,height=bitmap.height;bitmap.close();
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(new Blob([bytes],{type:"image/png"}));});
  return {name:file.name,width,height,bytes:bytes.byteLength,sha256:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join(""),data};
}
async function record(s) {
  const status=val("status"),count=val("count"),operation=val("operation"),id=val("rid"),note=val("notes");
  const file=$("picture").files[0];
  if(status==="success"&&(!id||!file||count!=="1"||["none","unknown"].includes(operation)))throw Error("成功须有 1 次调用、实际方式、回执定位和返回 PNG。");
  if(status==="unsent"&&(count!=="0"||operation!=="none"))throw Error("确认未调用时请登记 0 次、方式为无。");
  if(status!=="unsent"&&(count==="0"||operation==="none"))throw Error("零次调用请选“确认未调用”；不清楚请选“未知”。");
  if(status!=="success"&&(!note||file))throw Error("请说明失败、未知或未调用的事实，返回图仅关联成功回执。");

  if(id&&s.versions.some(v=>v.receipt?.id===id))throw Error("这一回执已经登记。");
  const readTime=id=>val(id)?new Date(val(id)).toISOString():null;
  const submitted=readTime("submitted");
  const started=readTime("runStart"),ended=readTime("runEnd");
  if(started&&ended&&ended<started)throw Error("外部结束时间须晚于或等于开始时间。");
  if(status==="unsent"&&(started||ended||val("actualRequest")))throw Error("未调用的机会不应有实发请求或服务时间。");
  const image=await png(file);
  const at=now();
  const v=latest(s);
  // Keep protocol deviations as observed rather than relabelling their outcome.
  const expectedOperation=s.condition==="D"?["text"]:v.input.references.length===1?["guide"]:["local","parent"];
  const routeMatches=["none","unknown"].includes(operation)?null:expectedOperation.includes(operation);
  if(status==="unsent"&&submitted)throw Error("确认未调用的记录不能有提交时间。");
  const stamps=[v.sealed,submitted,started,ended,at].filter(Boolean).map(Date.parse);
  if(stamps.some((x,i)=>i>0&&x<stamps[i-1]))throw Error("请核对封存、提交、运行、返回的时间顺序和服务器时区。");
  const actualBackend=val("actualBackend")||null;
  latest(s).receipt={status,calls:count==="unknown"?null:Number(count),operation,routeMatches,id:id||null,note:note||null,actualBackend,backendMatches:actualBackend===null?null:actualBackend===state.settings.backend,actualRequest:val("actualRequest")||null,submitted,started,ended,image,recorded:at,intervalsMs:{
    handoff:submitted?Date.parse(submitted)-Date.parse(v.sealed):null,queue:submitted&&started?Date.parse(started)-Date.parse(submitted):null,
    model:started&&ended?Date.parse(ended)-Date.parse(started):null,returnToDisplay:ended?Date.parse(at)-Date.parse(ended):null}};
  addEvent(s,"receipt_entered",at,{kind:latest(s).kind});
  s.phase=s.decision?"survey":"decide";
}
async function dispatch(kind){
  if(busy)return;busy=true;message("");
  try{
    if(kind==="lab"||kind==="study"){
      if(kind==="lab"&&(STUDY_ENTRY||pairOpen())){message("场次已开始，请先完成本场。");return;}
      pageMode=kind;render();return;
    }
    if(kind==="downloadSpec"||kind==="downloadText"){
      const v=await selectionRecord();
      if(kind==="downloadSpec")download("四旋翼-试配-"+v.id+".json",v);
      else downloadText(v.request.prompt);
      message("已导出当前试配版本。");return;
    }
    if(kind==="export"){
      const fresh=await read();
      const complete=fresh.sessions.length===2&&fresh.sessions[1].phase==="done";
      const sessions=complete?fresh.sessions:[fresh.sessions.at(-1)];
      download("E4-"+fresh.id+(complete?"-pair":"-"+sessions[0].task+sessions[0].condition)+".json",{...fresh,sessions:sessions.map(s=>({...s,summary:totals(s)}))});
      return;
    }
    if(kind==="handoff"&&active()?.phase==="waiting"){
      const s=active(),v=latest(s);
      download("E4-"+state.id+"-"+s.task+s.condition+"-"+v.number+".json",{pairId:state.id,backend:state.settings.backend,condition:s.condition,attempt:v.number,prompt:v.input.prompt,promptSha256:v.input.promptSha256,references:v.input.references,sealed:v.sealed});
      return;
    }
    if(kind==="another"){setup();$("sessionFooter").hidden=false;$("actions").innerHTML=action("back","返回已保存场次");return;}
    if(kind==="back"){render();return;}
    let next=structuredClone(state),s=next?.sessions.at(-1);
    if(s&&due(s)){timeout(s);if(kind!=="receipt") {await commit(next);render();return;}}
    if(kind==="expire"){await commit(next);render();return;}
    if(kind==="start"){
      if(s && !(next.sessions.length===2 && s.phase==="done"))return;
      const code=val("code"),backend=val("backend"),minutes=ACTIVE_MINUTES,order=orders[Number(val("order"))];
      const scale=val("scale")?val("scale").split("|").map(x=>x.trim()):standardScale.slice();
      if(!code||!backend||!order||!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error("请填写完整的场次设置。");
      if(scale.length&&(scale.length<2||scale.includes("")||new Set(scale).size!==scale.length))throw Error("每个量尺档位须有不同的非空标签，使用 | 分隔。");
      next={schema:"e4-author-pilot/2",id:crypto.randomUUID(),mode:"author_pilot",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,settings:{code,backend,minutes,order,scale,displayedReference:reference,cards,maxAttempts:MAX_ATTEMPTS,interfaceVersion:"select-20261117",defaultScale:!val("scale"),exploredInterface:sessionStorage.getItem("c1-lab-interacted")==="yes"},sessions:[newSession(order[0],minutes)]};
    }else if(kind==="next"&&s.phase==="done"&&next.sessions.length===1){
      next.sessions.push(newSession(next.settings.order[1],next.settings.minutes));
    }else if(kind==="pause"&&!paused(s)&&!s.decision&&s.phase!=="waiting"){
      const at=now();s.pauses.push({start:at,end:null});addEvent(s,"technical_pause",at);
    }else if(kind==="resume"&&paused(s)){
      const at=now();s.pauses.at(-1).end=at;addEvent(s,"technical_resume",at);
    }else if(paused(s))return;
    else if(kind==="freeze"&&["draft","revision"].includes(s.phase)&&s.versions.length<MAX_ATTEMPTS){
      const input=await collect(s),at=now();
      if(due(s))timeout(s);
      else{
        const number=s.versions.length+1;
        s.versions.push({number,kind:s.phase,sealed:at,input,receipt:null});
        addEvent(s,"input_sealed",at,{number});s.phase="waiting";
      }

    }else if(kind==="receipt"&&s.phase==="waiting"&&!latest(s).receipt){
      await record(s);if(due(s))timeout(s);
    }else if(kind==="revise"&&s.phase==="decide"&&s.versions.length<MAX_ATTEMPTS&&latest(s).receipt.status!=="unknown"){
      s.phase="revision";addEvent(s,"revision_started");
    }else if(kind==="cancelRevision"&&s.phase==="revision"){
      s.phase="decide";addEvent(s,"revision_input_discarded");
    }else if(kind==="lock"&&s.phase==="decide"){
      const choice=val("choice"),choiceReason=selected("lockReason"),reason=choiceReason==="另写"?val("reason"):choiceReason;
      if(!reason||!(choice==="none"||s.versions.some(v=>String(v.number)===choice&&v.receipt.status==="success")))throw Error("请选择可锁定的版本并填写理由。");
      const at=now();s.decision={choice,reason,at};addEvent(s,"decision_locked",at);s.phase="survey";
    }else if(kind==="survey"&&s.phase==="survey"&&s.decision&&!s.survey){
      const answers=questions.map((question,i)=>{let answer=i<4&&state.settings.scale.length?selected("q"+i):val("q"+i);if(i<4&&state.settings.scale.length)answer=answer?state.settings.scale[Number(answer.slice(1))]:null;return {question,answer:answer||null};});
      if(answers.slice(0,4).some(a=>!a.answer))throw Error("请完成前四题。");
      const at=now();s.survey={at,answers};addEvent(s,"survey_saved",at);s.phase="done";
    }else return;
    await commit(next);render();
  }catch(e){message(e.message??String(e));}finally{busy=false;}
}
function draftKey(s){return ["author-pilot",state.id,s.task,s.condition,s.phase,s.versions.length].join("/");}
main.addEventListener("input",e=>{
  const s=active(),el=e.target;
  if(el.type==="radio"){const other=$(el.name+"-other");if(other)other.hidden=el.value!=="另写";}
  if(!s||pageMode!=="study"||!el.id||el.type==="file"||!el.closest("form"))return;
  const key=draftKey(s),draft=JSON.parse(sessionStorage.getItem(key)??"{}");
  if(el.closest("#selection"))return;
  if(el.type==="radio"){
    for(const option of el.form.querySelectorAll('input[type="radio"]'))if(option.name===el.name)draft[option.id]=option.checked;
    const other=$(el.name+"-other");if(other)other.hidden=el.value!=="另写";
  }else draft[el.id]=el.value;
  sessionStorage.setItem(key,JSON.stringify(draft));
});
main.addEventListener("submit",e=>{e.preventDefault();if(e.target.dataset.form)dispatch(e.target.dataset.form);});
main.addEventListener("change",e=>{
  if(e.target.id==="spec"){
    const imported=Boolean(e.target.files.length);
    const host=$("selection");if(host)host.hidden=imported;
    $("preview-host").hidden=imported;$("promptCard").hidden=imported;
    $("importNotice").textContent=imported?"将使用 "+e.target.files[0].name+"。清除文件即可回到点选方案。":"将使用当前点选方案。";
  }
});
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(b)dispatch(b.dataset.act);});
(async()=>{try{await startDB();state=await read();if(pairOpen())pageMode="study";render();setInterval(updateClock,1000);}catch(e){main.textContent="无法打开本地记录。请用允许本地存储的 Edge 或 Chrome 打开本页。";message(e.message);}})();
