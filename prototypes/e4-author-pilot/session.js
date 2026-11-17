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
function setup() {
  $("title").textContent="准备工作台"; $("context").textContent="配对场次"; $("task").textContent="每人依分配表完成两个任务，每场可回选已返回的任一稿或均不提交。";
  main.innerHTML=`<form data-form="start"><h2>场次设置</h2><p class="hint">主持人在开始前填写。两场沿用相同后端、时限和量尺。</p>
  <div class="row">${input("code","演练编号",'required maxlength="60" autocomplete="off"')}${select("order","已分配的两场顺序",Object.fromEntries(orders.map((o,i)=>[i,o.map(c=>c[0]+" / "+c[1]).join("　→　")])),"0")}</div>
  ${input("backend","外部后端及版本",'required placeholder="填写本次共同约定的后端标识"')}
  <p>每场主动操作 15 分钟，最多封存 9 次。等待回图与技术暂停单列。</p>
  ${input("scale","前四题量尺（如有）",'placeholder="各档用 | 分隔"')}

  ${submit("开始第一场")}</form>`;
}
function edit(s) {
  const previous=latest(s)?.input;
  const prompt=s.condition==="D"
    ? area("free","准备交给模型的自由提示词",previous?.prompt)
    : input("spec","选择 E 盘配置器已确认并导出的四旋规格 JSON",'required type="file" accept=".json"');
  return `<form data-form="freeze"><h2>第 ${s.versions.length+1} 次输入</h2>${prompt}
    ${s.condition==="S"?'<p class="hint">在配置器中选部位、夹角和参照方式，确认版本后导出请求 JSON。请使用本场版本。</p>':''}
    ${area("target","你希望这次改变什么？",previous?.target)}
    ${area("keep","你希望保持什么？",previous?.keep)}
    ${area("basis","你作出这个选择的依据是什么？",previous?.basis)}
    <p class="hint">这三项供研究记录，交接时仅发送本次提示词与已选图像。</p>
    ${submit("封存本次输入")}</form>${s.versions.length?action("cancelRevision","回到版本选择"):""}`;
}
async function digest(bytes) {
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
}
async function collect(s) {
  const notes={target:val("target"),keep:val("keep"),basis:val("basis")};
  if(Object.values(notes).some(v=>!v))throw Error("请填写目标、保持项和依据。");
  if(s.condition==="D"){
    const prompt=val("free");
    if(!prompt)throw Error("请填写本次自由提示词。");
    return {...notes,prompt,promptSha256:await digest(new TextEncoder().encode(prompt)),references:[]};
  }
  const file=$("spec").files[0];
  if(!file)throw Error("请导入已确认的规格。");
  const v=JSON.parse(await file.text()),req=v.request;
  if(v.schema!=="uav-configurator-e/2"||v.draft?.inputs?.task!=="quad"||v.draft.inputs.view!=="top"||
    v.draft.inputs.method!=="structured"||req?.route!=="guide"||!v.id||!req.prompt?.trim()||
    !Array.isArray(req.references)||![1,2].includes(req.references.length))
    throw Error("本场 S 条件须导入正俯视四旋、部位规格 S、带布局图的已确认版本。");
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
  return {...notes,prompt:req.prompt,promptSha256:req.promptSha256,references,configuratorId:v.id,
    parameters:v.draft.parameters,inputs:v.draft.inputs,layout:v.layout};
}

