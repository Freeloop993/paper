import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout } from '../../design/design';
import { references } from '../../design/fields';
import { Field, Segmented, SliderField, TabIntro } from '../controls/controls';
import type { PropulsionParameters as P } from '../../types/DroneParameters';

const PropulsionParameters: React.FC = () => {
  const { parameters, setField } = useDroneStore();
  const p = parameters.propulsion;
  const layout = computeLayout(parameters);
  const dd = layout.d_over_D_mean;
  return (
    <div className="space-y-3">
      <TabIntro title="动力">桨径、每轴桨叶数、电机倾角和护圈。电机数量是任务固定的 4 个，与桨叶数分开。</TabIntro>

      <Field path="propulsion.prop_diameter_inch" hint={<>
        d/D＝桨径／对角轴距均值，当前 <b className="font-medium text-slate-700">{dd.toFixed(2)}</b>；相邻桨盘间隙 {layout.disk_gap_mm.toFixed(1)} mm。
        对照：实验档 {references.dd.experimental.map(m => m.v.toFixed(2)).join('／')}；图面量测 {references.dd.measured.map(m => `${m.label} ${m.v}`).join('、')}。{references.dd.note}
      </>}>
        <SliderField path="propulsion.prop_diameter_inch" min={3} max={10} step={0.1} unit="英寸" digits={1} />
      </Field>

      <Field path="propulsion.prop_blade_count" hint="四旋主试验每轴一副双叶桨，所以默认 2 叶；可以改。">
        <Segmented<P['prop_blade_count']> options={(['2叶', '3叶', '4叶', '5叶', '6叶'] as const).map(v => ({ value: v, zh: parseInt(v, 10) + ' 叶' }))}
          value={p.prop_blade_count} onChange={v => setField('propulsion.prop_blade_count', v)} />
      </Field>

      <Field path="propulsion.motor_tilt_degree" hint="倾角用于竞速机增加前进推力；日常航拍一般为 0°。示意图不画倾角，只写进提示词。">
        <SliderField path="propulsion.motor_tilt_degree" min={0} max={20} step={1} unit="°" />
      </Field>

      <Field path="propulsion.prop_guard" hint="护圈必须在这里明确选择才会出现。不选时提示词写“无护圈”，模板不会自行加。">
        <Segmented<P['prop_guard']> options={[{ value: 'none', zh: '不加护圈' }, { value: 'ring', zh: '环形护圈', hint: '每副桨外加一圈' }]}
          value={p.prop_guard} onChange={v => setField('propulsion.prop_guard', v)} />
      </Field>
    </div>
  );
};

export default PropulsionParameters;
