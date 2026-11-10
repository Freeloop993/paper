#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
无人机RAG知识库系统 - 统一启动脚本
"""

import sys
import os
import time
import threading
import webbrowser
from rag_api_server import app

def print_banner():
    """打印启动横幅"""
    print("🚁" + "=" * 58 + "🚁")
    print("    无人机造型参数化AI生图应用 - RAG知识库系统")
    print("    Drone Design AI Image Generation - RAG System")
    print("🚁" + "=" * 58 + "🚁")

def check_system():
    """快速系统检查"""
    print("🔍 系统检查中...")
    
    # 检查数据文件
    if not os.path.exists("design_filtered_comments.json"):
        print("❌ 数据文件缺失: design_filtered_comments.json")
        return False
    
    # 检查核心模块
    try:
        from rag_knowledge_base import DroneCommentRAG
        print("✅ 核心模块检查通过")
        return True
    except ImportError as e:
        print(f"❌ 模块导入失败: {e}")
        return False

def start_api_server():
    """启动API服务器"""
    print("🚀 启动RAG API服务器...")
    print("📡 服务地址: http://127.0.0.1:5000")
    print("📚 可用接口:")
    print("   - GET  /api/health     - 健康检查")
    print("   - POST /api/initialize - 初始化系统")
    print("   - POST /api/query      - 执行查询")
    print("   - POST /api/context    - 获取优化上下文")
    print("\n⚠️  首次启动需要初始化，请耐心等待...")
    print("🌐 系统启动后会自动打开浏览器")
    print("⏹️  按 Ctrl+C 停止服务")
    print("-" * 60)
    
    # 延迟打开浏览器
    def open_browser():
        time.sleep(3)
        try:
            webbrowser.open("http://127.0.0.1:5000/api/health")
        except:
            pass
    
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # 启动Flask应用
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=False,
        threaded=True
    )

def main():
    """主函数"""
    print_banner()
    
    # 系统检查
    if not check_system():
        print("\n❌ 系统检查失败，请检查环境配置")
        sys.exit(1)
    
    try:
        # 启动API服务器
        start_api_server()
        
    except KeyboardInterrupt:
        print("\n\n👋 系统已停止，感谢使用！")
    except Exception as e:
        print(f"\n❌ 启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 