#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
无人机评论RAG知识库系统

这个模块实现了基于LlamaIndex和HuggingFace嵌入模型的RAG（检索增强生成）知识库系统。
主要功能：
1. 从本地JSON文件加载预处理的评论数据
2. 使用中文嵌入模型创建向量索引
3. 提供语义搜索和查询功能
4. 支持相似度检索和元数据过滤

作者: AI Assistant
日期: 2024
"""

import json
import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

# LlamaIndex核心组件
from llama_index.core import Document, VectorStoreIndex, Settings
from llama_index.core.query_engine import BaseQueryEngine
from llama_index.core.response import Response
from llama_index.core.schema import NodeWithScore
from llama_index.core.node_parser import SentenceSplitter

# HuggingFace嵌入模型
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# 其他工具
import jieba
from tqdm import tqdm
import colorama
from colorama import Fore, Style

# 初始化colorama
colorama.init()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DroneCommentRAG:
    """
    无人机评论RAG知识库系统
    
    基于LlamaIndex和HuggingFace实现的检索增强生成系统，
    专门用于处理无人机用户评论数据，为提示词优化提供相关上下文。
    """
    
    def __init__(self, 
                 json_file_path: str = "design_filtered_comments.json",
                 embed_model_name: str = "moka-ai/m3e-base",
                 similarity_top_k: int = 3,
                 chunk_size: int = 2048,  # 增加块大小
                 chunk_overlap: int = 200):
        """
        初始化RAG系统
        
        Args:
            json_file_path: JSON数据文件路径
            embed_model_name: 嵌入模型名称
            similarity_top_k: 检索时返回的最相似文档数量
            chunk_size: 文本块大小
            chunk_overlap: 文本块重叠大小
        """
        self.json_file_path = json_file_path
        self.embed_model_name = embed_model_name
        self.similarity_top_k = similarity_top_k
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # 初始化组件
        self.documents: List[Document] = []
        self.index: Optional[VectorStoreIndex] = None
        self.query_engine: Optional[BaseQueryEngine] = None
        self.embed_model: Optional[HuggingFaceEmbedding] = None
        
        # 统计信息
        self.stats = {
            "total_documents": 0,
            "total_comments": 0,
            "unique_products": set(),
            "avg_text_length": 0
        }
        
    def load_data(self) -> List[Document]:
        """
        从JSON文件加载数据并转换为Document对象
        
        Returns:
            Document对象列表
        """
        print(f"{Fore.CYAN}📁 正在加载数据文件: {self.json_file_path}{Style.RESET_ALL}")
        
        try:
            with open(self.json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"{Fore.GREEN}✅ 成功加载 {len(data)} 条数据记录{Style.RESET_ALL}")
            
            # 转换为Document对象
            print(f"{Fore.CYAN}🔄 正在创建Document对象...{Style.RESET_ALL}")
            
            documents = []
            text_lengths = []
            unique_comments = set()
            unique_products = set()
            
            for item in tqdm(data, desc="处理数据"):
                # 获取文本内容
                text_content = item.get('text_chunk_to_embed', '')
                
                if not text_content or len(text_content.strip()) == 0:
                    continue
                
                # 简化元数据，只保留关键信息
                metadata = item.get('metadata', {})
                simplified_metadata = {
                    'comment_id': metadata.get('comment_id', ''),
                    'product_sku': metadata.get('product_sku_description', '')[:200],  # 限制长度
                    'source_part': metadata.get('source_comment_part', '')[:200],  # 限制长度
                    'chunk_seq': metadata.get('chunk_sequence_in_comment', 0)
                }
                
                # 创建Document对象
                doc = Document(
                    text=text_content,
                    metadata=simplified_metadata
                )
                
                documents.append(doc)
                
                # 统计信息
                text_lengths.append(len(text_content))
                unique_comments.add(metadata.get('comment_id', ''))
                unique_products.add(metadata.get('product_sku_description', ''))
            
            self.documents = documents
            
            # 更新统计信息
            self.stats.update({
                "total_documents": len(documents),
                "total_comments": len(unique_comments),
                "unique_products": unique_products,
                "avg_text_length": sum(text_lengths) / len(text_lengths) if text_lengths else 0
            })
            
            print(f"{Fore.GREEN}✅ 成功创建 {len(documents)} 个Document对象{Style.RESET_ALL}")
            print(f"{Fore.BLUE}📊 数据统计:{Style.RESET_ALL}")
            print(f"   - 独特评论数: {len(unique_comments)}")
            print(f"   - 独特产品数: {len(unique_products)}")
            print(f"   - 平均文本长度: {self.stats['avg_text_length']:.1f} 字符")
            
            return self.documents
            
        except FileNotFoundError:
            raise FileNotFoundError(f"找不到数据文件: {self.json_file_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON文件格式错误: {e}")
        except Exception as e:
            raise RuntimeError(f"加载数据时发生错误: {e}")
    
    def setup_embedding_model(self):
        """
        配置全局嵌入模型设置
        """
        print(f"{Fore.CYAN}🤖 正在配置嵌入模型: {self.embed_model_name}{Style.RESET_ALL}")
        
        try:
            # 创建HuggingFace嵌入模型实例
            embed_model = HuggingFaceEmbedding(
                model_name=self.embed_model_name,
                # 可以添加其他参数，如设备、批处理大小等
                # device="cuda" if torch.cuda.is_available() else "cpu",
                # max_length=512,
            )
            
            # 设置全局嵌入模型
            Settings.embed_model = embed_model
            
            print(f"{Fore.GREEN}✅ 嵌入模型配置完成{Style.RESET_ALL}")
            
        except Exception as e:
            print(f"{Fore.RED}❌ 嵌入模型配置失败: {e}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}💡 尝试使用备用模型: shibing624/text2vec-base-chinese{Style.RESET_ALL}")
            
            # 尝试备用模型
            try:
                embed_model = HuggingFaceEmbedding(
                    model_name="shibing624/text2vec-base-chinese"
                )
                Settings.embed_model = embed_model
                self.embed_model_name = "shibing624/text2vec-base-chinese"
                print(f"{Fore.GREEN}✅ 备用嵌入模型配置完成{Style.RESET_ALL}")
            except Exception as e2:
                raise RuntimeError(f"所有嵌入模型都配置失败: {e2}")
    
    def build_index(self) -> VectorStoreIndex:
        """
        构建向量存储索引
        
        Returns:
            VectorStoreIndex对象
        """
        if not self.documents:
            raise ValueError("请先加载数据")
        
        print(f"{Fore.CYAN}🏗️ 正在构建向量索引...{Style.RESET_ALL}")
        print(f"   - 文档数量: {len(self.documents)}")
        print(f"   - 嵌入模型: {self.embed_model_name}")
        print(f"   - 块大小: {self.chunk_size}")
        
        try:
            # 配置文本分割器
            text_splitter = SentenceSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap
            )
            
            # 使用LlamaIndex构建向量索引
            self.index = VectorStoreIndex.from_documents(
                self.documents,
                transformations=[text_splitter],  # 使用自定义分割器
                show_progress=True  # 显示进度条
            )
            
            print(f"{Fore.GREEN}✅ 向量索引构建完成{Style.RESET_ALL}")
            return self.index
            
        except Exception as e:
            raise RuntimeError(f"构建向量索引时发生错误: {e}")
    
    def create_query_engine(self) -> BaseQueryEngine:
        """
        创建查询引擎
        
        Returns:
            查询引擎对象
        """
        if not self.index:
            raise ValueError("请先构建向量索引")
        
        print(f"{Fore.CYAN}🔍 正在创建查询引擎...{Style.RESET_ALL}")
        
        try:
            # 设置LLM为None，只使用检索功能
            Settings.llm = None
            
            # 创建查询引擎，配置检索参数
            self.query_engine = self.index.as_query_engine(
                similarity_top_k=self.similarity_top_k,
                llm=None,  # 禁用LLM
                # 可以添加其他参数
                # response_mode="compact",  # 响应模式
                # streaming=False,  # 是否流式响应
            )
            
            print(f"{Fore.GREEN}✅ 查询引擎创建完成 (top_k={self.similarity_top_k}){Style.RESET_ALL}")
            return self.query_engine
            
        except Exception as e:
            raise RuntimeError(f"创建查询引擎时发生错误: {e}")
    
    def query(self, question: str) -> Tuple[Response, List[NodeWithScore]]:
        """
        执行查询
        
        Args:
            question: 查询问题
            
        Returns:
            (响应对象, 源节点列表)
        """
        if not self.query_engine:
            raise ValueError("请先创建查询引擎")
        
        print(f"{Fore.CYAN}❓ 查询问题: {question}{Style.RESET_ALL}")
        
        try:
            # 执行查询
            response = self.query_engine.query(question)
            
            # 获取源节点
            source_nodes = response.source_nodes if hasattr(response, 'source_nodes') else []
            
            return response, source_nodes
            
        except Exception as e:
            raise RuntimeError(f"查询时发生错误: {e}")
    
    def display_results(self, response: Response, source_nodes: List[NodeWithScore]):
        """
        显示查询结果
        
        Args:
            response: 查询响应
            source_nodes: 源节点列表
        """
        print(f"\n{Fore.GREEN}🎯 查询结果:{Style.RESET_ALL}")
        print(f"{Fore.WHITE}{response}{Style.RESET_ALL}")
        
        if source_nodes:
            print(f"\n{Fore.BLUE}📚 检索到的相关文档 (共{len(source_nodes)}个):{Style.RESET_ALL}")
            
            for i, node in enumerate(source_nodes, 1):
                print(f"\n{Fore.YELLOW}📄 文档 {i}:{Style.RESET_ALL}")
                
                # 显示文本内容
                content = node.text if hasattr(node, 'text') else node.get_content()
                print(f"   内容: {content}")
                
                # 显示相似度得分
                if hasattr(node, 'score') and node.score is not None:
                    print(f"   相似度: {node.score:.4f}")
                
                # 显示元数据
                if hasattr(node, 'metadata') and node.metadata:
                    print(f"   元数据:")
                    for key, value in node.metadata.items():
                        if key == 'segmented_words':
                            print(f"     {key}: {value[:10]}..." if len(value) > 10 else f"     {key}: {value}")
                        else:
                            value_str = str(value)
                            if len(value_str) > 100:
                                value_str = value_str[:100] + "..."
                            print(f"     {key}: {value_str}")
        else:
            print(f"{Fore.YELLOW}⚠️ 没有找到相关文档{Style.RESET_ALL}")
    
    def initialize_full_system(self):
        """
        初始化完整的RAG系统
        """
        print(f"{Fore.MAGENTA}🚀 初始化无人机评论RAG知识库系统{Style.RESET_ALL}")
        print("=" * 60)
        
        # 1. 加载数据
        self.load_data()
        
        # 2. 配置嵌入模型
        self.setup_embedding_model()
        
        # 3. 构建索引
        self.build_index()
        
        # 4. 创建查询引擎
        self.create_query_engine()
        
        print(f"\n{Fore.GREEN}🎉 RAG系统初始化完成！{Style.RESET_ALL}")
        print("=" * 60)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取系统统计信息
        
        Returns:
            统计信息字典
        """
        return {
            **self.stats,
            "unique_products": len(self.stats["unique_products"]),
            "embed_model": self.embed_model_name,
            "similarity_top_k": self.similarity_top_k,
            "index_built": self.index is not None,
            "query_engine_ready": self.query_engine is not None
        }


