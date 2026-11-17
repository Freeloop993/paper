import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout, frameRules, unitHubs, type FrameType } from '../../design/design';
import { armMaterialOptions, armRootOptions, references } from '../../design/fields';
import { Choice, Field, Group, OpenChoice, Slider, TabHeading } from '../controls/controls';

const frameTypes: FrameType[] = ['True X', 'Wide X', 'Stretch X', 'H-Frame', 'Deadcat', '+ Configuration'];

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
  const { parameters, setField } = useDroneStore();
  const frame = parameters.frame;
  const rule = frameRules[frame.frame_type];
  const layout = computeLayout(parameters);
  const measured = references.wl.measured;
  return (
    <div className="space-y-5">
      <TabHeading title="机架参数" en="Frame Parameters">四个电机放在哪里、机臂多宽。</TabHeading>

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
          reference={<>
            <b className="font-medium text-ink">实验档：</b>0.70、1.00、1.30。<br />
            <b className="font-medium text-ink">真实机型（手册图面量测）：</b>{measured.map(m => `${m.label} ${m.v.toFixed(2)}`).join('、')}。<br />
            {references.wl.note}
          </>}>
          <Slider path="frame.span_ratio_wl" min={rule.wl.min} max={rule.wl.max} step={0.01} unit="" digits={2}
            presets={references.wl.experimental.filter(m => m.v >= rule.wl.min && m.v <= rule.wl.max).map(m => ({ v: m.v, label: `${m.v.toFixed(2)} 实验${m.label}` }))
              .concat(rule.wl.max >= 1.41 ? [{ v: 1.41, label: '1.41 真实机型中位' }] : [])} />
        </Field>
      ) : (
        <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-ink-soft">
          {rule.zh}的横纵跨度比固定为 <b className="font-semibold text-ink">{layout.W_over_L.toFixed(2)}</b>。想调宽窄，请选宽 X、伸展 X 或 H 型。
        </p>
      )}

      <Field path="frame.wheelbase_mm" en="Wheelbase" value={`${frame.wheelbase_mm} mm`}
        hint="两条对角电机中心距的平均值。"
        reference={<>
          <b className="font-medium text-ink">实验设定：</b>250 mm（论文规格卡）。<br />
          <b className="font-medium text-ink">厂商公布的对角尺寸（端点未核）：</b>{references.diagonal.published.map(m => `${m.label} ${m.v}`).join('、')} mm。<br />
          当前任意两电机的最大距离为 {layout.max_pair_mm.toFixed(1)} mm。
        </>}>
        <Slider path="frame.wheelbase_mm" min={100} max={500} step={1} unit="mm" presets={[{ v: 250, label: '250 实验设定' }]} />
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
