import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, unitHubs, wlBasis, type FrameType } from '../../design/design';
import { armMaterialOptions, armRootOptions, references } from '../../design/fields';
import { Field, MarkLegend, OpenChoice, Segmented, SliderField, TabIntro, type Mark } from '../controls/controls';

const frameTypes: FrameType[] = ['True X', 'Wide X', 'Stretch X', 'H-Frame', 'Deadcat', '+ Configuration'];
const basisLabel = { definition: '几何定义', experimental: '实验档位', designer: '设计者输入' } as const;

/** 构型小图：与主预览同一个形状函数，只画轴心和连接。 */
const FrameIcon: React.FC<{ type: FrameType; active: boolean }> = ({ type, active }) => {
  const pts = unitHubs(type, frameRules[type].wl.value);
  const r = Math.max(...pts.map(p => Math.max(Math.abs(p.x), Math.abs(p.y))));
  const s = 15 / r;
  const stroke = active ? '#ffffff' : '#475569';
  const line = (x1: number, y1: number, x2: number, y2: number, k: number) => (
    <line key={k} x1={20 + x1 * s} y1={20 - y1 * s} x2={20 + x2 * s} y2={20 - y2 * s} stroke={stroke} strokeWidth="2" strokeLinecap="round" />
  );
  const links = type === 'H-Frame'
    ? [line(pts[0].x, pts[0].y, pts[3].x, pts[3].y, 0), line(pts[1].x, pts[1].y, pts[2].x, pts[2].y, 1), line(pts[0].x, 0, pts[1].x, 0, 2)]
    : pts.map((p, i) => line(0, 0, p.x, p.y, i));
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0" aria-hidden="true">
      {links}
      {pts.map((p, i) => <circle key={i} cx={20 + p.x * s} cy={20 - p.y * s} r="3" fill={active ? '#fecaca' : '#ef4444'} />)}
    </svg>
  );
};

const FrameParameters: React.FC = () => {
  const { parameters, setField } = useDroneStore();
  const frame = parameters.frame;
  const rule = frameRules[frame.frame_type];
  const layout = computeLayout(parameters);
  const wlMarks: Mark[] = [
    ...references.wl.experimental.map(m => ({ ...m, kind: 'experimental' as const })),
    ...references.wl.measured.map(m => ({ ...m, kind: 'measured' as const })),
  ];
  const dMarks: Mark[] = [
    ...references.diagonal.published.map(m => ({ ...m, kind: 'published' as const })),
    { v: references.diagonal.study, label: '论文规格卡', kind: 'study' },
  ];
  return (
    <div className="space-y-3">
      <TabIntro title="机架">决定四个电机轴心的位置和机臂。这里的轴心同时用于示意图、相邻夹角、点线条件图和导出坐标。</TabIntro>

      <Field path="frame.frame_type" hint={<><b className="font-medium text-slate-700">{rule.zh}的画法（{basisLabel[rule.basis]}）：</b>{rule.rule}</>}>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="构型">
          {frameTypes.map(type => {
            const active = frame.frame_type === type;
            return (
              <button key={type} type="button" role="radio" aria-checked={active} onClick={() => setField('frame.frame_type', type)}
                className={`flex flex-col items-center rounded-md border px-1 py-1.5 text-center ${active
                  ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-primary-500'}`}>
                <FrameIcon type={type} active={active} />
                <span>
                  <span className="block text-sm font-medium leading-tight">{frameRules[type].zh}</span>
                  <span className={`block text-[11px] ${active ? 'text-primary-50' : 'text-slate-500'}`}>W/L {frameRules[type].wl.value.toFixed(2)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field path="frame.span_ratio_wl" hint={rule.wl.adjustable
        ? <>W/L＝轴心横向跨度／纵向跨度。当前 {layout.W_over_L.toFixed(2)}，来源：{basisLabel[wlBasis(frame)]}。{references.wl.note}</>
        : <>{rule.zh}的 W/L 由形状规则算出，为 {layout.W_over_L.toFixed(2)}，不能单独调。想调 W/L 请选宽 X、伸展 X 或 H 型。</>}>
        <SliderField path="frame.span_ratio_wl" min={rule.wl.min} max={rule.wl.adjustable ? rule.wl.max : rule.wl.min + 0.01} step={0.01} unit="" digits={2}
          marks={rule.wl.adjustable ? wlMarks : []} disabled={!rule.wl.adjustable} />
        {rule.wl.adjustable && <MarkLegend marks={wlMarks} />}
      </Field>

      <Field path="frame.wheelbase_mm" hint={<>D＝两条对角电机中心距的均值（设计值）。当前任意两轴最大距 {layout.max_pair_mm.toFixed(1)} mm。{references.diagonal.note}</>}>
        <SliderField path="frame.wheelbase_mm" min={100} max={500} step={1} unit="mm" marks={dMarks} />
        <MarkLegend marks={dMarks} />
      </Field>

      <Field path="frame.arm_width_mm" hint="示意图按真实比例画机臂宽度；提示词里有单独一句写机臂宽和厚。">
        <Segmented options={[{ value: '10mm', zh: '10 mm' }, { value: '15mm', zh: '15 mm' }, { value: '20mm', zh: '20 mm' }]}
          value={frame.arm_width_mm} onChange={v => setField('frame.arm_width_mm', v)} />
      </Field>

      <Field path="frame.arm_thickness_mm" hint="厚度从正上方看不到，只在侧视示意和提示词里体现。">
        <Segmented options={[{ value: '3mm', zh: '3 mm' }, { value: '4mm', zh: '4 mm' }, { value: '5mm', zh: '5 mm' }, { value: '6mm', zh: '6 mm' }]}
          value={frame.arm_thickness_mm} onChange={v => setField('frame.arm_thickness_mm', v)} />
      </Field>

      <Field path="frame.arm_root" hint="机臂怎样接到机身，由设计者决定。留白时提示词不写这一项。">
        <OpenChoice path="frame.arm_root" options={armRootOptions} columns={2} />
      </Field>

      <Field path="frame.material_visual" hint="材料外观由设计者决定。只有在这里选了碳纤维，提示词才会出现碳纹。">
        <OpenChoice path="frame.material_visual" options={armMaterialOptions} columns={3} />
      </Field>
    </div>
  );
};

export default FrameParameters;
