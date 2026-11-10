import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import type { FrameParameters as FrameParametersType } from '../../types/DroneParameters';

const FrameParameters: React.FC = () => {
  const { parameters, updateFrameParams } = useDroneStore();
  const frameParams = parameters.frame;

  const handleFrameTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFrameParams({ frame_type: e.target.value as FrameParametersType['frame_type'] });
  };

  const handleWheelbaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFrameParams({ wheelbase_mm: Number(e.target.value) });
  };

  const handleArmThicknessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFrameParams({ arm_thickness_mm: e.target.value as FrameParametersType['arm_thickness_mm'] });
  };

  const handleArmWidthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFrameParams({ arm_width_mm: e.target.value as FrameParametersType['arm_width_mm'] });
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFrameParams({ material_visual: e.target.value as FrameParametersType['material_visual'] });
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold text-slate-900">机架参数</h3>
        <span className="text-sm text-slate-500">Frame Parameters</span>
      </div>

      {/* 机架类型 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          机架类型/风格 <span className="text-slate-500">(Frame Type)</span>
        </label>
        <select
          value={frameParams.frame_type}
          onChange={handleFrameTypeChange}
          className="input-field w-full"
        >
          <option value="True X">真X型 (True X)</option>
          <option value="Wide X">宽X型 (Wide X)</option>
          <option value="Stretch X">伸展X型 (Stretch X)</option>
          <option value="H-Frame">H型 (H-Frame)</option>
          <option value="Deadcat">Deadcat型 (Deadcat)</option>
          <option value="+ Configuration">十字型 (+ Configuration)</option>
        </select>
      </div>

      {/* 轴距 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          轴距/尺寸 <span className="text-slate-500">(Wheelbase): {frameParams.wheelbase_mm}mm</span>
        </label>
        <input
          type="range"
          min="100"
          max="500"
          step="1"
          value={frameParams.wheelbase_mm}
          onChange={handleWheelbaseChange}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>100mm</span>
          <span>500mm</span>
        </div>
      </div>

      {/* 机臂厚度 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          机臂厚度 <span className="text-slate-500">(Arm Thickness)</span>
        </label>
        <select
          value={frameParams.arm_thickness_mm}
          onChange={handleArmThicknessChange}
          className="input-field w-full"
        >
          <option value="3mm">3mm</option>
          <option value="4mm">4mm</option>
          <option value="5mm">5mm</option>
          <option value="6mm">6mm</option>
        </select>
      </div>

      {/* 机臂宽度 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          机臂宽度 <span className="text-slate-500">(Arm Width)</span>
        </label>
        <select
          value={frameParams.arm_width_mm}
          onChange={handleArmWidthChange}
          className="input-field w-full"
        >
          <option value="10mm">10mm</option>
          <option value="15mm">15mm</option>
          <option value="20mm">20mm</option>
        </select>
      </div>

      {/* 材料 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          材料 (视觉暗示) <span className="text-slate-500">(Material Visual)</span>
        </label>
        <select
          value={frameParams.material_visual}
          onChange={handleMaterialChange}
          className="input-field w-full"
        >
          <option value="Carbon Fiber">碳纤维 (Carbon Fiber)</option>
          <option value="Aluminum">铝合金 (Aluminum)</option>
          <option value="ABS Plastic">ABS塑料 (ABS Plastic)</option>
          <option value="PLA Plastic">PLA塑料 (PLA Plastic)</option>
        </select>
      </div>
    </div>
  );
};

export default FrameParameters; 