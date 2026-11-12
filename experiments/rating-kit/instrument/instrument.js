"use strict";
const el = id => document.getElementById(id);
const random = n => Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * n);
function shuffled(input) {
  const items = [...input];
  for (let i=items.length-1;i>0;i--) {
    const j=random(i+1);
    [items[i],items[j]]=[items[j],items[i]];
  }
  return items;
}
const groups = PACK.mode==="r1"?["render"]:["product","final"];
const order = groups.flatMap(group=>shuffled(PACK.images.filter(item=>item.block===group)));
const answer = {schema:PACK.schema,mode:PACK.mode,pack:PACK.pack,termsVersion:PACK.termsVersion,
  responseId:[...crypto.getRandomValues(new Uint8Array(12))].map(b=>b.toString(16).padStart(2,"0")).join(""),
  started:new Date().toISOString(),presentation:order.map(x=>x.id),images:[]};
let page=-1, polarities={}, began, ready=false;
function choice(name,title,options,ends) {
  const set=document.createElement("fieldset"), legend=document.createElement("legend");
  legend.textContent=title;set.append(legend);
  if(ends){
    const bar=document.createElement("div");bar.className="ends";
    for(const word of ends){const s=document.createElement("span");s.textContent=word;bar.append(s);}
    set.append(bar);
  }
  options.forEach(([value,text])=>{
    const label=document.createElement("label"),input=document.createElement("input");
    input.type="radio";input.name=name;input.value=value;input.required=true;
    label.append(input, text);set.append(label);
  });
  el("fields").append(set);
}
function exposure() {
  choice("labels","以前看过这些图的条件标签吗？",["未看过","看过","不确定"].map(s=>[s,s]));
  choice("analysis","以前看过这些图的 AI 结论吗？",["未看过","看过","不确定"].map(s=>[s,s]));
}
async function render() {
  el("fields").replaceChildren();el("status").textContent="";
  const reviewing=page>=0 && page<order.length;
  el("layout").className=reviewing?"":"intro";
  el("next").disabled=true;ready=false;
  if(page<0) {
    el("stage").textContent="开始前";el("subject").textContent="独立填写";
    el("hint").textContent="请一次完成。每题按自己的观察选择，最后下载匿名答卷。";
    exposure();el("next").textContent="开始评议";
  } else if(!reviewing) {
    answer.ended ||=new Date().toISOString();
    el("stage").textContent="已填完";el("subject").textContent="保存答卷";
    el("hint").textContent="请将下载的 JSON 交给研究者。再次下载会保存同一份答卷。";
    el("next").textContent="下载答卷 JSON";
  } else {
    const item=order[page], image=el("image");
    el("stage").textContent=(page+1)+" / "+order.length;
    el("subject").textContent=PACK.mode==="r1"?"画面与部位":"观察可见造型";
    el("hint").textContent=PACK.mode==="r1"?"依次观察产品感、相机位置和臂根。":"每组单独选一个位置。4 表示居中，无法判断可选“看不出”。";
    el("code").textContent=item.id;image.src="images/"+item.id+".png";
    polarities={};
    if(PACK.mode==="r1") {
      PACK.questions.forEach(([id,title,labels])=>choice(id,title,labels.map((s,i)=>[i,s]).reverse()));
    } else {
      PACK.terms.forEach(pair=>{
        const reversed=random(2)===1;
        polarities[pair.id]=reversed;
        const ends=reversed?[pair.right,pair.left]:[pair.left,pair.right];
        const options=[1,2,3,4,5,6,7].map(n=>[n,String(n)]).concat([["unreadable","看不出"]]);
        choice("term-"+pair.id,ends.join("　／　"),options,["1 · "+ends[0],"7 · "+ends[1]]);
      });
    }
    el("next").textContent=page===order.length-1?"结束并保存":"下一张";
    try {await image.decode();}
    catch {el("status").textContent="图片未载入，请核对整包是否已解压。";return;}
  }
  ready=true;el("next").disabled=false;began=performance.now();
}
el("form").onsubmit=event=>{
  event.preventDefault();if(!ready)return;
  const raw=Object.fromEntries(new FormData(el("form")));
  if(page<0)answer.exposure=raw;
  else if(page<order.length){
    const item=order[page], entry={id:item.id,block:item.block,seconds:(performance.now()-began)/1000};
    if(PACK.mode==="r1") entry.ratings=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,Number(v)]));
    else entry.terms=Object.fromEntries(PACK.terms.map(p=>{
      const clicked=raw["term-"+p.id], reversed=polarities[p.id];
      const value=clicked==="unreadable"?null:Number(clicked);
      return [p.id,{displayOrder:reversed?"reversed":"canonical",displayValue:value,
        canonicalValue:value===null?null:(reversed?8-value:value),unreadable:value===null}];
    }));
    answer.images.push(entry);
  } else {
    const url=URL.createObjectURL(new Blob([JSON.stringify(answer,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="rating-"+PACK.mode+"-"+answer.responseId+".json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  }
  page++;render();window.scrollTo(0,0);
};
render();
