'use strict';
const byId=id=>document.getElementById(id);
const message=(s,error=false)=>{byId('status').textContent=s;byId('status').className=error?'error':''};
let book,dirty=false,busy=false,view='spec';
function changed(){dirty=true;message('有未下载的修改。下载工作簿可在另一台电脑继续。')}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el}
function btn(title,fn){const b=node('button',title);b.onclick=()=>run(fn);return b}
async function run(fn){
  if(busy)return;
  busy=true;document.querySelector('main').inert=true;document.querySelector('header').inert=true;
  try{await fn()}catch(e){message(e.message,true);byId('status').scrollIntoView({block:'nearest'})}
  finally{busy=false;document.querySelector('main').inert=false;document.querySelector('header').inert=false}
}
function field(parent,title,el){const l=node('label',undefined,'field');l.append(node('span',title),el);parent.append(l);return el}
function entry(parent,title,value,fn,{multi=false,disabled=false,hint=''}={}){
  const el=node(multi?'textarea':'input');el.value=value;el.disabled=disabled;el.placeholder=hint;
  el.oninput=()=>fn(el.value);return field(parent,title,el);
}
function choices(parent,title,values,value,onchange,disabled=false){
  const el=node('select');for(const [v,label] of Object.entries(values))el.add(new Option(label,v));
  el.value=value;el.disabled=disabled;el.onchange=()=>onchange(el.value);return field(parent,title,el);
}
function file(parent,title,fn,disabled=false){
  const input=node('input');input.type='file';input.accept='image/png,image/jpeg';input.disabled=disabled;
  input.onchange=()=>{const f=input.files[0];if(f)run(async()=>{try{await fn(f)}finally{input.value=''}})};
  return field(parent,title,input);
}
function group(parent,title){const el=node('details');el.append(node('summary',title));parent.append(el);return el}
function picture(parent,a,alt){
  const link=node('a');link.href=a.dataUrl;link.download=alt+(a.mime==='image/png'?'.png':'.jpg');link.title='下载原始图片';
  const img=node('img',undefined,'preview');img.src=a.dataUrl;img.alt=alt;link.append(img);parent.append(link);
}
function evidenceForm(parent,e,locked,onchange,onReference){
  const section=group(parent,'来源、实发词与参考图');
  const captions={source:'来源 / 批次与原件位置',actualPrompt:'实发文字（按原文）',request:'请求原文或可追溯编号',seed:'种子 / 未指定',receipt:'回执原文或编号'};
  for(const [k,title] of Object.entries(captions)){
    entry(section,title,e[k]===unknown?'':e[k],v=>{e[k]=v.trim()?v:unknown;onchange()},{
      multi:['actualPrompt','request','receipt'].includes(k),disabled:locked,hint:unknown});
  }
  const ref=node('small',e.reference===unknown?'实发参考图 · 未核':'实发参考图 SHA-256 · '+e.reference);section.append(ref);
  if(e.reference!==unknown && book.assets[e.reference])picture(section,book.assets[e.reference],'实发参考图');
  if(!locked)file(section,'附实际发送的定位 / 参考图',async f=>{
    const a=await Form342.imageAsset(f);onReference(a);e.reference=a.sha256;ref.textContent='实发参考图 SHA-256 · '+a.sha256;onchange();
  });
}
function switchTo(name){
  view=name;for(const k of ['spec','gallery','chain'])byId(k).hidden=k!==name;
  document.querySelectorAll('nav button').forEach(b=>{if(b.dataset.view===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
}
function renderCards(){
  const container=byId('cards');container.replaceChildren();
  for(const d of directions){
    const c=book.cards[d],locked=book.events.length>0,el=node('article');
    el.append(node('h3','方向 '+d));container.append(el);
    entry(el,'词对目标',c.target,v=>{c.target=v;changed()},{disabled:locked,hint:'设计者填写'});
    entry(el,'依据卡号 / 设计者判断',c.basis,v=>{c.basis=v;changed()},{disabled:locked,hint:'如有依据卡，填写原编号'});
    const pre=node('pre',compiled(c.params));
    for(const k of fields){
      const [name,opts]=labels[k];
      choices(el,name,d!=='C'&&k==='arm_finish'?{matte_same:opts.matte_same}:opts,c.params[k],v=>{
        c.params[k]=v;pre.textContent=compiled(c.params);changed()
      },locked || (k==='arm_finish'&&d!=='C'));
    }
    group(el,'查看本次编译文字').append(pre);
  }
}
function pick(id){
  const c=book.candidates[id];ready(book);assetRef(book,c.image);
  appendEvent({...eventOf('select',c.reason,null),slot:id,image:c.image});switchTo('chain');
}
function renderPicks(){
  const container=byId('picks');container.replaceChildren();const locked=book.events.length>0;
  byId('loadArchive').disabled=locked;
  for(const d of directions){
    container.append(node('h3','方向 '+d,'rowtitle'));const row=node('div',undefined,'grid');container.append(row);
    for(const id of slots.filter(id=>id.endsWith(d))){
      const c=book.candidates[id],el=node('article');row.append(el);el.append(node('h3',id+' · '+(c.image?c.kind:'待导入')));
      if(c.image){picture(el,book.assets[c.image],id);group(el,'原图 SHA-256').append(node('code',c.image))}
      else el.append(node('div','等待原图','empty'));
      file(el,'导入原图',async f=>{
        const a=await Form342.imageAsset(f);
        check(!slots.some(k=>k!==id&&book.candidates[k].image===a.sha256),'该原图已占用其他图位');
        if(c.image===a.sha256)return message('该图位已经是这张原图。');
        if(c.image&&!confirm('替换此图并清空该图的取舍理由与来源信息？'))return;
        book.assets[a.sha256]=a;book.candidates[id]={image:a.sha256,reason:'',kind:'作者导入',evidence:newEvidence()};
        renderPicks();changed();
      },locked);
      entry(el,'取舍理由',c.reason,v=>{c.reason=v;changed()},{multi:true,disabled:locked,hint:'保留什么，舍弃什么？'});
      evidenceForm(el,c.evidence,locked||c.kind==='历史开发图',changed,a=>{book.assets[a.sha256]=a});
      const select=btn('选为父图',()=>pick(id));select.disabled=locked||!c.image;el.append(select);
    }
  }
}
function appendEvent(event,assets={}){
  const next={...book,events:[...book.events,event],assets:{...book.assets,...assets}};
  validate(next);book=next;render();changed();
}
function renderChain(){
  const root=byId('history');root.replaceChildren();
  const {head,versions,dir,terminal,revisionCount}=replay(book);
  if(!head){root.append(node('p','完成三张规格卡和九张原图取舍后，在九图选稿中指定父图。'));return}
  const panel=node('div',undefined,'panel');root.append(panel);
  panel.append(node('h3','方向 '+dir+' · '+({lock:'已锁稿',stop:'已停止'}[terminal]||'当前父图')));
  picture(panel,book.assets[head.image],'当前版本');panel.append(node('code',head.image));
  const ol=node('ol',undefined,'timeline');panel.append(ol);
  for(const e of book.events){
    const li=node('li');ol.append(li);const title={select:'选择 '+(e.slot||''),revise:'修订',rollback:'回退',lock:'锁稿',stop:'停止'}[e.type];
    li.append(node('strong',title+' · '+e.reason),node('br'),node('small',e.at));
    if(e.type==='revise'){
      li.append(node('p',labels[e.parameter][0]+'：'+labels[e.parameter][1][e.from]+' → '+labels[e.parameter][1][e.to]+'。其余部位：'+e.preserved));
      const info=group(li,'修订图与证据');picture(info,book.assets[e.image],'修订图');info.append(node('pre',e.compiledPrompt));evidenceForm(info,e.evidence,true);
    }
    if(e.parentSha256)li.append(node('p','父图 SHA-256 · '+e.parentSha256));
  }
  if(terminal)return;
  if(revisionCount<2){
    const edit=node('div',undefined,'panel');root.append(edit);edit.append(node('h3','登记第 '+(revisionCount+1)+' 次实际修订'));
    const draft={reason:'',preserved:'',evidence:newEvidence(),assets:{},image:null};
    const allowed=fields.filter(k=>k!=='arm_finish'||dir==='C');
    let key=allowed[0],to,old=node('small'),values=node('div'),preview=node('pre');
    function refresh(){
      values.replaceChildren();old.textContent='原档 · '+labels[key][1][head.params[key]];
      const options=Object.fromEntries(Object.entries(labels[key][1]).filter(([v])=>v!==head.params[key]));to=Object.keys(options)[0];
      const update=()=>{preview.textContent=compiled({...head.params,[key]:to})};
      choices(values,'新档',options,to,v=>{to=v;update()});update();
    }
    choices(edit,'改动参数',Object.fromEntries(allowed.map(k=>[k,labels[k][0]])),key,v=>{key=v;refresh()});
    edit.append(old,values);refresh();group(edit,'修订规格的编译文字').append(preview);
    entry(edit,'为什么改',draft.reason,v=>draft.reason=v);
    entry(edit,'其余部位保留情况',draft.preserved,v=>draft.preserved=v,{multi:true});
    const name=node('small','尚未附修订图');
    file(edit,'附实际编辑后的原图',async f=>{const a=await Form342.imageAsset(f);draft.image=a;name.textContent=f.name+' · '+a.sha256});
    edit.append(name);evidenceForm(edit,draft.evidence,false,()=>{},a=>{draft.assets[a.sha256]=a});
    edit.append(btn('记录修订',()=>{
      check(draft.image,'请附实际修订图');const a=draft.image;
      appendEvent({...eventOf('revise',draft.reason,head),image:a.sha256,parameter:key,from:head.params[key],to,
        compiledPrompt:compiled({...head.params,[key]:to}),preserved:draft.preserved,evidence:draft.evidence},
        {...draft.assets,[a.sha256]:a});
    }));
  }
  const decision=node('div',undefined,'panel');root.append(decision);decision.append(node('h3','回退、停止或锁稿'));
  const reason=entry(decision,'决定理由','',()=>{});
  const others=[...versions.values()].filter(v=>v.id!==head.id);
  if(others.length){
    const opts=Object.fromEntries(others.map(v=>[v.id,'版本 '+([...versions.keys()].indexOf(v.id)+1)+' · '+v.image.slice(0,12)]));
    const target=choices(decision,'回退目标',opts,others[0].id,()=>{});
    decision.append(btn('记录回退',()=>appendEvent({...eventOf('rollback',reason.value,head),targetId:target.value,image:versions.get(target.value).image})));
  }
  for(const [type,title] of [['stop','停止本轮'],['lock','锁定终稿']]){
    decision.append(btn(title,()=>{assertText(reason.value,'请填写决定理由');if(confirm('确认'+title+'并结束此工作簿的编辑？'))
      appendEvent({...eventOf(type,reason.value,head),image:head.image})}));
  }
}
function render(){renderCards();renderPicks();renderChain();switchTo(view)}


async function readLocal(path){
  const response=await fetch(path);check(response.ok,'无法读取离线附件 '+path);return response;
}
async function digestText(s) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function loadArchive(){
  if(Object.values(book.candidates).some(c=>c.image||c.reason||Object.values(c.evidence).some(v=>v!==unknown)) &&
    !confirm('载入归档会替换九个图位及取舍理由。继续？'))return;
  message('正在逐张校验九张归档原图、实发词和定位图…');
  const {rows}=await (await readLocal('archive/manifest.json')).json();
  check(rows.length===9&&slots.every(id=>rows.some(r=>r.id===id)),'开发归档清单不完整');
  const images={},candidates={};
  for(const r of rows){
    const local=path=>readLocal('archive/'+path);
    const image=await Form342.imageAsset(await (await local(r.original)).blob());
    const guide=images[r.guide_sha256] || await Form342.imageAsset(await (await local(r.guide)).blob());
    const receipt=await (await local(r.receipt)).json();
    const prompt=(await (await local(r.prompt)).text()).replace(/\r\n/g,'\n');
    check(image.sha256===r.sha256 && image.sha256===receipt.verification.file_sha256 &&
      guide.sha256===r.guide_sha256 && guide.sha256===receipt.request.images[0].sha256 &&
      prompt===receipt.request.prompt && await digestText(prompt)===r.prompt_sha256,'归档输入或摘要不匹配 · '+r.id);
    images[image.sha256]=image;images[guide.sha256]=guide;
    candidates[r.id]={image:image.sha256,reason:'',kind:'历史开发图',evidence:{
      source:'Freeloop993/paper · evidence/section421-minimax-review/'+r.id+' · 配置器历史开发批',
      actualPrompt:prompt,request:JSON.stringify(receipt.request,null,2),seed:Object.hasOwn(receipt.request,'seed')?String(receipt.request.seed):'请求未指定',
      receipt:JSON.stringify(receipt,null,2),reference:guide.sha256}};
  }
  const next={...book,candidates,assets:images};validate(next);book=next;render();changed();
  message('九张开发原图及其输入已核对原件。请逐张填写取舍理由，并下载保存。');
}
async function exportBook(){
  const state=validate(book);const assets=Object.fromEntries([...used(book)].map(k=>[k,book.assets[k]]));
  const revisionSnapshots={};
  for(const event of book.events.filter(e=>e.type==='revise')){
    const version=state.versions.get(event.id),layout=plannedLayout(version.params);
    const canvas=document.createElement('canvas');Form342.drawGuide(canvas,layout,true,false);
    const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    revisionSnapshots[event.id]={params:version.params,compiledPrompt:event.compiledPrompt,layout,plannedGuide:await Form342.imageAsset(png)};
  }
  const output={...book,assets,revisionSnapshots,specSnapshots:await snapshots(book),currentVersion:state.head,finalImageSha256:state.terminal==='lock'?state.head.image:null};
  const blob=new Blob([JSON.stringify(output)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  Form342.download('E3-作者工作簿-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',url);
  setTimeout(()=>URL.revokeObjectURL(url),10000);dirty=false;message('已请求下载。工作簿含原图字节、规格快照、证据和决定记录。');
}
async function openBook(f){
  if(dirty&&!confirm('用所选文件替换当前未下载的工作簿？'))return;
  const next=JSON.parse(await f.text()),state=validate(next);
  const verified=used(next);check(Object.keys(next.assets).length===verified.size,'图片资产清单与图位不一致');
  for(const k of verified)await verifyAsset(k,next.assets[k]);
  for(const d of directions){
    const s=next.specSnapshots?.[d],c=next.cards[d];
    check(s && s.target===c.target && s.basis===c.basis && fields.every(k=>s.params[k]===c.params[k]) &&
      s.compiledPrompt===compiled(c.params) && JSON.stringify(s.layout)===JSON.stringify(plannedLayout(c.params)),'方向快照不匹配');
    await verifyAsset(s.plannedGuide.sha256,s.plannedGuide);
  }
  for(const e of next.events.filter(e=>e.type==='revise')){
    const snap=next.revisionSnapshots?.[e.id],params=state.versions.get(e.id).params;
    check(snap && fields.every(k=>snap.params[k]===params[k]) && snap.compiledPrompt===e.compiledPrompt &&
      JSON.stringify(snap.layout)===JSON.stringify(plannedLayout(params)),'修订快照不匹配');
    await verifyAsset(snap.plannedGuide.sha256,snap.plannedGuide);
  }
  check(next.finalImageSha256===(state.terminal==='lock'?state.head.image:null) &&
    JSON.stringify(next.currentVersion)===JSON.stringify(state.head),'当前或锁稿版本摘要不匹配');
  book={schema:next.schema,dictionary:next.dictionary,cards:next.cards,candidates:next.candidates,assets:next.assets,events:next.events};
  dirty=false;view=state.head?'chain':'spec';render();message('工作簿已打开。已重算所附图片 SHA-256 并核对版本链。');
}
async function start(){
  dict=await (await readLocal('dictionary-v12.json')).json();book=blank();
  document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>switchTo(b.dataset.view));
  byId('save').onclick=()=>run(exportBook);
  byId('restore').onchange=()=>{const input=byId('restore'),f=input.files[0];if(f)run(async()=>{try{await openBook(f)}finally{input.value=''}})};
  byId('loadArchive').onclick=()=>run(loadArchive);render();
  message('当前为空白工作簿。填写后下载 JSON 保存，关闭页面前请保留文件。');
}
start().catch(()=>message('请按 README 在本目录启动本地服务，再打开页面。',true));
