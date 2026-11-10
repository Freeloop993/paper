"use strict";
const el = id => document.getElementById(id);
const make = tag => document.createElement(tag);
const cards = {
  A: "相机与机身的整合。拍摄方向清楚，相机与机身连接自然，机臂连接仍可辨。",
  B: "机身到四臂的过渡。机身与机臂的形体连贯，前置相机仍可辨。"
};
const construction = {
  rotors:"能数出四个有桨叶或电机实体的旋翼位置吗？",
  body:"能看到一个完整的机身实体吗？",
  arms:"能看到有粗细、连入机身的机臂吗？",
  camera:"能辨认机身前部的相机部件吗？"
};
const ratings = {taskFit:"任务契合", coherence:"整体协调与完成度（比例、体量、部件关系）", appeal:"外观吸引力", novelty:"新颖性"};
const features = {surface:"机身外壳上可见的分块和接缝，两图是否相似？", armBody:"机臂接到机身处的形状，两图是否相似？", payload:"相机或载荷与机身相接的位置和形状，两图是否相似？"};
const yesNo = ["是","否"], uncertain = "不可判";
const scale = ["1","2","3","4","5","6","7",uncertain];
function shuffled(items) {
  const out = [...items];
  for (let i=out.length-1; i>0; i--) {
    const word = crypto.getRandomValues(new Uint32Array(1))[0];
    const j = Math.floor(word / 4294967296 * (i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}
const ids = shuffled(PACK.images);
const pairs = shuffled(PACK.pairs).map(shuffled);
const record = {schema:PACK.schema, mode:PACK.mode, pack:PACK.pack, wording:PACK.wording,
  responseId:Array.from(crypto.getRandomValues(new Uint8Array(12)), n=>n.toString(16).padStart(2,"0")).join(""),
  started:new Date().toISOString(), presentation:ids.map(x=>x.id), pairOrder:pairs, images:[], pairs:[]};
let step = 0, onPage, began, ready;
function begin(title, hint, pics=[]) {
  ready=false;
  el("heading").textContent=title;
  el("hint").textContent=hint;
  el("fields").replaceChildren();
  el("pictures").replaceChildren();
  el("status").textContent="";
  const loads=pics.map(code=>{
    const fig=make("figure"), img=make("img"), cap=make("figcaption");
    cap.textContent=code; img.alt="匿名概念图 "+code;
    fig.append(img,cap);el("pictures").append(fig);img.src="images/"+code+".png";
    return img.decode();
  });
  el("next").disabled=true;
  Promise.all(loads).then(()=>{
    ready=true;began=performance.now();el("next").disabled=false;
  }).catch(()=>el("status").textContent="图片未能载入，请核对整个文件夹是否已解压。");
}
function field(name,title,options=null) {
  const label=make("label");
  label.textContent=title;
  const input=make(options?"select":"textarea");
  input.name=name;input.required=true;
  if(options) {
    input.add(new Option("请选择",""));
    options.forEach(x=>input.add(new Option(x,x)));
  } else input.maxLength=2000;
  label.append(input);el("fields").append(label);
}
const mode=PACK.mode==="calibration"?"校准":"正式";
function render() {
  const n=ids.length, pairOffset=1+n*2;
  if(step===0){
    el("stage").textContent=mode+" · 开始前";
    begin("评议背景","请独立填写。只写匿名背景，不填姓名、单位和联系方式。请一次完成，最后下载答卷。");
    field("background","设计学习或工作背景（可填无或不便说明）");
    field("experience","设计相关年限",["无","不足 1 年","1–3 年","4–9 年","10 年及以上","不便说明"]);
    field("relationship","与研究作者的关系",["本人","相识","不相识","不便说明"]);
    field("labelExposure","此前见过本组带条件标签的图吗？",["见过","未见过","不确定"]);
    field("aiExposure","此前看过这些图的 AI 评价吗？",["看过","未看过","不确定"]);
    onPage=(v,t)=>{record.background=v;record.backgroundSeconds=t;};
  } else if(step<pairOffset){
    const i=Math.floor((step-1)/2), item=ids[i], observing=(step%2===1);
    el("stage").textContent=mode+" · 单图 "+(i+1)+" / "+n;
    if(observing){
      begin("先描述你看到了什么","请描述机身、相机和机臂的可见形态。看不清的部位可以直接写明。提交后再阅读本图的任务重点。",[item.id]);
      field("observation","你在图中看到了什么？");
      onPage=(v,t)=>record.images.push({id:item.id,card:item.task,...v,observationSeconds:t});
    } else {
      begin("评价这张图","日常随行航拍四旋翼。任务重点为"+cards[item.task]+" 构型题按可见的实体部件作答。只有圆圈、十字或细线时选“否”，部位被遮挡、无法确定时选“不可判”。评分锚点为 1 明显不成立或有严重问题，4 可以接受但有明显不足，7 出色、几乎无需修改。能看清但评价低时可选低分；图中细节不足以评价某一项时，该项可选“不可判”。",[item.id]);
      for(const [key,title] of Object.entries(construction))field(key,title,[...yesNo,uncertain]);
      field("detailSufficiency","这张图的细节够你判断任务卡上的重点吗？",["够","只够判断一部分","不够"]);
      for(const [key,title] of Object.entries(ratings))field(key,title,scale);
      field("taskEvidence",item.task==="A"?"相机与机身交接处具体是什么样？看不清可以直说。":"机臂与机身交接处具体是什么样？看不清可以直说。");
      field("worthDeveloping","依据已经看得见的设计，你会推荐沿这个造型方向继续设计吗？",[...yesNo,uncertain]);
      field("reason","哪处可见设计影响了你的推荐？若不可判，写明还需要看清哪处。");
      onPage=(v,t)=>Object.assign(record.images[i],{evaluation:v,evaluationSeconds:t});
    }
  } else if(step<pairOffset+pairs.length){
    const i=step-pairOffset, shown=pairs[i];
    el("stage").textContent=mode+" · 成对图 "+(i+1)+" / "+pairs.length;
    begin("比较两张图的造型语言","逐项看左右图的同一部位。“保持”指能看出做法相近，“改变”指能看出不同。任一图缺少可比较的细节，可选“不可判”，写下哪里看不清或哪句话难懂。",shown);
    for(const [key,title] of Object.entries(features)){
      field(key,title,["保持","改变",uncertain]);field(key+"Site","你比较的是哪一处？");
    }
    onPage=(v,t)=>record.pairs.push({shown,features:v,seconds:t});
  } else {
    record.ended=new Date().toISOString();el("stage").textContent=mode+" · 已填完";
    begin("保存答卷","请下载 JSON 并交给研究者。可以再次下载同一份答卷。");
    el("next").textContent="下载答卷 JSON";
    onPage=null;
  }
}
el("form").addEventListener("submit",event=>{
  event.preventDefault();
  if(!ready)return;
  if(!onPage){
    const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:"application/json"}));
    const a=make("a");a.href=url;a.download="rating-"+record.mode+"-"+record.responseId+".json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  }
  const data=Object.fromEntries(Array.from(new FormData(event.target),([k,v])=>[k,v.trim()]));
  if(Object.values(data).some(v=>!v)){el("status").textContent="请补全本页空白项。";return;}
  onPage(data,Math.round((performance.now()-began)/10)/100);
  step++;render();window.scrollTo(0,0);el("heading").tabIndex=-1;el("heading").focus();
});
render();

