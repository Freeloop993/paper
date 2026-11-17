import { evaluate, labels, options, studyValues, type Key, type Patch } from './c1Model';

type State=ReturnType<typeof evaluate>;
let nextId=0;
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text=''){
  const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;
}
function button(cls:string,text:string){const b=el('button',cls,text);b.type='button';return b}
const frameNames:Record<string,string>={'True X':'径向 X','Wide X':'宽 X','Stretch X':'伸展 X','H-Frame':'H 型',Deadcat:'Deadcat','+ Configuration':'十字型'};
// Thumbnails use the native four hub coordinates and links, including H and Deadcat.
function frameIcon(frame:string) {
  const l=evaluate({frame,guide:'axes'}).layout!;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','275 275 474 474');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  const path=document.createElementNS(ns,'path');path.setAttribute('d',l.links.map(([x,y,u,v])=>'M'+x+' '+y+'L'+u+' '+v).join(' '));
  path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','22');svg.append(path);
  for(const h of l.hubs){const c=document.createElementNS(ns,'circle');c.setAttribute('cx',String(h.x_px));c.setAttribute('cy',String(h.y_px));c.setAttribute('r','28');c.setAttribute('fill','currentColor');svg.append(c)}
  return svg;
}
export function controls(root:HTMLElement,study:boolean,update:(p:Patch)=>void) {
  const id='c1s-'+(++nextId)+'-', paints:((s:State)=>void)[]=[];
  const tabs=el('div','c1s-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','参数分类');root.append(tabs);
  const pages=['构型','部件','色材'].map((title,i)=>{
    const tab=button('c1s-tab',title), pane=el('div','c1s-page');
    tab.setAttribute('role','tab');tab.id=id+'tab'+i;pane.id=id+'page'+i;
    tab.setAttribute('aria-controls',pane.id);pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tab.id);
    tab.onclick=()=>activate(i);
    tab.onkeydown=e=>{
      const to:Record<string,number>={ArrowLeft:(i+2)%3,ArrowRight:(i+1)%3,Home:0,End:2};
      if(Object.prototype.hasOwnProperty.call(to,e.key)){e.preventDefault();activate(to[e.key]);pages[to[e.key]].tab.focus()}
    };
    tabs.append(tab);root.append(pane);return {tab,pane};
  });
  function activate(i:number){pages.forEach(({tab,pane},j)=>{
    tab.tabIndex=i===j?0:-1;tab.setAttribute('aria-selected',String(i===j));pane.hidden=i!==j;
  })}
  activate(study?1:0);
  // Each control stays mounted. Tab navigation never emits a selection or resets focus.
  function group(k:Key,parent:HTMLElement) {
    const group=el('fieldset','c1s-block'),legend=el('legend','c1s-legend'),title=el('span','',labels[k]);
    const status=el('small','c1s-source'),reset=button('c1s-reset','恢复默认');
    reset.setAttribute('aria-label',labels[k]+'：恢复默认');reset.onclick=()=>{
      const focus=group.querySelector<HTMLElement>('input:checked,select,input:not([type="radio"])');
      focus?.focus();update({[k]:null});
    };
    legend.append(title,status,reset);group.append(legend);parent.append(group);
    group.disabled=study&&Object.prototype.hasOwnProperty.call(studyValues,k);
    paints.push(s=>{
      const field=s.research.fields[k];
      status.textContent=({selected:'手选',default:'默认',preset:'配置值',task:'任务固定'} as Record<string,string>)[field.source];
      reset.hidden=field.source!=='selected';
      if(k==='body'){
        const size=s.research.bodyEnvelopeMm;
        title.textContent=labels.body+(size?' · '+[size.length,size.width,size.height].join(' × ')+' mm':'');
      }
    });
    return group;
  }
  function choices(k:Key,parent:HTMLElement){
    const box=group(k,parent),grid=el('div','c1s-choices c1s-'+k);box.append(grid);
    for(const [v,label] of Object.entries(options[k]!)){
      const choice=el('label','c1s-choice'),radio=el('input'),face=el('span','c1s-face');
      radio.type='radio';radio.name=id+k;radio.value=v;radio.dataset.c1Field=k;
      if(k==='frame')face.append(frameIcon(v));
      if(k==='color'){const dot=el('span','c1s-dot');dot.dataset.color=v;dot.setAttribute('aria-hidden','true');face.append(dot)}
      face.append(document.createTextNode(k==='frame'?frameNames[v]:v==='open'?'留白':label));
      // Click fires for mouse, Space and native radio arrow keys, including a click on the inherited value.
      radio.onclick=()=>update({[k]:v});
      choice.append(radio,face);grid.append(choice);
      paints.push(s=>{radio.checked=s.research.fields[k].value===v});
    }
  }
  function select(k:Key,parent:HTMLElement){
    const box=group(k,parent),sel=el('select');sel.setAttribute('aria-label',labels[k]);sel.dataset.c1Field=k;
    for(const [v,label] of Object.entries(options[k]!))sel.add(new Option(label,v));
    sel.onchange=()=>update({[k]:sel.value});box.append(sel);
    paints.push(s=>{sel.value=String(s.research.fields[k].value)});
  }
  const [frames,parts,cmf]=pages.map(x=>x.pane);
  select('preset',frames);
  if(study){
    frames.append(el('p','c1s-lock','本场共用 True X · 250 mm · 四个 90°。参考图仅标轴心与机架连线。'));
  }
  choices('frame',frames);
  const spanBox=group('span',frames),spanRow=el('div','c1s-span'),range=el('input'),num=el('input');
  range.type='range';num.type='number';
  for(const [ctl,title] of [[range,'滑动调整轴距'],[num,'精确输入轴距']] as const){
    ctl.setAttribute('aria-label',title+'（毫米）');ctl.min='100';ctl.max='500';ctl.step='1';
    ctl.dataset.c1Field='span';ctl.oninput=()=>update({span:ctl.value===''?'':Number(ctl.value)});spanRow.append(ctl);
  }
  spanBox.append(spanRow);
  paints.push(s=>{
    const v=String(s.research.fields.span.value);if(num.value!==v)num.value=v;
    range.value=v===''?'250':v;
    num.setAttribute('aria-invalid',String(v===''||!Number.isInteger(Number(v))||Number(v)<100||Number(v)>500));
  });
  choices('angles',frames);
  const manual=group('custom',frames),angles=el('input');
  angles.type='text';angles.setAttribute('aria-label',labels.custom);angles.dataset.c1Field='custom';angles.placeholder='例如 75, 105, 75, 105';
  angles.oninput=()=>update({custom:angles.value});manual.append(angles);
  paints.push(s=>{manual.hidden=!s.research.fields.custom.active;const v=String(s.research.fields.custom.value);if(angles.value!==v)angles.value=v;});
  choices('guide',frames);
  for(const k of ['body','root','camera','seams'] as const)choices(k,parts);
  const measurements=el('div','c1s-pair');parts.append(measurements);select('width',measurements);select('thickness',measurements);
  choices('color',cmf);choices('finish',cmf);choices('material',cmf);
  return (s:State)=>paints.forEach(fn=>fn(s));
}

