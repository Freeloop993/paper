"use strict";
const el=id=>document.getElementById(id);
const cv=el("canvas"), ctx=cv.getContext("2d");
const positions=["左上","右上","右下","左下"], targets=["电机中心","较靠上的叶尖（等高取左）","同副桨的另一叶尖"];
const storeKey="quad-point-reader-v1-"+POINT_PACK.id;
let form=null,im=null,ready=false,zoomArmed=false,frame=[0,0,1024];
const msg=t=>el("msg").textContent=t;
function persist(){
  try {localStorage.setItem(storeKey,JSON.stringify(form));}
  catch {msg("本机存储不可用，请在本页完成后下载。");}
}
function redraw(){
  if(!ready)return;
  const [x,y,k]=frame;ctx.drawImage(im,x,y,k,k,0,0,1024,1024);
  for(const {xy} of form.pending){if(!xy)continue;
    const a=(xy[0]+.5-x)*1024/k,b=(xy[1]+.5-y)*1024/k;
    ctx.beginPath();ctx.arc(a,b,6,0,Math.PI*2);ctx.strokeStyle="#d46019";ctx.lineWidth=3;ctx.stroke();
  }
  const n=form.pending.length;
  el("progress").textContent="图 "+(form.rows.length+1)+" / "+POINT_PACK.images.length;
  el("point").textContent=zoomArmed?"点一下要放大的部位":n===12?"十二个位置已登记":positions[Math.floor(n/3)]+" · "+targets[n%3];
  el("next").disabled=n!==12;el("undo").disabled=n===0;
  el("skip").disabled=n===12; el("zoom").disabled=n===12;
}
function load(){
  el("intro").hidden=true;el("done").hidden=!form.ended;el("work").hidden=Boolean(form.ended);
  if(form.ended)return;
  ready=false;frame=[0,0,1024];zoomArmed=false;el("reason").value="";el("note").value=form.note;
  const id=POINT_PACK.images[form.rows.length];
  im=new Image();
  im.onload=()=>{if(im.naturalWidth!==1024||im.naturalHeight!==1024){msg("该图尺寸与点选规格不符。");return;}
    ready=true;redraw();};
  im.onerror=()=>msg("图片未加载，请先完整解压整个包。");
  im.src=id+".png";
}
el("start").onclick=()=>{
  if(!el("labels").value||!el("ai").value){msg("请先填写两项既往接触情况。");return;}
  const id=[...crypto.getRandomValues(new Uint8Array(12))].map(x=>x.toString(16).padStart(2,"0")).join("");
  form={schema:"topview-point-reader-v1",pack:POINT_PACK.id,responseId:id,started:new Date().toISOString(),
    exposure:{labels:el("labels").value,ai:el("ai").value},rows:[],pending:[],note:"",ended:null};
  msg("");persist();load();
};
function append(xy,reason){
  if(!ready||form.pending.length>=12)return;
  form.pending.push({xy,reason});frame=[0,0,1024];zoomArmed=false;el("reason").value="";msg("");redraw();persist();
}
cv.onclick=e=>{
  if(!ready||form.pending.length===12)return;
  const r=cv.getBoundingClientRect(),[x,y,k]=frame;
  const pixel=(v,min,span,offset)=>Math.max(0,Math.min(1023,Math.floor(offset+(v-min)/span*k)));
  const px=pixel(e.clientX,r.left,r.width,x),py=pixel(e.clientY,r.top,r.height,y);
  if(zoomArmed){frame=[Math.max(0,Math.min(768,px-128)),Math.max(0,Math.min(768,py-128)),256];zoomArmed=false;redraw();}
  else append([px,py],null);
};
el("skip").onclick=()=>{if(!el("reason").value){msg("请选择此点不可判的原因。");return;}append(null,el("reason").value);};
el("zoom").onclick=()=>{zoomArmed=true;redraw();};el("reset").onclick=()=>{zoomArmed=false;frame=[0,0,1024];redraw();};
el("undo").onclick=()=>{form.pending.pop();zoomArmed=false;frame=[0,0,1024];redraw();persist();};
el("note").oninput=()=>{form.note=el("note").value;persist();};
el("next").onclick=()=>{
  if(!ready||form.pending.length!==12)return;
  const marks=form.pending;
  form.rows.push({image:POINT_PACK.images[form.rows.length]+".png",
    hubs:[0,3,6,9].map(i=>marks[i].xy),tips:[0,3,6,9].map(i=>[marks[i+1].xy,marks[i+2].xy]),
    missing:marks.flatMap((p,i)=>p.xy?[]:[{position:positions[Math.floor(i/3)],point:targets[i%3],reason:p.reason}]),note:form.note});
  form.pending=[];form.note="";msg("");if(form.rows.length===POINT_PACK.images.length)form.ended=new Date().toISOString();
  persist();load();
};
el("download").onclick=()=>{
  const {pending,note,...result}=form;
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="topview-points-"+form.responseId+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
try {const raw=localStorage.getItem(storeKey);if(raw){form=JSON.parse(raw);if(form.pack===POINT_PACK.id)load();}}
catch{msg("上次进度未能读取，可从头填写。");}
