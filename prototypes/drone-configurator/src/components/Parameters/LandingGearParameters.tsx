import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { gearOptions } from '../../design/fields';
import { Choice, Field, Slider, TabHeading } from '../controls/controls';

const LandingGearParameters: React.FC = () => {
  const { parameters, setField } = useDroneStore();
  const gear = parameters.landing_gear;
  const has = gear.landing_gear_style !== '无独立起落架';
  return (
    <div className="space-y-5">
      <TabHeading title="起落架参数" en="Landing Gear Parameters">起落架在机身下面，俯视看不到，请切到「侧视」查看。</TabHeading>

      <Field path="landing_gear.landing_gear_style" en="Style" value={gear.landing_gear_style}>
        <Choice options={gearOptions} value={gear.landing_gear_style} onChange={v => setField('landing_gear.landing_gear_style', v)} label="起落架样式" />
      </Field>

      {has && (
        <Field path="landing_gear.landing_gear_height_mm" en="Ground Clearance" value={`${gear.landing_gear_height_mm} mm`}>
          <Slider path="landing_gear.landing_gear_height_mm" min={20} max={100} step={5} unit="mm" />
        </Field>
      )}
    </div>
  );
};

export default LandingGearParameters;
