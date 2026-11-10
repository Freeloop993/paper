import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import type { PropulsionParameters as PropulsionParametersType } from '../../types/DroneParameters';
import { Zap } from 'lucide-react';

const PropulsionParameters: React.FC = () => {
  const { parameters, updatePropulsionParams } = useDroneStore();
  const propulsionParams = parameters.propulsion;

  const handlePropDiameterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePropulsionParams({ prop_diameter_inch: Number(e.target.value) });
  };

  const handleBladeCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updatePropulsionParams({ prop_blade_count: e.target.value as PropulsionParametersType['prop_blade_count'] });
  };

  const handleMotorTiltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePropulsionParams({ motor_tilt_degree: Number(e.target.value) });
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center space-x-2">
        <Zap className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-slate-900">动力系统参数</h3>
        <span className="text-sm text-slate-500">Propulsion Parameters</span>
      </div>

      {/* 螺旋桨直径 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          螺旋桨直径 <span className="text-slate-500">(Prop Diameter): {propulsionParams.prop_diameter_inch}" </span>
        </label>
        <input
          type="range"
          min="3"
          max="10"
          step="0.1"
          value={propulsionParams.prop_diameter_inch}
          onChange={handlePropDiameterChange}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>3"</span>
          <span>10"</span>
        </div>
      </div>

      {/* 螺旋桨叶片数量 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          螺旋桨叶片数量 <span className="text-slate-500">(Prop Blade Count)</span>
        </label>
        <select
          value={propulsionParams.prop_blade_count}
          onChange={handleBladeCountChange}
          className="input-field w-full"
        >
          <option value="2叶">2叶</option>
          <option value="3叶">3叶</option>
          <option value="4叶">4叶</option>
          <option value="5叶">5叶</option>
          <option value="6叶">6叶</option>
        </select>
      </div>

      {/* 电机安装倾角 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          电机安装倾角 <span className="text-slate-500">(Motor Tilt): {propulsionParams.motor_tilt_degree}°</span>
        </label>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          value={propulsionParams.motor_tilt_degree}
          onChange={handleMotorTiltChange}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>0°</span>
          <span>20°</span>
        </div>
        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 提示：倾角用于FPV竞速无人机，增加前进推力
          </p>
        </div>
      </div>

      {/* 动力系统预览信息 */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-700 mb-2">动力系统概览</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">螺旋桨：</span>
            <span className="font-medium">{propulsionParams.prop_diameter_inch}" {propulsionParams.prop_blade_count}</span>
          </div>
          <div>
            <span className="text-slate-500">电机倾角：</span>
            <span className="font-medium">{propulsionParams.motor_tilt_degree}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropulsionParameters; 