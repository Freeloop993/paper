# 工单 #2 存档：[Codex · X01] 将两种操作流程接到自由外形输入，离线验收
原址：https://github.com/Freeloop993/paper/issues/2　建立：2026-11-09T12:56:20Z　存档：2026-11-18　评论数：11
本文件逐字保存工单的正文与全部评论，按时间排序，供关闭后追溯。每条评论标注发布者账号、时间与原链接；评论正文中的“Claude：”等前缀表示实际撰写者。关闭依据为作者 11 月 18 日对 #3 待议问题第 7 题的同意。

---

### 工单正文
*Freeloop993 · 2026-11-09T12:56:20Z*

责任角色：Codex。依赖：已确认四旋 B02；新版离线编译已有12份QA输入，不是12张图。

- [ ] 接入同一可操作入口：自由提示（D）与结构化部位/改变/保持（S），同简报、同等级工具。
- [ ] 保存实际请求并核传入的文字、控制图和父图；默认不锁外形，无授权不提交模型。
- [ ] 走通停、修订、回选及锁定终稿，保留父子版本、失败/未知；演练不计人次。
- [ ] 交脱敏回执、可复现步骤及未验证项；回填 `STATUS.md` 和本 issue。

独立转轴复测须用真实独立记录，软件检查不能代替。成功条件是输入/操作可复核，不是宣称生成质量通过。

### 评论 1

*Freeloop993 · 2026-11-09T13:01:45Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6740699957)*

Codex 接手 X01，输入版本 `92dfe2e8891e`。已核的起点是 12 份离线请求、4 个软件测试，不是已执行的正式实验。下一交付：两组操作入口导出的实际输入、父图绑定、停止/回选与终稿锁的可复核记录。当前工单未验收；本次建仓不新增生成或费用。

### 评论 2

*Freeloop993 · 2026-11-09T13:16:05Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6740990603)*

Codex 已交付离线联调，输入 `92dfe2e`，产物 [a44695f](/Freeloop993/paper/commit/a44695fcb6ab404644c5392badef46e734d0f46f)。

在同一浏览器入口分别走通 A/B × D/S。两种方法均支持停止、纯文字修订、以初稿作参考、回选和一次锁稿。已测保留初稿、选择修改稿、均不交、失败和状态未知。服务端拒绝旧页面写入、第三版请求和锁稿后的再次提交，刷新后终稿仍一致。

[复核步骤](https://github.com/Freeloop993/paper/tree/a44695fcb6ab404644c5392badef46e734d0f46f/experiments/operator-workbench) · [7 个浏览器演练场景及请求摘要](https://github.com/Freeloop993/paper/blob/a44695fcb6ab404644c5392badef46e734d0f46f/experiments/operator-workbench/browser-check.json)。7 份下载 ZIP 内共 11 份编译请求，独立按原字节核对了请求、最终选图和父图。样图是两张既有 PNG，0 次模型调用、0 个真人场次。真实后端能力、设计质量与独立转轴量测仍待核。请在另一台机器按 README 复核后回本工单，本项保持开放。

### 评论 3

*Freeloop993 · 2026-11-10T15:12:02Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6771029743)*

Codex 接手作者找回的无人机配置器源码公开整理，以 main `f477738` 为输入。范围是原型代码、旧需求说明，以及对应 3.2–3.6、4.1 和 5.5 的纠偏交接。会剔除凭据与私有语料，核对代码和离线可用性后把入口回填本工单和 #1。

### 评论 4

*Freeloop993 · 2026-11-10T15:19:24Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6771212287)*

Codex 交付｜main `95de8c7` 有可编辑的历史配置器，25 个前端 TS/TSX 模块、Python 源码、锁文件、旧需求与新的研究交接均已提交。离线 Vite 打包与 Chrome 首页通过，严格类型检查仍有与原件相同的 16 项诊断。原型与数据状态已回填；Claude 的首轮 PR 要求见 [#1 交接](https://github.com/Freeloop993/paper/issues/1#issuecomment-6771207185)。下一次 Codex 复核确认文本、定位 PNG/JSON、可选父图和实际导出之间的对应关系。

### 评论 5

*Freeloop993 · 2026-11-10T15:23:24Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6771309576)*

作者已将源码首轮优化交回 Codex，由我从 main `95de8c7` 实施。范围是原型实际入口、四/六旋规格、确认与导出一致、一次修改的版本记录和浏览器验收。Claude 继续总体审查与写作，无需并行改同一组文件。

### 评论 6

*Freeloop993 · 2026-11-10T16:17:34Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6772658535)*

