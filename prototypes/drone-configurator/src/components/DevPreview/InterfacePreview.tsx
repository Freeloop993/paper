import React, { useState, useCallback } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { Camera, Eye, Monitor, Smartphone, Code, Layers } from 'lucide-react';

const InterfacePreview: React.FC = () => {
  const { parameters } = useDroneStore();
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showDetails, setShowDetails] = useState(false);

  // 获取当前配置摘要
  const getConfigSummary = () => {
    return {
      frame: `${parameters.frame.frame_type} (${parameters.frame.wheelbase_mm}mm)`,
      propulsion: `${parameters.propulsion.prop_diameter_inch}" ${parameters.propulsion.prop_blade_count}`,
      fuselage: parameters.fuselage.fuselage_style,
      landing: parameters.landing_gear.landing_gear_style,
      color: parameters.accessories.drone_primary_color,
      camera: parameters.accessories.has_camera_gimbal ? '有相机' : '无相机'
    };
  };

  // 生成配置JSON
  const generateConfigJSON = useCallback(() => {
    const configData = {
      timestamp: new Date().toISOString(),
      parameters: parameters,
      summary: getConfigSummary()
    };
    
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `drone-config-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [parameters]);

  const configSummary = getConfigSummary();

  // 模拟无人机视觉预览
  const DroneVisualization: React.FC = () => {
    const { frame, propulsion, accessories, landing_gear, fuselage } = parameters;
    
    // 根据轴距计算机臂长度
    const getArmLength = () => {
      const baseLength = 24; // 增加基础长度，让机臂更明显
      const scaleFactor = frame.wheelbase_mm / 250;
      return Math.max(20, Math.min(40, baseLength * scaleFactor));
    };

    const armLength = getArmLength();

    // 根据机身尺寸计算机身大小
    const getFuselageSize = () => {
      const baseSize = 6;
      const lengthScale = fuselage.fuselage_dimensions_mm.length / 100;
      const widthScale = fuselage.fuselage_dimensions_mm.width / 80;
      return {
        width: Math.max(4, Math.min(12, baseSize * widthScale)),
        height: Math.max(4, Math.min(12, baseSize * lengthScale))
      };
    };

    const fuselageSize = getFuselageSize();

    // 根据机架类型获取机臂配置
    const getFrameArms = () => {
      switch (frame.frame_type) {
        case 'True X':
          return (
            <>
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 rotate-45" 
                style={{ width: `${armLength * 2}px` }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 -rotate-45" 
                style={{ width: `${armLength * 2}px` }} 
              />
            </>
          );
        
        case 'Wide X':
          return (
            <>
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 rotate-45" 
                style={{ width: `${armLength * 2.5}px` }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 -rotate-45" 
                style={{ width: `${armLength * 2.5}px` }} 
              />
            </>
          );
        
        case 'Stretch X':
          return (
            <>
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 rotate-30" 
                style={{ width: `${armLength * 2.2}px` }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 -rotate-30" 
                style={{ width: `${armLength * 2.2}px` }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 rotate-150" 
                style={{ width: `${armLength * 2.2}px` }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 -rotate-150" 
                style={{ width: `${armLength * 2.2}px` }} 
              />
            </>
          );
        
        case 'H-Frame':
          return (
            <>
              {/* H型：两条平行的横臂 */}
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2" 
                style={{ width: `${armLength * 2.5}px`, top: 'calc(50% - 8px)' }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2" 
                style={{ width: `${armLength * 2.5}px`, top: 'calc(50% + 8px)' }} 
              />
              {/* 连接杆 */}
              <div 
                className="absolute top-1/2 left-1/2 w-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2" 
                style={{ height: '16px' }} 
              />
            </>
          );
        
        case 'Deadcat':
          return (
            <>
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 rotate-30" 
                style={{ width: `${armLength * 2}px` }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 -rotate-30" 
                style={{ width: `${armLength * 2}px` }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 rotate-180" 
                style={{ width: `${armLength * 1.5}px` }} 
              />
            </>
          );
        
        case '+ Configuration':
          return (
            <>
              {/* 十字型：垂直和水平交叉 */}
              <div 
                className="absolute top-1/2 left-1/2 w-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2" 
                style={{ height: `${armLength * 2}px` }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2" 
                style={{ width: `${armLength * 2}px` }} 
              />
            </>
          );
        
        default:
          return (
            <>
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 rotate-45" 
                style={{ width: `${armLength * 2}px` }} 
              />
              <div 
                className="absolute top-1/2 left-1/2 h-0.5 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 -rotate-45" 
                style={{ width: `${armLength * 2}px` }} 
              />
            </>
          );
      }
    };

    // 获取螺旋桨位置
    const getPropPositions = () => {
      if (frame.frame_type === 'Stretch X') {
        // Stretch X: 机臂长度 armLength * 2.2，30度角
        const actualArmLength = armLength * 2.2;
        const propDistance = (actualArmLength / 2) * 1.1; // 稍微超出机臂端点
        return [
          { top: -propDistance * 0.5, left: -propDistance * 0.866 }, // 30度角的cos和sin
          { top: -propDistance * 0.5, left: propDistance * 0.866 },
          { top: propDistance * 0.5, left: -propDistance * 0.866 },
          { top: propDistance * 0.5, left: propDistance * 0.866 },
        ];
      } else if (frame.frame_type === 'Wide X') {
        // Wide X: 机臂长度 armLength * 2.5，45度角
        const actualArmLength = armLength * 2.5;
        const propDistance = (actualArmLength / 2) * 0.707 * 1.1; // 稍微超出机臂端点
        return [
          { top: -propDistance, left: -propDistance },
          { top: -propDistance, left: propDistance },
          { top: propDistance, left: -propDistance },
          { top: propDistance, left: propDistance },
        ];
      } else if (frame.frame_type === 'Deadcat') {
        // Deadcat: 前两臂 armLength * 2，后臂 armLength * 1.5
        const frontArmLength = armLength * 2;
        const rearArmLength = armLength * 1.5;
        const frontPropDistance = (frontArmLength / 2) * 0.866 * 1.1; // 稍微超出
        const rearPropDistance = (rearArmLength / 2) * 1.1;
        return [
          { top: -frontPropDistance * 0.5, left: -frontPropDistance * 0.5 },
          { top: -frontPropDistance * 0.5, left: frontPropDistance * 0.5 },
          { top: rearPropDistance, left: 0 },
        ];
      } else if (frame.frame_type === 'H-Frame') {
        // H型机架：横臂长度 armLength * 2.5
        const actualArmLength = armLength * 2.5;
        const propDistance = (actualArmLength / 2) * 1.1; // 稍微超出
        return [
          { top: -8, left: -propDistance },
          { top: -8, left: propDistance },
          { top: 8, left: -propDistance },
          { top: 8, left: propDistance },
        ];
      } else if (frame.frame_type === '+ Configuration') {
        // + Configuration: 机臂长度 armLength * 2
        const actualArmLength = armLength * 2;
        const propDistance = (actualArmLength / 2) * 1.1; // 稍微超出
        return [
          { top: -propDistance, left: 0 }, // 上
          { top: propDistance, left: 0 },  // 下
          { top: 0, left: -propDistance }, // 左
          { top: 0, left: propDistance },  // 右
        ];
      } else {
        // True X (默认): 机臂长度 armLength * 2，45度角
        const actualArmLength = armLength * 2;
        const propDistance = (actualArmLength / 2) * 0.707 * 1.1; // 稍微超出机臂端点
        return [
          { top: -propDistance, left: -propDistance },
          { top: -propDistance, left: propDistance },
          { top: propDistance, left: -propDistance },
          { top: propDistance, left: propDistance },
        ];
      }
    };

    const propPositions = getPropPositions();

    // 根据螺旋桨直径计算显示大小
    const getPropSize = () => {
      const baseSize = 3;
      const sizeScale = propulsion.prop_diameter_inch / 10; // 以10寸为基准
      return Math.max(2, Math.min(6, baseSize * sizeScale));
    };

    const propSize = getPropSize();

    // 安全解析叶片数量
    const getBladeCount = () => {
      const bladeStr = propulsion.prop_blade_count;
      const match = bladeStr.match(/(\d+)/);
      return match ? parseInt(match[1]) : 3; // 默认3叶
    };

    const bladeCount = getBladeCount();
    
    return (
      <div className="relative w-full h-48 bg-gradient-to-b from-sky-100 to-sky-200 rounded-lg overflow-hidden">
        {/* 背景网格 */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-8 grid-rows-6 h-full">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="border border-slate-300"></div>
            ))}
          </div>
        </div>
        
        {/* 无人机简化图形 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* 机臂 */}
            {getFrameArms()}
            
            {/* 机身中心 - 根据机身尺寸调整 */}
            <div 
              className="absolute top-1/2 left-1/2 rounded-lg border-2 border-slate-600 transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ 
                backgroundColor: accessories.drone_primary_color,
                width: `${fuselageSize.width * 4}px`,
                height: `${fuselageSize.height * 4}px`
              }}
            />
            
            {/* 螺旋桨 - 改进可视化 */}
            {propPositions.map((pos, index) => (
              <div 
                key={index}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  top: '50%',
                  left: '50%',
                  transform: `translate(calc(-50% + ${pos.left}px), calc(-50% + ${pos.top}px))`
                }}
              >
                {/* 螺旋桨圆盘 */}
                <div 
                  className="absolute top-1/2 left-1/2 border border-slate-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-30"
                  style={{ 
                    width: `${propSize * 4}px`,
                    height: `${propSize * 4}px`,
                    backgroundColor: 'rgba(148, 163, 184, 0.1)'
                  }}
                />
                {/* 电机中心 */}
                <div 
                  className="absolute top-1/2 left-1/2 bg-slate-800 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                  style={{ 
                    width: `${propSize}px`,
                    height: `${propSize}px`
                  }}
                />
                {/* 螺旋桨叶片指示线 */}
                {Array.from({ length: bladeCount }).map((_, bladeIndex) => (
                  <div
                    key={bladeIndex}
                    className="absolute top-1/2 left-1/2 bg-slate-600 transform -translate-x-1/2 -translate-y-1/2 origin-center"
                    style={{
                      width: `${propSize * 3}px`,
                      height: '1px',
                      transform: `translate(-50%, -50%) rotate(${(360 / bladeCount) * bladeIndex}deg)`
                    }}
                  />
                ))}
              </div>
            ))}
            
            {/* 相机云台 */}
            {accessories.has_camera_gimbal && (
              <div 
                className="absolute w-2 h-1 bg-slate-700 rounded-sm z-10" 
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, calc(-50% + ${fuselageSize.height * 2 + 4}px))`
                }}
              />
            )}
          </div>
        </div>
        
        {/* 参数标签 */}
        <div className="absolute top-2 left-2 text-xs text-slate-600">
          <div>{frame.frame_type}</div>
          <div>{frame.wheelbase_mm}mm轴距</div>
        </div>
        
        <div className="absolute top-2 right-2 text-xs text-slate-600 text-right">
          <div>{propulsion.prop_diameter_inch}"螺旋桨</div>
          <div>{propulsion.prop_blade_count} ({bladeCount}叶)</div>
        </div>
        
        <div className="absolute bottom-2 left-2 text-xs text-slate-600">
          <div>机身: {fuselage.fuselage_dimensions_mm.length}×{fuselage.fuselage_dimensions_mm.width}mm</div>
          <div>{fuselage.fuselage_style}</div>
        </div>
        
        <div className="absolute bottom-2 right-2 text-xs text-slate-600 text-right">
          <div>{accessories.has_camera_gimbal ? '含相机云台' : '无相机'}</div>
          <div>俯视图</div>
        </div>
      </div>
    );
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Eye className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-900">界面预览</h3>
          <span className="text-sm text-slate-500">Interface Preview</span>
        </div>
        
        {/* 视图模式切换 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-2 rounded-lg ${viewMode === 'desktop' ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="桌面视图"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-2 rounded-lg ${viewMode === 'mobile' ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="移动视图"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* 无人机可视化预览 */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Layers className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">无人机配置可视化</span>
          </div>
          
          <DroneVisualization />
          
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Code className="h-4 w-4" />
              <span>{showDetails ? '隐藏详情' : '显示详情'}</span>
            </button>
            
            <button
              onClick={generateConfigJSON}
              className="btn-primary flex items-center space-x-2"
            >
              <Camera className="h-4 w-4" />
              <span>导出配置</span>
            </button>
          </div>
        </div>

        {/* 详细配置信息 */}
        {showDetails && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-medium text-slate-700 mb-3">详细配置参数</h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="font-semibold text-slate-600 mb-1">机架参数:</div>
                  <div>类型: {parameters.frame.frame_type}</div>
                  <div>轴距: {parameters.frame.wheelbase_mm}mm</div>
                  <div>厚度: {parameters.frame.arm_thickness_mm}mm</div>
                  <div>材料: {parameters.frame.material_visual}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-600 mb-1">动力系统:</div>
                  <div>螺旋桨: {parameters.propulsion.prop_diameter_inch}"</div>
                  <div>叶片: {parameters.propulsion.prop_blade_count}</div>
                  <div>倾角: {parameters.propulsion.motor_tilt_degree}°</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-600 mb-1">机身参数:</div>
                  <div>样式: {parameters.fuselage.fuselage_style}</div>
                  <div>尺寸: {parameters.fuselage.fuselage_dimensions_mm.length}×{parameters.fuselage.fuselage_dimensions_mm.width}×{parameters.fuselage.fuselage_dimensions_mm.height}mm</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-600 mb-1">配件:</div>
                  <div>起落架: {parameters.landing_gear.landing_gear_style}</div>
                  <div>相机: {parameters.accessories.has_camera_gimbal ? '有' : '无'}</div>
                  <div>颜色: {parameters.accessories.drone_primary_color}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 当前配置状态摘要 */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-medium text-slate-700 mb-3">配置摘要</h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div><span className="text-slate-500">机架:</span> <span className="font-medium">{configSummary.frame}</span></div>
            <div><span className="text-slate-500">动力:</span> <span className="font-medium">{configSummary.propulsion}</span></div>
            <div><span className="text-slate-500">机身:</span> <span className="font-medium">{configSummary.fuselage}</span></div>
            <div><span className="text-slate-500">起落架:</span> <span className="font-medium">{configSummary.landing}</span></div>
            <div className="flex items-center">
              <span className="text-slate-500">颜色:</span> 
              <div className="flex items-center space-x-1 ml-1">
                <div 
                  className="w-3 h-3 rounded border border-slate-300" 
                  style={{ backgroundColor: configSummary.color }}
                />
                <span className="font-medium text-xs">{configSummary.color}</span>
              </div>
            </div>
            <div><span className="text-slate-500">相机:</span> <span className="font-medium">{configSummary.camera}</span></div>
          </div>
        </div>

        {/* 开发信息 */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            🎯 <strong>俯视图预览:</strong> 显示机架结构、螺旋桨配置和机身尺寸。起落架信息已移至Prompt生成器中，因为俯视角度无法准确展示起落架细节。螺旋桨现在显示实际叶片数量和相对大小。
          </p>
        </div>
      </div>
    </div>
  );
};

export default InterfacePreview; 