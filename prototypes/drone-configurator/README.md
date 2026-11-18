# 无人机造型配置器

作者 E 盘恢复的五页签 React / TypeScript 配置器，现在是一个三段式的造型工作台：**洞察 → 造型 → 交付**。设计者先看用户在说什么、定下想要的感觉；再在画布上直接拖动电机、机身和桨盘，或在五个部件页签里选参数；最后核对并导出条件图、提示词和规格。

[下载离线版 ZIP](configurator-offline.zip?raw=true)，完整解压后用浏览器打开包内的 `index.html`，不需要联网，也不需要启动服务。模型生图和评论检索目前没有接入。

- [第三轮交接报告：实测结果、还没验证的、需要作者确认和提供的](review/20261118-round3/README.md)
- [界面设计说明：整体框架、每一块的依据、用到的无人机设计常识](interface-design.md)
- [论文正文与实际进度的对照](review/20261118-round3/thesis-alignment.md)
- [最初的功能需求](original-design-brief.md) · [Claude 接手时的阅读清单](claude-interface-brief.md)

## 三个环节

| 环节 | 做什么 |
| --- | --- |
| 1 洞察 | 左边是评论依据：语料的三层数字、228 条外形评论的主题分布、可搜索的短引文墙，觉得哪条支持你的想法就收藏为依据。右边是设计简报：四组词对各选一端或留在中间，也可以用自己的话补一句。 |
| 2 造型 | 中间是画布：实时顶视图，可以直接拖橙色的电机轴心、机身边缘和桨盘边缘；可切到「条件图」和「侧视」。左边是五个部件页签（机架、动力、机身、起落架、配件），点画布上的哪个部件就切到哪个页签。右边是布局空间图、设计提示和参考机型。下面是方案条，可复制出 A、B、C 几个方向并叠在一起对比。 |
| 3 交付 | 条件图、提示词（刚改动的句子标黄，可展开逐句来源）、造型规格卡，以及「导出三件」。规格 JSON 可以读回来接着改。 |

航拍相机装在机头、朝正前方。俯视时镜头被机鼻挡住：画布用紫色虚线标出它的位置和大致视野，「侧视」里能看到它本身；不会把镜片画在机背上。

## 源码入口

| 要修改的内容 | 文件 |
| --- | --- |
| 整体框架与三个环节的切换 | [App.tsx](src/App.tsx)、[TopBar.tsx](src/components/Shell/TopBar.tsx) |
| 洞察页（主题、短引文墙、设计简报） | [InsightPage.tsx](src/components/Insight/InsightPage.tsx)、[corpus.ts](src/data/corpus.ts) |
| 造型页与五个部件页签 | [StudioPage.tsx](src/components/Studio/StudioPage.tsx)、[Parameters/](src/components/Parameters/)、[controls.tsx](src/components/controls/controls.tsx) |
| 画布（顶视、条件图、侧视、拖动、比例读数） | [Stage.tsx](src/components/Studio/Stage.tsx) |
| 布局空间图、设计提示、参考机型、方案条 | [SpaceMap.tsx](src/components/Studio/SpaceMap.tsx)、[Hints.tsx](src/components/Studio/Hints.tsx)、[References.tsx](src/components/Studio/References.tsx)、[Variants.tsx](src/components/Studio/Variants.tsx) |
| 交付页、提示词面板、规格卡与导出 | [HandoffPage.tsx](src/components/Handoff/HandoffPage.tsx)、[PromptGenerator.tsx](src/components/DevPreview/PromptGenerator.tsx)、[ParameterOverview.tsx](src/components/Overview/ParameterOverview.tsx) |
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

界面会直接用上合并后的卡片，搜索、主题筛选和收藏都不用改。

## 命令

在本目录执行 `npm ci` 后：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本机编辑预览 |
| `npm run build` | TypeScript 检查并生成 `dist/index.html` |
| `npm run package-offline` | 重新构建并打包 `configurator-offline.zip` |
| `npm run walkthrough` | 用无界面 Chrome 打开离线构建，按真实的点击、拖动和输入走完三个环节，保存浏览器实际下载的导出件、屏幕读数和截图 |
| `npm run check-offline` | 解压离线包，以 `file://` 打开，检查三个环节、报错、是否有非本地请求和实际下载 |
| `npm run verify` | 33 项几何与提示词自动复核 |
| `npm run replay` | 把留存的规格 JSON 读回当前源码再导出，逐项比对 |

后四条需要 Node 22.18 以上；`walkthrough` 和 `check-offline` 另需本机装有 Google Chrome。

复核时可以用地址栏参数直接还原状态：`index.html#step=studio&cfg=<规格 JSON 的 base64url>&pin=<对比规格>&set=frame.arm_width_mm="20mm"&tab=frame&q=小巧`。

[历史说明](README.historical.md)记录早期构想。已有实验的条件图见[图像和参数](public/research-guides/)。私有原始评论和本机服务配置由作者另行保存。
