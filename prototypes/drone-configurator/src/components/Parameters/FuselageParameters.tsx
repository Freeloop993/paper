import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { Box } from 'lucide-react';

const FuselageParameters: React.FC = () => {
  const { parameters, updateFuselageParams } = useDroneStore();
  const fuselageParams = parameters.fuselage;

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: number) => {
    updateFuselageParams({
      fuselage_dimensions_mm: {
        ...fuselageParams.fuselage_dimensions_mm,
        [dimension]: value
      }
    });
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center space-x-2">
        <Box className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-slate-900">机身参数</h3>
        <span className="text-sm text-slate-500">Fuselage Parameters</span>
      </div>

      {/* 机身长、宽、高为设计尺寸。 */}
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

      {/* 机身信息预览 */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-700 mb-2">机身概览</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-slate-500">尺寸：</span>
            <span className="font-medium">{fuselageParams.fuselage_dimensions_mm.length} × {fuselageParams.fuselage_dimensions_mm.width} × {fuselageParams.fuselage_dimensions_mm.height} mm</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuselageParameters; 