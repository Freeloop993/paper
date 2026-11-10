import React, { useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { ImageGenerationService } from '../../services/imageGenerationService';
import { GeminiPromptOptimizer } from '../../services/geminiPromptOptimizer';
import { TestTube, Play, Download, Copy, AlertCircle, CheckCircle, Sparkles, Eye } from 'lucide-react';

const TestImageGeneration: React.FC = () => {
  const { parameters, selectedUserProfile, useGeminiOptimization } = useDroneStore();
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);
  const [isTestingGeneration, setIsTestingGeneration] = useState(false);
  const [isTestingGeminiOptimization, setIsTestingGeminiOptimization] = useState(false);

  // 测试Prompt生成
  const testPromptGeneration = () => {
    setIsTestingPrompt(true);
    try {
      const prompt = ImageGenerationService.previewPrompt(parameters, selectedUserProfile || undefined);
      setTestResult({
        type: 'prompt',
        success: true,
        data: { prompt, length: prompt.length },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      setTestResult({
        type: 'prompt',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestingPrompt(false);
    }
  };

  // 测试Gemini优化
  const testGeminiOptimization = async () => {
    setIsTestingGeminiOptimization(true);
    try {
      const result = await ImageGenerationService.optimizePromptOnly(
        parameters,
        selectedUserProfile || undefined
      );
      setTestResult({
        type: 'gemini_optimization',
        ...result
      });
    } catch (error: any) {
      setTestResult({
        type: 'gemini_optimization',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestingGeminiOptimization(false);
    }
  };

  // 测试图像生成
  const testImageGeneration = async () => {
    setIsTestingGeneration(true);
    try {
      const result = await ImageGenerationService.generateImage(
        parameters, 
        selectedUserProfile || undefined,
        {
          useGeminiOptimization: useGeminiOptimization
        }
      );
      setTestResult({
        type: 'generation',
        ...result
      });
    } catch (error: any) {
      setTestResult({
        type: 'generation',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestingGeneration(false);
    }
  };

  // 复制Prompt到剪贴板
  const copyPrompt = async () => {
    let textToCopy = '';
    
    if (testResult?.type === 'prompt' && testResult.data?.prompt) {
      textToCopy = testResult.data.prompt;
    } else if (testResult?.type === 'gemini_optimization') {
      if (testResult.optimizedPrompt) {
        textToCopy = testResult.optimizedPrompt;
      } else if (testResult.structuredPrompt) {
        textToCopy = testResult.structuredPrompt;
      }
    }
    
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        // 可以添加成功提示
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  };

  // 下载生成的图像
  const downloadTestImage = async () => {
    if (testResult?.type === 'generation' && testResult.imageUrl) {
      try {
        await ImageGenerationService.downloadImage(
          testResult.imageUrl,
          `测试图像-${Date.now()}.png`
        );
      } catch (error: any) {
        console.error('下载失败:', error);
      }
    }
  };

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        <TestTube className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-900">API测试工具</h3>
      </div>

      {/* 测试按钮 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={testPromptGeneration}
          disabled={isTestingPrompt}
          className="btn-secondary flex items-center space-x-2"
        >
          <Play className="h-4 w-4" />
          <span>{isTestingPrompt ? '测试中...' : '测试Prompt生成'}</span>
        </button>

        <button
          onClick={testGeminiOptimization}
          disabled={isTestingGeminiOptimization}
          className="btn-secondary flex items-center space-x-2 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
        >
          <Sparkles className="h-4 w-4" />
          <span>{isTestingGeminiOptimization ? '优化中...' : '测试Gemini优化'}</span>
        </button>

        <button
          onClick={testImageGeneration}
          disabled={isTestingGeneration}
          className="btn-primary flex items-center space-x-2"
        >
          <Play className="h-4 w-4" />
          <span>{isTestingGeneration ? '生成中...' : '测试图像生成'}</span>
          {useGeminiOptimization && <Sparkles className="h-3 w-3 text-yellow-300" />}
        </button>
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div className="space-y-4">
          {/* 结果状态 */}
          <div className={`p-3 rounded-lg flex items-start space-x-2 ${
            testResult.success 
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                testResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResult.type === 'prompt' && 'Prompt生成'}
                {testResult.type === 'gemini_optimization' && 'Gemini优化'}
                {testResult.type === 'generation' && '图像生成'}
                {testResult.success ? '成功' : '失败'}
              </p>
              {!testResult.success && testResult.error && (
                <p className="text-sm text-red-700 mt-1">{testResult.error}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                测试时间: {new Date(testResult.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Prompt结果 */}
          {testResult.type === 'prompt' && testResult.success && testResult.data && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  生成的Prompt ({testResult.data.length} 字符)
                </span>
                <button
                  onClick={copyPrompt}
                  className="btn-xs flex items-center space-x-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>复制</span>
                </button>
              </div>
              <div className="bg-slate-100 p-3 rounded text-sm font-mono text-slate-700 max-h-40 overflow-y-auto">
                {testResult.data.prompt}
              </div>
            </div>
          )}

          {/* Gemini优化结果 */}
          {testResult.type === 'gemini_optimization' && testResult.success && (
            <div className="space-y-4">
              {/* 优化后的prompt */}
              {testResult.optimizedPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-700">
                      优化后的Prompt ({testResult.optimizedPrompt.length} 字符)
                    </span>
                    <button
                      onClick={copyPrompt}
                      className="btn-xs flex items-center space-x-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>复制</span>
                    </button>
                  </div>
                  <div className="bg-purple-50 p-3 rounded text-sm font-mono text-purple-800 max-h-32 overflow-y-auto">
                    {testResult.optimizedPrompt}
                  </div>
                </div>
              )}

              {/* 结构化prompt */}
              {testResult.structuredPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      结构化描述 ({testResult.structuredPrompt.length} 字符)
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(testResult.structuredPrompt)}
                      className="btn-xs flex items-center space-x-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>复制结构化</span>
                    </button>
                  </div>
                  <div className="bg-slate-100 p-3 rounded text-xs text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {testResult.structuredPrompt}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 图像生成结果 */}
          {testResult.type === 'generation' && testResult.success && testResult.imageUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  生成的图像 {testResult.usedGeminiOptimization && <span className="text-purple-600">(使用Gemini优化)</span>}
                </span>
                <button
                  onClick={downloadTestImage}
                  className="btn-xs flex items-center space-x-1"
                >
                  <Download className="h-3 w-3" />
                  <span>下载</span>
                </button>
              </div>
              <div className="bg-slate-100 rounded-lg p-2">
                <img 
                  src={testResult.imageUrl}
                  alt="测试生成的图像"
                  className="w-full h-32 object-contain rounded"
                />
              </div>
              <div className="text-xs text-slate-500">
                图像URL: <a href={testResult.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {testResult.imageUrl.substring(0, 50)}...
                </a>
              </div>
              
              {/* 显示使用的prompt信息 */}
              {testResult.usedGeminiOptimization && testResult.optimizedPrompt && (
                <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                  ✨ 使用了Gemini优化的prompt生成此图像
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 当前配置预览 */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <h4 className="text-sm font-medium text-slate-700 mb-2">当前测试配置</h4>
        <div className="text-xs text-slate-600 space-y-1">
          <div>机架: {parameters.frame.frame_type} - {parameters.frame.wheelbase_mm}mm</div>
          <div>螺旋桨: {parameters.propulsion.prop_diameter_inch}" {parameters.propulsion.prop_blade_count}</div>
          <div>用户画像: {selectedUserProfile || '未选择'}</div>
          <div>主色调: {parameters.accessories.drone_primary_color}</div>
          <div className="flex items-center space-x-1">
            <span>Gemini优化:</span>
            {useGeminiOptimization ? (
              <span className="text-purple-600 flex items-center space-x-1">
                <Sparkles className="h-3 w-3" />
                <span>启用</span>
              </span>
            ) : (
              <span className="text-slate-500">禁用</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestImageGeneration; 