def main():
    """
    主函数 - 演示RAG系统的使用
    """
    try:
        # 创建RAG系统实例
        rag_system = DroneCommentRAG(
            json_file_path="design_filtered_comments.json",
            embed_model_name="moka-ai/m3e-base",  # 或者使用 "shibing624/text2vec-base-chinese"
            similarity_top_k=3
        )
        
        # 初始化系统
        rag_system.initialize_full_system()
        
        # 示例查询
        test_questions = [
            "这款无人机的摄像头怎么样？用户主要反馈了哪些优点和缺点？",
            "用户对无人机的操控性和易用性有什么评价？",
            "关于无人机的续航时间，用户有什么反馈？",
            "无人机的稳定性和防抖功能表现如何？",
            "用户对无人机的外观设计和做工质量有什么看法？"
        ]
        
        print(f"\n{Fore.MAGENTA}🧪 开始测试查询功能{Style.RESET_ALL}")
        print("=" * 60)
        
        for question in test_questions:
            print(f"\n{'-' * 40}")
            
            # 执行查询
            response, source_nodes = rag_system.query(question)
            
            # 显示结果
            rag_system.display_results(response, source_nodes)
            
            # 等待用户输入（可选）
            input(f"\n{Fore.CYAN}按回车键继续下一个查询...{Style.RESET_ALL}")
        
        # 显示系统统计信息
        print(f"\n{Fore.MAGENTA}📊 系统统计信息:{Style.RESET_ALL}")
        stats = rag_system.get_stats()
        for key, value in stats.items():
            print(f"   {key}: {value}")
        
        # 交互式查询模式
        print(f"\n{Fore.MAGENTA}💬 进入交互式查询模式 (输入 'quit' 退出):{Style.RESET_ALL}")
        while True:
            user_question = input(f"\n{Fore.CYAN}请输入您的问题: {Style.RESET_ALL}")
            
            if user_question.lower() in ['quit', 'exit', '退出', 'q']:
                break
            
            if user_question.strip():
                try:
                    response, source_nodes = rag_system.query(user_question)
                    rag_system.display_results(response, source_nodes)
                except Exception as e:
                    print(f"{Fore.RED}❌ 查询错误: {e}{Style.RESET_ALL}")
        
        print(f"\n{Fore.GREEN}👋 感谢使用RAG知识库系统！{Style.RESET_ALL}")
        
    except Exception as e:
        print(f"{Fore.RED}❌ 系统错误: {e}{Style.RESET_ALL}")
        logger.exception("详细错误信息:")


if __name__ == "__main__":
    main() 