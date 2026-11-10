import React, { useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { Camera, Palette, Type, User, Sparkles, Loader2 } from 'lucide-react';
import type { UserProfile, UserProfileInfo } from '../../types/DroneParameters';
import { DeepSeekPromptOptimizer } from '../../services/deepseekPromptOptimizer';

const AccessoriesParameters: React.FC = () => {
  const { parameters, updateAccessoriesParams, selectedUserProfile, setSelectedUserProfile } = useDroneStore();
  const accessoriesParams = parameters.accessories;
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  // 用户画像配置
  const userProfiles: UserProfileInfo[] = [
    {
      name: '新手玩家',
      description: '追求简单易用、安全性高的入门级体验',
      icon: '🎮',
      characteristics: ['操作简单', '安全性高', '价格亲民', '易于维护'],
      optimizationFocus: ['简洁设计', 'LED指示灯', '明亮色彩', '安全特性']
    },
    {
      name: '摄影爱好者',
      description: '注重拍摄性能、稳定性和专业外观',
      icon: '📸',
      characteristics: ['拍摄性能', '稳定性强', '专业外观', '精密控制'],
      optimizationFocus: ['专业云台', '稳定系统', '专业配色', '拍摄细节']
    },
    {
      name: '户外/亲子用户',
      description: '耐用性强、适合户外环境的家庭友好型',
      icon: '🏕️',
      characteristics: ['耐用性强', '户外适应', '家庭友好', '操作安全'],
      optimizationFocus: ['防护性能', '鲜艳配色', '实用特性', '安全设计']
    }
  ];

  const handleCameraToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAccessoriesParams({ has_camera_gimbal: e.target.checked });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAccessoriesParams({ drone_primary_color: e.target.value });
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateAccessoriesParams({ custom_prompt_additions: e.target.value });
  };

  const handleUserProfileSelect = (profile: UserProfile) => {
    setSelectedUserProfile(profile);
    setOptimizationError(null);
  };

  const handleOptimizePrompt = async () => {
    if (!selectedUserProfile) {
      setOptimizationError('请先选择用户画像');
      return;
    }
    
    if (!accessoriesParams.custom_prompt_additions.trim()) {
      setOptimizationError('请先输入一些提示词内容');
      return;
    }

    setIsOptimizing(true);
    setOptimizationError(null);

    try {
      // 获取当前完整的无人机参数
      const currentParameters = {
        frame: parameters.frame,
        propulsion: parameters.propulsion,
        fuselage: parameters.fuselage,
        landing_gear: parameters.landing_gear,
        accessories: parameters.accessories
      };
      
      console.log('🚁 传递给RAG的完整参数:', currentParameters);
      
      const result = await DeepSeekPromptOptimizer.optimizePromptWithRAG(
        accessoriesParams.custom_prompt_additions,
        currentParameters,
        selectedUserProfile
      );
      
      if (result.success && result.optimizedPrompt) {
        updateAccessoriesParams({ custom_prompt_additions: result.optimizedPrompt });
      } else {
        throw new Error(result.error || 'RAG优化失败');
      }
    } catch (error) {
      setOptimizationError(error instanceof Error ? error.message : '优化失败');
    } finally {
      setIsOptimizing(false);
    }
  };

  const predefinedColors = [
    { name: '天空蓝', value: '#0ea5e9' },
    { name: '炭黑', value: '#1e293b' },
    { name: '纯白', value: '#ffffff' },
    { name: '橙红', value: '#f97316' },
    { name: '翠绿', value: '#10b981' },
    { name: '深紫', value: '#7c3aed' },
    { name: '金黄', value: '#f59e0b' },
    { name: '玫红', value: '#ec4899' }
  ];

  const handlePredefinedColorSelect = (color: string) => {
    updateAccessoriesParams({ drone_primary_color: color });
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center space-x-2">
        <Camera className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-slate-900">配件与视觉参数</h3>
        <span className="text-sm text-slate-500">Accessories Parameters</span>
      </div>

      {/* 相机云台 */}
      <div className="space-y-2">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accessoriesParams.has_camera_gimbal}
            onChange={handleCameraToggle}
            className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
          />
          <div className="flex items-center space-x-2">
            <Camera className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">
              包含相机/云台 <span className="text-slate-500">(Camera/Gimbal)</span>
            </span>
          </div>
        </label>
        <div className="mt-2 p-3 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-700">
            📸 {accessoriesParams.has_camera_gimbal ? '将会生成带有摄像设备的无人机' : '生成纯飞行无人机，无拍摄设备'}
          </p>
        </div>
      </div>

      {/* 主色调选择 */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Palette className="h-4 w-4 text-slate-600" />
          <label className="text-sm font-medium text-slate-700">
            无人机主色调 <span className="text-slate-500">(Primary Color)</span>
          </label>
        </div>

        {/* 预设颜色 */}
        <div className="grid grid-cols-4 gap-2">
          {predefinedColors.map((color) => (
            <button
              key={color.name}
              onClick={() => handlePredefinedColorSelect(color.value)}
              className={`p-2 rounded-lg border-2 transition-all ${
                accessoriesParams.drone_primary_color === color.value
                  ? 'border-primary-500 ring-2 ring-primary-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              title={color.name}
            >
              <div
                className="w-full h-8 rounded"
                style={{ backgroundColor: color.value }}
              />
              <p className="text-xs text-slate-600 mt-1 text-center">{color.name}</p>
            </button>
          ))}
        </div>

        {/* 自定义颜色选择器 */}
        <div className="flex items-center space-x-3">
          <input
            type="color"
            value={accessoriesParams.drone_primary_color}
            onChange={handleColorChange}
            className="w-12 h-12 rounded-lg border border-slate-300 cursor-pointer"
          />
          <div className="flex-1">
            <p className="text-sm text-slate-700">自定义颜色</p>
            <p className="text-xs text-slate-500">{accessoriesParams.drone_primary_color}</p>
          </div>
        </div>
      </div>

      {/* 用户画像选择 */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-slate-600" />
          <label className="text-sm font-medium text-slate-700">
            用户画像 <span className="text-slate-500">(User Profile)</span>
          </label>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {userProfiles.map((profile) => (
            <button
              key={profile.name}
              onClick={() => handleUserProfileSelect(profile.name)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedUserProfile === profile.name
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{profile.icon}</span>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{profile.name}</h4>
                  <p className="text-sm text-slate-600 mt-1">{profile.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.characteristics.slice(0, 3).map((char) => (
                      <span key={char} className="px-2 py-1 bg-slate-100 text-xs text-slate-600 rounded">
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 附加文本提示词 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Type className="h-4 w-4 text-slate-600" />
          <label className="text-sm font-medium text-slate-700">
            附加文本提示词 <span className="text-slate-500">(Custom Prompt Additions)</span>
          </label>
        </div>
        
        <textarea
          value={accessoriesParams.custom_prompt_additions}
          onChange={handlePromptChange}
          placeholder="例如：racing stripes, LED lights, carbon fiber texture..."
          className="input-field w-full h-24 resize-none"
        />
        
        {/* AI优化按钮 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleOptimizePrompt}
            disabled={isOptimizing || !selectedUserProfile || !accessoriesParams.custom_prompt_additions.trim()}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOptimizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{isOptimizing ? 'AI优化中...' : 'AI智能优化'}</span>
          </button>
          
          {selectedUserProfile && (
            <div className="flex items-center space-x-1 text-sm text-slate-600">
              <span>基于</span>
              <span className="font-medium text-primary-600">{selectedUserProfile}</span>
              <span>画像优化</span>
            </div>
          )}
        </div>
        
        {/* 错误提示 */}
        {optimizationError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {optimizationError}
          </div>
        )}
        
        <div className="mt-2 p-3 bg-indigo-50 rounded-lg">
          <p className="text-sm text-indigo-700">
            ✨ 提示：您可以添加特殊的视觉元素描述，如"赛车条纹"、"LED灯带"、"碳纤维纹理"等，这些将帮助AI生成更符合您期望的视觉效果
          </p>
        </div>
      </div>

      {/* 配件概览 */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-700 mb-2">配件概览</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-slate-500">相机设备：</span>
            <span className={`font-medium ${accessoriesParams.has_camera_gimbal ? 'text-green-600' : 'text-slate-600'}`}>
              {accessoriesParams.has_camera_gimbal ? '包含' : '无'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">主色调：</span>
            <div className="inline-flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded border border-slate-300"
                style={{ backgroundColor: accessoriesParams.drone_primary_color }}
              />
              <span className="font-medium">{accessoriesParams.drone_primary_color}</span>
            </div>
          </div>
          {selectedUserProfile && (
            <div>
              <span className="text-slate-500">用户画像：</span>
              <span className="font-medium text-primary-600">{selectedUserProfile}</span>
            </div>
          )}
          {accessoriesParams.custom_prompt_additions && (
            <div>
              <span className="text-slate-500">附加描述：</span>
              <span className="font-medium">{accessoriesParams.custom_prompt_additions.substring(0, 50)}{accessoriesParams.custom_prompt_additions.length > 50 ? '...' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* 生成提示 */}
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <span className="text-emerald-600 mt-0.5">💡</span>
          <div>
            <p className="text-sm text-emerald-700 font-medium">生成建议</p>
            <p className="text-sm text-emerald-600">
              设置完成后，点击"生成图像"按钮，AI将根据所有参数创建您的定制无人机设计
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessoriesParameters; 