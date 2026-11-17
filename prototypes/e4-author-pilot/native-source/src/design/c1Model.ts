import type { DroneParameters } from '../types/DroneParameters';
import { compile, frameSurfaces, layoutFor, newInputs, propSurface, quadBladeCount, shellFinishes } from './design';
import { directionDraft, quadDirections, type Direction } from './quadDirections';
import { freeze } from './versions';
declare const C1_STUDY_PNG:string, C1_STUDY_SHA:string;
export const studyGuide={mime:'image/png',width:1024,height:1024,dataUrl:C1_STUDY_PNG,sha256:C1_STUDY_SHA};

const opt = (values: string[]) => Object.fromEntries(values.map(v => [v,v]));
export const labels = {
  preset:'配置起点', frame:'机架构型', span:'最大电机中心距（mm）', angles:'相邻夹角', custom:'自定义夹角（°）',
  root:'臂根过渡', camera:'前向相机', body:'机身轮廓', seams:'上壳分件', finish:'上壳表面',
  color:'上壳主色', material:'外露机架', width:'机臂宽度', thickness:'机臂厚度', guide:'定位图',
} as const;
export type Key = keyof typeof labels;
// Missing key = inherit. "open" = the designer deliberately leaves the decision open.
export type Selection = Partial<Record<Key, string | number>>;
export type Patch = Partial<Record<Key, string | number | null>>;
const open = {open:'留白 · 自由探索'};
export const options: Partial<Record<Key,Record<string,string>>> = {
  preset:{base:'随行航拍四旋',...Object.fromEntries(Object.entries(quadDirections).map(([k,v])=>[k,v.label]))},
  frame:{'True X':'径向 X（默认等角）','Wide X':'宽 X','Stretch X':'伸展 X','H-Frame':'H 型','Deadcat':'Deadcat（前宽后收）','+ Configuration':'十字型'},
  angles:{frame:'随构型',...Object.fromEntries(['90-90-90-90','75-105-75-105','60-120-60-120','45-135-45-135'].map(v=>[v,v.split('-').join(' / ')+'°'])),custom:'手动填写'},
  root:{...open,shoulder:'短肩包覆',taper:'长渐缩融合',socket:'外露接合',hinge:'折叠铰接'},
  camera:{...open,inside:'内嵌鼻舱',outside:'前伸云台'},
  body:{...open,'Minimalist Plate':'极简平板','Aerodynamic Pod':'流线座舱','Boxy Enclosure':'方正机壳','Exposed Stack':'裸露堆叠'},
  seams:{...open,one:'单盖缝',few:'少分件（2–3 条盖缝）',many:'多分件（4 条以上）'},
  finish:{...open,matte:'细砂哑光',satin:'平滑缎面'},
  color:{...open,'#8a9095':'冷灰','#0ea5e9':'天空蓝','#1e293b':'炭黑','#ffffff':'纯白','#f97316':'橙红','#10b981':'翠绿','#7c3aed':'深紫','#f59e0b':'金黄','#ec4899':'玫红'},
  material:{'Carbon Fiber':'碳纤维',Aluminum:'铝合金','ABS Plastic':'ABS 塑料','PLA Plastic':'PLA 塑料'},
  width:opt(['10mm','15mm','20mm']), thickness:opt(['3mm','4mm','5mm','6mm']),
  guide:{axes:'轴心与机架连线',tips:'轴心、机架与双叶方向'},
};
const rootText:Record<string,string> = {
  shoulder:'机臂以短而圆润的肩部从机身过渡至臂宽。',taper:'机臂从机身逐渐收窄，以较长的连续曲面过渡到臂宽。',
  socket:'机臂插入轮廓可辨的臂根接口，接合处可见横向接缝。',hinge:'臂根为折叠铰接，显示转轴和接合间隙，机臂处于展开状态。',
};
const camText:Record<string,string> = {
  inside:'相机外壳收在机鼻前缘轮廓以内。',outside:'云台上壳伸出机鼻前缘，具体接合细节可探索。',
};
const seamText:Record<string,string> = {one:'上盖有一条盖缝。',few:'上盖有两至三条可辨盖缝。',many:'上盖有至少四条可辨盖缝。'};
// Native quad task values (droneStore); do not import its React store or legacy app.
function nativeQuad():DroneParameters {
  return {frame:{frame_type:'True X',wheelbase_mm:250,arm_width_mm:'15mm',arm_thickness_mm:'4mm',material_visual:'Carbon Fiber'},
    propulsion:{prop_diameter_inch:5,prop_blade_count:quadBladeCount,motor_tilt_degree:0},
    fuselage:{fuselage_style:'Minimalist Plate',fuselage_dimensions_mm:{length:100,width:80,height:30}},
    landing_gear:{landing_gear_style:'低矮滑撬/支腿',landing_gear_height_mm:40},
    accessories:{has_camera_gimbal:true,drone_primary_color:'#8a9095',custom_prompt_additions:''}};
}
export const keys = Object.keys(labels) as Key[];
const has = (o:object,k:string) => Object.prototype.hasOwnProperty.call(o,k);
export function patched(raw:Selection,patch:Patch): Selection {
  const copy = {...raw};
  for (const [k,v] of Object.entries(patch)) {
    if (!has(labels,k)) throw Error('未知选择字段：'+k);
    if(v == null) delete copy[k as Key];
    else if(typeof v==='string'||typeof v==='number') copy[k as Key]=v;
    else throw Error('不支持的字段类型：'+k);
  }
  return copy;
}
export const studyValues:Partial<Record<Key,string|number>> = {
  frame:'True X',span:250,angles:'frame',custom:'',guide:'axes',
};
export function unlocked(raw:Selection,study:boolean) {
  const next={...raw};
  if(study) for(const key of Object.keys(studyValues))delete next[key as Key];
  return next;
}
export function evaluate(selection:Selection,studyLayout=false) {
  const raw=unlocked(selection,studyLayout);
  const preset = String(raw.preset ?? 'base');
  const p0 = nativeQuad(), seeded = has(quadDirections,preset);
  const {inputs:d,parameters:p} = seeded ? directionDraft(preset as Direction,p0) : {inputs:newInputs('quad'),parameters:p0};
  const defaults:Record<Key,string|number> = {
    preset:'base',frame:p.frame.frame_type,span:p.frame.wheelbase_mm,angles:'frame',custom:'',
    body:seeded?p.fuselage.fuselage_style:'open',camera:'open',root:'open',seams:'open',
    material:p.frame.material_visual,width:p.frame.arm_width_mm,thickness:p.frame.arm_thickness_mm,
    color:p.accessories.drone_primary_color,finish:d.shellFinish ?? 'matte',guide:d.guideTips?'tips':'axes',
  };
  if(studyLayout)Object.assign(defaults,studyValues);
  const v={...defaults,...raw};
  const fields=Object.fromEntries(keys.map(k=>[k,{value:v[k],label:options[k]?.[v[k]]??String(v[k]),
    source:studyLayout&&has(studyValues,k)?'task':has(raw,k)?'selected':seeded && (k==='body'||k==='guide')?'preset':'default',
    active:k!=='custom'||v.angles==='custom',open:v[k]==='open'}]));
  const research={schema:'c1-selection/1',studyLayout,selection:{...raw},fields,
    taskLayout:studyLayout?{frame:'True X',spanMm:250,adjacentDeg:[90,90,90,90],guide:'axes',bladeTips:false}:null,
    legacyFallbacks:{landing_gear:'未参与提示词',has_camera_gimbal:v.camera==='outside'?'前伸云台':'原模型布尔默认，不约束相机安装方式'},
    fixed:{rotors:4,blades:2,diameterInch:5,tiltDeg:0,view:'top',cameraDirection:'forward'},
    // Native Draft requires concrete component values even for omitted groups.
    // The constraints in inputs/groups and the compiler text govern the handoff.
    bodyEnvelopeMm:v.body==='open'?null:{...p.fuselage.fuselage_dimensions_mm},
  };
  const draft={inputs:{...d,c1Selection:research},parameters:p,profile:null};
  const state={selection:{...raw},research,defaults};
  const errors:string[]=[];
  for(const k of keys) if(options[k]&&!has(options[k]!,String(v[k]))) errors.push(labels[k]+'：请选择有效选项。');
  const span=typeof v.span==='number'?v.span:/^\d+$/.test(v.span)?Number(v.span):NaN;
  if(!Number.isInteger(span)||span<100||span>500) errors.push('最大电机中心距须为 100–500 mm 的整数。');
  try {
    if(errors.length) throw Error(errors.join(' '));
    const frame=p.frame;
    frame.frame_type=v.frame as typeof frame.frame_type; frame.wheelbase_mm=span;
    frame.arm_width_mm=v.width as typeof frame.arm_width_mm; frame.arm_thickness_mm=v.thickness as typeof frame.arm_thickness_mm;
    frame.material_visual=v.material as typeof frame.material_visual;
    if(v.body!=='open') p.fuselage.fuselage_style=v.body as typeof p.fuselage.fuselage_style;
    if(v.color!=='open') p.accessories.drone_primary_color=String(v.color);
    // has_camera_gimbal has no "unspecified" or camera-position state in E.
    // Keep its native fallback. Only an explicit outside choice constrains a gimbal.
    const i=draft.inputs;
    i.groups=['frame','propulsion']; if(v.body!=='open') i.groups.push('fuselage');
    i.gaps=v.angles==='frame'?'':String(v.angles==='custom'?v.custom:v.angles);
    if(v.angles==='custom'&&!i.gaps.trim()) throw Error('请填写从 R1 起顺时针的四个相邻夹角。');
    i.guideLines=true; i.guideTips=i.guideBladeLines=v.guide==='tips';
    i.source='日常随行航拍四旋任务，采用本次选择及未改动的配置默认值。';
    i.change=['明确机身、前向相机与展开机臂的轮廓关系。',rootText[v.root],camText[v.camera],seamText[v.seams]].filter(Boolean).join('');
    i.keep='保留四个电机轴心和前向航拍功能。'+(studyLayout?'相机位于机头端。':'')+'镜头水平朝前，正上方不要求看见镜片。';
    const free=['未指定的外观细节',...(v.root==='open'?['臂根过渡']:[]),...(v.camera==='open'?[studyLayout?'机鼻范围内的相机位置及安装方式':'相机位置及安装方式']:[]),
      ...(v.body==='open'?['机身轮廓和包络']:[]),...(v.seams==='open'?['上壳分件']:[]),
      ...(v.color==='open'?['上壳主色']:[]),...(v.finish==='open'?['上壳表面处理']:[])];
    i.free=free.join('、')+'可探索。';
    i.instruction=[i.change,i.keep,i.free].join('\n');
    i.applyCmf=v.color!=='open'&&v.finish!=='open';
    if(v.finish!=='open') i.shellFinish=v.finish as keyof typeof shellFinishes;
    else delete i.shellFinish;
    if(!i.applyCmf) p.accessories.custom_prompt_additions=[
      v.color!=='open'?'上壳主色 '+v.color:'',v.finish!=='open'?shellFinishes[v.finish as keyof typeof shellFinishes]:'',
      '外露机架为'+frameSurfaces[frame.material_visual],propSurface].filter(Boolean).join('；')+'。';
    // Same motor-centre spacing in the 1024 px frame as E form342 / common reference.png.
    const layout=layoutFor(p,i,studyLayout?1024*0.41/(250/Math.sqrt(2)):undefined);
    if(i.gaps && !['True X','H-Frame'].includes(frame.frame_type)){
      const canonical=layoutFor(p,{...i,gaps:'',guideTips:false});
      if(canonical.adjacent_deg.some((a,k)=>Math.abs(a-layout.adjacent_deg[k])>1e-5))
        throw Error('所填夹角与所选构型的定义不一致。可选“随构型”，或切换径向 X / H 型后指定夹角。');
    }
    if(layout.hubs.some((a,k)=>layout.hubs.slice(k+1).some(b=>Math.hypot(a.x_px-b.x_px,a.y_px-b.y_px)<4)))
      throw Error('相邻轴心在定位图上过近，请增大间距。');
    const prompt=compile(p,null,i,layout,false);
    return {...state,validation:{ok:true,errors:[] as string[]},draft,layout,prompt};
  } catch(err) {
    return {...state,validation:{ok:false,errors:errors.length?errors:[(err as Error).message]},draft:null,layout:null,prompt:''};
  }
}
export async function exportState(s:ReturnType<typeof evaluate>) {
  if(!s.draft||!s.layout) throw Error(s.validation.errors.join(' '));
  const v=await freeze(s.draft,s.layout,s.prompt,s.prompt,'compiler',null,null,'');
  if(s.research.studyLayout){
    // Identical geometry; preserve the supplied common PNG bytes across browser encoders.
    v.guide={...studyGuide};v.request.references[0]={role:'top-layout',mime:v.guide.mime,sha256:v.guide.sha256};
  }
  return v;
}

