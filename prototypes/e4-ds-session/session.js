"use strict";
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const now = () => new Date().toISOString();
const reference = {file:"reference.png", sha256:"15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338"};
const cards = {A:"请让机鼻相机舱的前缘与机身轮廓衔接清楚，同时保住臂根连接。", B:"请让机身到机臂的轮廓过渡连贯，同时保住机鼻前缘。"};
const orders = [["AD","BS"],["BD","AS"],["AS","BD"],["BS","AD"]];
const questions = ["你的设计意图表达到了什么程度？","你对修改有多大控制感？","完成任务的负担多大？","下次是否愿意再用？","还有什么想补充？"];
const fields = {
  body_plan:["机身平面形",{pod:"流线舱",box:"方正机壳"}],
  arm_root:["臂根过渡",{seamless:"无缝过渡",socket:"外露承座",hinge:"折叠铰接"}],
  camera:["机鼻外突",{inside:"内嵌",projecting:"前伸云台"}],
  cover:["顶盖分件",{single:"单盖",multi:"多块分件"}],
  arm_finish:["臂材质",{matte_same:"同色哑光",exposed_carbon:"外露碳纹"}]
};
const pairs = [["紧凑","舒展"],["简洁","繁复"],["整体","拼凑"]];
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
    const req = indexedDB.open("e4-ds-offline-session-v1",1);
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
  const s={task:code[0],condition:code[1],started,deadline:new Date(Date.parse(started)+minutes*60000).toISOString(),phase:"draft",versions:[],events:[],decision:null,survey:null};
  addEvent(s,"session_started",started);
  return s;
}
function setup() {
  $("title").textContent="准备工作台"; $("context").textContent="配对场次"; $("task").textContent="每人依分配表完成两个任务，每场可回选初稿或均不提交。";
  main.innerHTML=`<form data-form="start"><h2>场次设置</h2><p class="hint">主持人在开始前填写。两场沿用相同后端、时限和量尺。</p>
  <div class="row">${input("code","演练编号",'required maxlength="60" autocomplete="off"')}${select("order","已分配的两场顺序",Object.fromEntries(orders.map((o,i)=>[i,o.map(c=>c[0]+" / "+c[1]).join("　→　")])),"0")}</div>
  ${input("backend","外部后端及版本",'required placeholder="填写本次共同约定的后端标识"')}
  <div class="row">${input("minutes","每场时限（分钟）",'type="number" min="1" max="1440" value="25" required')}${input("scale","前四题冻结量尺（如已提供）",'placeholder="按原顺序用 | 分隔各档，未提供时留空"')}</div>
  ${submit("开始第一场")}</form>`;
}
function edit(s) {
  const rev=s.phase==="revision";
  const old=s.versions[0]?.input;
  const role=rev?"修订":"初稿";
  let controls="";
  if(s.condition==="D") {
    controls=area("free",rev?"修订提示词":"自由提示词",rev?old.text:"");
  } else {
    const chosen=old?.params??dictionary.base;
    controls=`<p class="meta">造型字典 v1.3</p><div class="row">${Object.entries(fields).map(([k,[l,opts]])=>select(k,l,opts,chosen[k])).join("")}</div>
    <details open><summary>规格与设计意图</summary><div class="row">${pairs.map((p,i)=>select("pair"+i,p.join(" — "),{"不作要求":"不作要求",[p[0]]:p[0],[p[1]]:p[1]},old?.targets[i]??"不作要求")).join("")}</div>
    ${area("target","要改的部位与目标",old?.target)}${area("keep","要保持的部位",old?.keep)}
    ${input("basis","依据卡号或设计者判断",`required value="${esc(old?.basis??"")}"`)}
    <p class="hint">自由项包括壳面曲率、机臂截面、电机座、桨叶外形与分缝走向。</p></details>`;
  }
  return `<form data-form="freeze"><h2>${role}输入</h2><p class="hint">${rev?"依据初稿写明要改变和保留的内容。":"写下本场目标与保持项，然后封存交给外部操作者的输入。"}</p>${rev?outcomes(s):""}${controls}${submit("封存"+role+"输入")}</form>${rev?action("cancelRevision","返回版本选择"):""}`;
}
function collect(s) {
  if(s.condition==="D") {const text=val("free"); if(!text) throw Error("请填写自由提示词。");return {text};}
  const params=Object.fromEntries(Object.keys(fields).map(k=>[k,val(k)]));
  const targets=pairs.map((_,i)=>val("pair"+i));
  const target=val("target"),keep=val("keep"),basis=val("basis");
  if(!target||!keep||!basis) throw Error("请填写目标、保持项和依据。");
  const lines=dictionary.fixed_lines;
  const cmf=params.arm_finish==="exposed_carbon"?dictionary.cmf_line_when_exposed_carbon:lines.cmf;
  const prompt=[lines.head,lines.layout,...Object.keys(fields).map(k=>dictionary.params[k][params[k]]),cmf,lines.tail].join("\n");
  return {dictionary:dictionary.version,params,targets,target,keep,basis,prompt};
}
function receiptForm(s) {
  const v=latest(s);
  return `<form data-form="receipt"><h2>登记外部运行</h2><p class="hint">${esc(state.settings.backend)} · 输入已封存。仅按外部运行实际发生的情况登记。</p>
  ${detail("查看已封存输入",JSON.stringify(v.input,null,2))}
  ${select("status","运行结果",{"":"请选择",success:"成功",failed:"失败",unknown:"结果未知",unsent:"确认未调用"},"")}
  ${input("rid","实际回执编号或原件定位",'placeholder="无回执可留空；有原件请填可复核位置"')}
  ${select("count","本机会实际调用次数",{"":"请选择","0":"0 次","1":"1 次","unknown":"未知"},"")}
  ${select("operation","实际执行方式",{"":"请选择",guide:"共同参考图生成",parent:"以上一稿作参考",local:"局部编辑",resample:"重新采样",none:"无",unknown:"未知"},"")}
  ${area("notes","外部回执原文或事实说明（请先脱敏）","",false)}
  <details><summary>实发请求与服务时间（有记录时填写）</summary>
  ${input("actualBackend","回执记载的后端及版本",'placeholder="按原件抄录，缺失时留空"')}
  ${input("actualRequest","实发请求原件定位",'placeholder="外部运行器的文件编号或相对路径"')}
  <div class="row">${input("runStart","外部开始（本地时间）",'type="datetime-local" step="1"')}${input("runEnd","外部结束（本地时间）",'type="datetime-local" step="1"')}</div></details>
  ${input("picture","外部返回的 PNG（成功时必选）",'type="file" accept="image/png"')}
  ${submit("保存实际回执")}</form>`;
}
function outcomes(s) {
  return s.versions.map(v=>{
    const r=v.receipt;
    const label=v.kind==="draft"?"初稿":"修订稿";
    return `<div class="group"><b>${label}</b>　<span class="meta">${esc(({success:"成功",failed:"失败",unknown:"结果未知",unsent:"确认未调用"})[r?.status]??"待登记")}${r?.backendMatches===false?" · 实际后端标识与约定不同":""}</span>
    ${r?.image?`<div><img class="result" src="${r.image.data}" alt="${label}外部返回图"></div>`:""}</div>`;
  }).join("");
}
function decision(s) {
  const opts={"":"请选择"};
  for(const v of s.versions) if(v.receipt?.status==="success") opts[v.kind]=v.kind==="draft"?"锁定初稿":"锁定修订稿";
  opts.none="均不提交";
  return `<h2>检查版本</h2>${outcomes(s)}${s.versions.length===1&&opts.draft?action("revise","使用一次修订机会"):""}
  <hr><form data-form="lock">${select("choice","最终选择",opts,"")}${area("reason","选择理由")}${submit("确认选择，进入五题")}</form>`;
}
function survey() {
  const scale=state.settings.scale;
  return `<form data-form="survey"><h2>场后五题</h2><p class="hint">${scale.length?"前四题按本场预设量尺逐项作答。":"量尺未登记，请保留原始回答。"}第五题可留空。</p>${questions.map((q,i)=>{
    if(i===4)return area("q4",q,"",false);
    return scale.length?select("q"+i,q,Object.fromEntries([["","请选择"],...scale.map((v,j)=>["v"+j,v])]),""):input("q"+i,q);
  }).join("")}${submit("保存答卷，结束本场")}</form>`;
}
function totals(s) {
  const receipts=s.versions.map(v=>v.receipt);
  const known=receipts.reduce((n,r)=>n+(r?.calls??0),0);
  const incomplete=receipts.some(r=>!r||r.calls===null);
  const wait=s.versions.reduce((n,v)=>n+(v.receipt?Math.max(0,Math.min(Date.parse(v.receipt.recorded),Date.parse(s.decision?.at??now()))-Date.parse(v.sealed)):0),0);
  const duration=s.decision?Date.parse(s.decision.at)-Date.parse(s.started):null;
  return {knownCalls:known,unknownOrPending:incomplete,totalCalls:incomplete?null:known,elapsedToDecisionMs:duration,handoffToEntryMs:wait,nonWaitingToDecisionMs:duration===null?null:Math.max(0,duration-wait)};
}
function render() {
  $("actions").innerHTML=""; message("");
  if(!state) {setup(); return;}
  const s=active();
  $("context").textContent=`场次 ${state.sessions.length} / 2　·　任务 ${s.task}　·　条件 ${s.condition}`;
  $("title").textContent=({draft:"准备初稿",revision:"准备修订",waiting:"等待外部回执",decide:"查看与取舍",survey:"记录本场反馈",done:"本场已结束"})[s.phase];
  $("task").textContent="任务 "+s.task+"　"+cards[s.task];
  const t=totals(s);
  $("progress").textContent=`初稿 ${s.versions.length?1:0}/1　·　修订 ${s.versions.length>1?1:0}/1　·　已确认调用 ${t.knownCalls} 次${t.unknownOrPending?"（另有待核）":""}`;
  $("actions").innerHTML=action("export","导出场次 JSON");
  if(s.phase==="waiting") $("actions").insertAdjacentHTML("afterbegin",action("handoff","下载本次输入"));
  if(s.phase==="draft"||s.phase==="revision") main.innerHTML=edit(s);
  if(s.phase==="waiting") main.innerHTML=receiptForm(s);
  if(s.phase==="decide") main.innerHTML=decision(s);
  if(s.phase==="survey") main.innerHTML=survey();
  if(s.phase==="done") main.innerHTML=`<h2>${s.decision.choice==="timeout"?"超时未锁定":"场后记录已保存"}</h2>
    <p class="hint">已保留本场输入、步骤时间、外部回执及五题原答。</p>${detail("查看步骤时间",s.events.map(e=>time(e.at)+"　"+e.type).join("\n"))}
    <div class="buttons">${state.sessions.length===1?action("next","开始第二场"):action("another","准备另一组演练")}</div>`;
  updateClock();
}
function due(s){return !s.decision&&Date.now()>=Date.parse(s.deadline);}
function timeout(s){
  if(s.decision)return;
  const at=s.deadline;
  s.decision={choice:"timeout",reason:"冻结时限内未锁定",at};
  addEvent(s,"timeout_unlocked",at);
  if(s.phase!=="waiting")s.phase="survey";
}
function updateClock(){
  const s=active();if(!s)return;
  const end=s.decision?.at??now();
  const sec=Math.max(0,Math.floor((Date.parse(end)-Date.parse(s.started))/1000));
  $("clock").textContent=`用时 ${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")} / ${state.settings.minutes} 分钟`;
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
  if(s.versions.length===1&&["parent","local"].includes(operation))throw Error("本场初稿没有上一稿可作父图。");
  if(id&&s.versions.some(v=>v.receipt?.id===id))throw Error("这一回执已经登记。");
  const readTime=id=>val(id)?new Date(val(id)).toISOString():null;
  const started=readTime("runStart"),ended=readTime("runEnd");
  if(started&&ended&&ended<started)throw Error("外部结束时间须晚于或等于开始时间。");
  if(status==="unsent"&&(started||ended||val("actualRequest")))throw Error("未调用的机会不应有实发请求或服务时间。");
  const image=await png(file);
  const at=now();
  const actualBackend=val("actualBackend")||null;
  latest(s).receipt={status,calls:count==="unknown"?null:Number(count),operation,id:id||null,note:note||null,actualBackend,backendMatches:actualBackend===null?null:actualBackend===state.settings.backend,actualRequest:val("actualRequest")||null,started,ended,image,recorded:at};
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
      download("E4-"+state.id+"-"+s.task+s.condition+"-"+v.kind+".json",{pairId:state.id,code:state.settings.code,backend:state.settings.backend,condition:s.condition,task:cards[s.task],kind:v.kind,reference,parentAvailable:v.parentAvailable,input:v.input,sealed:v.sealed});
      return;
    }
    if(kind==="another"){setup();$("actions").innerHTML=action("back","返回已保存场次");return;}
    if(kind==="back"){render();return;}
    let next=structuredClone(state),s=next?.sessions.at(-1);
    if(s&&due(s)){timeout(s);if(kind!=="receipt") {await commit(next);render();return;}}
    if(kind==="expire"){await commit(next);render();return;}
    if(kind==="start"){
      if(s && !(next.sessions.length===2 && s.phase==="done"))return;
      const code=val("code"),backend=val("backend"),minutes=Number(val("minutes")),order=orders[Number(val("order"))];
      const scale=val("scale")?val("scale").split("|").map(x=>x.trim()):[];
      if(!code||!backend||!order||!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error("请填写完整的场次设置。");
      if(scale.length&&(scale.length<2||scale.includes("")||new Set(scale).size!==scale.length))throw Error("每个量尺档位须有不同的非空标签，使用 | 分隔。");
      next={schema:"e4-ds-session/1",id:crypto.randomUUID(),mode:"offline_rehearsal",settings:{code,backend,minutes,order,scale,reference,cards,dictionary:dictionary.version},sessions:[newSession(order[0],minutes)]};
    }else if(kind==="next"&&s.phase==="done"&&next.sessions.length===1){
      next.sessions.push(newSession(next.settings.order[1],next.settings.minutes));
    }else if(kind==="freeze"&&["draft","revision"].includes(s.phase)&&s.versions.length<2){
      const input=collect(s),vkind=s.phase,at=now();
      if(vkind==="revision"&&s.condition==="S"&&Object.keys(fields).every(k=>input.params[k]===s.versions[0].input.params[k]))throw Error("结构化修订须至少改变一个造型档位。");
      s.versions.push({kind:vkind,sealed:at,input,reference,parentAvailable:vkind==="revision"?s.versions[0].receipt.image.sha256:null,receipt:null});
      addEvent(s,"input_sealed",at,{kind:vkind});s.phase="waiting";
    }else if(kind==="receipt"&&s.phase==="waiting"&&!latest(s).receipt){
      await record(s);if(due(s))timeout(s);
    }else if(kind==="revise"&&s.phase==="decide"&&s.versions.length===1&&latest(s).receipt.status==="success"){
      s.phase="revision";addEvent(s,"revision_started");
    }else if(kind==="cancelRevision"&&s.phase==="revision"){
      s.phase="decide";addEvent(s,"revision_input_discarded");
    }else if(kind==="lock"&&s.phase==="decide"){
      const choice=val("choice"),reason=val("reason");
      if(!reason||!(choice==="none"||s.versions.some(v=>v.kind===choice&&v.receipt.status==="success")))throw Error("请选择可锁定的版本并填写理由。");
      const at=now();s.decision={choice,reason,at};addEvent(s,"decision_locked",at);s.phase="survey";
    }else if(kind==="survey"&&s.phase==="survey"&&s.decision&&!s.survey){
      const answers=questions.map((question,i)=>{let answer=val("q"+i);if(i<4&&state.settings.scale.length)answer=state.settings.scale[Number(answer.slice(1))];return {question,answer:answer||null};});
      if(answers.slice(0,4).some(a=>!a.answer))throw Error("请完成前四题。");
      const at=now();s.survey={at,answers};addEvent(s,"survey_saved",at);s.phase="done";
    }else return;
    await commit(next);render();
  }catch(e){message(e.message??String(e));}finally{busy=false;}
}
main.addEventListener("submit",e=>{e.preventDefault();dispatch(e.target.dataset.form);});
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(b)dispatch(b.dataset.act);});
(async()=>{try{await startDB();state=await read();render();setInterval(updateClock,1000);}catch(e){main.textContent="无法打开本地记录。请用允许本地存储的 Edge 或 Chrome 打开本页。";message(e.message);}})();
