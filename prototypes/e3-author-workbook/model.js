'use strict';
const directions = ['A','B','C'];
const slots = directions.flatMap(d => [1,2,3].map(n => n+d));
const unknown = '未核';
const schema = 'e3-author-workbook/1';
const labels = {
  body_plan:['机身平面形',{pod:'流线舱',box:'切角方壳'}],
  arm_root:['臂根',{seamless:'无缝过渡',socket:'外露承座',hinge:'折叠铰接'}],
  camera:['鼻部相机舱',{inside:'无外突',projecting:'前伸云台'}],
  cover:['顶盖',{single:'单盖',multi:'多块顶盖'}],
  span:['对角轴距（mm）',{'250':'250','300':'300','320':'320（待验证）'}],
  arm_finish:['臂材质',{matte_same:'同色哑光',exposed_carbon:'外露碳纹'}]
};
const fields = Object.keys(labels);
const finish = {
  matte_same:'Arms in the same matte light grey as the shell.',
  exposed_carbon:'Exposed carbon-fibre arms with a visible weave, held by dark grey sockets at the shell.'
};
let dict;
function check(ok,message){if(!ok) throw new Error(message)}
function assertText(v,message){check(typeof v==='string' && v.trim(),message)}
function settings(d) {
  return {...dict.base,...(d==='C'?{body_plan:'box',arm_root:'socket',camera:'projecting',cover:'multi'}:{}),
    span:'250',arm_finish:'matte_same'};
}
function assertParams(d,p){
  check(fields.every(k=>typeof p[k]==='string' && Object.hasOwn(labels[k][1],p[k])),'规格中有未知档位');
  check(d==='C'||p.arm_finish==='matte_same','只有方向 C 可选外露碳纹');
}
function compiled(p){
  const f=dict.fixed_lines;
  const cmf=p.arm_finish==='exposed_carbon'?'Matte light grey shell, dark grey motors, black propellers.':f.cmf;
  return [f.head,f.layout.replace('250 mm',p.span+' mm'),...Object.keys(dict.params).map(k=>dict.params[k][p[k]]),
    finish[p.arm_finish],cmf,f.tail].join('\n');
}
function plannedLayout(p){
  return Form342.layoutFor({frame:{frame_type:'True X',wheelbase_mm:Number(p.span)},propulsion:{prop_diameter_inch:5,motor_tilt_degree:0}},
    {task:'quad',route:'guide',gaps:'',guideTips:false,guideBladeLines:false,guideNose:false},1024*.41/(250/Math.sqrt(2)));
}
function newEvidence(){return {source:unknown,actualPrompt:unknown,request:unknown,seed:unknown,receipt:unknown,reference:unknown}}
function blank(){
  return {schema, dictionary:'shape-dictionary-v1.3', cards:Object.fromEntries(directions.map(d=>[d,{target:'',basis:'',params:settings(d)}])),
    candidates:Object.fromEntries(slots.map(id=>[id,{image:null,reason:'',kind:'作者导入',evidence:newEvidence()}])),assets:{},events:[]};
}
function ready(w){
  for(const d of directions){
    assertText(w.cards[d].target,'请填写 '+d+' 的词对目标');
    assertText(w.cards[d].basis,'请填写 '+d+' 的依据卡号，缺失时可写“未核”或设计者判断');
  }
  for(const id of slots){
    check(w.candidates[id].image,'尚缺原图 '+id);
    assertText(w.candidates[id].reason,'请填写 '+id+' 的取舍理由');
  }
}
function assetRef(w,key){check(typeof key==='string' && /^[a-f0-9]{64}$/.test(key) && Object.hasOwn(w.assets,key),'图片字节缺失或 SHA 无效')}
function evidenceOk(w,e) {
  for(const k of Object.keys(newEvidence()))assertText(e[k],'缺失证据字段 '+k+'，须标为未核');
  if(e.reference!==unknown)assetRef(w,e.reference);
}
function replay(w){
  let head=null,terminal=null,revisionCount=0,dir=null;
  const versions=new Map(),ids=new Set();
  for(const e of w.events){
    assertText(e.reason,'需要填写决定理由');
    check(!terminal && !ids.has(e.id) && typeof e.id==='string' && Number.isFinite(Date.parse(e.at)),'版本顺序、编号或时间无效');
    ids.add(e.id);
    if(e.type==='select'){
      check(!head && e.basedOn===null && slots.includes(e.slot),'父图选择无效');ready(w);
      const item=w.candidates[e.slot];dir=e.slot[1];
      check(e.image===item.image && e.parentSha256===null,'选稿原图摘要不匹配');
      head={id:e.id,image:e.image,params:w.cards[dir].params};versions.set(head.id,head);continue;
    }
    check(head && e.basedOn===head.id && e.parentSha256===head.image,'父图 SHA 或父版本不匹配');
    if(e.type==='revise'){
      check(revisionCount<2,'已达两次修订上限');
      const k=e.parameter;
      check(fields.includes(k) && e.from===head.params[k] && e.to!==e.from,'原档、新档与当前版本不符');
      const params={...head.params,[k]:e.to};assertParams(dir,params);
      check(e.compiledPrompt===compiled(params),'修订编译词与规格不符');
      assertText(e.preserved,'请记录其余部位是否保住');assetRef(w,e.image);
      check(!Object.values(w.candidates).some(c=>c.image===e.image) && ![...versions.values()].some(v=>v.image===e.image),'修订图与已有原图字节相同');
      evidenceOk(w,e.evidence);revisionCount++;head={id:e.id,image:e.image,params};versions.set(head.id,head);
    }else if(e.type==='rollback'){
      check(versions.has(e.targetId) && e.targetId!==head.id,'请回选其他已记录版本');
      head=versions.get(e.targetId);check(e.image===head.image,'回退目标摘要不匹配');
    }else{
      check(['stop','lock'].includes(e.type) && e.image===head.image,'终止事件无效');terminal=e.type;
    }
  }
  return {head,versions,terminal,dir,revisionCount};
}
function validate(w){
  check(w?.schema===schema && w.dictionary==='shape-dictionary-v1.3','工作簿格式或字典版本不符');
  check(Array.isArray(w.events)&&w.assets&&typeof w.assets==='object'&&!Array.isArray(w.assets),'工作簿结构无效');
  check(Object.keys(w.cards).length===3&&Object.keys(w.candidates).length===9,'需要三张规格卡、九个图位');
  for(const d of directions){
    const c=w.cards[d];assertParams(d,c.params);
    check(typeof c.target==='string'&&typeof c.basis==='string','规格卡文字无效');
  }
  const seen=new Set();
  for(const id of slots){
    const c=w.candidates[id];check(typeof c.reason==='string'&&['作者导入','历史开发图'].includes(c.kind),'图位格式无效');
    if(c.image!==null){assetRef(w,c.image);check(!seen.has(c.image),'九图中有重复原图');seen.add(c.image)}
    evidenceOk(w,c.evidence);
  }
  return replay(w);
}
function used(w){
  const keys=new Set();
  for(const item of [...Object.values(w.candidates),...w.events]){
    if(item.image)keys.add(item.image);
    if(item.evidence && item.evidence.reference!==unknown)keys.add(item.evidence.reference);
  }
  return keys;
}
async function verifyAsset(key,a){
  check(/^data:image\/(png|jpeg);base64,/.test(a.dataUrl),'只接受嵌入的 PNG 或 JPEG');
  const mime=a.dataUrl.slice(5,a.dataUrl.indexOf(';'));
  const raw=Uint8Array.from(atob(a.dataUrl.split(',')[1]),c=>c.charCodeAt(0));
  const checked=await Form342.imageAsset(new Blob([raw],{type:mime}));
  check(key===checked.sha256 && key===a.sha256 && mime===a.mime && a.width===checked.width && a.height===checked.height,'原图 SHA、尺寸或类型不匹配');
}
async function snapshots(w){
  const list={};
  for(const d of directions){
    const card=w.cards[d],layout=plannedLayout(card.params),canvas=document.createElement('canvas');
    Form342.drawGuide(canvas,layout,true,false);
    const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    list[d]={...card,layout,compiledPrompt:compiled(card.params),plannedGuide:await Form342.imageAsset(png)};
  }
  return list;
}
function eventOf(type,reason,head){return {type,id:crypto.randomUUID(),at:new Date().toISOString(),reason,
  basedOn:head?.id??null,parentSha256:head?.image??null}}
