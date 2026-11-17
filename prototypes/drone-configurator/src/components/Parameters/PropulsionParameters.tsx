import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout } from '../../design/design';
import { references } from '../../design/fields';
import { Choice, Field, Slider, TabHeading } from '../controls/controls';
import type { PropulsionParameters as P } from '../../types/DroneParameters';

const PropulsionParameters: React.FC = () => {
  const { parameters, setField } = useDroneStore();
  const p = parameters.propulsion;
  const layout = computeLayout(parameters);
  return (
    <div className="space-y-5">
      <TabHeading title="动力系统参数" en="Propulsion Parameters">桨有多大、每副几片叶、要不要护圈。</TabHeading>

      <Field path="propulsion.prop_diameter_inch" en="Prop Diameter" value={`${p.prop_diameter_inch} 英寸 · ${layout.prop_diameter_mm.toFixed(0)} mm`}
        hint={<>桨径 ÷ 轴距 = <b className="font-semibold text-ink">{layout.d_over_D_mean.toFixed(2)}</b>，相邻桨盘间隙 {layout.disk_gap_mm.toFixed(0)} mm。</>}
        reference={<>
          <b className="font-medium text-ink">实验档（桨径 ÷ 轴距）：</b>0.40、0.50、0.60。<br />
          <b className="font-medium text-ink">真实机型（手册图面量测）：</b>{references.dd.measured.map(m => `${m.label} ${m.v}`).join('、')}。
        </>}>
        <Slider path="propulsion.prop_diameter_inch" min={3} max={10} step={0.1} unit="″" digits={1} />
      </Field>

      <Field path="propulsion.prop_blade_count" en="Blade Count" value={`${parseInt(p.prop_blade_count, 10)} 叶`} hint="航拍四旋常用每副 2 叶。">
        <Choice<P['prop_blade_count']> options={(['2叶', '3叶', '4叶', '5叶', '6叶'] as const).map(v => ({ value: v, zh: `${parseInt(v, 10)} 叶` }))}
          value={p.prop_blade_count} onChange={v => setField('propulsion.prop_blade_count', v)} label="每轴桨叶数" />
      </Field>

      <Field path="propulsion.prop_guard" en="Prop Guard" value={p.prop_guard === 'ring' ? '环形护圈' : '不加'}>
        <Choice<P['prop_guard']> options={[{ value: 'none', zh: '不加护圈' }, { value: 'ring', zh: '环形护圈', hint: '每副桨外加一圈' }]}
          value={p.prop_guard} onChange={v => setField('propulsion.prop_guard', v)} label="桨叶护圈" />
      </Field>

      <Field path="propulsion.motor_tilt_degree" en="Motor Tilt" value={`${p.motor_tilt_degree}°`} hint="竞速机用来增加前进推力；日常航拍一般为 0°。">
        <Slider path="propulsion.motor_tilt_degree" min={0} max={20} step={1} unit="°" />
      </Field>
    </div>
  );
};

export default PropulsionParameters;
