# 无人机造型配置器

[Claude 接手界面优化：阅读清单、已核实的依据和第一轮验收](claude-interface-brief.md)

这是作者 E 盘恢复的五页签 React / TypeScript 配置器，作为后续优化的源码起点。

[下载离线版 ZIP](configurator-offline.zip?raw=true)。完整解压后用浏览器打开包内的 `index.html`。在「机架」「动力」「机身」「起落架」「配件」中选择参数，可查看示意图、导出配置 JSON，并在「Prompt生成器」下载对应文本。「机身」页可调长、宽、高，外壳造型留给设计者决定。

## 源码入口

| 要修改的内容 | 文件 |
| --- | --- |
| 主界面、页签顺序 | [App.tsx](src/App.tsx) |
| 部件选项、默认参数 | [五组部件面板](src/components/Parameters/)、[参数状态](src/store/droneStore.ts) |
| 参数示意与文本导出 | [预览组件](src/components/DevPreview/InterfacePreview.tsx)、[提示词生成器](src/components/DevPreview/PromptGenerator.tsx) |
| 早期评论检索实现 | [知识库](rag_knowledge_base.py)、[本地服务](rag_api_server.py) |

在本目录执行 `npm ci`，再执行 `npm run dev` 可编辑预览。`npm run build` 执行 TypeScript 检查并生成 `dist/index.html`。离线包取自 E 盘封存的可运行版本；模型生图和向量检索目前均停用。

[最初的功能需求](original-design-brief.md)与[历史说明](README.historical.md)记录早期构想。已有实验的条件图见[图像和参数](public/research-guides/)。私有原始评论和本机服务配置由作者另行保存。
