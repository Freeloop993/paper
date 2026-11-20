"use strict";
const byId = id => document.getElementById(id);
const node = (tag, text) => Object.assign(document.createElement(tag), {textContent:text});
const titles = {A:"相机与机身整合", B:"机臂与机身过渡"};
const tasks = {A:"重点处理前部相机与机身体量的关系，同时保留清楚的机臂连接。", B:"重点处理四个臂根向主体的过渡，同时保留可辨的前部相机。"};
const methods = {D:"自由文字", S:"部位、改变与保持"};
const labels = {awaiting_example:"等待登记样图", example_attached:"已登记演练样图", unknown:"状态未知", failed:"失败", stopped_without_image:"停止时无图"};
let session;
let busy = false;
async function request(url, data) {
  const options = data === undefined ? {} : {method:"POST", headers:{"Content-Type":"application/json"},body:JSON.stringify(data)};
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "请求未成功");
  return result;
}
function handle(id, event, fn) {
  byId(id).addEventListener(event, async e => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    byId("message").textContent="";
    try { await fn(); } catch (err) { byId("message").textContent=err.message; }
    finally { busy=false; }
  });
}
function render() {
  byId("setup").hidden=true;
  byId("work").hidden=false;
  byId("card").textContent=titles[session.task]+" · "+methods[session.method];
  byId("focus").textContent=tasks[session.task]+"  使用略俯视的前方三分之四视角，完整呈现整机。";
  byId("phase").textContent={active:"进行中",stopped:"已停止修订",locked:"已锁定"}[session.phase];
  byId("receipt").href="/sessions/"+session.id+"/receipt.zip";
  const box=byId("versions"), choices=byId("choice");
  const placeholder=new Option("请选择交付版本","",true,true);
  placeholder.disabled=true;
  choices.required=true;
  box.replaceChildren(); choices.replaceChildren(placeholder,new Option("均不交","none"));
  if (!session.versions.length) box.append(node("p","初稿请求保存后，将在此显示。"));
  for (const v of session.versions) {
    const tile=node("article",""), title=v.number===1?"初稿":"修改稿";
    tile.append(node("h3",title),node("p",labels[v.status]));
    if (v.image_sha256) {
      const img=new Image(); img.src="/image/"+v.image_sha256; img.alt=title+"的演练样图";tile.append(img);
      choices.add(new Option(title,String(v.number)));
    }
    const details=node("details","");
    details.append(node("summary","查看实际请求"),node("pre",JSON.stringify(v.request,null,2)));
    tile.append(details);box.append(tile);
  }
  const last=session.versions.at(-1), active=session.phase==="active";
  const editing=active && (!last || (last.number===1 && last.status==="example_attached"));
  byId("editor").hidden=!editing;
  if (editing) {
    byId("editTitle").textContent=last?"修改初稿":"编写初稿";
    byId("fields").replaceChildren();
    const fields=session.method==="D"?{instruction:"设计指令"}:{part:"要处理的部位",change:"希望产生的改变",keep:"要保留的关系"};
    for(const [key,name] of Object.entries(fields)){
      const label=node("label",name), area=document.createElement("textarea");
      area.name=key;area.rows=session.method==="D"?5:2;area.required=true;area.maxLength=6000;
      area.value=last?.edit[key] || "";label.append(area);byId("fields").append(label);
    }
    byId("refRow").hidden=!last; byId("ref").checked=false;
  }
  byId("result").hidden=!(active && last?.status==="awaiting_example");
  byId("stop").hidden=!active;
  byId("finish").hidden=session.phase==="locked";
  byId("locked").hidden=!byId("finish").hidden;
  if(session.final) byId("decision").textContent=({1:"初稿",2:"修改稿"}[session.final.version] || "均不交")+" · "+session.final.reason;
}
async function action(data) {
  session=await request("/sessions/"+session.id,{...data,revision:session.revision});render();
}
handle("start","submit",async()=>{
  session=await request("/sessions",Object.fromEntries(new FormData(byId("start"))));
  history.replaceState(null,"","#"+session.id);render();
});
handle("editor","submit",async()=>action({action:"compile",edit:Object.fromEntries(new FormData(byId("editor"))),reference:byId("ref").checked}));
handle("attach","click",async()=>{
  const file=byId("file").files[0];
  if(!file || file.size>12*1024*1024) throw Error("请选择 12 MiB 以内的 PNG 原图");
  const data=await new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(",")[1]);reader.onerror=()=>reject(Error("读图失败"));reader.readAsDataURL(file);
  });
  await action({action:"attach",png:data});byId("file").value="";
});
for (const status of ["failed","unknown"]) handle(status,"click",async()=>action({action:status,reason:byId("failureReason").value}));
handle("stop","click",async()=>action({action:"stop"}));
handle("finish","submit",async()=>action({action:"lock",choice:byId("choice").value==="none"?null:Number(byId("choice").value),reason:byId("why").value}));
const saved=location.hash.slice(1);
if(/^[a-f0-9]{24}$/.test(saved)) request("/sessions/"+saved).then(s=>{session=s;render();}).catch(e=>{byId("message").textContent=e.message;});

