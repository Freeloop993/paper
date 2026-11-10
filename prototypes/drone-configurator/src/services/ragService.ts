/**
 * RAG知识库服务
 * 
 * 这个服务类负责与Python RAG系统交互，为提示词优化提供相关的用户评论信息。
 * 主要功能：
 * 1. 启动和管理Python RAG进程
 * 2. 执行语义搜索查询
 * 3. 格式化检索结果
 * 4. 为提示词优化提供上下文信息
 */

import axios from 'axios';
import type { DroneParameters } from '../types/DroneParameters';

// RAG API服务器配置
const RAG_API_BASE_URL = 'http://127.0.0.1:5000/api';

export interface RAGQueryResult {
  success: boolean;
  query: string;
  response?: string;
  sourceDocuments?: RAGSourceDocument[];
  error?: string;
  timestamp: string;
}

export interface RAGSourceDocument {
  content: string;
  similarity: number;
  metadata: {
    comment_id: string;
    product_sku_description: string;
    source_comment_part: string;
    chunk_sequence_in_comment: number;
    segmented_words?: string[];
  };
}

export interface RAGSystemStatus {
  isInitialized: boolean;
  isReady: boolean;
  totalDocuments: number;
  totalComments: number;
  uniqueProducts: number;
  embedModel: string;
  error?: string;
}

export interface RAGContextResult {
  success: boolean;
  originalPrompt: string;
  context: string;
  queryResults?: Array<{
    query: string;
    response: string;
    topDocument: {
      content: string;
      metadata: Record<string, any>;
    };
  }>;
  error?: string;
  timestamp: string;
}