Codex 给 Claude（关联 #1）｜11/11 E 盘原生配置器，四旋技术预试更新。P01 斜前上视、P02 正交俯视各一张，均为配置器外的 Codex 内置图像生成，网页模型调用 0。作者已否决 P02 的旋翼。复查原回执：保存的动力配置是三叶，但该组未纳入提交文字；输入图只标了四个电机轴心。输出各桨毂可见两片朝同侧张开的桨叶，按原图四个中心和八个叶尖做知条件估读，桨内夹角约 109°。此前约 90° 的读数是机架中心到四个电机的相邻夹角，不能作为旋翼正确的证据。保留为 4.1.3/5.2.3 的失败个案；本轮作者意见不计独立评议。已在 E 盘准备等信息纯文字与文字＋四点的探索性输入，共同指定三叶完全展开和归一化轴位，实际提交 0。本对照用于查技术可行性，正式自由文字/结构化改稿和植保六旋仍待实证。

### 评论 7

*Freeloop993 · 2026-11-10T16:24:23Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6772823316)*

Codex 按作者新裁定，从 main `95de8c7` 核对旧切角壳体系列、衍生评图与现行数据入口。交付按批次退出正式证据、原反馈独立归档、新批从独立输入重新计数。

### 评论 8

*Freeloop993 · 2026-11-10T16:32:33Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6773015160)*

Codex 已交付 main `9c591bd`。正式纳入、校准发放与正式汇总均检查图像身份；已用退役原图、改名重编码副本、未入名单原图、临时正例验证。E 盘原程序另已落实四旋每桨三叶及新版本保存检查，D/S 的实际文本与导出经过浏览器验收。P03 两次真实内置工具输出单列技术日志；同文只差有无四点图，均未纳入正式样本。研究控制和下一轮分档见 [变量表](https://github.com/Freeloop993/paper/blob/9c591bd/docs/research-variables.md)。

### 评论 9

*Freeloop993 · 2026-11-10T17:05:51Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6773813673)*

Codex 已按作者要求跑完随行航拍双叶桨 P04，6 次内置生图、6 份原图，正式样本 0。四轴可读 6/6，跨度比在 0.10 容限内 2/6，另两张读数接近边界。四副桨均可逐叶确认展开仅 1/6，该图存在明显的桨叶长短不对称。24 副桨逐副记可见性；知条件 AI 初读，独立真人复测 0。全部原图、实际输入、读数与复算已进入 main，下一步先离线检查等距叶尖定位。见[本轮数据与六图对照](https://github.com/Freeloop993/paper/tree/36c79be/evidence/p04-quad-biblade)。

### 评论 10

*Freeloop993 · 2026-11-12T05:12:49Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6815295936)*

Codex 研究执行交接已落到 [main 的24项任务](https://github.com/Freeloop993/paper/blob/f306370a34e9b000c25ce6bce905bcda82c7bed9/docs/execution-playbook.md)。本轮交付为执行清单、逐节映射、离线审核页和可编辑思维导图，已核浏览器默认入口、章节/放大、旧16项意见兼容。下一棒先依次提交 T04 需求语义编码（含反例）、T06 两种任务的部位与保持项规格、T07 设计几何到定位图的字段对照，再核 T08 等信息量的两种请求、T09 独立量尺。结果回填对应既有工单；图像生成与真人场次分别以冻结协议和实到原件为准。本次没有新增样本。

### 评论 11

*Freeloop993 · 2026-11-12T08:28:37Z · [原链接](https://github.com/Freeloop993/paper/issues/2#issuecomment-6818674398)*

Codex｜离线第二步回执，提交 `0e732e0`、[稿件 PR #50](https://github.com/Freeloop993/paper/pull/50)。地基第7节12项已落实到[六章执行清单](https://github.com/Freeloop993/paper/blob/0e732e0030096b347bada49b9a7f000a1e503bb9/docs/execution-playbook.md)、methods、正式采集材料、P3冻结模板与[Google顶部清单](https://docs.google.com/document/d/1Ek_Ne35sFQFC0FcMU4uNbeFCGl28ipOj9wYOQRN_2ro/edit)；24项任务、79项目录映射保留。STATUS已合并排错说明，已核#4—#13全部附证据关闭；E0—E6对应#19—#25，T01—T24对应#26—#49，见[工单映射](https://github.com/Freeloop993/paper/blob/0e732e0030096b347bada49b9a7f000a1e503bb9/docs/handoff.md)。第8节逐行对照在PR正文。本步实际模型调用0、生成0、正式真人场次0；未签发实验冻结文件。下一步等待Claude复核。
