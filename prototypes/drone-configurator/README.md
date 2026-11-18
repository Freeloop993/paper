# 多旋翼造型工作台

[下载离线版 ZIP](configurator-offline.zip?raw=true)，完整解压后打开 `index.html`。简报、画布、资料检索、历史案例与本地记录可离线使用。工作台支持三旋、四旋、平面六旋、平面八旋、共轴六旋 Y6 和共轴八旋 X8，使用任务可分别选择日常航拍、农业植保或中性外观比较。

## 从简报到一个可回看的设计决定

1. 在“洞察”选择使用任务与构型，写下意图。系统按话题、部位和使用状态找公开短引。只说“小巧”时可澄清折叠或展开；缺少相应任务资料时可自定。确认、驳回及撤销保存在当前方案。
2. 在“造型”调整机架、机身与其他部件，对比顶视、条件图和侧视。画布分别标出水平轴位与旋翼层数。共轴导出增加带绑定摘要的侧视示意。新构型的参考资料写明了适用视图。
3. 在“交付 → 设计输入”核对并下载规格、提示词与条件图。在“候选与记录”写下本轮目标、保持项，选择结构化或自由提示，确认并冻结。冻结本身不会发送生成请求。
4. 展开“模型提交与外部运行文件”。可以下载该轮请求 JSON 和输入 PNG 交给主持人。也可以填写自己的 ComfyUI 地址，设置种子后主动提交。服务须具备本项目使用的 Qwen Image 2.1 工作流及模型，且允许该浏览器来源访问。结构化方式发送已确认文字与条件图，自由方式发送作者原文；选父图修订时额外附上该图。点击“查询回图”取回同一作业的全部候选。[ComfyUI 服务接口](https://docs.comfy.org/development/comfyui-server/comms_routes)
5. 外部运行可导入实发请求、作业号、服务历史和原 PNG。查看候选后记录采纳、驳回、回选或人工深化及理由。浏览器本地保存原件；“导出本轮记录”可备份该轮完整材料。历史四旋 B2 与农业六旋在单独的回放区域，使用原归档标识。

[上一版界面与历史验收](review/20261118-round3/README.md) · [研究系统实施依据](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/system.md)

## 源码入口

| 要修改的内容 | 文件 |
| --- | --- |
| 整体框架与三个环节的切换 | [App.tsx](src/App.tsx)、[TopBar.tsx](src/components/Shell/TopBar.tsx) |
| 设计简报、语义检索与研究资料 | [InsightPage.tsx](src/components/Insight/InsightPage.tsx)、[字段检索](src/design/semantics/lookup.mjs)、[公开卡语义标注](src/design/semantics/topics.mjs) |
| 造型页与五个部件页签 | [StudioPage.tsx](src/components/Studio/StudioPage.tsx)、[Parameters/](src/components/Parameters/)、[controls.tsx](src/components/controls/controls.tsx) |
| 画布（顶视、条件图、侧视、拖动、比例读数） | [Stage.tsx](src/components/Studio/Stage.tsx) |
| 布局空间图、设计提示、参考机型、方案条 | [SpaceMap.tsx](src/components/Studio/SpaceMap.tsx)、[Hints.tsx](src/components/Studio/Hints.tsx)、[References.tsx](src/components/Studio/References.tsx)、[Variants.tsx](src/components/Studio/Variants.tsx) |
| 交付页、提示词面板、规格卡与导出 | [HandoffPage.tsx](src/components/Handoff/HandoffPage.tsx)、[PromptGenerator.tsx](src/components/DevPreview/PromptGenerator.tsx)、[ParameterOverview.tsx](src/components/Overview/ParameterOverview.tsx) |
| 模型请求、候选原件、人工取舍与历史回放 | [ModelDispatch.tsx](src/components/Handoff/ModelDispatch.tsx)、[candidateRecords.ts](src/design/candidateRecords.ts)、[HistoryReplay.tsx](src/components/Handoff/HistoryReplay.tsx) |
| 轴心几何、构型画法与依据、条件图 | [design.ts](src/design/design.ts) |
| 设计提示的算法（桨盘重叠、相机视野、桨与机身） | [checks.ts](src/design/checks.ts) |
| 每个选项的名称、短语和参考数值 | [fields.ts](src/design/fields.ts) |
| 提示词逐句编译与检查；导出与读入 | [partPrompt.ts](src/design/partPrompt.ts)、[exporters.ts](src/design/exporters.ts) |
| 状态、撤销、方案、对比、设计意图 | [droneStore.ts](src/store/droneStore.ts) |
| 参考机型数据（官方规格与手册图面量测） | [aircraft.ts](src/data/aircraft.ts) |
| 评论短引文数据 | [evidenceCards.json](src/data/evidenceCards.json)，由 `npm run evidence` 生成 |
| 早期评论检索与模型服务（停用，未改动） | [知识库](rag_knowledge_base.py)、[本地服务](rag_api_server.py)、`src/services/` |

## 评论短引文从哪里来、怎样增加

界面里的短引文取自仓库公开的 `evidence/semantic-cards/cards.csv`，目前 36 条。它们是按既定方向挑选的示例，不足以单独支撑判断，所以洞察页同时给出语料的主题分布。

要从私有评论库里再挑一批，把新挑的短引文按 `cards.csv` 的十一列整理成一份 CSV（只放 60 字以内的脱敏片段，不放完整原评论、用户名或链接；卡号不与已有的重复），然后执行：

```sh
npm run evidence -- --extra 路径/新增短引文.csv
```

语义索引锁定本次 36 张卡的版本。增加卡后须逐条复核话题、适用状态和同源关系，再更新结构化索引的版本与内容摘要，重新核验有关查询。

## 命令

在本目录执行 `npm ci` 后：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本机编辑预览 |
| `npm run build` | TypeScript 检查并生成 `dist/index.html` |
| `npm run package-offline` | 重新构建并打包 `configurator-offline.zip` |
| `npm run walkthrough` | 从离线包走完三个环节，保存农业六旋实际导出与桌面截图，命令会输出所在目录 |
| `npm run check-offline` | 解压离线包，以 `file://` 打开，检查三个环节、报错、是否有非本地请求和实际下载 |
| `npm run verify` | 任务、构型、几何、导入导出与提示词自动复核 |
| `npm run replay` | 把留存的规格 JSON 读回当前源码再导出，逐项比对 |

开发核查使用 Node 22.18 以上。打包与解压核验需要 Python 3，界面核验还需要 Chrome。

浏览器记录及协议测试可分别运行 `node scripts/record-walkthrough.mjs <预览地址>` 和 `node scripts/dispatch-walkthrough.mjs <预览地址>`。需安装 Playwright Core 或通过 `PLAYWRIGHT_CORE` 指定其路径。前者核对历史回放、导入、取舍与父图，后者在本机软件夹具上核对 HTTP 输入、回图和失败历史。两者均不调用模型。

复核时可以用地址栏参数直接还原状态：`index.html#step=studio&cfg=<规格 JSON 的 base64url>&pin=<对比规格>&set=frame.arm_width_mm="20mm"&tab=frame&q=小巧`。

[历史说明](README.historical.md)记录早期构想。已有实验的条件图见[图像和参数](public/research-guides/)。私有原始评论和本机服务配置由作者另行保存。
