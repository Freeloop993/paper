import { layoutFor, drawGuide, newInputs } from './design';
import type { DroneParameters } from '../types/DroneParameters';

const choices = {
  body: {'pod':['流线舱','A rounded pod with a continuous curved outline.'], 'box':['方正机壳','A box-shaped shell with straight sides and clipped corners.']},
  ratio: {'1.4':['1.4',''], '1.8':['1.8',''], '2.4':['2.4','']},
  arm: {'10':['细 · 10 mm',''], '15':['中 · 15 mm',''], '20':['宽 · 20 mm','']},
  root: {'shoulder':['短肩包覆','Each arm reaches its running width within one arm width of the shell, through a short, seamless, rounded shoulder.'],
         'taper':['长渐缩融合','Each arm tapers gradually out of the shell for at least two arm widths before reaching its running width, with no joint seam.'],
         'socket':['外露接合','Each arm enters a distinct socket at the shell, with a visible transverse joint seam.'],
         'hinge':['折叠铰接','Each arm meets the shell at an exposed hinge with a visible pivot and a joint gap.']},
  camera: {'inside':['内嵌鼻舱','The camera housing lies within the nose outline.'], 'outside':['前伸云台','The camera gimbal projects beyond the nose outline.']},
  seams: {'one':['单盖缝','One top cover seam.'], 'few':['少分件','Two or three distinct top cover seams.'], 'many':['多分件','Four or more distinct top cover seams.']},
} as const;
type Shape = { [K in keyof typeof choices]: keyof (typeof choices)[K] };
type Field = keyof Shape;
const starting: Shape = {body:'pod',ratio:'1.8',arm:'15',root:'shoulder',camera:'inside',seams:'few'};
const presets: Record<string,Shape> = {
  R1:{...starting}, R2:{...starting,root:'taper'},
  A:{body:'pod',ratio:'1.4',arm:'20',root:'shoulder',camera:'inside',seams:'one'},
  B:{body:'pod',ratio:'2.4',arm:'10',root:'taper',camera:'inside',seams:'one'},
  C:{body:'box',ratio:'1.4',arm:'20',root:'socket',camera:'outside',seams:'many'},
};
const names:Record<Field,string> = {body:'机身平面形',ratio:'机身长宽比',arm:'机臂宽度',root:'臂根过渡',camera:'相机舱形式',seams:'上盖分件'};
const controls = document.querySelector<HTMLFormElement>('#parameters')!;
const text = document.querySelector<HTMLTextAreaElement>('#prompt')!;
const canvas = document.querySelector<HTMLCanvasElement>('#guide')!;
const draftSelect = document.querySelector<HTMLSelectElement>('#preset')!;
for (const key of Object.keys(names) as Field[]) {
  const select=document.createElement('select'); select.name=key;
  for (const [value,pair] of Object.entries(choices[key])) select.add(new Option(pair[0],value));
  const label=document.createElement('label'); label.append(names[key],select); controls.append(label);
}
const bladeInput = document.querySelector<HTMLSelectElement>('#blades')!;
function readShape():Shape {
  return Object.fromEntries(Object.keys(names).map(k=>[k,(controls.elements.namedItem(k) as HTMLSelectElement).value])) as Shape;
}
function exportSpec() {
  const shape=readShape();
  const blades=Number(bladeInput.value);
  const params:DroneParameters = {
    frame:{frame_type:'True X',wheelbase_mm:250,arm_width_mm:(shape.arm+'mm') as DroneParameters['frame']['arm_width_mm'],arm_thickness_mm:'4mm',material_visual:'Carbon Fiber'},
    propulsion:{prop_diameter_inch:5,prop_blade_count:(blades+'叶') as DroneParameters['propulsion']['prop_blade_count'],motor_tilt_degree:0},
    fuselage:{fuselage_style:shape.body==='pod'?'Aerodynamic Pod':'Boxy Enclosure',fuselage_dimensions_mm:{length:Number(shape.ratio)*50,width:50,height:40}},
    landing_gear:{landing_gear_style:'无独立起落架',landing_gear_height_mm:40},
    accessories:{has_camera_gimbal:true,drone_primary_color:'',custom_prompt_additions:''}
  };
  const inputs={...newInputs('quad'),guideTips:false,guideBladeLines:false,guideNose:false,applyCmf:false};
  const layout=layoutFor(params,inputs,1024*0.41/(250/Math.sqrt(2)));
  const propWord=['','','two','three','four','five','six'][blades];
  const prompt=[
    'Design a compact quadcopter for everyday aerial photography. Strict orthographic top view, nose toward the top edge, arms fully unfolded.',
    'Match the four motor centres and arm directions in the layout. True X, 250 mm opposite-motor span, equal horizontal and vertical spacing. Each motor carries one stationary '+propWord+'-blade, 5-inch propeller. No propeller guards.',
    choices.body[shape.body][1]+' The main shell is '+shape.ratio+' times as long as wide.',
    'Each arm is '+parseInt(params.frame.arm_width_mm,10)+' mm wide at midspan.',
    choices.root[shape.root][1],
    choices.camera[shape.camera][1]+' The camera faces horizontally forward; its optical face is hidden from directly overhead.',
    choices.seams[shape.seams][1],
    'Show the complete product on a plain light background. Omit guide marks and lettering.'
  ].join('\n');
  return {schema:'form342-h3/1',shape,layout,bladeCount:blades,designDimensionsMm:params.fuselage.fuselage_dimensions_mm,armWidthMm:Number(shape.arm),requestedPropDiameterMm:127,prompt};
}
function refresh() {
  const spec=exportSpec(); text.value=spec.prompt;drawGuide(canvas,spec.layout,true,false);
}
function applyPreset() {
  const s=presets[draftSelect.value]; if(!s)return;
  for(const k of Object.keys(s) as Field[]) (controls.elements.namedItem(k) as HTMLSelectElement).value=s[k];
  bladeInput.value='2';refresh();
}
function save(file:string,blob:Blob) {
  const url=URL.createObjectURL(blob); const a=document.createElement('a');a.download=file;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
document.querySelector('#save-text')!.addEventListener('click',()=>save('prompt.txt',new Blob([exportSpec().prompt],{type:'text/plain;charset=utf-8'})));
document.querySelector('#save-spec')!.addEventListener('click',()=>save('spec.json',new Blob([JSON.stringify(exportSpec(),null,2)],{type:'application/json'})));
document.querySelector('#save-guide')!.addEventListener('click',()=>canvas.toBlob(b=>{if(b)save('guide.png',b)},'image/png'));
draftSelect.addEventListener('change',applyPreset);
function edited(){draftSelect.value='custom';refresh()}
controls.addEventListener('change',edited);bladeInput.addEventListener('change',edited);applyPreset();
