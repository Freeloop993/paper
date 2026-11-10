#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAG知识库API服务器

这个Flask应用提供RESTful API接口，用于与前端TypeScript应用交互。
主要功能：
1. 初始化RAG系统
2. 提供查询接口
3. 返回系统状态
4. 处理跨域请求

运行方式：
python rag_api_server.py

API端点：
- GET /api/status - 获取系统状态
- POST /api/initialize - 初始化RAG系统
- POST /api/query - 执行查询
- POST /api/context - 获取提示词优化上下文
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
import traceback
from typing import Dict, Any, List
import threading
import time

# 导入我们的RAG系统
from rag_knowledge_base import DroneCommentRAG

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)
CORS(app)  # 启用跨域支持

# 全局RAG系统实例
rag_system: DroneCommentRAG = None
initialization_lock = threading.Lock()

def create_rag_system():
    """创建RAG系统实例"""
    global rag_system
    try:
        rag_system = DroneCommentRAG(
            json_file_path="design_filtered_comments.json",
            embed_model_name="moka-ai/m3e-base",
            similarity_top_k=3
        )
        logger.info("RAG系统实例创建成功")
        return True
    except Exception as e:
        logger.error(f"创建RAG系统失败: {e}")
        return False

def initialize_rag_system():
    """初始化RAG系统"""
    global rag_system
    with initialization_lock:
        if rag_system is None:
            if not create_rag_system():
                return False
        
        try:
            rag_system.initialize_full_system()
            logger.info("RAG系统初始化完成")
            return True
        except Exception as e:
            logger.error(f"RAG系统初始化失败: {e}")
            return False

