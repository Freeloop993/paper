import React, { useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import FrameParameters from './components/Parameters/FrameParameters';
import PropulsionParameters from './components/Parameters/PropulsionParameters';
import FuselageParameters from './components/Parameters/FuselageParameters';
import LandingGearParameters from './components/Parameters/LandingGearParameters';
import AccessoriesParameters from './components/Parameters/AccessoriesParameters';
import ImagePreview from './components/ImagePreview/ImagePreview';
import ParameterOverview from './components/Overview/ParameterOverview';
import InterfacePreview from './components/DevPreview/InterfacePreview';
import PromptGenerator from './components/DevPreview/PromptGenerator';
import TestImageGeneration from './components/DevPreview/TestImageGeneration';
import GeminiOptimizationViewer from './components/DevPreview/GeminiOptimizationViewer';
import { useDroneStore } from './store/droneStore';
import DroneAPI, { ParameterValidator } from './services/api';
import { Settings, Image, RefreshCw, Zap, Box, Anchor, Camera, AlertCircle, CheckCircle, Save, Upload, Sparkles } from 'lucide-react';
import { ImageGenerationService } from './services/imageGenerationService';
import { RAGOptimizationService } from './services/ragOptimizationService';

type TabType = 'frame' | 'propulsion' | 'fuselage' | 'landing' | 'accessories';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('frame');
  const { 
    parameters, 
    isGenerating, 
    setGenerating, 
    setCurrentImage, 
    setError,
    selectedUserProfile,
    error,
    resetToDefaults,
    useGeminiOptimization,
    setUseGeminiOptimization,
    isOptimizingPrompt,
    setOptimizingPrompt,
    lastOptimizationResult,
    setLastOptimizationResult,
    useRAGOptimization,
    setUseRAGOptimization
  } = useDroneStore();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const tabs = [
    { id: 'frame', label: '机架', icon: Settings },
    { id: 'propulsion', label: '动力', icon: Zap },
    { id: 'fuselage', label: '机身', icon: Box },
    { id: 'landing', label: '起落架', icon: Anchor },
    { id: 'accessories', label: '配件', icon: Camera },
  ] as const;

  const handleGenerateImage = async () => {
    try {
      setError(null);
      setGenerating(true);
      
      console.log('开始生成图像，参数:', parameters);
      console.log('用户画像:', selectedUserProfile);
      console.log('使用Gemini优化:', useGeminiOptimization);
      
      // 调用图像生成服务（带Gemini优化选项）
      const result = await ImageGenerationService.generateImage(
        parameters, 
        selectedUserProfile || undefined,
        {
          useGeminiOptimization: useGeminiOptimization
        }
      );
      
      if (result.success && result.imageUrl) {
        setCurrentImage(result.imageUrl);
        
        // 保存优化结果
        if (result.usedGeminiOptimization && result.structuredPrompt) {
          setLastOptimizationResult({
            success: true,
            originalPrompt: result.originalPrompt,
            optimizedPrompt: result.optimizedPrompt,
            structuredPrompt: result.structuredPrompt,
            timestamp: result.timestamp
          });
        }
        
        console.log('图像生成成功:', result.imageUrl);
        if (result.usedGeminiOptimization) {
          console.log('✨ 使用了Gemini优化的prompt');
        }
      } else {
        throw new Error(result.error || '图像生成失败');
      }
      
    } catch (error: any) {
      console.error('图像生成错误:', error);
      setError(error.message || '图像生成失败，请稍后重试');
      setCurrentImage(null);
    } finally {
      setGenerating(false);
    }
  };

  // 仅优化prompt（不生成图像）
  const handleOptimizePromptOnly = async () => {
    try {
      setError(null);
      setOptimizingPrompt(true);
      
      console.log('开始优化Prompt...');
      console.log('使用RAG优化:', useRAGOptimization);
      console.log('使用Gemini优化:', useGeminiOptimization);
      
      let result;
      
      if (useRAGOptimization) {
        // 使用RAG知识库优化
        console.log('🤖 调用RAG知识库优化...');
        
        // 先生成原始prompt
        const originalPrompt = ImageGenerationService.previewPrompt(parameters, selectedUserProfile || undefined);
        
        // 调用RAG优化服务
        const ragResult = await RAGOptimizationService.optimizeWithRAG(
          originalPrompt,
          parameters,
          selectedUserProfile || '新手玩家'
        );
        
        // 转换为PromptOptimizationResult格式
        result = {
          success: true,
          originalPrompt: originalPrompt,
          optimizedPrompt: ragResult,
          structuredPrompt: ragResult, // RAG优化后的就是最终结果
          timestamp: new Date().toISOString()
        };
        console.log('✅ RAG优化成功');
      } else if (useGeminiOptimization) {
        // 使用Gemini优化
        console.log('🤖 调用Gemini优化...');
        result = await ImageGenerationService.optimizePromptOnly(
          parameters,
          selectedUserProfile || undefined
        );
      } else {
        // 不使用任何优化，只生成原始prompt
        const originalPrompt = ImageGenerationService.previewPrompt(parameters, selectedUserProfile || undefined);
        result = {
          success: true,
          originalPrompt: originalPrompt,
          optimizedPrompt: originalPrompt,
          structuredPrompt: originalPrompt,
          timestamp: new Date().toISOString()
        };
        console.log('📝 生成原始Prompt（未优化）');
      }
      
      setLastOptimizationResult(result);
      
      if (result.success) {
        console.log('✅ Prompt优化成功');
      } else {
        setError(result.error || 'Prompt优化失败');
      }
      
    } catch (error: any) {
      console.error('Prompt优化错误:', error);
      setError(error.message || 'Prompt优化失败，请稍后重试');
    } finally {
      setOptimizingPrompt(false);
    }
  };

  const getParameterSummary = () => {
    return {
      frame: `${parameters.frame.frame_type} - ${parameters.frame.wheelbase_mm}mm`,
      propulsion: `${parameters.propulsion.prop_diameter_inch}" ${parameters.propulsion.prop_blade_count}`,
      fuselage: parameters.fuselage.fuselage_style,
      landing: parameters.landing_gear.landing_gear_style,
      accessories: `${parameters.accessories.has_camera_gimbal ? '含相机' : '无相机'}`
    };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div id="drone-configurator-app" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 左侧：参数控制面板 */}
          <div className="xl:col-span-2 space-y-6">
            {/* 选项卡导航 */}
            <div className="card">
              <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* 错误提示 */}
              {(error || validationErrors.length > 0) && (
                <div className="card border-red-200 bg-red-50">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800">错误提示</h4>
                      {error && <p className="text-sm text-red-700 mt-1">{error}</p>}
                      {validationErrors.length > 0 && (
                        <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                          {validationErrors.map((err, index) => (
                            <li key={index}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 参数面板内容 */}
              <div className="space-y-6">
                {activeTab === 'frame' && <FrameParameters />}
                {activeTab === 'propulsion' && <PropulsionParameters />}
                {activeTab === 'fuselage' && <FuselageParameters />}
                {activeTab === 'landing' && <LandingGearParameters />}
                {activeTab === 'accessories' && <AccessoriesParameters />}
              </div>
            </div>

            {/* AI智能优化控制面板 */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-slate-900">AI智能优化</h3>
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={useGeminiOptimization}
                      onChange={(e) => setUseGeminiOptimization(e.target.checked)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">启用Gemini优化</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={useRAGOptimization}
                      onChange={(e) => setUseRAGOptimization(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">启用RAG知识库优化</span>
                  </label>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleOptimizePromptOnly}
                  disabled={isOptimizingPrompt}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isOptimizingPrompt ? '优化中...' : '预览优化结果'}</span>
                </button>
                
                {lastOptimizationResult && (
                  <div className="text-sm text-slate-600">
                    {lastOptimizationResult.success ? (
                      <span className="text-green-600">✅ 优化完成</span>
                    ) : (
                      <span className="text-red-600">❌ 优化失败</span>
                    )}
                  </div>
                )}
              </div>
              
              {(useGeminiOptimization || useRAGOptimization) && (
                <div className="mt-3 space-y-2">
                  {useGeminiOptimization && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-700">
                        🤖 启用后，生成图像时将使用Gemini AI优化prompt，提升图像质量和专业度
                      </p>
                    </div>
                  )}
                  {useRAGOptimization && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        🧠 启用后，将基于5614条真实用户评论数据优化prompt，让设计更符合用户偏好
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="card">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleGenerateImage}
                  disabled={isGenerating}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>{isGenerating ? '生成中...' : '生成图像'}</span>
                  {useGeminiOptimization && <Sparkles className="h-3 w-3 text-yellow-300" />}
                </button>
                
                <button
                  onClick={resetToDefaults}
                  disabled={isGenerating}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>重置参数</span>
                </button>
              </div>
              
              {isGenerating && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    🔄 正在生成您的定制无人机设计，请稍候...
                    {useGeminiOptimization && ' (使用AI优化中)'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：预览和概览 - 等高布局 */}
          <div className="space-y-6">
            {/* 图像预览 */}
            <div className="h-80">
              <ImagePreview />
            </div>
            
            {/* Gemini优化结果查看器 */}
            <div className="min-h-96 max-h-screen overflow-y-auto">
              <GeminiOptimizationViewer />
            </div>
            
            {/* API测试工具 */}
            <div className="min-h-96 max-h-screen overflow-y-auto">
              <TestImageGeneration />
            </div>
            
            {/* 界面预览 */}
            <div className="h-96">
              <InterfacePreview />
            </div>
            
            {/* Prompt生成器 */}
            <div className="h-80">
              <PromptGenerator />
            </div>
            
            {/* 参数概览 */}
            <div className="h-64">
              <ParameterOverview />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
