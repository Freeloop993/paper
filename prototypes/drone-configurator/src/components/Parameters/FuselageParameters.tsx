import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout } from '../../design/design';
import { fuselageStyleOptions, legacyFuselageStyles, references, topCoverOptions } from '../../design/fields';
import { Field, OpenChoice, SliderField, TabIntro } from '../controls/controls';

const list = (items: { v: number; label: string }[]) => items.map(m => `${m.label} ${m.v}`).join('、');

const FuselageParameters: React.FC = () => {
  const { parameters } = useDroneStore();
  const layout = computeLayout(parameters);
  const legacy = legacyFuselageStyles.find(o => o.value === parameters.fuselage.fuselage_style);
  return (
    <div className="space-y-3">
      <TabIntro title="机身">长、宽、高只限定包络尺寸。轮廓和顶盖怎样分件由设计者决定，可以留白。</TabIntro>

      <Field path="fuselage.fuselage_dimensions_mm.length" hint={<>机身长/宽 当前 <b className="font-medium text-slate-700">{layout.body_length_over_width.toFixed(2)}</b>。手册图面量测：{list(references.bodyLengthOverWidth.measured)}。{references.bodyLengthOverWidth.note}</>}>
        <SliderField path="fuselage.fuselage_dimensions_mm.length" min={50} max={300} step={5} unit="mm" />
      </Field>

      <Field path="fuselage.fuselage_dimensions_mm.width" hint={<>机身宽/D 当前 <b className="font-medium text-slate-700">{layout.body_width_over_D.toFixed(3)}</b>。手册图面量测：{list(references.bodyWidthOverD.measured)}。{references.bodyWidthOverD.note}</>}>
        <SliderField path="fuselage.fuselage_dimensions_mm.width" min={30} max={200} step={5} unit="mm" />
      </Field>

      <Field path="fuselage.fuselage_dimensions_mm.height" hint="高度从正上方看不到，见侧视示意。">
        <SliderField path="fuselage.fuselage_dimensions_mm.height" min={20} max={150} step={5} unit="mm" />
      </Field>

      <Field path="fuselage.fuselage_style" hint={legacy
        ? `当前值「${legacy.zh}」来自旧配置，仍会写入提示词；可改选或清除。`
        : '留白时示意图只画虚线包络，提示词只给尺寸。选了轮廓，示意图会换成对应的大致形状（仅示意）。'}>
        <OpenChoice path="fuselage.fuselage_style" options={fuselageStyleOptions} columns={2} />
      </Field>

      <Field path="fuselage.top_cover" hint="顶盖分几块由设计者决定。留白时提示词不写这一项。">
        <OpenChoice path="fuselage.top_cover" options={topCoverOptions} columns={4} />
      </Field>
    </div>
  );
};

export default FuselageParameters;
