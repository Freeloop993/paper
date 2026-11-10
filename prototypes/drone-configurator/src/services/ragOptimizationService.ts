import axios from 'axios';
import type { DroneParameters } from '../types/DroneParameters';

// RAG API配置
const RAG_API_BASE_URL = 'http://127.0.0.1:5000';
const DEEPSEEK_API_KEY = 'HISTORICAL_KEY_REMOVED';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface RAGContext {
  relevant_comments: string[];
  context_summary: string;
  user_preferences: string[];
}

export class RAGOptimizationService {
  // 步骤1: 从RAG知识库获取相关上下文
  static async getRAGContext(parameters: DroneParameters, userType: string): Promise<RAGContext> {
    try {
      // 构建查询字符串，基于无人机参数
      const query = this.buildQueryFromParameters(parameters, userType);
      
      console.log('🔍 RAG查询开始');
      console.log('📝 查询字符串:', query);
      console.log('👤 用户类型:', userType);
      console.log('🔧 参数:', JSON.stringify(parameters, null, 2));
      console.log('🌐 API地址:', `${RAG_API_BASE_URL}/api/context`);
      
      const requestData = {
        originalPrompt: query,
        parameters: parameters
      };
      
      console.log('📤 发送请求数据:', JSON.stringify(requestData, null, 2));
      
      const response = await axios.post(`${RAG_API_BASE_URL}/api/context`, requestData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📥 RAG响应状态:', response.status);
      console.log('📊 RAG响应数据:', response.data);
      
      if (response.data.success) {
        const contextData = response.data;
        
        // 从查询结果中提取相关评论
        const relevantComments: string[] = [];
        const userPreferences: string[] = [];
        
        if (contextData.queryResults && Array.isArray(contextData.queryResults)) {
          console.log('📋 处理查询结果，数量:', contextData.queryResults.length);
          contextData.queryResults.forEach((result: any, index: number) => {
            console.log(`📄 处理结果 ${index + 1}:`, result.query);
            if (result.topDocument && result.topDocument.content) {
              relevantComments.push(result.topDocument.content);
            }
            if (result.response) {
              // 从回答中提取用户偏好关键词
              const keywords = this.extractKeywords(result.response);
              userPreferences.push(...keywords);
            }
          });
        }
        
        const ragContext = {
          relevant_comments: relevantComments.slice(0, 5), // 限制数量
          context_summary: contextData.context || '暂无相关用户反馈',
          user_preferences: [...new Set(userPreferences)].slice(0, 10) // 去重并限制数量
        };
        
        console.log('✅ RAG上下文构建完成:', {
          commentsCount: ragContext.relevant_comments.length,
          preferencesCount: ragContext.user_preferences.length,
          summaryLength: ragContext.context_summary.length
        });
        
        return ragContext;
      } else {
        console.warn('⚠️ RAG上下文获取失败:', response.data.error);
        return {
          relevant_comments: [],
          context_summary: '',
          user_preferences: []
        };
      }
    } catch (error) {
      console.error('❌ RAG上下文获取异常:', error);
      if (axios.isAxiosError(error)) {
        console.error('🌐 网络错误详情:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
      }
      return {
        relevant_comments: [],
        context_summary: '',
        user_preferences: []
      };
    }
  }

  // 步骤2: 结合RAG上下文和大模型进行优化
  static async optimizeWithRAG(
    originalPrompt: string, 
    parameters: DroneParameters, 
    userType: string
  ): Promise<string> {
    try {
      // 获取RAG上下文
      const ragContext = await this.getRAGContext(parameters, userType);
      
      // 构建增强的系统提示词
      const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(userType, ragContext);
      
      // 调用DeepSeek进行优化
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: enhancedSystemPrompt
            },
            {
              role: 'user',
              content: `请基于用户评论数据优化以下无人机外观描述提示词：\n\n${originalPrompt}`
            }
          ],
          max_tokens: 600,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const optimizedPrompt = response.data.choices[0].message.content.trim();
      
      console.log('RAG优化完成:', {
        ragContextUsed: ragContext.relevant_comments.length > 0,
        commentsCount: ragContext.relevant_comments.length,
        optimizedLength: optimizedPrompt.length
      });

      return optimizedPrompt;
    } catch (error) {
      console.error('RAG优化失败:', error);
      throw new Error('基于知识库的提示词优化失败，请稍后重试');
    }
  }

