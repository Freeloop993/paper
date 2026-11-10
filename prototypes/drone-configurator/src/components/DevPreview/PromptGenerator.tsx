import React, { useState, useCallback } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { FileText, Copy, Download, Wand2, Star } from 'lucide-react';

const PromptGenerator: React.FC = () => {
  const { parameters, selectedUserProfile } = useDroneStore();
  const [copied, setCopied] = useState(false);

  // 生成最终版本的完整prompt（新增）
  const generateFinalPrompt = useCallback(() => {
    const { frame, propulsion, fuselage, landing_gear, accessories } = parameters;
    
    // 基础无人机描述
    const baseDescription = [
      "A professional high-quality drone/quadcopter",
      `with ${frame.frame_type.toLowerCase()} frame configuration`,
      `${frame.wheelbase_mm}mm wheelbase and ${frame.arm_thickness_mm}mm thick ${frame.material_visual.toLowerCase()} arms`,
      `equipped with ${propulsion.prop_diameter_inch}-inch ${propulsion.prop_blade_count}-blade propellers`,
      propulsion.motor_tilt_degree > 0 ? `motors tilted at ${propulsion.motor_tilt_degree}° angle` : "vertically mounted brushless motors",
      `${fuselage.fuselage_style.toLowerCase()} fuselage design (${fuselage.fuselage_dimensions_mm.length}×${fuselage.fuselage_dimensions_mm.width}×${fuselage.fuselage_dimensions_mm.height}mm)`
    ];

    // 起落架描述
    const landingGearDesc = landing_gear.landing_gear_style !== '无独立起落架'
      ? `equipped with ${landing_gear.landing_gear_style.toLowerCase()} landing gear system providing ${landing_gear.landing_gear_height_mm}mm ground clearance`
      : "streamlined design with integrated landing system";

    // 相机配置
    const cameraDesc = accessories.has_camera_gimbal
      ? "featuring a professional 3-axis camera gimbal stabilizer system"
      : "designed for pure flight performance without camera equipment";

    // 基于用户画像的增强描述
    const userProfileEnhancements = selectedUserProfile ? getUserProfileEnhancements(selectedUserProfile) : [];

    // 颜色和风格
    const styleDescription = [
      `primary color scheme in ${accessories.drone_primary_color}`,
      "professional matte finish with clean modern aesthetics",
      "high-precision mechanical components",
      "aerodynamic propeller guards for safety"
    ];

    // 组合所有描述
    const allParts = [
      ...baseDescription,
      landingGearDesc,
      cameraDesc,
      ...userProfileEnhancements,
      ...styleDescription,
      accessories.custom_prompt_additions || null, // 用户自定义提示词
      // 最终质量描述
      "ultra-high resolution professional product photography",
      "studio lighting with perfect shadows and highlights",
      "clean white background",
      "photorealistic details and textures",
      "commercial product showcase quality"
    ].filter(Boolean);

    return allParts.join(", ");
  }, [parameters, selectedUserProfile]);

  // 根据用户画像生成增强描述
  const getUserProfileEnhancements = (profile: string): string[] => {
    switch (profile) {
      case '新手玩家':
        return [
          "beginner-friendly design with bright LED status indicators",
          "safety-focused with protective features",
          "intuitive control interface",
          "durable construction for learning",
          "modern consumer-grade appearance"
        ];
      case '摄影爱好者':
        return [
          "professional cinematography setup",
          "ultra-stable gimbal system for smooth footage",
          "premium black and grey color scheme",
          "precision-engineered for aerial photography",
          "high-end broadcast quality equipment",
          "carbon fiber reinforcement for vibration dampening"
        ];
      case '户外/亲子用户':
        return [
          "rugged outdoor-ready construction",
          "family-friendly safety features",
          "bright vibrant colors for visibility",
          "weather-resistant design elements",
          "impact-resistant frame and propeller guards",
          "easy maintenance and field-serviceable components"
        ];
      default:
        return [];
    }
  };

  // 生成详细的prompt文本
  const generatePrompt = useCallback(() => {
    const { frame, propulsion, fuselage, landing_gear, accessories } = parameters;
    
    const promptParts = [
      // 基础描述
      "A detailed professional drone/quadcopter",
      
      // 机架描述
      `with ${frame.frame_type.toLowerCase()} frame configuration`,
      `${frame.wheelbase_mm}mm wheelbase`,
      `${frame.arm_thickness_mm}mm thick carbon fiber arms`,
      `${frame.material_visual.toLowerCase()} frame material finish`,
      
      // 动力系统 - 更详细
      `equipped with ${propulsion.prop_diameter_inch}-inch propellers`,
      `${propulsion.prop_blade_count}-blade propeller configuration`,
      propulsion.motor_tilt_degree > 0 ? `motors tilted at ${propulsion.motor_tilt_degree}° angle` : "motors mounted vertically",
      "brushless motors with propeller guards",
      
      // 机身
      `${fuselage.fuselage_style.toLowerCase()} fuselage design`,
      `fuselage dimensions ${fuselage.fuselage_dimensions_mm.length}×${fuselage.fuselage_dimensions_mm.width}×${fuselage.fuselage_dimensions_mm.height}mm`,
      
      // 起落架 - 详细描述
      landing_gear.landing_gear_style !== '无独立起落架' 
        ? `equipped with ${landing_gear.landing_gear_style.toLowerCase()} landing gear system, ${landing_gear.landing_gear_height_mm}mm ground clearance`
        : "integrated landing system without separate landing gear",
      
      // 配件
      accessories.has_camera_gimbal ? "equipped with 3-axis camera gimbal stabilizer" : "without camera gimbal",
      
      // 颜色和外观
      `primary color scheme: ${accessories.drone_primary_color}`,
      "matte finish with professional appearance",
      
      // 附加提示词
      accessories.custom_prompt_additions || null,
      
      // 质量和风格描述
      "high-resolution photography",
      "studio lighting with soft shadows",
      "clean white background",
      "professional product photography style",
      "detailed mechanical components visible",
      "realistic materials and textures"
    ].filter(Boolean);
    
    return promptParts.join(", ");
  }, [parameters]);

  // 生成简化版prompt
  const generateSimplePrompt = useCallback(() => {
    const { frame, propulsion, accessories } = parameters;
    
    return [
      `${frame.frame_type} drone`,
      `${frame.wheelbase_mm}mm wheelbase`,
      `${propulsion.prop_diameter_inch}" props`,
      `${accessories.drone_primary_color} color`,
      accessories.has_camera_gimbal ? "with camera" : null,
      accessories.custom_prompt_additions || null,
      "high quality, detailed"
    ].filter(Boolean).join(", ");
  }, [parameters]);

  // 生成技术规格
  const generateTechnicalSpecs = useCallback(() => {
    const { frame, propulsion, fuselage, landing_gear } = parameters;
    
    return {
      frame: `${frame.frame_type} | ${frame.wheelbase_mm}mm | ${frame.arm_thickness_mm} arms | ${frame.material_visual}`,
      propulsion: `${propulsion.prop_diameter_inch}" ${propulsion.prop_blade_count} | ${propulsion.motor_tilt_degree}° tilt`,
      fuselage: `${fuselage.fuselage_style} | ${fuselage.fuselage_dimensions_mm.length}×${fuselage.fuselage_dimensions_mm.width}×${fuselage.fuselage_dimensions_mm.height}mm`,
      landing: `${landing_gear.landing_gear_style} | ${landing_gear.landing_gear_height_mm}mm`,
      color: parameters.accessories.drone_primary_color,
      camera: parameters.accessories.has_camera_gimbal ? "Yes" : "No"
    };
  }, [parameters]);

  const detailedPrompt = generatePrompt();
  const simplePrompt = generateSimplePrompt();
  const finalPrompt = generateFinalPrompt();
  const techSpecs = generateTechnicalSpecs();

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 下载为文本文件
  const downloadPrompt = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Wand2 className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-900">Prompt生成器</h3>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* 最终版本Prompt - 新增置顶 */}
        <div className="border-2 border-primary-200 bg-primary-50 rounded-lg">
          <div className="flex items-center justify-between mb-2 p-3 pb-0">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-primary-600" />
              <h4 className="text-sm font-medium text-primary-700">最终版本 (完整整合)</h4>
              {selectedUserProfile && (
                <span className="px-2 py-1 bg-primary-100 text-xs text-primary-600 rounded">
                  {selectedUserProfile}画像
                </span>
              )}
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => copyToClipboard(finalPrompt)}
                className="p-1 text-primary-600 hover:text-primary-800"
                title="复制最终版本"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => downloadPrompt(finalPrompt, `drone-prompt-final-${Date.now()}.txt`)}
                className="p-1 text-primary-600 hover:text-primary-800"
                title="下载最终版本"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-3 pt-0">
            <div className="p-3 bg-white rounded border font-mono text-sm text-slate-700 max-h-32 overflow-y-auto">
              {finalPrompt}
            </div>
            <div className="mt-2 text-xs text-primary-600">
              ✨ 此版本整合了所有参数配置
              {selectedUserProfile && ` + ${selectedUserProfile}画像优化`}
              {parameters.accessories.custom_prompt_additions && ' + 自定义提示词'}
              ，适合直接用于AI生图
            </div>
          </div>
        </div>

        {/* 详细Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-slate-700">详细描述</h4>
            <div className="flex space-x-1">
              <button
                onClick={() => copyToClipboard(detailedPrompt)}
                className="p-1 text-slate-500 hover:text-slate-700"
                title="复制"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => downloadPrompt(detailedPrompt, `drone-prompt-detailed-${Date.now()}.txt`)}
                className="p-1 text-slate-500 hover:text-slate-700"
                title="下载"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-sm font-mono text-slate-700 max-h-24 overflow-y-auto">
            {detailedPrompt}
          </div>
        </div>

        {/* 简化Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-slate-700">简化描述</h4>
            <div className="flex space-x-1">
              <button
                onClick={() => copyToClipboard(simplePrompt)}
                className="p-1 text-slate-500 hover:text-slate-700"
                title="复制"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => downloadPrompt(simplePrompt, `drone-prompt-simple-${Date.now()}.txt`)}
                className="p-1 text-slate-500 hover:text-slate-700"
                title="下载"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-sm font-mono text-slate-700">
            {simplePrompt}
          </div>
        </div>

        {/* 技术规格 */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">技术规格</h4>
          <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
            <div><span className="font-medium">机架:</span> {techSpecs.frame}</div>
            <div><span className="font-medium">动力:</span> {techSpecs.propulsion}</div>
            <div><span className="font-medium">机身:</span> {techSpecs.fuselage}</div>
            <div><span className="font-medium">起落架:</span> {techSpecs.landing}</div>
            <div><span className="font-medium">颜色:</span> {techSpecs.color}</div>
            <div><span className="font-medium">相机:</span> {techSpecs.camera}</div>
            {parameters.accessories.custom_prompt_additions && (
              <div><span className="font-medium">附加:</span> {parameters.accessories.custom_prompt_additions}</div>
            )}
          </div>
        </div>

        {/* 起落架详细信息卡片 */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center">
            🦵 起落架配置
          </h4>
          <div className="text-xs text-amber-700 space-y-1">
            <div><span className="font-medium">类型:</span> {parameters.landing_gear.landing_gear_style}</div>
            <div><span className="font-medium">高度:</span> {parameters.landing_gear.landing_gear_height_mm}mm</div>
            <div className="text-xs text-amber-600 mt-2">
              💡 起落架信息已集成到prompt中，AI生图时会根据此配置生成相应的起落架样式
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 <strong>使用提示:</strong> 
            <span className="font-medium text-blue-800">最终版本</span>整合了所有参数、用户画像和自定义提示词，推荐优先使用。
            详细描述适合ComfyUI等AI生图工具，简化描述适合快速测试。点击复制按钮可直接粘贴到AI工具中使用。
          </p>
        </div>

        {/* 复制成功提示 */}
        {copied && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 text-center">
            ✅ 已复制到剪贴板
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptGenerator; 