import type { DroneParameters } from '../types/DroneParameters';
import { RAGService } from './ragService';

// DeepSeek API配置
const DEEPSEEK_API_KEY = 'HISTORICAL_KEY_REMOVED';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// RAG服务实例
const ragService = RAGService.getInstance();

// 优化结果接口
export interface PromptOptimizationResult {
  success: boolean;
  originalPrompt?: string;
  optimizedPrompt?: string;
  structuredPrompt?: string;
  ragContext?: string;
  error?: string;
  timestamp: string;
}

export class DeepSeekPromptOptimizer {
  
  // 生成结构化的优化指令
  private static getOptimizationInstruction(): string {
    return `你是一个专业的无人机视觉描述专家，专门为AI图像生成优化提示词。请严格按照以下格式优化无人机描述：

**输出格式要求：**

1. **Style**
* Overall Design Philosophy: (e.g., Modern minimalist industrial design that visually communicates speed and precision)
* Visual Cues: (e.g., Clean uninterrupted planes, subtle chamfers, no unnecessary ornamentation)
* Material Emphasis: (e.g., Carbon-fiber weave intentionally exposed on arm undersides for a performance cue)

2. **Structural & Functional Elements**
* Frame: (e.g., True X 250 mm wheelbase with 4 mm tapered carbon-fiber arms; internal cable channels reduce drag)
* Motors: (e.g., Vertically mounted brushless motors on CNC-milled aluminum clamp rings for rapid maintenance)
* Propellers: (e.g., 5-inch transparent tri-blade props, orange safety tips increase visibility during spin-up)
* Fuselage: (e.g., Two-plate fuselage (100 × 80 × 30 mm): lower plate = 7075-T6 aluminum spine, upper plate = matte polycarbonate shell)
* Landing Gear: (e.g., Low-profile 40 mm TPU landing skids integrated into arm ends; shallow V-shape disperses impact)

3. **Layout & Ergonomics**
* Component Placement: (e.g., Battery sits flush between plates, C-of-G dead-center for balanced pitch/roll response)
* User Interaction: (e.g., Dual easy-grip handles recessed into side plates; doubles as structural bridge)
* Safety Features: (e.g., All edges (arms, shell, skids) radius ≥ 3 mm for child-safe touch points)

4. **Color Palette**
* Primary: (e.g., #0ea5e9 bright matte blue for polycarbonate shell, handles)
* Accent: (e.g., #ff6a00 vivid orange for prop tips, bumpers, LED diffusers)
* Neutrals: (e.g., satin carbon black #222222 for arms, gunmetal gray #5a5a5a for hardware)

5. **Mood & Visual Language**
* Overall Impression: (e.g., High-tech yet family-friendly: rugged proportions, softened silhouettes, vibrant highlights)
* Specific Cues: (e.g., Convey outdoor readiness with purposeful ribbing, gasket lines and torque-marked fasteners)

6. **Materials & Finish**
* Carbon Fiber: (e.g., 3K twill carbon fiber, 10 GU matte clearcoat)
* Plastics: (e.g., Impact-resistant polycarbonate with fine bead-blast texture 2 µm Ra)
* Hardware: (e.g., Anodized titanium fasteners, color-matched to accents for subtle branding)

7. **Safety & Indicators**
* Lighting: (e.g., 360° diffused LED ring under top plate displays status in blue/orange patterns)
* Markings: (e.g., Prop-edge warning graphics silk-screened on arms; reflective tape inserts for dusk flights)

8. **Studio Presentation**
* Lighting: (e.g., Three-point soft-box lighting: key 45° left, fill 45° right, rim from rear)
* Camera: (e.g., 50 mm, ƒ/8, slight overhead ¾ view to showcase prop plane and fuselage depth)
* Background: (e.g., White seamless backdrop, faint contact shadow to ground the product)

9. **Comprehensive Image Generation Prompt**
* 最终生成一个完整的单行prompt，包含所有技术细节和视觉要求

**重要要求：**
1. 严格按照上述9个部分的格式输出
2. 每个部分都要有具体的技术细节和专业描述
3. 保持原有参数的准确性
4. 使用专业的工业设计和摄影术语
5. 最后的Comprehensive Image Generation Prompt要是一个完整的单行描述
6. 输出必须是英文
7. 结合用户真实反馈信息，确保设计符合用户期望和实际使用体验

请优化以下无人机描述：`;
  }

