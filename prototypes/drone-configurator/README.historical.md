# 🚁 无人机造型参数化AI生图应用

一个强大的无人机设计配置器，让用户通过直观的界面调整无人机参数，并生成高质量的AI绘图提示词。

## ✨ 核心功能

- **📐 完整参数配置**: 机架、动力、机身、起落架、配件等全方位配置
- **👤 用户画像系统**: 新手玩家、摄影爱好者、户外用户三大画像
- **🤖 AI智能优化**: DeepSeek API驱动的提示词智能优化
- **📱 实时可视化**: 无人机配置的实时2D预览
- **✍️ 智能Prompt生成**: 多版本提示词生成，直接适用于AI绘图工具

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: Tailwind CSS
- **状态管理**: Zustand
- **图标**: Lucide React
- **AI服务**: DeepSeek API

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 📁 项目结构

```
src/
├── components/
│   ├── Parameters/          # 参数配置组件
│   │   ├── FrameParameters.tsx
│   │   ├── PropulsionParameters.tsx
│   │   ├── FuselageParameters.tsx
│   │   ├── LandingGearParameters.tsx
│   │   └── AccessoriesParameters.tsx
│   ├── DevPreview/          # 预览组件
│   │   ├── InterfacePreview.tsx
│   │   ├── ImagePreview.tsx
│   │   ├── PromptGenerator.tsx
│   │   └── ParameterOverview.tsx
│   └── Layout/              # 布局组件
│       ├── Header.tsx
│       └── Footer.tsx
├── services/                # 服务层
│   └── api.ts              # API服务和AI优化
├── store/                   # 状态管理
│   └── droneStore.ts       # Zustand状态管理
├── types/                   # 类型定义
│   └── DroneParameters.ts  # TypeScript类型
└── styles/                  # 样式文件
    └── index.css           # Tailwind CSS配置
```

## 🎯 主要特性详解

### 参数配置系统
- **机架参数**: 6种机架类型，轴距100-500mm可调
- **动力系统**: 螺旋桨直径、叶片数量、电机倾角
- **机身设计**: 4种样式，精确尺寸控制
- **起落架**: 3种类型，高度可调
- **配件系统**: 相机云台、颜色选择、提示词输入

### 用户画像优化
- **🎮 新手玩家**: 安全易用，明亮色彩
- **📸 摄影爱好者**: 专业稳定，精密控制
- **🏕️ 户外/亲子**: 耐用防护，家庭友好

### AI智能生成
- **最终版本Prompt**: 整合所有配置的完整描述
- **多版本支持**: 详细、简化、技术规格三个版本
- **一键操作**: 复制到剪贴板或下载为文件

## 🔧 配置说明

### 环境变量
```bash
VITE_API_BASE_URL=http://localhost:8000  # 后端API地址
```

### 启动脚本
项目提供了批处理启动脚本：
```bash
./start-dev.bat  # Windows启动脚本
```

## 📈 开发状态

**当前版本**: v1.0  
**完成度**: 96%  
**状态**: 前端开发完成，待后端集成

详细开发报告请查看：[FRONTEND_DEVELOPMENT_REPORT.md](./FRONTEND_DEVELOPMENT_REPORT.md)

## 🎨 界面预览

- **参数配置界面**: 直观的选项卡式参数设置
- **实时预览**: 2D无人机配置可视化
- **Prompt生成器**: 智能提示词生成和优化
- **响应式设计**: 支持桌面和移动设备

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🚀 下一步计划

- [ ] 后端API集成
- [ ] 预设配置系统
- [ ] 用户引导功能
- [ ] 性能优化
- [ ] 测试覆盖完善

---

**让AI为您的无人机设计插上翅膀！** ✈️