  // 根据无人机参数构建查询
  private static buildQueryFromParameters(parameters: DroneParameters, userType: string): string {
    const queryParts = [];
    
    // 基于用户类型
    queryParts.push(userType);
    
    // 基于机架类型
    queryParts.push(parameters.frame.frame_type);
    
    // 基于机架类型推断螺旋桨数量（大多数消费级无人机都是四轴）
    const frameType = parameters.frame.frame_type;
    if (frameType.includes('X') || frameType.includes('H-Frame') || frameType.includes('Deadcat')) {
      queryParts.push('四轴');
    } else if (frameType.includes('+')) {
      queryParts.push('四轴');
    } else {
      queryParts.push('多轴'); // 默认情况
    }
    
    // 基于用途
    if (userType === '摄影爱好者') {
      queryParts.push('航拍', '摄影', '稳定');
    } else if (userType === '竞速玩家') {
      queryParts.push('竞速', '速度', '敏捷');
    } else if (userType === '专业用户') {
      queryParts.push('专业', '工业', '可靠');
    } else {
      queryParts.push('入门', '简单', '安全');
    }
    
    // 基于尺寸
    const wheelbase = parameters.frame.wheelbase_mm;
    if (wheelbase < 200) queryParts.push('小型');
    else if (wheelbase < 350) queryParts.push('中型');
    else queryParts.push('大型');
    
    return queryParts.join(' ');
  }

  // 构建增强的系统提示词
  private static buildEnhancedSystemPrompt(userType: string, ragContext: RAGContext): string {
    const basePrompt = `你是一个专业的无人机视觉描述专家，专门优化AI生图的提示词。你需要根据用户输入的原始描述，结合真实用户评论数据和特定用户画像，生成更专业、更精确的视觉描述。`;

    let contextSection = '';
    if (ragContext.relevant_comments.length > 0) {
      contextSection = `

**真实用户评论参考：**
${ragContext.relevant_comments.slice(0, 3).map((comment, index) => `${index + 1}. ${comment}`).join('\n')}

**用户偏好总结：**
${ragContext.context_summary}

**关键偏好点：**
${ragContext.user_preferences.join(', ')}`;
    }

    const userTypePrompts = {
      '新手玩家': `${basePrompt}${contextSection}

用户画像：新手玩家
特点：追求简单易用、安全性高、价格亲民
优化方向：
- 强调简洁、现代的设计
- 突出安全特性（保护罩、LED指示灯）
- 明亮友好的色彩
- 基于用户评论中提到的易用性特点进行优化`,

      '摄影爱好者': `${basePrompt}${contextSection}

用户画像：摄影爱好者
特点：注重画质、稳定性、续航能力
优化方向：
- 强调专业摄影设备外观
- 突出云台和相机系统
- 稳重的配色方案
- 结合用户评论中关于航拍体验的反馈`,

      '竞速玩家': `${basePrompt}${contextSection}

用户画像：竞速玩家
特点：追求速度、敏捷性、个性化外观
优化方向：
- 强调运动感和速度感
- 突出轻量化设计
- 鲜艳的竞速配色
- 参考用户评论中关于操控性的描述`,

      '专业用户': `${basePrompt}${contextSection}

用户画像：专业用户
特点：注重可靠性、功能性、工业级品质
优化方向：
- 强调工业级外观设计
- 突出专业功能模块
- 商务化配色
- 基于用户评论中的专业应用场景优化`
    };

    const selectedPrompt = userTypePrompts[userType as keyof typeof userTypePrompts] || userTypePrompts['新手玩家'];

    return `${selectedPrompt}

要求：
1. 保持原有描述的核心意图
2. 结合真实用户评论数据中的偏好
3. 添加专业的技术术语和视觉细节
4. 确保描述符合AI生图的最佳实践
5. 输出简洁但富有细节的英文描述
6. 只返回优化后的提示词，不要其他解释`;
  }

  // 健康检查RAG系统
  static async checkRAGHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${RAG_API_BASE_URL}/api/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.warn('RAG系统不可用，将使用基础优化模式');
      return false;
    }
  }

  // 初始化RAG系统
  static async initializeRAG(): Promise<boolean> {
    try {
      const response = await axios.post(`${RAG_API_BASE_URL}/api/initialize`, {}, {
        timeout: 30000 // 初始化可能需要较长时间
      });
      return response.status === 200;
    } catch (error) {
      console.error('RAG系统初始化失败:', error);
      return false;
    }
  }

  // 从RAG回答中提取关键词
  private static extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // 定义一些常见的用户偏好关键词
    const preferenceKeywords = [
      '简单', '易用', '安全', '稳定', '轻便', '耐用', '美观', '现代',
      '专业', '高质量', '性价比', '续航', '操控', '画质', '速度',
      '静音', '便携', '智能', '可靠', '精准', '流畅', '清晰'
    ];
    
    // 在文本中查找关键词
    preferenceKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    });
    
    return keywords;
  }
} 