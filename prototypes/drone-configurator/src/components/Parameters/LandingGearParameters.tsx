import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import type { LandingGearParameters as LandingGearParametersType } from '../../types/DroneParameters';
import { Anchor } from 'lucide-react';

const LandingGearParameters: React.FC = () => {
  const { parameters, updateLandingGearParams } = useDroneStore();
  const landingGearParams = parameters.landing_gear;

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateLandingGearParams({ landing_gear_style: e.target.value as LandingGearParametersType['landing_gear_style'] });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateLandingGearParams({ landing_gear_height_mm: Number(e.target.value) });
  };

  const hasLandingGear = landingGearParams.landing_gear_style !== '无独立起落架';

  const styleDescriptions = {
    '无独立起落架': '直接着陆，适合轻量化设计',
    '低矮滑撬/支腿': '简单保护，适合平地起降',
    '高脚起落架': '高离地间隙，适合草地等不平地形'
  };

  const getHeightRecommendation = () => {
    const frameWheelbase = parameters.frame.wheelbase_mm;
    const propDiameter = parameters.propulsion.prop_diameter_inch * 25.4; // 转换为mm
    
    if (frameWheelbase < 200) {
      return '建议30-50mm，适合小型机架';
    } else if (frameWheelbase < 350) {
      return '建议40-70mm，适合中型机架';
    } else {
      return '建议60-100mm，适合大型机架';
    }
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center space-x-2">
        <Anchor className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-slate-900">起落架参数</h3>
        <span className="text-sm text-slate-500">Landing Gear Parameters</span>
      </div>

      {/* 起落架样式 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          起落架样式 <span className="text-slate-500">(Landing Gear Style)</span>
        </label>
        <select
          value={landingGearParams.landing_gear_style}
          onChange={handleStyleChange}
          className="input-field w-full"
        >
          <option value="无独立起落架">无独立起落架</option>
          <option value="低矮滑撬/支腿">低矮滑撬/支腿</option>
          <option value="高脚起落架">高脚起落架</option>
        </select>
        <div className="mt-2 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
            🛬 {styleDescriptions[landingGearParams.landing_gear_style]}
          </p>
        </div>
      </div>

      {/* 起落架高度 - 只在有起落架时显示 */}
      {hasLandingGear && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            起落架高度 <span className="text-slate-500">(Landing Gear Height): {landingGearParams.landing_gear_height_mm}mm</span>
          </label>
          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={landingGearParams.landing_gear_height_mm}
            onChange={handleHeightChange}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>20mm</span>
            <span>100mm</span>
          </div>
          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 {getHeightRecommendation()}
            </p>
          </div>
        </div>
      )}

      {/* 兼容性检查 */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-700 mb-2">起落架概览</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-slate-500">样式：</span>
            <span className="font-medium">{landingGearParams.landing_gear_style}</span>
          </div>
          {hasLandingGear && (
            <>
              <div>
                <span className="text-slate-500">高度：</span>
                <span className="font-medium">{landingGearParams.landing_gear_height_mm}mm</span>
              </div>
              <div>
                <span className="text-slate-500">重量影响：</span>
                <span className={`font-medium ${landingGearParams.landing_gear_style === '低矮滑撬/支腿' ? 'text-amber-600' : 'text-red-600'}`}>
                  {landingGearParams.landing_gear_style === '低矮滑撬/支腿' ? '轻微增重' : '明显增重'}
                </span>
              </div>
            </>
          )}
          <div>
            <span className="text-slate-500">适用场景：</span>
            <span className="font-medium">
              {landingGearParams.landing_gear_style === '无独立起落架' && '平整硬地面'}
              {landingGearParams.landing_gear_style === '低矮滑撬/支腿' && '一般平地'}
              {landingGearParams.landing_gear_style === '高脚起落架' && '草地、不平地形'}
            </span>
          </div>
        </div>
      </div>

      {/* 警告信息 */}
      {hasLandingGear && landingGearParams.landing_gear_height_mm > 80 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-amber-600 mt-0.5">⚠️</span>
            <div>
              <p className="text-sm text-amber-700 font-medium">高度警告</p>
              <p className="text-sm text-amber-600">
                起落架过高可能影响飞行稳定性，建议根据机架尺寸调整
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingGearParameters; 