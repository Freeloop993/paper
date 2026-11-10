import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { Settings, Info } from 'lucide-react';

const ParameterOverview: React.FC = () => {
  const { parameters } = useDroneStore();

  const getParameterSummary = () => {
    return {
      frame: `${parameters.frame.frame_type} (${parameters.frame.wheelbase_mm}mm)`,
      propulsion: `${parameters.propulsion.prop_diameter_inch}" ${parameters.propulsion.prop_blade_count}叶`,
      fuselage: parameters.fuselage.fuselage_style,
      landing: parameters.landing_gear.landing_gear_style,
      accessories: parameters.accessories.has_camera_gimbal ? '带相机云台' : '无相机云台'
    };
  };

  const summary = getParameterSummary();

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center space-x-2 mb-4 flex-shrink-0">
        <Settings className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-slate-900">参数概览</h3>
      </div>
      
      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">机架：</span>
            <span className="font-medium text-slate-700">{summary.frame}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-500">动力：</span>
            <span className="font-medium text-slate-700">{summary.propulsion}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-500">机身：</span>
            <span className="font-medium text-slate-700">{summary.fuselage}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-500">起落架：</span>
            <span className="font-medium text-slate-700">{summary.landing}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-500">配件：</span>
            <span className="font-medium text-slate-700">{summary.accessories}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-500">主色调：</span>
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded border border-slate-300"
                style={{ backgroundColor: parameters.accessories.drone_primary_color }}
              />
              <span className="font-medium text-slate-700">{parameters.accessories.drone_primary_color}</span>
            </div>
          </div>
        </div>
        
        {/* 附加提示词 */}
        {parameters.accessories.custom_prompt_additions && (
          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">附加提示词：</p>
                <p className="text-sm text-amber-700 mt-1">{parameters.accessories.custom_prompt_additions}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 统计信息 */}
        <div className="pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div>
              <span className="font-medium">轴距：</span> {parameters.frame.wheelbase_mm}mm
            </div>
            <div>
              <span className="font-medium">机臂厚度：</span> {parameters.frame.arm_thickness_mm}mm
            </div>
            <div>
              <span className="font-medium">螺旋桨：</span> {parameters.propulsion.prop_diameter_inch}"
            </div>
            <div>
              <span className="font-medium">电机倾角：</span> {parameters.propulsion.motor_tilt_degree}°
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParameterOverview; 