import { drawGuide, type Layout } from './design';
import { evaluate, exportState, patched, studyGuide, unlocked, type Patch, type Selection } from './c1Model';

import { controls } from './c1Controls';

type State = ReturnType<typeof evaluate>;
const snapshot=(s:State)=>structuredClone({selection:s.selection,research:s.research,layout:s.layout,prompt:s.prompt,validation:s.validation});
type Mount = {
  panel:HTMLElement; preview?:HTMLElement; prompt?:HTMLElement;
  studyLayout?:boolean; initialSelection?:Selection; onChange?:(s:ReturnType<typeof snapshot>)=>void;
};
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text='') {
  const node=document.createElement(tag);if(cls) node.className=cls;if(text) node.textContent=text;return node;
}
function svgElement<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,number|string>,text='') {
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [k,v] of Object.entries(attrs)) node.setAttribute(k,String(v));
  node.textContent=text;return node;
}
const deg=(a:number)=>Number(a.toFixed(2))+'°';
function diagram(l:Layout) {
  const pts=[...l.hubs,...l.bladeTips,{x_px:512,y_px:512}];
  const extent=(ns:number[])=>[Math.min(...ns),Math.max(...ns)];
  const [x0,x1]=extent(pts.map(p=>p.x_px)),[y0,y1]=extent(pts.map(p=>p.y_px));
  // Map layout pixels into a dimensioned sketch. Never mutate layout or reuse this scale for PNG.
  const scale=Math.min(258/Math.max(1,x1-x0),190/Math.max(1,y1-y0));
  const X=(x:number)=>154+(x-(x0+x1)/2)*scale, Y=(y:number)=>119+(y-(y0+y1)/2)*scale;
  const [left,right]=extent(l.hubs.map(h=>X(h.x_px))),[top,bottom]=extent(l.hubs.map(h=>Y(h.y_px)));
  const [minX,maxX]=extent(l.hubs.map(h=>h.x_mm)),[minY,maxY]=extent(l.hubs.map(h=>h.y_mm));
  const W=(maxX-minX).toFixed(1), L=(maxY-minY).toFixed(1);
  const svg=svgElement('svg',{viewBox:'0 0 340 266',role:'img','aria-label':`轴心横跨 W ${W} mm，纵跨 L ${L} mm，R1 至 R2 夹角 ${deg(l.adjacent_deg[0])}`});
  const path=(d:string,stroke:string,width:number,dash='')=>svg.append(svgElement('path',{d,stroke,'stroke-width':width,fill:'none','stroke-dasharray':dash}));
  function label(x:number,y:number,text:string,attrs:Record<string,string|number>={}){
    svg.append(svgElement('text',{x,y,'text-anchor':'middle','dominant-baseline':'central','font-size':12,fill:'#294b4b',stroke:'#f4f8f7','stroke-width':3,'paint-order':'stroke',...attrs},text));
  }
  const cx=X(512),cy=Y(512);
  path(`M8 ${cy}H299 M${cx} 7V229`,'#bfd0cc',.9,'3 4');
  for(const [x,y,u,v] of l.links)path(`M${X(x)} ${Y(y)}L${X(u)} ${Y(v)}`,'#46677b',2.4);
  const radius=Math.min(32,...l.hubs.map(h=>Math.hypot(X(h.x_px)-cx,Y(h.y_px)-cy)*.36));
  const [h1,h2]=l.hubs,gap=l.adjacent_deg[0],start=Math.atan2(h1.y_px-512,h1.x_px-512);
  const P=(a:number,r:number)=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r];
  const end=start+gap*Math.PI/180;
  if(l.links.length===3)path(`M${X(h1.x_px)} ${Y(h1.y_px)}L${cx} ${cy}L${X(h2.x_px)} ${Y(h2.y_px)}`,'#8fa5a3',1,'3 3');
  svg.append(svgElement('path',{d:`M${P(start,radius)} A${radius} ${radius} 0 0 1 ${P(end,radius)}`,fill:'none',stroke:'#9d652b','stroke-width':1.6,'data-adjacent-deg':gap}));
  const [ax,ay]=P((start+end)/2,radius+11);label(ax,ay,deg(gap),{fill:'#7a4c1e'});
  for(const h of l.hubs){
    const [a,b]=l.bladeTips.filter(t=>t.hub===h.id);
    if(a&&b)path(`M${X(a.x_px)} ${Y(a.y_px)}L${X(b.x_px)} ${Y(b.y_px)}`,'#25817f',2.8);
    svg.append(svgElement('circle',{cx:X(h.x_px),cy:Y(h.y_px),r:4.1,fill:'#fff',stroke:'#203f4b','stroke-width':2}));
    label(X(h.x_px),Y(h.y_px)+(h.y_px<512?-13:14),h.id,{'font-weight':650});
  }
  svg.append(svgElement('circle',{cx,cy,r:2.4,fill:'#426565'}));
  // Extension lines and ticks measure hub centres, not the projected blade-tip envelope.
  path(`M${left} ${bottom+18}V244 M${right} ${bottom+18}V244 M${right+8} ${top}H311 M${right+8} ${bottom}H311`,'#b5c5c0',.8,'2 3');
  path(`M${left} 238v8m0 -4H${right}m0 -4v8 M306 ${top}h8m-4 0V${bottom}m-4 0h8`,'#58716a',1.1);
  label((left+right)/2,256,'W '+W+' mm',{'data-dimension':'W'});
  const ly=(top+bottom)/2;label(325,ly,'L '+L+' mm',{transform:`rotate(-90 325 ${ly})`,'data-dimension':'L'});
  return svg;
}
export function mount({panel,preview,prompt:promptHost,initialSelection={},studyLayout=false,onChange}:Mount){
  if(!panel) throw Error('请提供选择面板容器。');
  const hosts=[panel,preview,promptHost].filter((n):n is HTMLElement=>!!n);
  if(hosts.some((a,i)=>hosts.slice(i+1).some(b=>a.contains(b)||b.contains(a)))) throw Error('请选择三个互不包含的挂载点。');
  const study=studyLayout===true;
  let raw=unlocked(patched({},initialSelection),study),state=evaluate(raw,study),dead=false;
  const panelRoot=el('div','c1s-panel'), pv=el('div','c1s-preview'),full=el('pre','c1s-prompt');
  const paintControls=controls(panelRoot,study,update);
  const feedback=el('p','c1s-feedback');feedback.setAttribute('aria-live','polite');
  panelRoot.append(feedback);
  const toolbar=el('div','c1s-bar'), mode=el('button','c1s-toggle'),head=el('strong','','↑ 机头');
  mode.type='button';let showGuide=false;
  mode.addEventListener('click',()=>{showGuide=!showGuide;paint();});
  toolbar.append(head,mode);
  const drawing=el('div','c1s-drawing'),caption=el('p','c1s-caption');
  pv.append(toolbar,drawing,caption);
  panel.replaceChildren(panelRoot);preview?.replaceChildren(pv);
  const textControl=promptHost instanceof HTMLTextAreaElement || promptHost instanceof HTMLInputElement?promptHost:null;
  if(!textControl)promptHost?.replaceChildren(full);
  function paint(){
    if(!preview)return;
    mode.disabled=!state.layout; mode.textContent=showGuide?'查看轴位图':'查看导出定位图';
    mode.setAttribute('aria-pressed',String(showGuide));
    const l=state.layout;
    if(!l){drawing.replaceChildren(el('p','c1s-empty','修正参数后显示轴位图'));caption.textContent='';return;}
    if(showGuide&&study){const img=el('img');img.src=studyGuide.dataUrl;img.alt='交接使用的共用轴位定位图';drawing.replaceChildren(img);}
    else if(showGuide){
      const c=el('canvas');c.setAttribute('role','img');c.setAttribute('aria-label','交给模型的顶视定位图');
      drawGuide(c,l,true,state.draft!.inputs.guideBladeLines);drawing.replaceChildren(c);
    } else drawing.replaceChildren(diagram(l));
    caption.textContent='最大中心距 '+l.max_motor_distance_mm+' mm · R1 起顺时针 '+l.adjacent_deg.map(deg).join(' / ');
  }
  function render(){
    paintControls(state);
    const error=state.validation.errors.join(' ');feedback.textContent=error;feedback.hidden=!error;
    paint();
    if(textControl)textControl.value=state.prompt;
    else full.textContent=state.prompt;
    onChange?.(snapshot(state));
  }
  function update(patch:Patch){
    if(dead)throw Error('该选择面板已卸载。');
    raw=unlocked(patched(raw,patch),study);state=evaluate(raw,study);render();return snapshot(state);
  }
  render();
  return {
    getSnapshot:()=>snapshot(state),setSelection:update,
    async exportVersion(){if(dead)throw Error('该选择面板已卸载。');return exportState(state);},
    destroy(){if(dead)return;dead=true;panelRoot.remove();pv.remove();full.remove();if(textControl)textControl.value='';},
  };
}
