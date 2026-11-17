import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { gearOptions } from '../../design/fields';
import { Field, Segmented, SliderField, TabIntro } from '../controls/controls';

const LandingGearParameters: React.FC = () => {
  const { parameters, setField } = useDroneStore();
  const gear = parameters.landing_gear;
  const has = gear.landing_gear_style !== '无独立起落架';
  return (
    <div className="space-y-3">
      <TabIntro title="起落架">起落架在机身下方，从正上方看会被遮住。选择会进入侧视示意和提示词，顶视图里以虚线标出位置。</TabIntro>

      <Field path="landing_gear.landing_gear_style">
        <Segmented options={gearOptions} value={gear.landing_gear_style} onChange={v => setField('landing_gear.landing_gear_style', v)} columns={1} />
      </Field>

      {has ? (
        <Field path="landing_gear.landing_gear_height_mm" hint="离地高度是设计值，在侧视示意中按比例画出。">
          <SliderField path="landing_gear.landing_gear_height_mm" min={20} max={100} step={5} unit="mm" />
        </Field>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">没有独立起落架，不需要离地高度。</p>
      )}
    </div>
  );
};

export default LandingGearParameters;
