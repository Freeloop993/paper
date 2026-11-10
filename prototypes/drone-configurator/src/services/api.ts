import axios from 'axios';
import type { GenerateImageRequest, GenerateImageResponse, DroneParameters } from '../types/DroneParameters';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时，AI生图可能需要较长时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// API响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

export class DroneAPI {
  // 生成图像
  static async generateImage(parameters: DroneParameters): Promise<GenerateImageResponse> {
    try {
      console.log('发送生成请求，参数:', parameters);
      
      const request: GenerateImageRequest = { parameters };
      
      const response = await apiClient.post<GenerateImageResponse>('/generate', request);
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`生成图像失败: ${error.response?.data?.error || error.message}`);
      }
      throw new Error('生成图像时发生未知错误');
    }
  }

  // 获取生成进度（如果后端支持）
  static async getProgress(jobId: string): Promise<{ progress: number; status: string }> {
    try {
      const response = await apiClient.get(`/progress/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('获取进度失败:', error);
      throw error;
    }
  }

  // 健康检查
  static async healthCheck(): Promise<{ status: string; version?: string }> {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('健康检查失败:', error);
      throw error;
    }
  }

  // 获取预设配置（如果后端提供）
  static async getPresets(): Promise<{ presets: DroneParameters[] }> {
    try {
      const response = await apiClient.get('/presets');
      return response.data;
    } catch (error) {
      console.error('获取预设配置失败:', error);
      throw error;
    }
  }

  // 保存用户配置（如果后端支持）
  static async saveConfiguration(name: string, parameters: DroneParameters): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post('/configurations', { name, parameters });
      return response.data;
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    }
  }
}

// 参数验证器
export class ParameterValidator {
  static validateParameters(parameters: DroneParameters): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 机架参数验证
    if (parameters.frame.wheelbase_mm < 100 || parameters.frame.wheelbase_mm > 500) {
      errors.push('轴距应在100-500mm之间');
    }

    // 动力系统参数验证
    if (parameters.propulsion.prop_diameter_inch < 3 || parameters.propulsion.prop_diameter_inch > 10) {
      errors.push('螺旋桨直径应在3-10英寸之间');
    }

    if (parameters.propulsion.motor_tilt_degree < 0 || parameters.propulsion.motor_tilt_degree > 20) {
      errors.push('电机倾角应在0-20度之间');
    }

    // 机身参数验证
    const { length, width, height } = parameters.fuselage.fuselage_dimensions_mm;
    if (length < 50 || length > 300) {
      errors.push('机身长度应在50-300mm之间');
    }
    if (width < 30 || width > 200) {
      errors.push('机身宽度应在30-200mm之间');
    }
    if (height < 20 || height > 150) {
      errors.push('机身高度应在20-150mm之间');
    }

    // 起落架参数验证
    if (parameters.landing_gear.landing_gear_height_mm < 20 || parameters.landing_gear.landing_gear_height_mm > 100) {
      errors.push('起落架高度应在20-100mm之间');
    }

    // 颜色验证
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(parameters.accessories.drone_primary_color)) {
      errors.push('无效的颜色格式');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// DeepSeek AI提示词优化服务
export class PromptOptimizationService {
  private static readonly DEEPSEEK_API_KEY = 'HISTORICAL_KEY_REMOVED';
  private static readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private static readonly RAG_API_BASE_URL = 'http://127.0.0.1:5000';

  static async optimizePrompt(originalPrompt: string, userType: string, parameters?: DroneParameters): Promise<string> {
    try {
      console.log('🤖 开始使用DeepSeek优化Prompt...');
      console.log('📝 原始提示词:', originalPrompt);
      console.log('👤 用户类型:', userType);
      console.log('🔧 无人机参数:', parameters);
      
      // 1. 首先尝试从RAG知识库获取相关上下文
      let ragContext = '';
      try {
        console.log('🔍 正在从RAG知识库获取相关上下文...');
        
        // 构建正确的请求格式
        const ragRequestData = {
          originalPrompt: originalPrompt,
          parameters: parameters || {
            frame: { frame_type: "True X", wheelbase_mm: 250, material_visual: "Carbon Fiber" },
            propulsion: { prop_diameter_inch: 5, prop_blade_count: "3叶" },
            fuselage: { fuselage_style: "Minimalist Plate" },
            landing_gear: { landing_gear_style: "Fixed Landing Gear" },
            accessories: { has_camera_gimbal: false, drone_primary_color: "#0ea5e9" }
          }
        };
        
        console.log('📤 发送RAG请求数据:', JSON.stringify(ragRequestData, null, 2));
        
        const ragResponse = await axios.post(
          `${this.RAG_API_BASE_URL}/api/context`,
          ragRequestData,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('📥 RAG响应状态:', ragResponse.status);
        console.log('📊 RAG响应数据:', ragResponse.data);
        
        if (ragResponse.data && ragResponse.data.success && ragResponse.data.context) {
          ragContext = ragResponse.data.context;
          console.log('✅ RAG上下文获取成功，长度:', ragContext.length);
          console.log('🔍 查询结果数量:', ragResponse.data.queryResults?.length || 0);
        } else {
          console.log('⚠️ RAG返回空结果或失败');
        }
      } catch (ragError) {
        console.warn('⚠️ RAG上下文获取失败，继续使用基础优化:', ragError);
        ragContext = '';
      }
      
      // 2. 构建增强的系统提示词
      const systemPrompt = this.getSystemPrompt(userType, ragContext);
      
      // 3. 调用DeepSeek API
      console.log('📡 调用DeepSeek API...');
      const response = await axios.post(
        this.DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `请优化以下无人机外观描述提示词：\n\n${originalPrompt}`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const optimizedPrompt = response.data.choices[0].message.content.trim();
      console.log('✅ DeepSeek优化完成');
      console.log('📊 优化结果长度:', optimizedPrompt.length);
      console.log('🧠 使用了RAG上下文:', ragContext.length > 0);
      
      return optimizedPrompt;
    } catch (error) {
      console.error('❌ AI优化失败:', error);
      throw new Error('提示词优化失败，请稍后重试');
    }
  }

  private static getSystemPrompt(userType: string, ragContext: string = ''): string {
    const basePrompt = `你是一个专业的无人机视觉描述专家，专门优化AI生图的提示词。你需要根据用户输入的原始描述，结合特定用户画像，生成更专业、更精确的视觉描述。

要求：
1. 保持原有描述的核心意图
2. 添加专业的技术术语和视觉细节
3. 确保描述符合AI生图的最佳实践
4. 输出简洁但富有细节的英文描述
5. 只返回优化后的提示词，不要其他解释`;

    // 如果有RAG上下文，添加到系统提示词中
    const ragContextPrompt = ragContext ? `

**用户真实反馈上下文**：
${ragContext}

请特别注意用户反馈中提到的优点和缺点，在优化描述时强化优点相关的设计元素，改进缺点相关的设计特征。` : '';

    const userTypePrompts = {
      '新手玩家': `${basePrompt}${ragContextPrompt}

用户画像：新手玩家
特点：追求简单易用、安全性高、价格亲民
优化方向：
- 强调简洁、现代的设计
- 突出安全特性（保护罩、LED指示灯）
- 明亮友好的色彩
- 避免过于复杂的专业术语`,

      '摄影爱好者': `${basePrompt}${ragContextPrompt}

用户画像：摄影爱好者
特点：注重拍摄性能、稳定性、专业外观
优化方向：
- 强调专业摄影设备（云台、相机）
- 突出稳定性和精密性
- 专业的黑色/灰色配色方案
- 添加摄影相关的专业细节`,

      '户外/亲子用户': `${basePrompt}${ragContextPrompt}

用户画像：户外/亲子用户
特点：耐用性强、适合户外环境、家庭友好
优化方向：
- 强调耐用和防护性能
- 鲜艳活泼的色彩搭配
- 户外使用的实用特性
- 安全友好的设计元素`
    };

    return userTypePrompts[userType as keyof typeof userTypePrompts] || userTypePrompts['新手玩家'];
  }
}

// 导出默认配置
export default DroneAPI; 