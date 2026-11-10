# 无人机设计配置器使用指南

## 系统组件

系统包含以下主要组件：
1. 前端界面（React + TypeScript）
2. RAG知识库服务（Python）
3. 图像生成服务（Python）

## 启动步骤

### 1. 启动前端开发服务器
```bash
# 在项目根目录下运行
npm install  # 首次运行需要安装依赖
npm run dev  # 启动开发服务器
```

### 2. 启动RAG知识库服务
```bash
# 在项目根目录下运行
python init_rag.py  # 初始化RAG系统
python rag_api_server.py  # 启动RAG API服务
```

### 3. 启动图像生成服务
```bash
# 在项目根目录下运行
python test_image_generation.py  # 测试图像生成服务
```

## 测试脚本说明

### 核心测试文件
- `test_image_generation.py`: 图像生成服务测试
- `rag_api_server.py`: RAG知识库服务
- `init_rag.py`: RAG系统初始化

### 已删除的冗余文件
- test_rag_direct.py
- test_api_call.py
- final_test.py
- test_rag_system.py
- start_rag_system.py

## 环境要求

1. Node.js环境
   - Node.js 16+
   - npm 8+

2. Python环境
   - Python 3.8+
   - 依赖包：见 requirements_rag.txt

3. API密钥
   - GPT-4 Vision API: HISTORICAL_KEY_REMOVED
   - 其他API密钥在环境变量中配置

## 使用流程

1. 启动所有服务
2. 访问前端界面（默认 http://localhost:5173）
3. 配置无人机参数
4. 使用AI智能优化功能
5. 生成无人机设计图像

## 注意事项

1. 确保所有服务都正常运行
2. 检查API密钥是否正确配置
3. 确保RAG知识库已正确初始化
4. 图像生成可能需要较长时间，请耐心等待

## 故障排除

1. 如果前端无法连接后端服务，检查端口是否被占用
2. 如果RAG服务无法启动，检查Python环境和依赖
3. 如果图像生成失败，检查API密钥和网络连接

## 更新日志

### 最新更新
- 更新图像生成为GPT-4 Vision
- 更新API密钥
- 清理冗余测试文件
- 优化系统启动流程 