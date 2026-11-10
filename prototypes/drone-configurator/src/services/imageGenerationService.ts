import { OpenAI } from 'openai';
import type { DroneParameters } from '../types/DroneParameters';
import { GeminiPromptOptimizer, type PromptOptimizationResult } from './geminiPromptOptimizer';

// OpenAI API配置
const openai = new OpenAI({
  apiKey: 'HISTORICAL_KEY_REMOVED',
  baseURL: 'https://image-provider.invalid/v1',
  dangerouslyAllowBrowser: true // 允许在浏览器中使用
});

// 图像生成响应接口
export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  timestamp: string;
  originalPrompt?: string;
  optimizedPrompt?: string;
  structuredPrompt?: string;
  usedGeminiOptimization?: boolean;
}

// 图像生成参数接口
export interface GenerationOptions {
  model?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  useGeminiOptimization?: boolean; // 新增：是否使用Gemini优化
}

// 用户画像类型
type UserProfileKey = '新手玩家🎮' | '摄影爱好者📸' | '户外/亲子用户🏕️';

export class ImageGenerationService {
  // 根据参数生成最终版本prompt
  private static generateFinalPrompt(parameters: DroneParameters, userProfile?: string): string {
    const { frame, propulsion, fuselage, landing_gear, accessories } = parameters;
    
    // 基础描述
    let prompt = `A professional high-quality drone/quadcopter with ${frame.frame_type.toLowerCase()} frame configuration, ${frame.wheelbase_mm}mm wheelbase and ${frame.arm_thickness_mm} thick ${frame.material_visual.toLowerCase()} arms, equipped with ${propulsion.prop_diameter_inch}-inch ${propulsion.prop_blade_count}-blade propellers, ${propulsion.motor_tilt_degree === 0 ? 'vertically' : `${propulsion.motor_tilt_degree}° tilted`} mounted brushless motors, ${fuselage.fuselage_style.toLowerCase()} fuselage design (${fuselage.fuselage_dimensions_mm.length}×${fuselage.fuselage_dimensions_mm.width}×${fuselage.fuselage_dimensions_mm.height}mm), equipped with ${landing_gear.landing_gear_style} landing gear system providing ${landing_gear.landing_gear_height_mm}mm ground clearance`;

    // 相机云台
    if (accessories.has_camera_gimbal) {
      prompt += ', equipped with stabilized camera gimbal';
    } else {
      prompt += ', designed for pure flight performance without camera equipment';
    }

    // 用户画像增强
    if (userProfile) {
      const userEnhancements = this.getUserProfileEnhancements(userProfile);
      prompt += `, ${userEnhancements}`;
    }

    // 主色调和风格
    prompt += `, primary color scheme in ${accessories.drone_primary_color}, professional matte finish with clean modern aesthetics, high-precision mechanical components`;

    // 自定义提示词
    if (accessories.custom_prompt_additions?.trim()) {
      prompt += `, ${accessories.custom_prompt_additions}`;
    }

    // 摄影质量要求
    prompt += ', ultra-high resolution professional product photography, studio lighting with perfect shadows and highlights, clean white background, photorealistic details and textures, commercial product showcase quality';

    return prompt;
  }

  // 根据用户画像生成增强描述
  private static getUserProfileEnhancements(userProfile: string): string {
    const enhancements: Record<UserProfileKey, string> = {
      '新手玩家🎮': 'beginner-friendly design with bright LED status indicators, safety-focused with protective features, intuitive control interface, durable construction for learning, modern consumer-grade appearance',
      '摄影爱好者📸': 'professional-grade build quality, precision engineering for stable footage, streamlined aerodynamic design, vibration-dampening construction, camera-optimized configuration',
      '户外/亲子用户🏕️': 'family-friendly design with enhanced safety features, robust construction for outdoor environments, bright visibility colors, easy maintenance design, recreational-grade aesthetics'
    };

    return enhancements[userProfile as UserProfileKey] || 'high-quality consumer drone design';
  }