  // 优化prompt（纯DeepSeek优化，不调用RAG）
  static async optimizePrompt(
    originalPrompt: string, 
    parameters: DroneParameters,
    userProfile?: string
  ): Promise<PromptOptimizationResult> {
    try {
      console.log('🤖 开始使用DeepSeek优化Prompt（纯DeepSeek，不调用RAG）...');
      
      // 1. 构建优化指令
      const instruction = this.getOptimizationInstruction();
      
      // 2. 添加用户画像信息
      const userProfileInfo = userProfile ? `\n\n**用户画像**: ${userProfile}\n请根据此用户画像调整设计风格和重点。` : '';
      
      // 3. 添加参数信息
      const parameterInfo = this.formatParametersForContext(parameters);
      
      // 4. 构建完整prompt（不包含RAG上下文）
      const fullPrompt = `${instruction}${userProfileInfo}\n\n**技术参数参考**:\n${parameterInfo}\n\n**原始描述**:\n${originalPrompt}`;
      
      console.log('📝 发送给DeepSeek的指令长度:', fullPrompt.length);
      console.log('🚫 未调用RAG系统（纯DeepSeek优化）');
      
      // 5. 调用DeepSeek API
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const optimizedText = result.choices[0].message.content.trim();
      
      console.log('✅ DeepSeek优化完成');
      
      // 6. 提取简化的prompt（查找最后的单行prompt）
      const lines = optimizedText.split('\n');
      let simplifiedPrompt = '';
      
      // 查找Comprehensive Image Generation Prompt部分
      let foundComprehensiveSection = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 找到Comprehensive Image Generation Prompt标题
        if (line.includes('Comprehensive Image Generation Prompt') || line.includes('9.')) {
          foundComprehensiveSection = true;
          continue;
        }
        
        // 如果找到了该部分，查找下一个非空的内容行
        if (foundComprehensiveSection && line && !line.startsWith('*') && !line.startsWith('#') && line.length > 50) {
          simplifiedPrompt = line;
          break;
        }
      }
      
      // 如果没有找到Comprehensive部分，尝试查找最后一个长句子
      if (!simplifiedPrompt) {
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line && !line.startsWith('*') && !line.startsWith('#') && !line.includes(':') && line.length > 100) {
            simplifiedPrompt = line;
            break;
          }
        }
      }
      
      // 如果还是没有找到，使用原始prompt
      if (!simplifiedPrompt) {
        simplifiedPrompt = originalPrompt;
      }
      
      return {
        success: true,
        originalPrompt,
        optimizedPrompt: simplifiedPrompt,
        structuredPrompt: optimizedText,
        ragContext: '未使用RAG（纯DeepSeek优化）',
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error('❌ DeepSeek优化失败:', error);
      
      let errorMessage = 'Prompt优化失败';
      if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        originalPrompt,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 优化prompt（集成RAG知识库）- 仅供"AI智能优化"按钮使用
  static async optimizePromptWithRAG(
    originalPrompt: string, 
    parameters: DroneParameters,
    userProfile?: string
  ): Promise<PromptOptimizationResult> {
    try {
      console.log('🤖 开始使用DeepSeek+RAG优化Prompt...');
      
      // 1. 首先获取RAG上下文信息
      console.log('🔍 正在获取用户反馈上下文...');
      let ragContext = '';
      try {
        ragContext = await ragService.getContextForPromptOptimization(originalPrompt, parameters);
        console.log('✅ RAG上下文获取成功，长度:', ragContext.length);
      } catch (ragError) {
        console.warn('⚠️ RAG上下文获取失败，继续使用基础优化:', ragError);
        ragContext = '暂无相关用户反馈信息';
      }
      
      // 2. 构建优化指令
      const instruction = this.getOptimizationInstruction();
      
      // 3. 添加用户画像信息
      const userProfileInfo = userProfile ? `\n\n**用户画像**: ${userProfile}\n请根据此用户画像调整设计风格和重点。` : '';
      
      // 4. 添加参数信息
      const parameterInfo = this.formatParametersForContext(parameters);
      
      // 5. 添加RAG上下文信息
      const ragContextInfo = ragContext ? `\n\n**用户真实反馈上下文**:\n${ragContext}\n\n请特别注意用户反馈中提到的优点和缺点，在设计描述中强化优点，改进缺点相关的设计元素。` : '';
      
      const fullPrompt = `${instruction}${userProfileInfo}\n\n**技术参数参考**:\n${parameterInfo}${ragContextInfo}\n\n**原始描述**:\n${originalPrompt}`;
      
      console.log('📝 发送给DeepSeek的指令长度:', fullPrompt.length);
      console.log('📊 RAG上下文长度:', ragContext.length);
      
      // 6. 调用DeepSeek API
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const optimizedText = result.choices[0].message.content.trim();
      
      console.log('✅ DeepSeek+RAG优化完成');
      
      // 7. 提取简化的prompt（查找最后的单行prompt）
      const lines = optimizedText.split('\n');
      let simplifiedPrompt = '';
      
      // 查找Comprehensive Image Generation Prompt部分
      let foundComprehensiveSection = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 找到Comprehensive Image Generation Prompt标题
        if (line.includes('Comprehensive Image Generation Prompt') || line.includes('9.')) {
          foundComprehensiveSection = true;
          continue;
        }
        
        // 如果找到了该部分，查找下一个非空的内容行
        if (foundComprehensiveSection && line && !line.startsWith('*') && !line.startsWith('#') && line.length > 50) {
          simplifiedPrompt = line;
          break;
        }
      }
      
      // 如果没有找到Comprehensive部分，尝试查找最后一个长句子
      if (!simplifiedPrompt) {
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line && !line.startsWith('*') && !line.startsWith('#') && !line.includes(':') && line.length > 100) {
            simplifiedPrompt = line;
            break;
          }
        }
      }
      
      // 如果还是没有找到，使用原始prompt
      if (!simplifiedPrompt) {
        simplifiedPrompt = originalPrompt;
      }
      
      return {
        success: true,
        originalPrompt,
        optimizedPrompt: simplifiedPrompt,
        structuredPrompt: optimizedText,
        ragContext: ragContext,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error('❌ DeepSeek+RAG优化失败:', error);
      
      let errorMessage = 'Prompt优化失败';
      if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        originalPrompt,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // 格式化参数信息供DeepSeek参考
  private static formatParametersForContext(parameters: DroneParameters): string {
    const { frame, propulsion, fuselage, landing_gear, accessories } = parameters;
    
    return `
机架: ${frame.frame_type}, ${frame.wheelbase_mm}mm轴距, ${frame.arm_thickness_mm}mm臂厚, ${frame.material_visual}材质
动力: ${propulsion.prop_diameter_inch}英寸螺旋桨, ${propulsion.prop_blade_count}叶片, 电机倾角${propulsion.motor_tilt_degree}°
机身: ${fuselage.fuselage_style}样式, 尺寸${fuselage.fuselage_dimensions_mm.length}×${fuselage.fuselage_dimensions_mm.width}×${fuselage.fuselage_dimensions_mm.height}mm
起落架: ${landing_gear.landing_gear_style}, 高度${landing_gear.landing_gear_height_mm}mm
配件: ${accessories.has_camera_gimbal ? '含相机云台' : '无相机'}, 主色调${accessories.drone_primary_color}
自定义: ${accessories.custom_prompt_additions || '无'}`;
  }
  
  // 验证API密钥
  static async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('DeepSeek API密钥验证失败:', error);
      return false;
    }
  }
  
  // 获取模型信息
  static getModelInfo(): { model: string; apiKey: string } {
    return {
      model: 'deepseek-chat',
      apiKey: DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.substring(0, 8)}...` : '未设置'
    };
  }
  
  // 获取RAG状态
  static async getRAGStatus() {
    try {
      return await ragService.getSystemStatus();
    } catch (error: any) {
      console.error('获取RAG状态失败:', error);
      return {
        isInitialized: false,
        isReady: false,
        totalDocuments: 0,
        totalComments: 0,
        uniqueProducts: 0,
        embedModel: 'unknown',
        error: error.message
      };
    }
  }
  
  // 初始化RAG系统
  static async initializeRAG() {
    try {
      await ragService.initialize();
      return { success: true, message: 'RAG系统初始化成功' };
    } catch (error: any) {
      console.error('RAG系统初始化失败:', error);
      return { success: false, message: error.message };
    }
  }
} 