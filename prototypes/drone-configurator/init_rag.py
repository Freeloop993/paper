#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAG系统初始化脚本
"""

import requests
import time

def initialize_rag():
    """初始化RAG系统"""
    print("🚀 正在初始化RAG系统...")
    
    try:
        response = requests.post("http://127.0.0.1:5000/api/initialize", timeout=300)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ RAG系统初始化成功！")
            print(f"📊 {result}")
            return True
        else:
            print(f"❌ 初始化失败: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 初始化过程中出错: {e}")
        return False

if __name__ == "__main__":
    success = initialize_rag()
    if success:
        print("\n🎉 现在可以使用前端的AI智能优化功能了！")
    else:
        print("\n⚠️ 初始化失败，请检查后端服务状态") 