function receiptForm(s) {
  const v=latest(s);
  return `<form data-form="receipt"><h2>登记外部运行</h2><p class="hint">${esc(state.settings.backend)} · 输入已封存。仅按外部运行实际发生的情况登记。</p>
  ${detail("查看已封存输入",JSON.stringify(v.input,null,2))}
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
  ${submit("保存实际回执")}</form>`;
}
function outcomes(s) {
  return s.versions.map(v=>{
    const r=v.receipt;
    const label="第 "+v.number+" 稿";
    return `<div class="group"><b>${label}</b>　<span class="meta">${esc(({success:"成功",failed:"失败",unknown:"结果未知",unsent:"确认未调用"})[r?.status]??"待登记")}${r?.backendMatches===false?" · 实际后端标识与约定不同":""}</span>
    ${r?.image?`<div><img class="result" src="${esc(r.image.data)}" alt="${label}外部返回图"></div>`:""}</div>`;
  }).join("");
}
function decision(s) {
  const opts={"":"请选择"};
  for(const v of s.versions) if(v.receipt?.status==="success") opts[v.number]="锁定第 "+v.number+" 稿";
  opts.none="均不提交";
  return `<h2>检查版本</h2>${outcomes(s)}${s.versions.length<MAX_ATTEMPTS && latest(s).receipt?.status!=="unknown"?action("revise","继续下一次尝试"):""}
  <hr><form data-form="lock">${select("choice","最终选择",opts,"")}${area("reason","选择理由")}${submit("确认选择，进入五题")}</form>`;
}
function survey() {
  const scale=state.settings.scale;
  return `<form data-form="survey"><h2>场后五题</h2><p class="hint">${scale.length?"前四题按本场预设量尺逐项作答。":"量尺未登记，请保留原始回答。"}第五题可留空。</p>${questions.map((q,i)=>{
    if(i===4)return area("q4",q,"",false);
    return scale.length?select("q"+i,q,Object.fromEntries([["","请选择"],...scale.map((v,j)=>["v"+j,v])]),""):input("q"+i,q);
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
  if(!state) {setup(); return;}
  const s=active();
  $("context").textContent=`场次 ${state.sessions.length} / 2　·　任务 ${s.task}　·　条件 ${s.condition}`;
  $("title").textContent=({draft:"准备初稿",revision:"准备修订",waiting:"等待外部回执",decide:"查看与取舍",survey:"记录本场反馈",done:"本场已结束"})[s.phase];
  $("task").textContent="任务 "+s.task+"　"+cards[s.task];
  const t=totals(s);
  $("progress").textContent=`封存 ${s.versions.length}/${MAX_ATTEMPTS}　·　已确认调用 ${t.knownCalls} 次${t.unknownOrPending?"（另有待核）":""}`;
  $("actions").innerHTML=action("export","导出场次 JSON");
  if(s.phase==="waiting") $("actions").insertAdjacentHTML("afterbegin",action("handoff","下载本次输入"));
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
    if(Object.hasOwn(draft,el.id))el.value=draft[el.id];
  }
  updateClock();
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
  const s=active();if(!s)return;
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
    if(kind==="another"){setup();$("actions").innerHTML=action("back","返回已保存场次");return;}
    if(kind==="back"){render();return;}
    let next=structuredClone(state),s=next?.sessions.at(-1);
    if(s&&due(s)){timeout(s);if(kind!=="receipt") {await commit(next);render();return;}}
    if(kind==="expire"){await commit(next);render();return;}
    if(kind==="start"){
      if(s && !(next.sessions.length===2 && s.phase==="done"))return;
      const code=val("code"),backend=val("backend"),minutes=ACTIVE_MINUTES,order=orders[Number(val("order"))];
      const scale=val("scale")?val("scale").split("|").map(x=>x.trim()):[];
      if(!code||!backend||!order||!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error("请填写完整的场次设置。");
      if(scale.length&&(scale.length<2||scale.includes("")||new Set(scale).size!==scale.length))throw Error("每个量尺档位须有不同的非空标签，使用 | 分隔。");
      next={schema:"e4-author-pilot/2",id:crypto.randomUUID(),mode:"author_pilot",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,settings:{code,backend,minutes,order,scale,displayedReference:reference,cards,maxAttempts:MAX_ATTEMPTS},sessions:[newSession(order[0],minutes)]};
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
      const choice=val("choice"),reason=val("reason");
      if(!reason||!(choice==="none"||s.versions.some(v=>String(v.number)===choice&&v.receipt.status==="success")))throw Error("请选择可锁定的版本并填写理由。");
      const at=now();s.decision={choice,reason,at};addEvent(s,"decision_locked",at);s.phase="survey";
    }else if(kind==="survey"&&s.phase==="survey"&&s.decision&&!s.survey){
      const answers=questions.map((question,i)=>{let answer=val("q"+i);if(i<4&&state.settings.scale.length)answer=state.settings.scale[Number(answer.slice(1))];return {question,answer:answer||null};});
      if(answers.slice(0,4).some(a=>!a.answer))throw Error("请完成前四题。");
      const at=now();s.survey={at,answers};addEvent(s,"survey_saved",at);s.phase="done";
    }else return;
    await commit(next);render();
  }catch(e){message(e.message??String(e));}finally{busy=false;}
}
function draftKey(s){return ["author-pilot",state.id,s.task,s.condition,s.phase,s.versions.length].join("/");}
main.addEventListener("input",e=>{
  const s=active(),el=e.target;
  if(!s||!el.id||el.type==="file"||!el.closest("form"))return;
  const key=draftKey(s),draft=JSON.parse(sessionStorage.getItem(key)??"{}");
  draft[el.id]=el.value;sessionStorage.setItem(key,JSON.stringify(draft));
});
main.addEventListener("submit",e=>{e.preventDefault();dispatch(e.target.dataset.form);});
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(b)dispatch(b.dataset.act);});
(async()=>{try{await startDB();state=await read();render();setInterval(updateClock,1000);}catch(e){main.textContent="无法打开本地记录。请用允许本地存储的 Edge 或 Chrome 打开本页。";message(e.message);}})();
