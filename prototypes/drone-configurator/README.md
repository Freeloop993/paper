# 无人机造型配置器

作者 E 盘恢复的五页签 React / TypeScript 配置器，11 月 17 日完成第一轮界面优化。设计者在「机架」「动力」「机身」「起落架」「配件」五个页签里点选和拖动，随时能看到三件事：选了什么、图和文字怎样跟着变、哪些造型决定还留着没定。

[下载离线版 ZIP](configurator-offline.zip?raw=true)，完整解压后用浏览器打开包内的 `index.html`，不需要联网，也不需要启动服务。模型生图和向量检索本轮保持停用。

- [第一轮交接报告：实测通过了什么、还有什么待验证](review/20261117-round1/README.md)
- [优化后的界面需求](requirements-v2.md)（[最初的功能需求](original-design-brief.md)保留作对照）
- [论文正文与实际进度的对照](review/20261117-round1/thesis-alignment.md)
- [Claude 接手时的阅读清单与验收项](claude-interface-brief.md)

## 界面怎么用

| 区域 | 用途 |
| --- | --- |
| 设计任务与目标 | 任务固定条件；由设计者提出的目标；可查看、采纳、撤销的 36 张离线公开证据卡。搜不到合适的卡就自己写意图。证据卡只作依据，采纳或撤销都不改参数。 |
| 五个页签 | 选项按钮、色板、滑块和数值微调。每一项都标着状态（任务固定／默认值／你的选择／留白）和顶视可见性（顶视可见／仅进文字／顶视遮挡），可单独清除。 |
| 顶视布局示意 | 按毫米等比例画轴心、机臂、桨盘和机身包络。旁边的侧视示意画出顶视看不到的相机朝向、机身高度和起落架。「记为对照」后再改参数，可以叠着看前后两个方案。 |
| 刚才的改动 | 每改一项，写明图怎么变、提示词哪一句改写（前后对照）、对应导出里的哪个字段，可一步撤销。 |
| 发给模型的文字 | 逐句列出提示词并标来源；留白的造型项不成句。附模板自检：护圈、颜色、碳纹只在明确选择后出现。 |
| 当前选择 | 全部选项的值与状态，最上面单列「仍待决定的造型」。 |
| 导出 | 「导出三件」一次给出同一时间戳的点线条件图 PNG、提示词 TXT、配置 JSON；「读入配置」可把导出的 JSON 读回来接着改。 |

机身轮廓、顶盖分件、臂根过渡、机臂材料、相机安装、主色和表面处理默认都是「留白」，由设计者决定。航拍相机朝机头前方是任务固定条件；从正上方看镜头可以被机鼻遮住，界面用紫色虚线标出位置，在侧视示意里画出朝前的视线，不会把镜片画在机背上。

## 数值各是什么来源

界面和导出都把四类数值分开：

| 类别 | 例子 | 在界面里的样子 |
| --- | --- | --- |
| 设计者输入（设计值） | 对角电机中心距 D、机身长宽高、改动过的 W/L | 滑块与数值框；导出为 `parameters` |
| 实验设定与实验档位 | D＝250 mm；W/L 0.70／1.00／1.30；d/D 0.40／0.50／0.60 | 滑块下的紫色刻度，标「实验档位／实验设定」 |
| 厂商公布、手册图面量测 | 4 款机型公布的对角尺寸（端点未核）；4 款四旋的图面 W/L、机身宽/D | 灰色、绿色刻度和说明文字，只作对照，不写入参数 |
| 生成图上的读数 | 回图后的轴心、比例、造型档位 | 本程序没有；导出里 `measured_from_output` 明确为「无」 |

D 的定义是两条对角电机中心距的均值，导出同时给出对置最大距和任意两轴最大距。条件图把 D 归一到 600 px，与已登记的研究条件图同尺度。

## 源码入口

| 要修改的内容 | 文件 |
| --- | --- |
| 主界面、页签顺序、宽屏与窄屏布局 | [App.tsx](src/App.tsx) |
| 轴心几何、构型规则与依据、点线条件图 | [design.ts](src/design/design.ts) |
| 每个选项的名称、状态、可见性、短语和对照数值 | [fields.ts](src/design/fields.ts) |
| 提示词逐句编译、逐句比较、模板自检 | [partPrompt.ts](src/design/partPrompt.ts) |
| 导出与读入 | [exporters.ts](src/design/exporters.ts) |
| 选择状态、撤销、对照、设计意图 | [droneStore.ts](src/store/droneStore.ts) |
| 五组部件面板与共用控件 | [Parameters/](src/components/Parameters/)、[controls.tsx](src/components/controls/controls.tsx) |
| 顶视与侧视示意、读数、刚才的改动 | [InterfacePreview.tsx](src/components/DevPreview/InterfacePreview.tsx) |
| 提示词面板与导出按钮 | [PromptGenerator.tsx](src/components/DevPreview/PromptGenerator.tsx) |
| 当前选择、仍待决定的造型、与对照比较 | [ParameterOverview.tsx](src/components/Overview/ParameterOverview.tsx) |
| 证据卡面板；离线卡片数据 | [EvidencePanel.tsx](src/components/Evidence/EvidencePanel.tsx)、[evidenceCards.json](src/data/evidenceCards.json) |
| 早期评论检索实现（停用，未改动） | [知识库](rag_knowledge_base.py)、[本地服务](rag_api_server.py)、`src/services/` |

## 命令

在本目录执行 `npm ci` 后：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本机编辑预览 |
| `npm run build` | TypeScript 检查并生成 `dist/index.html` |
| `npm run verify` | 33 项几何与提示词自动复核（真 X／宽 X、Deadcat 四轴、臂宽只改一句、未选项不出现、证据卡不改参数） |
| `npm run replay` | 把留存的导出配置读回当前源码再导出，逐项比对 |
| `npm run package-offline` | 重新构建并打包 `configurator-offline.zip` |
| `npm run check-offline` | 解压离线包，以 `file://` 打开，检查渲染、报错和是否有非本地请求 |
| `npm run evidence` | 由 `evidence/semantic-cards/cards.csv` 重新生成界面内置的证据卡数据 |

后四条需要 Node 22.18 以上；`check-offline` 另需本机装有 Google Chrome。

复核时可以用地址栏参数直接还原一次导出的状态：`index.html#cfg=<配置 JSON 的 base64url>&pin=<对照配置>&set=frame.arm_width_mm="20mm"&tab=frame&evidence=1&q=小巧`。[截图脚本](review/20261117-round1/make_screenshots.mjs)就是这样生成各张截图的。

[历史说明](README.historical.md)记录早期构想。已有实验的条件图见[图像和参数](public/research-guides/)。私有原始评论和本机服务配置由作者另行保存。
