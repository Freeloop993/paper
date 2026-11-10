export const frames = { x: "X 型", plus: "十字型", h: "H 型", v: "V 型" };
export const tasks = {
  quad: { name: "四旋 · 日常随行航拍", count: 4,
    need: "日常随行航拍。整机紧凑，前向相机融入机鼻，机臂与机身自然过渡。",
    goals: ["前摄与机鼻的整合", "臂根到机身的过渡"],
    keep: "四个清楚的旋翼、相连的机臂和可辨认的前向相机。" },
  hexa: { name: "六旋 · 农业植保喷洒", count: 6,
    need: "农作物植保喷洒。表现药箱由中央机架承托，以及喷洒部件怎样连接机架或支臂。",
    goals: ["药箱与中央机架的整合", "喷洒部件的安装与支撑"],
    keep: "六个旋翼、相连的六臂、可识别的药箱和喷洒组件。" }
};

export function defaults(rotorType) {
  const t = tasks[rotorType];
  return { rotorType, frameType:"x", mode:"angles", angleConfig:Array(t.count).fill(360/t.count).join("-"),
    axisLength:rotorType==="quad" ? "40" : "160", spanRatio:"1", propDiameter:"",
    guide:"skeleton", need:t.need, goal:t.goals[0], keep:t.keep, free:"壳体轮廓、截面、表面分件与材质由设计者探索。" };
}

function numberIn(value, label, low, high) {
  const n = Number(value);
  if (String(value).trim()==="" || !Number.isFinite(n) || n<low || n>high)
    throw new Error(label+"须在 "+low+" 至 "+high+" 之间。");
  return n;
}
const deg = Math.PI/180;
const turn = a => (a % 360 + 360) % 360;
const bearing = p => turn(Math.atan2(p.y,p.x) / deg);
const span = (points,key) => Math.max(...points.map(p=>p[key])) - Math.min(...points.map(p=>p[key]));
const fmt = n => String(Number(n.toFixed(2)));

export function createDesign(d) {
  const task = tasks[d.rotorType], n=task.count, frame=d.frameType;
  const maxSpan=numberIn(d.axisLength,"最大轴距（cm）",1,1000);
  const prop=String(d.propDiameter).trim()==="" ? null : numberIn(d.propDiameter,"桨盘直径（cm）",0.1,500);
  if (!d.need.trim() || !d.goal.trim() || !d.keep.trim()) throw new Error("请填写任务需求、设计重点和保持项。");
  const useRatio=frame==="h" || d.mode==="ratio";
  const ratio=useRatio ? numberIn(d.spanRatio,"前后／左右轴位跨度比",0.25,4) : null;
  const standard=(frame==="v") ? [120,60,120,60] : Array(n).fill(360/n);
  let angles=standard;
  if (!useRatio) {
    if (/^\s*[-,，、;；]|[-,，、;；]\s*[-,，、;；]|[-,，、;；]\s*$/.test(d.angleConfig)) throw new Error("夹角之间只用一个分隔符，各值须为正数。");
    const parts=String(d.angleConfig).trim().split(/[\s,，、;；-]+/);
    if (parts.length!==n || parts.some(s=>!/^\d+(\.\d+)?$/.test(s))) throw new Error("按顺时针填写 "+n+" 个相邻夹角。");
    angles=parts.map(Number);
    if (angles.some(a=>a<=0 || a>=180) || Math.abs(angles.reduce((a,b)=>a+b,0)-360)>0.00001)
      throw new Error("每个夹角须大于 0° 且小于 180°，总和须为 360°。");
  }
  let pts;
  if (frame==="h") {
    const xs=n===4 ? [-1,1] : [-1,0,1];
    pts=[...xs.map(x=>({x,y:-1})),...xs.slice().reverse().map(x=>({x,y:1}))];
  } else {
    // Anchor the X/V sector bisector to the nose/tail or lateral axis. Regular layouts stay oriented when their paired gaps change.
    let a=frame==="plus" ? 0 : frame==="v" ? 90-angles[0]/2 : n===4 ? 180-angles[0]/2 : angles[n-1]/2;
    pts=angles.map(gap=>{ const p={x:Math.cos(a*deg),y:Math.sin(a*deg)}; a+=gap; return p; });
  }
  if (useRatio) {
    const stretch=ratio*span(pts,"y")/span(pts,"x");
    pts=pts.map(p=>({x:p.x*stretch,y:p.y}));
  }
  const distances=pts.flatMap((a,i)=>pts.slice(i+1).map(b=>Math.hypot(a.x-b.x,a.y-b.y)));
  const unit=maxSpan/Math.max(...distances);
  const cm=pts.map(p=>({x:p.x*unit,y:p.y*unit}));
  const gaps=cm.map((p,i)=>turn(bearing(cm[(i+1)%n])-bearing(p)));
  const actualRatio=span(cm,"x")/span(cm,"y");
  const coverage=Math.max(...cm.flatMap(p=>[Math.abs(p.x),Math.abs(p.y)]))+(prop||0)/2;
  const scale=Math.min(10,205/coverage);
  const hubs=cm.map((p,i)=>({id:"R"+(i+1), x_cm:p.x,y_cm:p.y,x:250+p.x*scale,y:250+p.y*scale}));
  const cmToPanel = (x,y)=>[250+x*scale,250+y*scale];
  let lines=hubs.map(p=>[250,250,p.x,p.y]);
  if (frame==="h") {
    const hx=span(cm,"x")/2, hy=span(cm,"y")/2;
    lines=[[-hx,-hy,hx,-hy],[-hx,hy,hx,hy],[0,-hy,0,hy]].map(([x,y,z,w])=>[...cmToPanel(x,y),...cmToPanel(z,w)]);
  }
  const geometry={rotorType:d.rotorType,frameType:frame,mode:useRatio?"spanRatio":"adjacentAngles",
    max_motor_distance_cm:maxSpan, adjacent_angles_input_deg:useRatio?null:angles,span_ratio_input:ratio,
    prop_diameter_cm:prop, actual_gaps_clockwise_deg:gaps, r1_bearing_clockwise_deg:bearing(cm[0]),
    actual_longitudinal_to_lateral_ratio:actualRatio, guide:d.guide};
  const cue=d.guide==="skeleton"?"红点定位电机转轴，蓝线表示骨架连接。":"红点只定位电机转轴。";
  const propCue=prop ? "虚线圈只标注桨盘范围，目标桨盘直径 "+fmt(prop)+" cm。" : "";
  const brief={task:task.name,need:d.need.trim(),goal:d.goal.trim(),keep:d.keep.trim(),free:d.free.trim()};
  const prompt=[brief.task+"。"+brief.need,"重点表现："+brief.goal+"。","保留："+brief.keep,brief.free,
    "参考随附定位图，原画幅正交顶视，机头朝右。"+cue+propCue,
    "使用"+n+"个电机转轴，"+frames[frame]+"布局。最大轴距设计值 "+fmt(maxSpan)+" cm；"+(useRatio?"前后／左右轴位跨度比 "+fmt(actualRatio):"从 R1（相对机头顺时针 "+fmt(bearing(cm[0]))+"°）起相邻射线夹角依次为 "+gaps.map(fmt).join("、")+"°")+"。",
    "生成一张完整的产品概念效果图，保留轴心在画幅中的相对位置，实体部件替代示意符号。画面无坐标、标号和辅助线。"].filter(Boolean).join("\n");
  return {brief, geometry, hubs, lines, scale, prompt, minSeparation: Math.min(...distances)*unit,
    marker:Math.min(7,Math.max(1,Math.min(...distances)*unit*scale/4))};
}
