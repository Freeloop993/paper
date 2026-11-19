# 多旋翼造型工作台

下一台电脑和接手设计的 Claude 请从[当前工作台交接](../../planning/workbench-handoff/README.md)开始，那里汇总了导师方向、文献依据、已测流程和待做试验。

[下载离线版 ZIP](configurator-offline.zip?raw=true)，完整解压后打开 `index.html`。画布上的目标、依据、造型、便签、参考图、保存版本和历史案例可离线使用。在线生成与设计对话使用下方本机服务。工作台支持三旋、四旋、平面六旋、平面八旋、共轴六旋 Y6 和共轴八旋 X8，使用任务可分别选择日常航拍、农业植保或中性外观比较。

## 一块画布，每一步都在上面做

3.4 版把目标、参数、候选图三个页面并进了画布。设计的每一步是画布上的一张卡片，在卡片上直接做；右侧面板跟着所选的卡片变化。为什么这样改见[界面设计说明](interface-design.md)和[画布式工作流拆解](../../planning/workbench-handoff/literature/画布式工作流拆解.md)。

| 想做的事 | 在画布上怎样做 |
| --- | --- |
| 写这次的目标 | 直接在「目标」卡片上写，回车保存。右侧同时给出可参考的用户原话，可以采用、驳回，或把某张证据卡放到画布上 |
| 定布局和尺寸 | 在「造型」卡片里拖橙色轴心、机身边缘和桨盘；右侧是五个部件页签的参数 |
| 加下一步 | 选中卡片，点它上方出现的按钮（生成效果图、另开方向、存为版本、以此图继续…），新卡片自动接在右边。也可以用底部工具条，或双击画布空白处 |
| 用一张图作参考 | 把图片拖进画布，再点「以此图生成」，或把它连到一张「生成」卡片 |
| 生成 | 「生成」卡片先以虚线出现，右侧列出将要提交的条件图、文字和参考图；点卡片上的「生成」才提交 |
| 取舍和继续 | 回图接在那一轮后面。选中候选图，点「保留」或「以此图继续」 |
| 并行几个方向 | 「另开方向」把当前方向复制一份，并排放在画布上，点哪个编辑哪个 |
| 问设计助手 | 右侧面板的「设计对话」页签。只查依据不需要模型账号 |
| 查研究记录 | 顶栏「显示留档」在画布上展开每轮冻结的规格和条件图；「研究详情与导出」里是提示词逐句来源、规格卡、导出、全部回执与取舍 |

