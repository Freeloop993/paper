import React, { useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { Sparkles, Copy, Eye, EyeOff, FileText, Zap } from 'lucide-react';

const GeminiOptimizationViewer: React.FC = () => {
  const { lastOptimizationResult, useGeminiOptimization } = useDroneStore();
  const [showStructured, setShowStructured] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  if (!lastOptimizationResult) {
    return (
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-slate-900">Gemini优化结果</h3>
        </div>
        
        <div className="text-center py-8 text-slate-500">
          <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>暂无优化结果</p>
          <p className="text-xs mt-1">
            {useGeminiOptimization ? '点击"预览优化结果"或"生成图像"查看' : '请先启用Gemini优化'}
          </p>
        </div>
      </div>
    );
  }

  if (!lastOptimizationResult.success) {
    return (
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-slate-900">Gemini优化结果</h3>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">优化失败</p>
          <p className="text-red-700 text-sm mt-1">{lastOptimizationResult.error}</p>
          <p className="text-red-600 text-xs mt-2">
            时间: {new Date(lastOptimizationResult.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-slate-900">Gemini优化结果</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowStructured(!showStructured)}
            className="btn-xs flex items-center space-x-1"
          >
            {showStructured ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span>{showStructured ? '隐藏结构化' : '显示结构化'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* 优化状态 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-green-600" />
            <span className="text-green-800 font-medium">优化成功</span>
          </div>
          <p className="text-green-700 text-xs mt-1">
            时间: {new Date(lastOptimizationResult.timestamp).toLocaleString()}
          </p>
        </div>

        {/* 原始Prompt */}
        {lastOptimizationResult.originalPrompt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                原始Prompt ({lastOptimizationResult.originalPrompt.length} 字符)
              </span>
              <button
                onClick={() => copyToClipboard(lastOptimizationResult.originalPrompt!, 'original')}
                className={`btn-xs flex items-center space-x-1 ${
                  copiedType === 'original' ? 'bg-green-100 text-green-700' : ''
                }`}
              >
                <Copy className="h-3 w-3" />
                <span>{copiedType === 'original' ? '已复制' : '复制'}</span>
              </button>
            </div>
            <div className="bg-slate-100 p-3 rounded text-sm text-slate-700 max-h-32 overflow-y-auto">
              {lastOptimizationResult.originalPrompt}
            </div>
          </div>
        )}

        {/* 优化后的Prompt */}
        {lastOptimizationResult.optimizedPrompt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-700">
                优化后的Prompt ({lastOptimizationResult.optimizedPrompt.length} 字符)
              </span>
              <button
                onClick={() => copyToClipboard(lastOptimizationResult.optimizedPrompt!, 'optimized')}
                className={`btn-xs flex items-center space-x-1 ${
                  copiedType === 'optimized' ? 'bg-green-100 text-green-700' : ''
                }`}
              >
                <Copy className="h-3 w-3" />
                <span>{copiedType === 'optimized' ? '已复制' : '复制'}</span>
              </button>
            </div>
            <div className="bg-purple-50 border border-purple-200 p-3 rounded text-sm text-purple-800 max-h-32 overflow-y-auto">
              {lastOptimizationResult.optimizedPrompt}
            </div>
          </div>
        )}

        {/* 结构化描述 */}
        {showStructured && lastOptimizationResult.structuredPrompt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                结构化描述 ({lastOptimizationResult.structuredPrompt.length} 字符)
              </span>
              <button
                onClick={() => copyToClipboard(lastOptimizationResult.structuredPrompt!, 'structured')}
                className={`btn-xs flex items-center space-x-1 ${
                  copiedType === 'structured' ? 'bg-green-100 text-green-700' : ''
                }`}
              >
                <Copy className="h-3 w-3" />
                <span>{copiedType === 'structured' ? '已复制' : '复制'}</span>
              </button>
            </div>
            <div className="bg-slate-50 border p-3 rounded text-xs text-slate-700 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
              {lastOptimizationResult.structuredPrompt}
            </div>
          </div>
        )}

        {/* 优化统计 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2">优化统计</h4>
          <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
            <div>
              <span className="font-medium">原始长度:</span> {lastOptimizationResult.originalPrompt?.length || 0} 字符
            </div>
            <div>
              <span className="font-medium">优化后长度:</span> {lastOptimizationResult.optimizedPrompt?.length || 0} 字符
            </div>
            <div>
              <span className="font-medium">结构化长度:</span> {lastOptimizationResult.structuredPrompt?.length || 0} 字符
            </div>
            <div>
              <span className="font-medium">优化比例:</span> {
                lastOptimizationResult.originalPrompt && lastOptimizationResult.optimizedPrompt
                  ? Math.round((lastOptimizationResult.optimizedPrompt.length / lastOptimizationResult.originalPrompt.length) * 100)
                  : 0
              }%
            </div>
          </div>
        </div>

        {/* 使用提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Zap className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">使用建议</p>
              <p className="text-xs mt-1">
                优化后的prompt已经过Gemini AI处理，包含更专业的视觉描述和技术细节。
                生成图像时会自动使用优化后的prompt。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiOptimizationViewer; 