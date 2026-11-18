import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout } from '../../design/design';
import { fuselageStyleOptions, legacyFuselageStyles, references, topCoverOptions } from '../../design/fields';
import { Field, Group, OpenChoice, Slider, TabHeading } from '../controls/controls';

const list = (items: { v: number; label: string }[]) => items.map(m => `${m.label} ${m.v}`).join('、');

const FuselageParameters: React.FC = () => {
  const { parameters } = useDroneStore();
  const size = parameters.fuselage.fuselage_dimensions_mm;
  const layout = computeLayout(parameters);
  const legacy = legacyFuselageStyles.find(o => o.value === parameters.fuselage.fuselage_style);
  return (
    <div className="space-y-5">
      <TabHeading title="机身参数" en="Fuselage Parameters">长宽高只限定大小；轮廓和分件可以不指定。</TabHeading>

      <Field path="fuselage.fuselage_dimensions_mm.length" en="Length" value={`${size.length} mm`}>
        <Slider path="fuselage.fuselage_dimensions_mm.length" min={50} max={300} step={5} unit="mm" />
      </Field>
      <Field path="fuselage.fuselage_dimensions_mm.width" en="Width" value={`${size.width} mm`}>
        <Slider path="fuselage.fuselage_dimensions_mm.width" min={30} max={200} step={5} unit="mm" />
      </Field>
      <Field path="fuselage.fuselage_dimensions_mm.height" en="Height" value={`${size.height} mm`} hint="高度从正上方看不到，可在侧视里查看。">
        <Slider path="fuselage.fuselage_dimensions_mm.height" min={20} max={150} step={5} unit="mm" />
      </Field>

      <div className="rounded-lg bg-canvas px-4 py-3 text-sm text-ink-soft">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>机身宽 ÷ 轴距 <b className="font-semibold text-ink">{layout.body_width_over_D.toFixed(2)}</b></span>
          <span>机身长 ÷ 宽 <b className="font-semibold text-ink">{layout.body_length_over_width.toFixed(2)}</b></span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          想让展开俯视显得紧凑，可以试试调这两个比例；是否真的显得紧凑，要靠出图后的评议来判断。
          真实机型的机身宽 ÷ 轴距（手册图面量测）：{list(references.bodyWidthOverD.measured)}。
        </p>
      </div>

      <Group title="造型" note="可以不指定，留给后续设计">
        <Field path="fuselage.fuselage_style" en="Outline" hint={legacy ? `当前是旧配置里的「${legacy.zh}」，可以改选或重置。` : undefined}>
          <OpenChoice path="fuselage.fuselage_style" options={fuselageStyleOptions} />
        </Field>
        <Field path="fuselage.top_cover" en="Top Cover">
          <OpenChoice path="fuselage.top_cover" options={topCoverOptions} />
        </Field>
      </Group>
    </div>
  );
};

export default FuselageParameters;