[打开我的项目](http://127.0.0.1:4178/#step=canvas&board=project) · [打开 B2 四旋翼案例](http://127.0.0.1:4178/#step=canvas&board=history)。B2 案例沿图像连线回放去窗底图、相机上端和下端两种安装方案，以及作者的取舍；案例里的图片可以引用到自己的项目。

旧地址仍然可用，落在同一块画布上：`#step=insight` 选中目标卡片，`#step=studio&tab=fuselage` 选中造型卡片并切到机身页签，`#step=handoff` 打开研究详情与导出。

## 本地入口

从本目录构建并启动本机服务。证据检索无需模型账号。

```shell
npm ci
npm run build
npm run studio:chat -- --port 4178
```

第一次试用可以在目标卡片上写“折起来能放进小包”，看右侧给出的两条原句；或选中造型卡片，在「设计对话」里输入“折叠后装进小包，有哪些原句可以参考？”，点击「只查依据」。

检索来自36张公开的脱敏短引，界面区分卡数、来源数和答复提及的卡号。设计者可以预览、采纳、写明驳回理由或撤销。保存版本、冻结轮次和导出规格时会保留当时的对话与决定；读入上一版规格时，已有参数和意图仍可使用。生成图的服务回执、作者对图片的取舍与设计助手的文字建议分别保留。

只想走查界面、不调用模型时，用 `npm run studio:fixture -- --port 4178` 代替上面最后一条命令。这个服务照常检索公开卡，图像作业由软件夹具应答：它把本轮的布局条件图原样当作“回图”返回，只用来检查画布上的提交、回图、取舍和继续生成是否连得上。

## 在本机试用带证据的设计对话

使用 Node.js 24 或更新版本，在本目录执行 `npm ci` 和 `npm run build`。在 PowerShell 中运行以下命令，新密钥可在隐藏输入提示中填写。区域 `global` 对应国际站账号，`cn` 对应中国站账号。

```powershell
$env:MINIMAX_REGION = 'global'
$env:MINIMAX_API_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'MiniMax API Key' -AsSecureString)).Password
try { node scripts/design-chat-server.mjs --port 4178 } finally { Remove-Item Env:MINIMAX_API_KEY }
```

打开 [造型卡片的机身页签](http://127.0.0.1:4178/#step=studio&tab=fuselage)，在右侧面板的「设计对话」页签询问折叠收纳的依据，或选中机身后要求调整宽度。工作台从现有脱敏短引检索相关卡，用 MiniMax-M3.1-Flash 的 `max` 推理生成答复。选「预览」在造型卡片上查看宽度差异，选「应用到草稿」才写入当前规格。模型服务只监听本机回环地址。浏览器通过同源代理调用模型。图像默认使用相同区域和密钥。若账户分别授权了图像和文本服务，可在启动进程前通过环境变量 MINIMAX_IMAGE_API_KEY、MINIMAX_IMAGE_REGION 指定图像凭据与区域。

## 从设计目标到候选图

1. 在「目标」卡片上写下想做的改变。可选择采用一条用户原话，也可以按自己的判断确认目标。工作台按话题、观察状态和任务筛选适用依据。
2. 在「造型」卡片上直接拖动，或在右侧选择部件修改规格。部件面板可从知识库调出对照问题，由设计师决定是否记入当前方案。画布能从设计目标或已保存规格追到实际采用的证据卡。
3. 选中造型卡片，点「生成效果图」，再点新卡片上的「生成」。工作台保存当前规格，把布局条件图发给 MiniMax H3 Image，默认每轮生成一张 1024 × 1024 PNG。以候选图继续生成时，同时传入父图；以画布上的参考图生成时，同时传入那张图。等待回图时可以继续修改造型。
4. 选中候选图，选择「保留」或「以此图继续」。原始输入、图像摘要、服务回执、选案与各版关系均可回查。「研究详情与导出」保留完整记录和旧版 ComfyUI 研究工具。[MiniMax 图像编辑接口](https://platform.minimax.io/docs/guides/image-generation)

本机服务在用户数据目录 Freeloop/multirotor-workbench/image-jobs 中保存轮次与 PNG，供浏览器刷新后取回。设置 WORKBENCH_IMAGE_JOBS_DIR 可以指定该目录。

[本轮软件走查记录与截图](review/20261119-round4/README.md) · [上一版界面与历史验收](review/20261118-round3/README.md) · [研究系统实施依据](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/system.md)


## 源码入口

| 要修改的内容 | 文件 |
| --- | --- |
| 应用外壳、地址栏入口、顶栏 | [App.tsx](src/App.tsx)、[WorkbenchShell.tsx](src/components/Graph/WorkbenchShell.tsx) |
| 设计画布：添加步骤、选中后的下一步、生成与取舍 | [CanvasWorkspace.tsx](src/components/Canvas/CanvasWorkspace.tsx) |
| 画布上的步骤卡片（目标、造型、生成、图像、便签） | [StepCards.tsx](src/components/Canvas/StepCards.tsx) |
| 画布本身：排布、卡片位置、视野、连线、整理 | [DesignBoard.tsx](src/components/Canvas/DesignBoard.tsx) |
| 随所选步骤变化的右侧面板、设计对话页签 | [StepPanel.tsx](src/components/Canvas/StepPanel.tsx)、[canvasUi.tsx](src/components/Canvas/canvasUi.tsx) |
| 画布上的卡片与连线从哪里来（草稿、保存的版本、轮次、便签、待生成步骤） | [workflowGraph.ts](src/design/workflowGraph.ts)、[project.ts](src/design/workflow/project.ts)、[attempts.ts](src/design/workflow/attempts.ts)、[workspaceRecords.ts](src/design/workflow/workspaceRecords.ts) |
| 证据卡、保存版本等卡片的通用详情 | [GraphInspector.tsx](src/components/Graph/GraphInspector.tsx) |
| 目标面板、语义检索与研究资料 | [InsightPage.tsx](src/components/Insight/InsightPage.tsx)、[useGoalEditor.ts](src/components/Insight/useGoalEditor.ts)、[字段检索](src/design/semantics/lookup.mjs)、[公开卡语义标注](src/design/semantics/topics.mjs) |
| 五个部件页签的参数 | [Parameters/](src/components/Parameters/)、[controls.tsx](src/components/controls/controls.tsx) |
| 造型卡片里的顶视、条件图、侧视、拖动与比例读数 | [Stage.tsx](src/components/Studio/Stage.tsx) |
| 设计对话 | [DesignChat.tsx](src/components/Studio/DesignChat.tsx) |
| 布局空间图、设计提示、参考机型 | [SpaceMap.tsx](src/components/Studio/SpaceMap.tsx)、[Hints.tsx](src/components/Studio/Hints.tsx)、[References.tsx](src/components/Studio/References.tsx) |
| 研究详情与导出：提示词面板、规格卡与导出 | [HandoffPage.tsx](src/components/Handoff/HandoffPage.tsx)、[PromptGenerator.tsx](src/components/DevPreview/PromptGenerator.tsx)、[ParameterOverview.tsx](src/components/Overview/ParameterOverview.tsx) |
| 历史提交、候选原件、人工取舍与历史回放 | [ModelDispatch.tsx](src/components/Handoff/ModelDispatch.tsx)、[candidateRecords.ts](src/design/candidateRecords.ts)、[HistoryReplay.tsx](src/components/Handoff/HistoryReplay.tsx) |
| H3 生成、参考图转换、同一轮次恢复与本机代理 | [generation.ts](src/design/generation.ts)、[image-jobs.mjs](scripts/image-jobs.mjs) |
| 轴心几何、构型画法与依据、条件图 | [design.ts](src/design/design.ts) |
| 设计提示的算法（桨盘重叠、相机视野、桨与机身） | [checks.ts](src/design/checks.ts) |
| 每个选项的名称、短语和参考数值 | [fields.ts](src/design/fields.ts) |
| 提示词逐句编译与检查；导出与读入 | [partPrompt.ts](src/design/partPrompt.ts)、[exporters.ts](src/design/exporters.ts) |
| 状态、撤销、方向（方案）、对比、设计意图 | [droneStore.ts](src/store/droneStore.ts) |
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
| `npm run dev` | 本机编辑预览。检索、对话和图像作业转给 4178 端口的本机服务（`studio:chat` 或 `studio:fixture`） |
| `npm run build` | TypeScript 检查并生成 `dist/index.html` |
| `npm run package-offline` | 重新构建并打包 `configurator-offline.zip` |
| `npm run walkthrough:canvas` | 先 `npm run build`。在隔离的浏览器里把画布上的每一步做一遍：目标、依据、造型拖动、生成、保留、以候选继续、参考图作输入、便签、新方向、留档、B2 案例和手机宽度。图像作业由软件夹具应答，不调用模型。可加一个目录参数保存截图 |
| `npm run walkthrough` | 从离线包走一遍目标、造型和导出，保存农业六旋实际导出与桌面截图，命令会输出所在目录 |
| `npm run check-offline` | 解压离线包，以 `file://` 打开，检查画布、目标面板、造型、导出、报错、是否有非本地请求和实际下载 |
| `npm run verify` | 任务、构型、几何、导入导出与提示词自动复核 |
| `npm run replay` | 把留存的规格 JSON 读回当前源码再导出，逐项比对 |

开发核查使用 Node 22.18 以上。打包与解压核验需要 Python 3，界面核验还需要 Chrome。

浏览器记录及协议测试可分别运行 `node scripts/record-walkthrough.mjs <预览地址>` 和 `node scripts/dispatch-walkthrough.mjs <预览地址>`。需安装 Playwright Core 或通过 `PLAYWRIGHT_CORE` 指定其路径。前者核对历史回放、导入、取舍与父图，后者在本机软件夹具上核对 HTTP 输入、回图和失败历史。两者均不调用模型。

复核时可以用地址栏参数直接还原状态：`index.html#step=studio&cfg=<规格 JSON 的 base64url>&pin=<对比规格>&set=frame.arm_width_mm="20mm"&tab=frame&q=小巧`。

[历史说明](README.historical.md)记录早期构想。已有实验的条件图见[图像和参数](public/research-guides/)。私有原始评论和本机服务配置由作者另行保存。
