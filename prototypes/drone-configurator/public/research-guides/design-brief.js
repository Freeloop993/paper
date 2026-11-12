"use strict";
const form = document.querySelector("#brief");
const statusLine = document.querySelector("#status");
const siteNames = ["机身平面轮廓与比例","臂根到机身的过渡","机鼻（相机舱）前缘轮廓","分件线与配色分区"];
const fields = ["title","change","free","wl","dd","keep","source"];
const constraints = ["四旋","双叶","展开","正交顶视","机头朝上"];
const storageKey = "t06-orthographic-brief-v1";
function emptyBrief() {
  return Object.assign(Object.fromEntries(fields.map(k => [k,""])), {sites:[],goals:{}});
}
let state = {terms:null,briefs:[emptyBrief(),emptyBrief(),emptyBrief()]};
let active = 0;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && saved.briefs?.length === 3) state = saved;
} catch { statusLine.textContent = "本页无法读取本机草稿，可随时导出 JSON。"; }
function save() {
  try { localStorage.setItem(storageKey,JSON.stringify(state)); }
  catch { statusLine.textContent = "本机存储不可用，请导出草稿留存。"; }
}
function readForm() {
  const data = state.briefs[active];
  for (const name of fields) data[name] = form.elements.namedItem(name).value.trim();
  data.sites = [...form.querySelectorAll("[name=site]:checked")].map(x => x.value);
  data.goals = Object.fromEntries([...form.querySelectorAll("[data-term]")].map(x => [x.dataset.term,x.value]));
  save();
}
function render() {
  const data = state.briefs[active];
  [...document.querySelector("#tabs").children].forEach((button,i) => button.setAttribute("aria-pressed",String(active===i)));
  for (const name of fields) form.elements.namedItem(name).value = data[name] || "";
  for (const box of form.querySelectorAll("[name=site]")) box.checked = data.sites.includes(box.value);
  const area = document.querySelector("#terms");
  area.replaceChildren();
  if (!state.terms) {
    area.textContent = "词对 v1 待作者确认。现可填写部位、几何和依据并导出草稿。";
    return;
  }
  for (const pair of state.terms.pairs) {
    const label = document.createElement("label");
    label.textContent = pair.left + " — " + pair.right;
    const select = document.createElement("select");
    select.dataset.term = pair.id;
    for (const [value,text] of [["","请选择"],["left",pair.left],["right",pair.right],["none","不作要求"]])
      select.add(new Option(text,value));
    select.value = data.goals[pair.id] || "";
    label.append(select);
    area.append(label);
  }
}
for (let i=0;i<3;i++) {
  const btn=document.createElement("button");
  btn.type="button"; btn.textContent="方向 "+(i+1);
  btn.onclick=()=>{readForm(); active=i; render(); statusLine.textContent="";};
  document.querySelector("#tabs").append(btn);
}
for (const s of siteNames) {
  const label=document.createElement("label"), input=document.createElement("input");
  label.className="spot"; input.type="checkbox"; input.name="site"; input.value=s;
  label.append(input," "+s); document.querySelector("#sites").append(label);
}
form.addEventListener("input",readForm);
document.querySelector("#importTerms").onchange=async event=>{
  if (!event.target.files.length) return;
  try {
    const spec=JSON.parse(await event.target.files[0].text());
    const pairs=spec.pairs;
    const named=x=>typeof x==="string"&&x.trim().length>0;
    if (!named(spec.version)||!named(spec.freezeReference)||!Array.isArray(pairs)||![3,4].includes(pairs.length)||
        pairs.some(p=>!p||!named(p.id)||!named(p.left)||!named(p.right)||p.left===p.right)||
        new Set(pairs.map(p=>p.id)).size!==pairs.length) throw Error();
    const terms={version:spec.version,freezeReference:spec.freezeReference,pairs:pairs.map(({id,left,right})=>({id,left,right}))};
    if (state.terms && JSON.stringify(terms)!==JSON.stringify(state.terms) && state.briefs.some(b=>Object.values(b.goals).some(Boolean))) {
      statusLine.textContent="已有方向使用了另一版词对。请保留现有规格，另开独立工作副本。"; return;
    }
    state.terms=terms; save(); render(); statusLine.textContent="已载入 "+terms.version;
  } catch { statusLine.textContent="无法载入。请核对词对文件、版本与冻结记录。"; }
  finally { event.target.value=""; }
};
function exportBrief(confirmed) {
  readForm();
  const b=state.briefs[active];
  if (confirmed) {
    if (!state.terms) { statusLine.textContent="请先载入作者已确认的词对 v1。"; return; }
    if (Object.values(b.goals).some(x=>!x)||!b.title||b.sites.length<1||b.sites.length>2||!b.change||!b.free||!b.wl||!b.dd||!b.source) {
      statusLine.textContent="请完成各词对的取向、1 至 2 个部位、改变项、自由项、两个比值和依据。"; return;
    }
  }
  const result={schema:"t06-quad-brief-v1",direction:active+1,status:confirmed?"author_confirmed":"draft",savedAt:new Date().toISOString(),
    constraints,terms:state.terms,brief:b};
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:"application/json"}));
  const a=document.createElement("a"); a.href=url; a.download="T06-"+(active+1)+"-"+result.status+".json"; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  statusLine.textContent=confirmed?"已生成当前方向的确认文件。":"已生成当前方向的草稿文件。";
}
form.onsubmit=e=>{e.preventDefault();exportBrief(true);};
document.querySelector("#draft").onclick=()=>exportBrief(false);
render();