export class RAGService {
  private static instance: RAGService;
  private isInitialized = false;
  private isReady = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // 配置axios默认设置
    axios.defaults.timeout = 30000; // 30秒超时
  }

  public static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  /**
   * 检查API服务器是否可用
   */
  private async checkServerHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${RAG_API_BASE_URL}/health`);
      return response.data.success === true;
    } catch (error) {
      console.error('RAG服务器健康检查失败:', error);
      return false;
    }
  }

  /**
   * 初始化RAG系统
   */
  public async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeRAGSystem();
    return this.initializationPromise;
  }

  private async _initializeRAGSystem(): Promise<void> {
    try {
      console.log('🚀 正在初始化RAG知识库系统...');
      
      // 1. 检查服务器是否可用
      const isServerHealthy = await this.checkServerHealth();
      if (!isServerHealthy) {
        throw new Error('RAG API服务器不可用，请确保Python服务器已启动 (python rag_api_server.py)');
      }
      
      // 2. 调用初始化API
      const response = await axios.post(`${RAG_API_BASE_URL}/initialize`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'RAG系统初始化失败');
      }
      
      this.isInitialized = true;
      this.isReady = true;
      
      console.log('✅ RAG系统初始化完成');
      console.log('📊 系统统计:', response.data.stats);
      
    } catch (error) {
      console.error('❌ RAG系统初始化失败:', error);
      this.isInitialized = false;
      this.isReady = false;
      throw error;
    }
  }

  /**
   * 执行RAG查询
   */
  public async query(question: string): Promise<RAGQueryResult> {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      console.log(`🔍 执行RAG查询: ${question}`);
      
      const response = await axios.post(`${RAG_API_BASE_URL}/query`, {
        question: question
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'RAG查询失败');
      }
      
      return {
        success: true,
        query: question,
        response: response.data.response,
        sourceDocuments: response.data.sourceDocuments,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ RAG查询失败:', error);
      return {
        success: false,
        query: question,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 根据无人机参数生成相关查询
   */
  public generateQueriesFromParameters(parameters: DroneParameters): string[] {
    const queries: string[] = [];

    // 根据机架参数生成查询
    if (parameters.frame.frame_type) {
      queries.push(`用户对${parameters.frame.frame_type}机架类型的无人机有什么评价？`);
    }

    // 根据动力系统参数生成查询
    if (parameters.propulsion.prop_diameter_inch > 0) {
      queries.push(`用户对螺旋桨直径${parameters.propulsion.prop_diameter_inch}英寸的无人机性能有什么反馈？`);
    }

    // 根据机身参数生成查询
    if (parameters.fuselage.fuselage_style) {
      queries.push(`用户对${parameters.fuselage.fuselage_style}风格的无人机外观设计有什么看法？`);
    }

    // 根据配件参数生成查询
    if (parameters.accessories.has_camera_gimbal) {
      queries.push(`用户对无人机摄像头功能的评价如何？画质和稳定性怎么样？`);
    }

    if (parameters.accessories.drone_primary_color) {
      queries.push(`用户对${parameters.accessories.drone_primary_color}颜色的无人机外观有什么评价？`);
    }

    // 通用查询
    queries.push('用户对无人机的整体性能和使用体验有什么反馈？');
    queries.push('用户最常提到的无人机优点和缺点是什么？');

    return queries;
  }

  /**
   * 为提示词优化获取相关上下文
   */
  public async getContextForPromptOptimization(
    originalPrompt: string,
    parameters: DroneParameters
  ): Promise<string> {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      console.log(`🔍 获取提示词优化上下文: ${originalPrompt.substring(0, 50)}...`);
      
      const response = await axios.post(`${RAG_API_BASE_URL}/context`, {
        originalPrompt: originalPrompt,
        parameters: parameters
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取上下文失败');
      }
      
      console.log('✅ RAG上下文获取成功');
      return response.data.context || '暂无相关用户反馈信息';
      
    } catch (error) {
      console.error('获取RAG上下文失败:', error);
      return '获取用户反馈信息时出现错误';
    }
  }

  /**
   * 获取详细的上下文结果（包含查询详情）
   */
  public async getDetailedContextForPromptOptimization(
    originalPrompt: string,
    parameters: DroneParameters
  ): Promise<RAGContextResult> {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      console.log(`🔍 获取详细提示词优化上下文: ${originalPrompt.substring(0, 50)}...`);
      
      const response = await axios.post(`${RAG_API_BASE_URL}/context`, {
        originalPrompt: originalPrompt,
        parameters: parameters
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取上下文失败');
      }
      
      return {
        success: true,
        originalPrompt: originalPrompt,
        context: response.data.context || '暂无相关用户反馈信息',
        queryResults: response.data.queryResults,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('获取详细RAG上下文失败:', error);
      return {
        success: false,
        originalPrompt: originalPrompt,
        context: '获取用户反馈信息时出现错误',
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取系统状态
   */
  public async getSystemStatus(): Promise<RAGSystemStatus> {
    try {
      const response = await axios.get(`${RAG_API_BASE_URL}/status`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || '获取状态失败');
      }
      
      const status = response.data.status;
      
      // 更新本地状态
      this.isInitialized = status.isInitialized;
      this.isReady = status.isReady;
      
      return {
        isInitialized: status.isInitialized,
        isReady: status.isReady,
        totalDocuments: status.totalDocuments,
        totalComments: status.totalComments,
        uniqueProducts: status.uniqueProducts,
        embedModel: status.embedModel
      };
      
    } catch (error) {
      console.error('获取RAG状态失败:', error);
      return {
        isInitialized: false,
        isReady: false,
        totalDocuments: 0,
        totalComments: 0,
        uniqueProducts: 0,
        embedModel: '',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 测试RAG系统连接
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const isHealthy = await this.checkServerHealth();
      
      if (!isHealthy) {
        return {
          success: false,
          message: 'RAG API服务器不可用，请确保Python服务器已启动'
        };
      }
      
      const status = await this.getSystemStatus();
      
      if (status.error) {
        return {
          success: false,
          message: `RAG系统状态异常: ${status.error}`
        };
      }
      
      return {
        success: true,
        message: `RAG系统连接正常 (${status.totalDocuments}个文档, ${status.totalComments}条评论)`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.isInitialized = false;
    this.isReady = false;
    this.initializationPromise = null;
  }
}

// 导出单例实例
export const ragService = RAGService.getInstance(); 