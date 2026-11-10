# 无人机造型配置器 · 历史源码与接续入口

这是作者找回的 React / TypeScript 参数配置器公开副本。想接着改原型，请先读[作者讨论与首轮改动要求](../../docs/configurator-realignment.md)，再看[最初的功能需求](original-design-brief.md)。[原版 README](README.historical.md) 和目录中的旧指南作为开发历史保留。实际按钮调用什么服务，以源码为准。

| 要理解的问题 | 从这里读 |
|---|---|
| 设计者可以决定什么 | [五组部件参数](src/types/DroneParameters.ts)、[初始规格](src/store/droneStore.ts)、[用户画像和附加要求](src/components/Parameters/AccessoriesParameters.tsx) |
| 俯视小图怎样随参数变化 | [界面预览组件](src/components/DevPreview/InterfacePreview.tsx)。这版绘制的是示意图。可计算轴位及定位图的实现另见[桌面版几何模块](../../experiments/desktop-parameter-v2/README.md)。 |
| 九段设计描述从何而来 | [Gemini 的九段模板](src/services/geminiPromptOptimizer.ts)、[DeepSeek 的对应模板](src/services/deepseekPromptOptimizer.ts)。[提示词面板](src/components/DevPreview/PromptGenerator.tsx)还生成不同长度的描述。 |
| 评论怎样影响设计 | [片段与索引](rag_knowledge_base.py)、[检索接口](rag_api_server.py)、[按画像与参数检索和改写](src/services/ragOptimizationService.ts)。私有语料由原数据持有人管理。 |
| 预览与最终提交能否对得上 | 从 [App 的两个按钮](src/App.tsx) 跟到[实际图像请求](src/services/imageGenerationService.ts)，另看[配件面板写回附加文本](src/components/Parameters/AccessoriesParameters.tsx)。 |

### 本地查看

在本目录使用锁文件安装依赖，再启动本地界面。只查看前端布局和参数不需要模型密钥。

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run dev -- --host 127.0.0.1
```

公开副本移除了源码和旧指南里的密钥字面量及私人图像代理地址。占位值不提供模型服务。原始评论 JSON、环境文件、依赖目录和运行缓存不随仓库分发。请勿在前端源码或 Vite 环境变量中填入服务端密钥。后续如接模型，凭据保存在服务端，前端仅提交已确认的设计请求。`start_system.py`、`test_image_generation.py` 和原启动指南记录旧外部服务路径，不属于离线预览步骤。


### 本次交接的离线验证

公开副本使用原机器已有的依赖完成 Vite 打包，22 个直接依赖的安装版本与锁文件一致。Chrome 在禁止外部域名访问时加载了打包首页，五个部件页签以及预览、生成两个按钮均出现在页面中。5 个 Python 文件通过语法解析。未提交模型请求，评论检索服务也未联机运行。

完整的 `npm run build` 含 TypeScript 严格检查。原件与公开副本均有 16 条未使用项诊断（15 条 TS6133，1 条 TS6192），当前未通过该检查。此次从注册表全新安装曾遇到连接中断，跨设备全新安装仍待复验。Claude 可在首个修改 PR 中清理未用项并按原命令重验。
