import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, unitHubs, topologyOf, usesConsumerReferences, type FrameType } from '../../design/design';
import { armMaterialOptions, armRootOptions, references } from '../../design/fields';
import { designStart } from '../../design/defaults';
import { Choice, Field, Group, OpenChoice, Slider, TabHeading } from '../controls/controls';

const frameTypes = Object.keys(frameRules) as FrameType[];

/** 构型小图：与预览用同一个形状函数，只画轴心和连接。 */
const FrameIcon: React.FC<{ type: FrameType }> = ({ type }) => {
  const pts = unitHubs(type, frameRules[type].wl.value);
  const r = Math.max(...pts.map(p => Math.max(Math.abs(p.x), Math.abs(p.y))));
  const s = 17 / r;
  const line = (x1: number, y1: number, x2: number, y2: number, k: number) => (
    <line key={k} x1={24 + x1 * s} y1={24 - y1 * s} x2={24 + x2 * s} y2={24 - y2 * s} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  );
  const links = type === 'H-Frame'
    ? [line(pts[0].x, pts[0].y, pts[3].x, pts[3].y, 0), line(pts[1].x, pts[1].y, pts[2].x, pts[2].y, 1), line(pts[0].x, 0, pts[1].x, 0, 2)]
    : pts.map((p, i) => line(0, 0, p.x, p.y, i));
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
      {links}
      {pts.map((p, i) => <circle key={i} cx={24 + p.x * s} cy={24 - p.y * s} r="3.6" fill="#ff6a1a" />)}
    </svg>
  );
};

const FrameParameters: React.FC = () => {
  const { parameters, setField, intent } = useDroneStore();
  const frame = parameters.frame;
  const rule = frameRules[frame.frame_type];
  const layout = computeLayout(parameters);
  const topology = topologyOf(frame.frame_type);
  const consumer = usesConsumerReferences(frame.frame_type, intent.taskId);
  const measured = references.wl.measured;
  return (
    <div className="space-y-5">
      <TabHeading title="机架参数" en="Frame Parameters">{topology.axis_count} 处轴位 · 每轴 {topology.layers_per_axis} 层 · 共 {topology.rotor_count} 副旋翼</TabHeading>

      <Field path="frame.frame_type" en="Frame Type" value={rule.zh} hint={rule.desc} reference={<><b className="font-medium text-ink">画法：</b>{rule.rule}</>}>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="构型">
          {frameTypes.map(type => {
            const active = frame.frame_type === type;
            return (
              <button key={type} type="button" role="radio" aria-checked={active} data-frame={type} onClick={() => setField('frame.frame_type', type)}
                className={`flex flex-col items-center rounded-xl border px-1 py-2 transition-colors ${active
                  ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink/40'}`}>
                <FrameIcon type={type} />
                <span className="mt-0.5 text-[13px] font-medium">{frameRules[type].zh}</span>
                <span className={`text-[10px] ${active ? 'text-white/60' : 'text-ink-faint'}`}>{frameRules[type].en}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {rule.wl.adjustable ? (
        <Field path="frame.span_ratio_wl" value={layout.W_over_L.toFixed(2)}
          hint="电机左右跨度 ÷ 前后跨度。数值越大，机架越宽扁。"
          reference={consumer && <>
            <b className="font-medium text-ink">起始值：</b>1.35，32 款真实四旋翼产品的中位数。<br />
            <b className="font-medium text-ink">实验档（研究登记的条件，不是起始值）：</b>0.70、1.00、1.30。<br />
            <b className="font-medium text-ink">真实机型（手册图面量测）：</b>{measured.map(m => `${m.label} ${m.v.toFixed(2)}`).join('、')}。<br />
            {references.wl.note}
          </>}>
          <Slider path="frame.span_ratio_wl" min={rule.wl.min} max={rule.wl.max} step={0.01} unit="" digits={2}
            presets={!consumer ? [] : references.wl.experimental.filter(m => m.v >= rule.wl.min && m.v <= rule.wl.max).map(m => ({ v: m.v, label: `${m.v.toFixed(2)} 实验${m.label}` }))
              .concat(rule.wl.min <= designStart.span_ratio_wl && rule.wl.max >= designStart.span_ratio_wl ? [{ v: designStart.span_ratio_wl, label: designStart.span_ratio_wl.toFixed(2) + ' 真实产品中位' }] : [])} />
        </Field>
      ) : (
        <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-ink-soft">
          {rule.zh}的横纵跨度比固定为 <b className="font-semibold text-ink">{layout.W_over_L.toFixed(2)}</b>。{topology.layers_per_axis === 2 && topology.layer_visibility}
        </p>
      )}

      <Field path="frame.wheelbase_mm" en="Wheelbase" value={`${frame.wheelbase_mm} mm`}
        hint={layout.D_mean_mm === null ? '此构型无对置轴，以最远两轴之间的距离确定图面尺度。' : '此构型所有对置轴心距离的平均值。'}
        reference={consumer && <>
          <b className="font-medium text-ink">实验设定：</b>250 mm（论文规格卡）。<br />
          <b className="font-medium text-ink">厂商公布的对角尺寸（端点未核）：</b>{references.diagonal.published.map(m => `${m.label} ${m.v}`).join('、')} mm。<br />
          当前任意两电机的最大距离为 {layout.max_pair_mm.toFixed(1)} mm。
        </>}>
        <Slider path="frame.wheelbase_mm" min={100} max={Math.max(consumer ? 500 : 2000,frame.wheelbase_mm)} step={1} unit="mm" presets={consumer ? [{ v: 250, label: '250 实验设定' }] : []} />
      </Field>

      <Field path="frame.arm_width_mm" en="Arm Width" value={`${parseInt(frame.arm_width_mm, 10)} mm`}>
        <Choice options={[{ value: '10mm', zh: '10 mm' }, { value: '15mm', zh: '15 mm' }, { value: '20mm', zh: '20 mm' }]}
          value={frame.arm_width_mm} onChange={v => setField('frame.arm_width_mm', v)} label="机臂宽度" />
      </Field>

      <Field path="frame.arm_thickness_mm" en="Arm Thickness" value={`${parseInt(frame.arm_thickness_mm, 10)} mm`} hint="厚度从正上方看不到，可在侧视里查看。">
        <Choice options={[{ value: '3mm', zh: '3 mm' }, { value: '4mm', zh: '4 mm' }, { value: '5mm', zh: '5 mm' }, { value: '6mm', zh: '6 mm' }]}
          value={frame.arm_thickness_mm} onChange={v => setField('frame.arm_thickness_mm', v)} label="机臂厚度" />
      </Field>

      <Group title="造型" note="可以不指定，留给后续设计">
        <Field path="frame.arm_root" en="Arm Root">
          <OpenChoice path="frame.arm_root" options={armRootOptions} />
        </Field>
        <Field path="frame.material_visual" en="Arm Material">
          <OpenChoice path="frame.material_visual" options={armMaterialOptions} />
        </Field>
      </Group>
    </div>
  );
};

export default FrameParameters;