@app.route('/api/status', methods=['GET'])
def get_status():
    """获取系统状态"""
    try:
        if rag_system is None:
            return jsonify({
                'success': True,
                'status': {
                    'isInitialized': False,
                    'isReady': False,
                    'totalDocuments': 0,
                    'totalComments': 0,
                    'uniqueProducts': 0,
                    'embedModel': '',
                    'error': '系统未初始化'
                }
            })
        
        stats = rag_system.get_stats()
        
        return jsonify({
            'success': True,
            'status': {
                'isInitialized': rag_system.index is not None,
                'isReady': rag_system.query_engine is not None,
                'totalDocuments': stats['total_documents'],
                'totalComments': stats['total_comments'],
                'uniqueProducts': stats['unique_products'],
                'embedModel': stats['embed_model'],
                'similarityTopK': stats['similarity_top_k']
            }
        })
        
    except Exception as e:
        logger.error(f"获取状态失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/initialize', methods=['POST'])
def initialize():
    """初始化RAG系统"""
    try:
        logger.info("开始初始化RAG系统...")
        
        success = initialize_rag_system()
        
        if success:
            stats = rag_system.get_stats()
            return jsonify({
                'success': True,
                'message': 'RAG系统初始化成功',
                'stats': stats
            })
        else:
            return jsonify({
                'success': False,
                'error': 'RAG系统初始化失败'
            }), 500
            
    except Exception as e:
        logger.error(f"初始化失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/query', methods=['POST'])
def query():
    """执行RAG查询"""
    try:
        # 检查系统是否已初始化
        if rag_system is None or rag_system.query_engine is None:
            return jsonify({
                'success': False,
                'error': '系统未初始化，请先调用 /api/initialize'
            }), 400
        
        # 获取请求数据
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必要参数: question'
            }), 400
        
        question = data['question']
        logger.info(f"执行查询: {question}")
        
        # 执行查询
        response, source_nodes = rag_system.query(question)
        
        # 格式化源文档
        source_documents = []
        for node in source_nodes:
            source_doc = {
                'content': node.text if hasattr(node, 'text') else node.get_content(),
                'similarity': float(node.score) if hasattr(node, 'score') and node.score is not None else 0.0,
                'metadata': node.metadata if hasattr(node, 'metadata') else {}
            }
            source_documents.append(source_doc)
        
        return jsonify({
            'success': True,
            'query': question,
            'response': str(response),
            'sourceDocuments': source_documents,
            'timestamp': time.time()
        })
        
    except Exception as e:
        logger.error(f"查询失败: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/context', methods=['POST'])
def get_context():
    """获取提示词优化上下文"""
    try:
        # 检查系统是否已初始化
        if rag_system is None or rag_system.query_engine is None:
            return jsonify({
                'success': False,
                'error': '系统未初始化，请先调用 /api/initialize'
            }), 400
        
        # 获取请求数据
        data = request.get_json()
        if not data or 'originalPrompt' not in data or 'parameters' not in data:
            return jsonify({
                'success': False,
                'error': '缺少必要参数: originalPrompt, parameters'
            }), 400
        
        original_prompt = data['originalPrompt']
        parameters = data['parameters']
        
        logger.info(f"获取上下文，原始提示词: {original_prompt[:50]}...")
        
        # 生成相关查询
        queries = generate_queries_from_parameters(parameters, original_prompt)
        queries.append(f"关于'{original_prompt}'，用户有什么相关的评价和反馈？")
        
        # 执行查询并收集结果
        results = []
        for query in queries[:3]:  # 限制查询数量
            try:
                response, source_nodes = rag_system.query(query)
                if source_nodes:
                    result_info = {
                        'query': query,
                        'response': str(response),
                        'topDocument': {
                            'content': source_nodes[0].text if hasattr(source_nodes[0], 'text') else source_nodes[0].get_content(),
                            'metadata': source_nodes[0].metadata if hasattr(source_nodes[0], 'metadata') else {}
                        }
                    }
                    results.append(result_info)
            except Exception as query_error:
                logger.warning(f"查询失败: {query} - {query_error}")
                continue
        
        # 格式化上下文
        context_parts = []
        for result in results:
            context_parts.append(f"查询: {result['query']}")
            context_parts.append(f"回答: {result['response']}")
            if 'source_comment_part' in result['topDocument']['metadata']:
                context_parts.append(f"用户原始评论: \"{result['topDocument']['metadata']['source_comment_part']}\"")
            context_parts.append("---")
        
        context = '\n\n'.join(context_parts)
        
        return jsonify({
            'success': True,
            'originalPrompt': original_prompt,
            'context': context or '暂无相关用户反馈信息',
            'queryResults': results,
            'timestamp': time.time()
        })
        
    except Exception as e:
        logger.error(f"获取上下文失败: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def generate_queries_from_parameters(parameters: Dict[str, Any], original_prompt: str = "") -> List[str]:
    """根据无人机参数和原始提示词生成相关查询"""
    queries = []
    
    try:
        # 提取原始提示词中的关键词
        prompt_keywords = []
        if original_prompt:
            # 简单的关键词提取（可以后续优化为更智能的NLP处理）
            keywords = original_prompt.lower().replace(',', ' ').split()
            prompt_keywords = [kw.strip() for kw in keywords if len(kw.strip()) > 2]
        
        # 基于原始提示词生成查询
        if original_prompt:
            queries.append(f"用户对包含'{original_prompt}'特征的无人机有什么评价和反馈？")
            
            # 如果提示词包含特定关键词，生成相关查询
            if any(kw in original_prompt.lower() for kw in ['racing', '赛车', 'stripe', '条纹']):
                queries.append("用户对运动型或赛车风格无人机的外观设计有什么看法？")
            if any(kw in original_prompt.lower() for kw in ['led', 'light', '灯', '照明']):
                queries.append("用户对带LED灯光效果的无人机有什么使用体验？")
            if any(kw in original_prompt.lower() for kw in ['carbon', '碳纤维', 'fiber']):
                queries.append("用户对碳纤维材质无人机的质量和外观有什么评价？")
            if any(kw in original_prompt.lower() for kw in ['professional', '专业', 'pro']):
                queries.append("用户对专业级无人机的性能和功能有什么反馈？")
        
        # 机架参数相关查询
        frame = parameters.get('frame', {})
        if frame.get('frame_type'):
            frame_type = frame['frame_type']
            queries.append(f"用户对{frame_type}机架类型的无人机稳定性和操控性有什么评价？")
            
            # 根据轴距生成查询
            wheelbase = frame.get('wheelbase_mm', 0)
            if wheelbase > 0:
                if wheelbase < 200:
                    queries.append("用户对小型无人机的便携性和操控体验有什么反馈？")
                elif wheelbase > 300:
                    queries.append("用户对大型无人机的稳定性和载重能力有什么评价？")
                else:
                    queries.append("用户对中型无人机的平衡性和实用性有什么看法？")
        
        # 动力系统参数相关查询
        propulsion = parameters.get('propulsion', {})
        prop_diameter = propulsion.get('prop_diameter_inch', 0)
        if prop_diameter > 0:
            if prop_diameter >= 6:
                queries.append("用户对大螺旋桨无人机的飞行性能和噪音水平有什么反馈？")
            else:
                queries.append("用户对小螺旋桨无人机的灵活性和续航能力有什么评价？")
        
        # 机身风格相关查询
        fuselage = parameters.get('fuselage', {})
        fuselage_style = fuselage.get('fuselage_style', '')
        if fuselage_style:
            if 'minimalist' in fuselage_style.lower() or '简约' in fuselage_style:
                queries.append("用户对简约风格无人机设计的美观性和实用性有什么看法？")
            elif 'racing' in fuselage_style.lower() or '竞速' in fuselage_style:
                queries.append("用户对竞速型无人机的外观设计和性能表现有什么评价？")
        
        # 配件功能相关查询
        accessories = parameters.get('accessories', {})
        if accessories.get('has_camera_gimbal'):
            queries.append("用户对无人机摄像头和云台功能的画质、稳定性有什么具体评价？")
        else:
            queries.append("用户对纯飞行无人机（无摄像功能）的操控乐趣有什么反馈？")
        
        # 颜色相关查询
        color = accessories.get('drone_primary_color', '')
        if color:
            if color in ['#000000', '#1e293b']:  # 黑色系
                queries.append("用户对黑色或深色无人机的外观质感和专业感有什么评价？")
            elif color in ['#ffffff', '#f8fafc']:  # 白色系
                queries.append("用户对白色无人机的清洁度维护和视觉效果有什么看法？")
            elif color in ['#0ea5e9', '#3b82f6']:  # 蓝色系
                queries.append("用户对蓝色无人机的外观吸引力和辨识度有什么反馈？")
            else:
                queries.append("用户对彩色无人机的个性化外观和视觉冲击力有什么评价？")
        
        # 根据参数组合生成综合查询
        if accessories.get('has_camera_gimbal') and prop_diameter >= 5:
            queries.append("用户对中大型摄影无人机的整体性能和拍摄体验有什么综合评价？")
        
        # 确保至少有一些基础查询
        if len(queries) < 3:
            queries.extend([
                '用户对无人机的整体设计和制造质量有什么反馈？',
                '用户最常提到的无人机使用优点和改进建议是什么？',
                '用户对无人机的性价比和购买体验有什么评价？'
            ])
        
        # 限制查询数量并去重
        unique_queries = list(dict.fromkeys(queries))  # 去重但保持顺序
        return unique_queries[:5]  # 最多返回5个查询
        
    except Exception as e:
        logger.warning(f"生成查询时出错: {e}")
        # fallback查询
        fallback_queries = [
            f"用户对'{original_prompt}'相关的无人机特征有什么评价？" if original_prompt else "用户对无人机有什么整体评价？",
            '用户对无人机的设计和性能有什么反馈？',
            '用户最关心的无人机功能和特性是什么？'
        ]
        return fallback_queries

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'success': True,
        'message': 'RAG API服务器运行正常',
        'timestamp': time.time()
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': '接口不存在'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': '服务器内部错误'
    }), 500

if __name__ == '__main__':
    logger.info("启动RAG API服务器...")
    
    # 可选：在启动时预初始化系统
    # initialize_rag_system()
    
    # 启动Flask应用
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True,
        threaded=True
    ) 