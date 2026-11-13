import { componentPhrases, type PartGroup } from './partPrompt';
import type { DroneParameters, UserProfile } from '../types/DroneParameters';

export type Task = 'quad' | 'hexa';
export const quadBladeCount: DroneParameters['propulsion']['prop_blade_count'] = '2叶';
export const quadRotorConstraint = '四个电机各装一副静止、完全展开的双叶螺旋桨，每个电机只装两片桨叶。';
export type Group = PartGroup;
export type Inputs = {
  preset?: 'A' | 'B' | 'C'; task: Task; need: string; source: string; target: string; change: string; keep: string; free: string;
  method: 'structured' | 'free'; instruction: string; view: 'top' | 'product';
  route: 'guide' | 'text'; guideLines: boolean; guideNose?: boolean; guideTips?: boolean; guideBladeLines?: boolean; applyCmf?: boolean; shellFinish?: ShellFinish; gaps: string; groups: Group[];
};
export const shellFinishes = {
  matte: '细砂哑光聚合物，细密纹理与柔和宽高光',
  satin: '缎面涂装聚合物，平滑表面与清晰的柔亮反光带',
} as const;
export type ShellFinish = keyof typeof shellFinishes;
export const frameSurfaces = {
  'Carbon Fiber': '炭灰碳纤维，细编织纹与半哑光清漆',
  Aluminum: '银灰铝合金，细拉丝与窄条高光',
  'ABS Plastic': '深灰 ABS，均匀细砂纹与低光泽',
  'PLA Plastic': '深灰 PLA，可见层纹与低光泽',
} as const;
export const propSurface = '石墨黑模塑桨叶，低光泽，平滑无编织纹';
export const titles = {quad:'日常随行航拍', hexa:'农业植保喷洒'};
export function newInputs(task: Task): Inputs {
  const quad = task === 'quad';
  const target = quad ? '整机、航拍相机和机臂' : '药箱与中央机架、喷洒组件与支臂';
  const change = quad ? '探索适合日常携带的整机方案。' : '明确药箱承托面，让喷洒件的安装位置和管路连接可辨。';
  const keep = quad ? '保留四个电机轴心、相连的机臂和前向相机。' : '保留六个电机轴心、中央药箱和喷洒组件。';
  const free = quad ? '机身外轮廓、相机安装位置与接合方式、机臂过渡、壳体曲面和分件可探索。' : '机身外轮廓、壳体曲面、分件和配色可探索。';
  return {task, need:quad?'设计一台便于日常携带的航拍四旋翼。':'设计一台用于田间喷洒的农业植保六旋翼。',
    source:'作者确认的设计简报',target,change,keep,free,method:'structured',instruction:[change,keep,free].join('\n'),
    view:'top',route:'guide',guideLines:quad,guideTips:quad,guideBladeLines:quad,applyCmf:quad,shellFinish:'matte',gaps:'',groups:[]};
}

type Hub = {id: string; x_mm: number; y_mm: number; x_px: number; y_px: number};
export function projectedTips(hubs: Hub[], radius: number) {
  return hubs.flatMap(hub => {
    const distance = Math.hypot(hub.x_mm, hub.y_mm);
    const dx = -hub.y_mm / distance * radius;
    const dy = hub.x_mm / distance * radius;
    return [-1, 1].map(sign => ({
      hub: hub.id, x_px: hub.x_px + sign * dx, y_px: hub.y_px + sign * dy,
    }));
  });
}

