# 无人机造型配置器

作者 E 盘恢复的五页签 React / TypeScript 配置器。设计者在这里把一次设计的想法整理成规格：先说想要什么感觉，再在「机架」「动力」「机身」「起落架」「配件」五个页签里选择和拖动，最后核对并导出条件图、提示词和规格。

[下载离线版 ZIP](configurator-offline.zip?raw=true)，完整解压后用浏览器打开包内的 `index.html`，不需要联网，也不需要启动服务。模型生图和评论检索目前没有接入。

- [第二轮交接报告：这一版怎么来的、实测结果、还没验证的](review/20261118-round2/README.md)
- [界面设计说明：每一块为什么这样放，与论文方法怎样对应](interface-design.md)
- [论文正文与实际进度的对照](review/20261118-round2/thesis-alignment.md)
- [最初的功能需求](original-design-brief.md) · [Claude 接手时的阅读清单](claude-interface-brief.md)

## 页面从上到下

| 区块 | 做什么 |
| --- | --- |
| ① 设计意图 | 四组词对（紧凑—舒展、简洁—繁复、整体—拼凑、低调—醒目）各选一端或都不选，也可以写一句自己的话。「看看用户怎么说」打开 36 条整理过的评论依据，觉得合适就采纳；采纳只记依据，不改参数。 |
| ② 部件参数 | 五个页签。尺寸和构型用选项按钮与滑块；造型项（臂根、材料、机身轮廓、顶盖、相机安装、主色、表面）都可以选「不指定」，留给后续设计。改过的参数旁边有「重置」。 |
| 预览（右侧，随页面停留） | 顶视示意、将要导出的条件图、侧视三种视图，下方是四个比例：横纵比 W/L、桨径 ÷ 轴距、机身宽 ÷ 轴距、机身长 ÷ 宽。「对比」可以记下当前方案，再改参数时叠着看。 |
| ③ 确认与导出 | 左边是自动写成的提示词，刚改动的句子标黄，可展开逐句来源；右边是造型规格卡和「导出三件」（条件图 PNG、提示词 TXT、规格 JSON，同一时间戳）。规格 JSON 可以读回来接着改。 |

航拍相机装在机头、朝正前方。俯视时镜头会被机鼻挡住：顶视示意用紫色虚线标出它的位置，「侧视」里能看到它和朝前的视线；不会把镜片画在机背上。

## 源码入口

| 要修改的内容 | 文件 |
| --- | --- |
| 页面结构、页签顺序、宽屏与窄屏 | [App.tsx](src/App.tsx) |
| 五组部件面板与共用控件 | [Parameters/](src/components/Parameters/)、[controls.tsx](src/components/controls/controls.tsx) |
| 设计意图与评论依据抽屉 | [IntentCard.tsx](src/components/Intent/IntentCard.tsx)、[EvidenceDrawer.tsx](src/components/Intent/EvidenceDrawer.tsx) |
| 预览（顶视、条件图、侧视、比例、对比） | [InterfacePreview.tsx](src/components/DevPreview/InterfacePreview.tsx) |
| 提示词面板 | [PromptGenerator.tsx](src/components/DevPreview/PromptGenerator.tsx) |
| 造型规格卡与导出 | [ParameterOverview.tsx](src/components/Overview/ParameterOverview.tsx) |
| 轴心几何、构型画法与依据、条件图 | [design.ts](src/design/design.ts) |
| 每个选项的名称、短语和参考数值 | [fields.ts](src/design/fields.ts) |
| 提示词逐句编译与检查 | [partPrompt.ts](src/design/partPrompt.ts) |
| 导出与读入 | [exporters.ts](src/design/exporters.ts) |
| 状态、撤销、对比、设计意图 | [droneStore.ts](src/store/droneStore.ts) |
| 评论依据数据 | [evidenceCards.json](src/data/evidenceCards.json)，由 `npm run evidence` 从 `evidence/semantic-cards/cards.csv` 生成 |
| 早期评论检索与模型服务（停用，未改动） | [知识库](rag_knowledge_base.py)、[本地服务](rag_api_server.py)、`src/services/` |

## 命令

在本目录执行 `npm ci` 后：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本机编辑预览 |
| `npm run build` | TypeScript 检查并生成 `dist/index.html` |
| `npm run package-offline` | 重新构建并打包 `configurator-offline.zip` |
| `npm run walkthrough` | 用无界面 Chrome 打开离线构建，按真实点击走完一遍流程，保存浏览器实际下载的导出件、屏幕读数和截图 |
| `npm run check-offline` | 解压离线包，以 `file://` 打开，检查首屏、报错、是否有非本地请求和实际下载 |
| `npm run verify` | 33 项几何与提示词自动复核 |
| `npm run replay` | 把留存的规格 JSON 读回当前源码再导出，逐项比对 |

后四条需要 Node 22.18 以上；`walkthrough` 和 `check-offline` 另需本机装有 Google Chrome。

复核时可以用地址栏参数直接还原一次导出的状态：`index.html#cfg=<规格 JSON 的 base64url>&pin=<对比规格>&set=frame.arm_width_mm="20mm"&tab=frame&evidence=1&q=小巧`。

[历史说明](README.historical.md)记录早期构想。已有实验的条件图见[图像和参数](public/research-guides/)。私有原始评论和本机服务配置由作者另行保存。
