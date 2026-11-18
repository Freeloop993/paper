# 多旋翼造型工作台

[下载离线版 ZIP](configurator-offline.zip?raw=true)，完整解压后打开 `index.html`。设计目标、参数画布、知识检索与历史案例可离线使用。在线生成与设计对话使用下方本机服务。工作台支持三旋、四旋、平面六旋、平面八旋、共轴六旋 Y6 和共轴八旋 X8，使用任务可分别选择日常航拍、农业植保或中性外观比较。

## 打开方案关系画布

启动下方本机服务后，打开 [B2 四旋翼案例](http://127.0.0.1:4178/?view=canvas#step=canvas&board=history)，沿图像连线查看去窗底图、相机上端和下端两种安装方案，以及作者的取舍。点「图片对照」可并排查看原图。

在「我的项目」可添加参考图、连接节点、保存规格版本，并从旧版继续编辑。生成轮次、回图和取舍按本机记录进入画布。手动连线记录设计上的参考关系，轮次详情里可以核对实际提交给模型的输入。[打开我的项目](http://127.0.0.1:4178/?view=canvas#step=canvas&board=project)

## 在本机试用带证据的设计对话

使用 Node.js 24 或更新版本，在本目录执行 `npm ci` 和 `npm run build`。在 PowerShell 中运行以下命令，新密钥可在隐藏输入提示中填写。区域 `global` 对应国际站账号，`cn` 对应中国站账号。

```powershell
$env:MINIMAX_REGION = 'global'
$env:MINIMAX_API_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'MiniMax API Key' -AsSecureString)).Password
try { node scripts/design-chat-server.mjs --port 4178 } finally { Remove-Item Env:MINIMAX_API_KEY }
```

打开 [本机造型页](http://127.0.0.1:4178/#step=studio&tab=fuselage)，在右侧「设计对话」询问折叠收纳的依据，或选中机身后要求调整宽度。工作台从现有脱敏短引检索相关卡，用 MiniMax-M3.1-Flash 的 `max` 推理生成答复。选「预览」查看宽度差异，选「应用到草稿」才写入当前规格。模型服务只监听本机回环地址。浏览器通过同源代理调用模型。图像默认使用相同区域和密钥。若账户分别授权了图像和文本服务，可在启动进程前通过环境变量 MINIMAX_IMAGE_API_KEY、MINIMAX_IMAGE_REGION 指定图像凭据与区域。

## 从设计目标到候选图

1. 在「设计目标」写下想做的改变。可选择采纳一条用户原话，也可以按自己的判断确认目标。工作台按话题、观察状态和任务筛选适用依据。
2. 在「调整参数」选择部件，直接修改规格。部件面板可从知识库调出对照问题，由设计师决定是否记入当前方案。画布能从设计目标或已保存规格追到实际采用的证据卡。
3. 在画布或参数页点「生成候选图」。工作台保存当前规格，把布局条件图发给 MiniMax H3 Image，默认每轮生成一张 1024 × 1024 PNG。以候选图继续生成时，同时传入父图。可以离开结果页继续修改草稿。
4. 在候选图下选择「保留此方案」或从这张图继续修订。原始输入、图像摘要、服务回执、选案与各版关系均可回查。「研究详情与导出」保留完整记录和旧版 ComfyUI 研究工具。[MiniMax 图像编辑接口](https://platform.minimax.io/docs/guides/image-generation)

本机服务在用户数据目录 Freeloop/multirotor-workbench/image-jobs 中保存轮次与 PNG，供浏览器刷新后取回。设置 WORKBENCH_IMAGE_JOBS_DIR 可以指定该目录。

[上一版界面与历史验收](review/20261118-round3/README.md) · [研究系统实施依据](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/system.md)


## 源码入口

| 要修改的内容 | 文件 |
| --- | --- |
| 工作台与工具切换 | [App.tsx](src/App.tsx)、[WorkbenchShell.tsx](src/components/Graph/WorkbenchShell.tsx) |
| 方案关系画布、节点详情与数据来源 | [WorkflowWorkspace.tsx](src/components/Graph/WorkflowWorkspace.tsx)、[GraphBoard.tsx](src/components/Graph/GraphBoard.tsx)、[workflowGraph.ts](src/design/workflowGraph.ts) |
| 设计目标、语义检索与研究资料 | [InsightPage.tsx](src/components/Insight/InsightPage.tsx)、[字段检索](src/design/semantics/lookup.mjs)、[公开卡语义标注](src/design/semantics/topics.mjs) |
| 造型页与五个部件页签 | [StudioPage.tsx](src/components/Studio/StudioPage.tsx)、[Parameters/](src/components/Parameters/)、[controls.tsx](src/components/controls/controls.tsx) |
| 画布（顶视、条件图、侧视、拖动、比例读数） | [Stage.tsx](src/components/Studio/Stage.tsx) |
| 布局空间图、设计提示、参考机型、方案条 | [SpaceMap.tsx](src/components/Studio/SpaceMap.tsx)、[Hints.tsx](src/components/Studio/Hints.tsx)、[References.tsx](src/components/Studio/References.tsx)、[Variants.tsx](src/components/Studio/Variants.tsx) |
| 交付页、提示词面板、规格卡与导出 | [HandoffPage.tsx](src/components/Handoff/HandoffPage.tsx)、[PromptGenerator.tsx](src/components/DevPreview/PromptGenerator.tsx)、[ParameterOverview.tsx](src/components/Overview/ParameterOverview.tsx) |
| 历史提交、候选原件、人工取舍与历史回放 | [ModelDispatch.tsx](src/components/Handoff/ModelDispatch.tsx)、[candidateRecords.ts](src/design/candidateRecords.ts)、[HistoryReplay.tsx](src/components/Handoff/HistoryReplay.tsx) |
| H3 单击生成、同一轮次恢复与本机代理 | [generation.ts](src/design/generation.ts)、[image-jobs.mjs](scripts/image-jobs.mjs) |
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