export function layoutFor(parameters:DroneParameters, inputs:Inputs, drawingScale?:number) {
  const frame=parameters.frame.frame_type;
  const n=inputs.task==='quad'?4:6;
  const half = frame==='Wide X'?58:frame==='Stretch X'?32:frame==='Deadcat'?65:45;
  const preset = n===6 ? [-30,30,90,150,210,270] : frame==='+ Configuration' ? [0,90,180,270] :
    [-half,half,frame==='Deadcat'?145:180-half,frame==='Deadcat'?215:180+half];
  let angles=preset;
  if (inputs.gaps.trim()) {
    const parts=inputs.gaps.trim().split(/[\s,，、;；-]+/);
    const gaps=parts.map(Number);
    if (parts.length!==n || parts.some(s=>!/^\d+(?:\.\d+)?$/.test(s)) ||
        gaps.some(v=>v<=0 || v>=180) || Math.abs(gaps.reduce((s,v)=>s+v,0)-360)>1e-5)
      throw new Error('请填写 '+n+' 个大于 0°、小于 180°的相邻夹角，总和须为 360°。');
    let a=frame==='+ Configuration'?0:-gaps[0]/2;
    angles=gaps.map(gap=>{ const bearing=a; a+=gap; return bearing; });
  }
  const span=parameters.frame.wheelbase_mm;
  if (!Number.isFinite(span) || span<=0) throw new Error('最大电机中心距须为正数。');
  const unit=angles.map((angle,i)=>{
    const r=frame==='Deadcat' && i>=2 ? .82 : 1;
    const a=angle*Math.PI/180;
    return {x:r*Math.sin(a),y:-r*Math.cos(a)};
  });
  const maxDistance=Math.max(...unit.flatMap((a,i)=>unit.slice(i+1).map(b=>Math.hypot(b.x-a.x,b.y-a.y))));
  const mm=unit.map(p=>({x:p.x*span/maxDistance,y:p.y*span/maxDistance}));
  // Keep one drawing scale per task so changing wheelbase moves the exported hubs.
  const pxPerMm=drawingScale ?? 800/(n===4?500:3000);
  if (!Number.isFinite(pxPerMm) || pxPerMm<=0) throw new Error('定位图比例尺须为正数。');
  if (mm.some(p=>Math.max(Math.abs(p.x),Math.abs(p.y))*pxPerMm>496))
    throw new Error('当前参数超出本任务定位图的固定比例尺。');

  const hubs=mm.map((p,i)=>({id:'R'+(i+1), x_mm:p.x,y_mm:p.y,
    x_px:512+p.x*pxPerMm,y_px:512+p.y*pxPerMm}));
  // Each blade pair lies tangent to the radial arm in the top projection.
  const withTips = n === 4 && inputs.route === 'guide' && inputs.guideTips;
  const radius = parameters.propulsion.prop_diameter_inch * 25.4 * pxPerMm / 2;
  if (withTips && parameters.propulsion.motor_tilt_degree !== 0)
    throw new Error('等距叶尖定位适用于 0° 电机倾角。请调整倾角或取消叶尖定位。');
  if (withTips && !(Number.isFinite(radius) && radius > 0)) throw new Error('桨径须为正数。');
  const bladeTips = withTips ? projectedTips(hubs, radius) : [];
  if (bladeTips.some(p => Math.min(p.x_px, p.y_px, 1024-p.x_px, 1024-p.y_px) < 6))
    throw new Error('叶尖超出定位图。请调整桨径或轴距，或取消叶尖定位。');
  let links=hubs.map(p=>[512,512,p.x_px,p.y_px]);
  if (frame==='H-Frame') {
    const [fl,fr,rr,rl]=hubs;
    links=[[fl.x_px,fl.y_px,rl.x_px,rl.y_px],[fr.x_px,fr.y_px,rr.x_px,rr.y_px],
      [(fl.x_px+rl.x_px)/2,(fl.y_px+rl.y_px)/2,(fr.x_px+rr.x_px)/2,(fr.y_px+rr.y_px)/2]];
  }
  return {...(inputs.task==='quad' && inputs.route==='guide' && inputs.guideNose ? {noseMarker:true} : {}),size:1024, nose:'up', origin:'top-left', mm_origin:'frame-center',pxPerMm,
    max_motor_distance_mm:span,hubs,links,bladeTips,adjacent_deg:angles.map((a,i)=>(angles[(i+1)%n]-a+360)%360),
    r1_clockwise_from_nose_deg:(angles[0]+360)%360};
}
export type Layout=ReturnType<typeof layoutFor>;
export function compile(parameters:DroneParameters,profile:UserProfile|null,d:Inputs,layout:Layout,hasParent:boolean) {
  const text=d.method==='free' ? [d.instruction] : [d.target,d.change,d.keep,d.free];
  if ([d.need,d.source,...text].some(v=>!v.trim())) throw new Error('请补全任务、依据和当前方式下的设计要求。');
  const {frame,propulsion,accessories:parts}=parameters;
  const intent=d.method==='free'?d.instruction.trim():['目标部位：'+d.target.trim(),'本次改变：'+d.change.trim(),'保持：'+d.keep.trim(),'自由项：'+d.free.trim()].join('\n');
  const bladeSpec=d.task==='quad' && propulsion.prop_blade_count===quadBladeCount
    ? quadRotorConstraint : '每个电机一副桨，每桨 '+propulsion.prop_blade_count+'。';
  const cmf = d.applyCmf && d.task === 'quad'
    ? 'CMF 外观：上壳主色 '+parts.drone_primary_color+'，'+shellFinishes[d.shellFinish ?? 'matte']+
      '；外露机架为'+frameSurfaces[frame.material_visual]+'；'+propSurface+
      '。同一中性侧光下清楚表现部件交界、细纹与高光差异，整机清晰对焦。'
    : '';
  return [titles[d.task]+'。'+d.need.trim(),bladeSpec,profile?'面向'+profile+'。':'',intent,...componentPhrases(parameters,d.groups),cmf,
    parts.custom_prompt_additions.trim(),layout.hubs.length+' 个电机，'+(frame.frame_type==='True X' && d.gaps.trim()?'径向 X 型':frame.frame_type)+' 布局。最大电机中心距设计值 '+frame.wheelbase_mm+
    ' mm，相邻夹角从 R1 起顺时针为 '+layout.adjacent_deg.map(a=>Number(a.toFixed(2))).join('、')+'°。',
    d.route==='guide'?'随附正交俯视定位图，机头朝上，红点定位电机轴心。'+(d.guideLines?'蓝线表示机架连接。':''):'',
    layout.bladeTips.length ? '每个红色桨毂旁的两个青色点是这副桨的两个叶尖。'+(d.guideBladeLines?'青线穿过桨毂，两端对应同一副桨的叶尖。':'')+'双叶连线垂直于该轴心和机架中心的连线，桨径 '+propulsion.prop_diameter_inch+' 英寸。绘制完整展开的桨，保留桨与机身之间的可见边界。' : '',
    hasParent?'外观父图用于延续已有方案，按本次指令修订目标部位。':'',
    d.view==='top'?'输出正交俯视产品图，制图观察方向从无人机正上方垂直向下，机头指向画面上沿，完整显示所有电机轴心和桨叶。'+(d.route==='guide'?'保持各轴心在定位图画幅内的归一化位置和留白。':''):'输出斜前上视产品图，展示部件厚度、支撑和连接，按该视角投影平面布局。',
    '浅色中性背景，照片级工业产品设计渲染，柔和棚拍侧光与接触阴影，画面无辅助线、刻度或文字。'].filter(Boolean).join('\n');
}
export function drawGuide(canvas:HTMLCanvasElement,layout:Layout,lines:boolean,bladeLines=false) {
  const ctx=canvas.getContext('2d');
  if (!ctx) throw new Error('无法绘制定位图。');
  canvas.width=canvas.height=layout.size;
  ctx.fillStyle='black';ctx.fillRect(0,0,layout.size,layout.size);
  if (lines) {
    ctx.strokeStyle='#205cff';ctx.lineWidth=3;
    for (const [x,y,u,v] of layout.links) {ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(u,v);ctx.stroke();}
  }
  if (layout.noseMarker) {
    const center = layout.size / 2;
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(center,center-18);
    ctx.lineTo(center,center-64);
    ctx.moveTo(center-10,center-49);
    ctx.lineTo(center,center-64);
    ctx.lineTo(center+10,center-49);
    ctx.stroke();
  }
  if (bladeLines) {
    ctx.strokeStyle='#00b6bc';ctx.lineWidth=3;
    for (const hub of layout.hubs) {
      const pair=layout.bladeTips.filter(t => t.hub===hub.id);
      if (pair.length!==2) continue;
      ctx.beginPath();ctx.moveTo(pair[0].x_px,pair[0].y_px);ctx.lineTo(pair[1].x_px,pair[1].y_px);ctx.stroke();
    }
  }
  ctx.fillStyle='#00ffff';
  for (const tip of layout.bladeTips) {
    ctx.beginPath(); ctx.arc(tip.x_px,tip.y_px,5,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle='#ff0000';
  const nearest=Math.min(...layout.hubs.flatMap((a,i)=>layout.hubs.slice(i+1).map(b=>Math.hypot(a.x_px-b.x_px,a.y_px-b.y_px))));
  if(nearest<4) throw new Error('所设夹角让两个轴心在 1024 像素画布上过近，请增大间距。');
  for (const h of layout.hubs) {ctx.beginPath();ctx.arc(h.x_px,h.y_px,Math.min(10,nearest/4),0,Math.PI*2);ctx.fill();}
}
