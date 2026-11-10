import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import type { FuselageParameters as FuselageParametersType } from '../../types/DroneParameters';
import { Box } from 'lucide-react';

const FuselageParameters: React.FC = () => {
  const { parameters, updateFuselageParams } = useDroneStore();
  const fuselageParams = parameters.fuselage;

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFuselageParams({ fuselage_style: e.target.value as FuselageParametersType['fuselage_style'] });
  };

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: number) => {
    updateFuselageParams({
      fuselage_dimensions_mm: {
        ...fuselageParams.fuselage_dimensions_mm,
        [dimension]: value
      }
    });
  };

  const isCustomStyle = fuselageParams.fuselage_style !== 'Exposed Stack';

  const styleDescriptions = {
    'Exposed Stack': '裸露的飞控板叠层，最轻量化设计',
    'Minimalist Plate': '简洁平板式保护外壳',
    'Aerodynamic Pod': '流线型座舱，减少风阻',
    'Boxy Enclosure': '方正机壳，最大保护性'
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center space-x-2">
        <Box className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-slate-900">机身参数</h3>
        <span className="text-sm text-slate-500">Fuselage Parameters</span>
      </div>

      {/* 机身样式 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          机身/座舱盖样式 <span className="text-slate-500">(Fuselage Style)</span>
        </label>
        <select
          value={fuselageParams.fuselage_style}
          onChange={handleStyleChange}
          className="input-field w-full"
        >
          <option value="Exposed Stack">裸露堆叠 (Exposed Stack)</option>
          <option value="Minimalist Plate">极简平板 (Minimalist Plate)</option>
          <option value="Aerodynamic Pod">流线型座舱 (Aerodynamic Pod)</option>
          <option value="Boxy Enclosure">方正机壳 (Boxy Enclosure)</option>
        </select>
        <div className="mt-2 p-3 bg-amber-50 rounded-lg">
          <p className="text-sm text-amber-700">
            📋 {styleDescriptions[fuselageParams.fuselage_style]}
          </p>
        </div>
      </div>

      {/* 机身尺寸 - 只在非裸露样式时显示 */}
      {isCustomStyle && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-700">机身尺寸 (Fuselage Dimensions)</h4>
          
          {/* 长度 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              长度 <span className="text-slate-500">(Length): {fuselageParams.fuselage_dimensions_mm.length}mm</span>
            </label>
            <input
              type="range"
              min="50"
              max="300"
              step="5"
              value={fuselageParams.fuselage_dimensions_mm.length}
              onChange={(e) => handleDimensionChange('length', Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>50mm</span>
              <span>300mm</span>
            </div>
          </div>

          {/* 宽度 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              宽度 <span className="text-slate-500">(Width): {fuselageParams.fuselage_dimensions_mm.width}mm</span>
            </label>
            <input
              type="range"
              min="30"
              max="200"
              step="5"
              value={fuselageParams.fuselage_dimensions_mm.width}
              onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>30mm</span>
              <span>200mm</span>
            </div>
          </div>

          {/* 高度 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              高度 <span className="text-slate-500">(Height): {fuselageParams.fuselage_dimensions_mm.height}mm</span>
            </label>
            <input
              type="range"
              min="20"
              max="150"
              step="5"
              value={fuselageParams.fuselage_dimensions_mm.height}
              onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>20mm</span>
              <span>150mm</span>
            </div>
          </div>
        </div>
      )}

      {/* 机身信息预览 */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-700 mb-2">机身概览</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-slate-500">样式：</span>
            <span className="font-medium">{fuselageParams.fuselage_style}</span>
          </div>
          {isCustomStyle && (
            <div>
              <span className="text-slate-500">尺寸：</span>
              <span className="font-medium">
                {fuselageParams.fuselage_dimensions_mm.length} × {fuselageParams.fuselage_dimensions_mm.width} × {fuselageParams.fuselage_dimensions_mm.height} mm
              </span>
            </div>
          )}
          <div>
            <span className="text-slate-500">重量影响：</span>
            <span className={`font-medium ${fuselageParams.fuselage_style === 'Exposed Stack' ? 'text-green-600' : 'text-amber-600'}`}>
              {fuselageParams.fuselage_style === 'Exposed Stack' ? '最轻' : '增加重量'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuselageParameters; 