  // 生成图像（带Gemini优化选项）
  static async generateImage(
    parameters: DroneParameters, 
    userProfile?: string,
    options: GenerationOptions = {}
  ): Promise<ImageGenerationResult> {
    try {
      console.log('🎨 开始生成无人机图像...');
      
      // 生成原始prompt
      const originalPrompt = this.generateFinalPrompt(parameters, userProfile);
      console.log('📝 原始Prompt:', originalPrompt);

      let finalPrompt = originalPrompt;
      let optimizationResult: PromptOptimizationResult | null = null;
      let usedGeminiOptimization = false;

      // 如果启用Gemini优化
      if (options.useGeminiOptimization) {
        console.log('🤖 使用Gemini优化Prompt...');
        try {
          optimizationResult = await GeminiPromptOptimizer.optimizePrompt(
            originalPrompt, 
            parameters, 
            userProfile
          );
          
          if (optimizationResult.success && optimizationResult.optimizedPrompt) {
            finalPrompt = optimizationResult.optimizedPrompt;
            usedGeminiOptimization = true;
            console.log('✅ Gemini优化成功');
            console.log('🔄 优化后Prompt:', finalPrompt);
          } else {
            console.log('⚠️ Gemini优化失败，使用原始prompt');
          }
        } catch (error) {
          console.log('⚠️ Gemini优化出错，使用原始prompt:', error);
        }
      }

      // 设置默认选项
      const {
        model = 'dall-e-3',
        size = '1024x1024',
        quality = 'standard',
        style = 'natural'
      } = options;

      // 调用OpenAI API
      const response = await openai.images.generate({
        model,
        prompt: finalPrompt,
        size,
        quality,
        style,
        n: 1
      });

      const imageUrl = response.data?.[0]?.url;
      
      if (!imageUrl) {
        throw new Error('未收到图像URL');
      }

      console.log('✅ 图像生成成功:', imageUrl);

      return {
        success: true,
        imageUrl,
        timestamp: new Date().toISOString(),
        originalPrompt,
        optimizedPrompt: optimizationResult?.optimizedPrompt,
        structuredPrompt: optimizationResult?.structuredPrompt,
        usedGeminiOptimization
      };

    } catch (error: any) {
      console.error('❌ 图像生成失败:', error);
      
      // 处理不同类型的错误
      let errorMessage = '图像生成失败';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error.message || error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        originalPrompt: this.generateFinalPrompt(parameters, userProfile),
        usedGeminiOptimization: options.useGeminiOptimization || false
      };
    }
  }

  // 仅优化prompt（不生成图像）
  static async optimizePromptOnly(
    parameters: DroneParameters, 
    userProfile?: string
  ): Promise<PromptOptimizationResult> {
    const originalPrompt = this.generateFinalPrompt(parameters, userProfile);
    return await GeminiPromptOptimizer.optimizePrompt(originalPrompt, parameters, userProfile);
  }

  // 下载图像到本地
  static async downloadImage(imageUrl: string, filename?: string): Promise<void> {
    try {
      console.log('⬇️ 开始下载图像...');
      
      // 获取图像数据
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('下载图像失败');
      }
      
      const blob = await response.blob();
      
      // 创建下载链接
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `drone-design-${Date.now()}.png`;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL对象
      URL.revokeObjectURL(downloadUrl);
      
      console.log('✅ 图像下载完成');
      
    } catch (error) {
      console.error('❌ 图像下载失败:', error);
      throw new Error('下载图像失败，请稍后重试');
    }
  }

  // 验证图像URL是否有效
  static async validateImageUrl(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  // 获取图像的Base64编码（用于本地存储）
  static async getImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('获取Base64编码失败:', error);
      throw error;
    }
  }

  // 预览prompt（不生成图像）
  static previewPrompt(parameters: DroneParameters, userProfile?: string): string {
    return this.generateFinalPrompt(parameters, userProfile);
  }
} 