import React, { useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { ImageGenerationService } from '../../services/imageGenerationService';
import { Image, Download, RefreshCw, AlertCircle } from 'lucide-react';

const ImagePreview: React.FC = () => {
  const { currentImage, isGenerating, error } = useDroneStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const downloadImage = async () => {
    if (!currentImage) return;
    
    try {
      setIsDownloading(true);
      setDownloadError(null);
      
      await ImageGenerationService.downloadImage(
        currentImage, 
        `无人机设计-${new Date().toISOString().slice(0, 10)}-${Date.now()}.png`
      );
      
    } catch (error: any) {
      console.error('下载失败:', error);
      setDownloadError(error.message || '下载失败，请稍后重试');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-slate-900">图像预览</h3>
        {currentImage && (
          <button
            onClick={downloadImage}
            disabled={isDownloading}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
            <span>{isDownloading ? '下载中...' : '下载'}</span>
          </button>
        )}
      </div>
      
      {/* 错误提示 */}
      {(error || downloadError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-700">
              {error && <p>生成错误: {error}</p>}
              {downloadError && <p>下载错误: {downloadError}</p>}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
        {isGenerating ? (
          <div className="text-center text-slate-500">
            <RefreshCw className="h-12 w-12 mx-auto mb-2 animate-spin" />
            <p>正在生成图像...</p>
            <p className="text-xs mt-1">这可能需要15-30秒</p>
          </div>
        ) : currentImage ? (
          <div className="relative w-full h-full">
            <img 
              src={currentImage} 
              alt="Generated drone" 
              className="w-full h-full object-contain rounded-lg"
              onError={() => {
                console.error('图像加载失败');
                // 可以在这里添加图像加载失败的处理
              }}
            />
            {/* 图像信息叠加 */}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
              AI生成图像
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500">
            <Image className="h-12 w-12 mx-auto mb-2" />
            <p>点击"生成图像"查看结果</p>
            <p className="text-xs mt-1">AI将根据您的配置生成无人机图像</p>
          </div>
        )}
      </div>
      
      {currentImage && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg flex-shrink-0">
          <p className="text-sm text-green-700">
            ✅ 图像生成完成！您可以继续调整参数并重新生成。
          </p>
        </div>
      )}
    </div>
  );
};

export default ImagePreview; 