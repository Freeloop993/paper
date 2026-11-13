# 接手快照 · 2026-11-13

## 11 月 13 日晚 · Claude 在作者本机接手后的记录

**先读：** [Codex 的复盘索引](claude-context-20261113.md)（早期并排图、各批原图与实参、历轮错误），再读[研究地基](foundation.md)。我已按索引逐项看过原图、实际请求和判读。

**我们在做什么。** 论文研究的是设计者一侧的工作方法，不是出图技巧。设计者把使用任务和需求语义写成部件级的造型规格；配置器把规格里的参数编译成条件图和提示词；模型出候选；设计者检查、修订、回退、锁稿；别人独立量测和盲评。四旋的任务是日常随行航拍，要设计的是顶视下看得见的四处：机身平面轮廓与比例、臂根过渡、机鼻相机舱前缘、分件线与配色分区。语义目标是词对 v1。电机位置受控只是其中的“保持结构”。

**作者看完 P1 的反馈（11/13）。** 23 张图问题很大，不像在做产品设计。我接受：P1 用的是一句通用特征清单，没有使用任务、没有目标部位、没有词对，23 张里辨认不出机鼻相机舱；第二、三轮又只测了跨度比。此前我在 P1 说明和 #19 回复里写的“产品级渲染”是我自己的非盲判断，只指画面完整、有材质细节，不是作者的认可。P1 只能用来讨论参数响应。

**到今天为止的出图都卡在同一步。**

| 环节 | 现状 |
|---|---|
| 需求语义（3.2） | 36 张证据卡入库，词对 v1 已冻结；第二编码和真实产品顶视图未完成 |
| 造型规格（3.3） | [三张规格卡草案](protocols/e3-spec-cards-draft.md)，待作者审阅 |
| 参数与条件图（3.4、5.2） | E0 开源 6 张、E1 36 张：带条件图时 W/L、d/D 各 12/12 命中，纯文字不跟随。L1 七组无一通过整组几何判据。D2 只完成 P 臂 10 张 |
| 生成与协同（3.5、第 4 章） | 0。E2、E3 未开始；G3 小测不能充当 E2 |
| 评价（5.3、5.4） | 新终稿评议 0，E4 场次 0 |
| 六旋（5.5） | 0 |

**没有解决的技术问题。** Qwen 上还没有一个设置能同时保住布局和造型：E1 的条件图加全程边缘控制，几何准但图是平的、臂根有白缝；纯文字有体积但布局不受控；L1 的编辑通路最接近但没过判据；本来要找这个设置的 D2 K、I 臂被取消。P1 在 MiniMax 编辑接口上看到“只画机臂和电机座的参考图能保住跨度比、造型仍自由”，每格一张、非盲，只算线索。

**下一步（都要作者先授权，现在新增出图为 0）。**

1. 作者审阅并改定三张规格卡，裁定草案第 6 节的六个问题。
2. 规格卡定下后，先在 MiniMax 上用三张卡的提示词各出 3 张（共 9 张，带同一张骨架参考图），只看一件事：三张卡出来的是不是三个可辨的设计方向，四个目标部位能不能在图上指出来。不进论文分母，不开 GPU。
3. 作者认可后，在 Qwen 上预登记一个小批次找出图设置：只比传递方式（早停的条件控制、骨架图走编辑通路），用卡 A 的提示词，W/L 两档 × 2 个种子。判据为几何、五条核对项和产品感三题。
4. 设置选定后才跑 E3 的 9 张初稿，随后 E2。

**本机操作备忘。** `gh` 当前账号是 Freeloop993（有写权限），本机还留有另一个只读账号，操作前用 `gh api user --jq .login` 确认。本机全局 git 身份是另一个账号：提交时显式用仓库作者的身份，推送用 `gh auth git-credential`。MiniMax 密钥只放环境变量；作者贴过的那个密钥应当更换。P1 的原图和脚本在 [PR #65](https://github.com/Freeloop993/paper/pull/65)。

## 11 月 12 日及之前的快照

**11 月 13 日交接。** 作者已[取消本轮余项并关机](https://github.com/Freeloop993/paper/issues/19#issuecomment-6830744463)，准备调整研究思路。讨论请从[六张闭源原图、各自的完整提示词与实际参考图](../evidence/d2-closed-six/README.md)进入，按 01–06 引用图号。补充 18 个开源位置只完成了离线编译。

作者看过 MiniMax 三轮 23 张后，请先读[配置器早期并排原图、历轮错误、冻结词对与第四章接手清单](claude-context-20261113.md)。里面列出了跨分支的原图和实发请求，以及当前缺的三方向规格和设计过程证据。

[L1 全部 28 张原件与总览](../evidence/l1-layout-actual/README.md)已完成回收核验，28 个不同 RGB，采样缓存命中 0。[Claude 逐图复核入口](../evidence/prompt-parameter-review/README.md)包含完整实参和提示词。作者已在 [#3 授权 D2 的 42 个位置](https://github.com/Freeloop993/paper/issues/3#issuecomment-6828927053)，后续按 [#63](https://github.com/Freeloop993/paper/pull/63) 开发调参；L1 真人读数待回收。

先读[研究地基](foundation.md)，再读[六章执行清单](execution-playbook.md)、[状态](../STATUS.md)、[Google执行总记录](https://docs.google.com/document/d/1Ek_Ne35sFQFC0FcMU4uNbeFCGl28ipOj9wYOQRN_2ro/edit)及[#1交接](https://github.com/Freeloop993/paper/issues/1)。

## 此刻从哪里接

<!-- e1-actual-start -->
11 月 12 日晚，[E1 原图和实际数据](../evidence/e1-open-20261112/README.md)已核验 36/36，条件图 24 张，纯文字 12 张。两名盲态 AI 各已交 36 份逐图读数；分组均值、离散和命中情况均在原件目录。 真人 12 张抽读待回收，两倍独立读数误差的最终判定待补。E0 开源 6/6、闭源 0/6；作者可在[六张原图及相机与臂根局部](../evidence/e0-open-20261112/gallery.md)中对照。当前实例按作者要求保持开机。
<!-- e1-actual-end -->

作者指出 E1 的几何与造型表现分离。第 3.4、5.2 节请读[全部 12 对同档同种子的原图](../evidence/e1-open-20261112/README.md#第-52-节配对对照)。第 4 章和 E5 的方案图仍取后续锁定终稿。Claude 已在 [#19 转达 R1 修订](https://github.com/Freeloop993/paper/issues/19#issuecomment-6824870785)：12 格 × 2 种子，引用 E1 的 2 张，新增 22 张，加入作用终点 0.35。下段 16 个位置为早期版本。

11 月 12 日晚更新：R0 环境复现 2/2；[E0 开源原件及盲读](../evidence/e0-open-20261112/open-gate.json)为 6/6，两位 AI 独立读取的三档 W/L 均值均递增。真人抽读待收，闭源 0/6。E1 已在同机按先 24 张条件图、后 12 张纯文字的顺序启动。R1 排在 E1 之后、E2 之前，[PR #54](https://github.com/Freeloop993/paper/pull/54)收录 16 份离线请求，2 张将引用 E1，新增最多 14 张。以下保留开跑时登记。

#50、#51、#52 已合并。优云 48 GB 单卡已开机，R0 先验收四份权重、十二节点和原图 Canny 输出，再做两次复现。E0 的六个闭源位置使用官方 `gpt-image-2.6-flare`。两名盲态 AI 全读和一名真人抽读 12 张的种子、脚本与说明见[冻结单](../experiments/r0-e0-e1/README.md)。#3 登记作者决定，#19 留实际运行回执；E2 继续用同一实例，六次运行授权另记 #3。

作者已确定开源 Qwen-Image 2.1＋ControlNet Union 为主后端；闭源 API 仅E0三档×2次。正式视图统一正交顶视。费用、招募、伦理和导师意见在[#3](https://github.com/Freeloop993/paper/issues/3)由作者处理。禁止单张预试；服务器与API到位后核标识与摘要，先交冻结文件再执行。E0→E1→E2任一步失败，停止并向对应工单报告。

## 逐项工单

- [E0 后端对照](https://github.com/Freeloop993/paper/issues/19)
- [E1 参数响应与纯文字对照](https://github.com/Freeloop993/paper/issues/20)
- [E2 父图修订能力](https://github.com/Freeloop993/paper/issues/21)
- [E3 四旋方案展开与深化](https://github.com/Freeloop993/paper/issues/22)
- [E4 D/S 协同对照](https://github.com/Freeloop993/paper/issues/23)
- [E5 顶视终稿独立评议](https://github.com/Freeloop993/paper/issues/24)
- [E6 农业植保六旋应用与响应](https://github.com/Freeloop993/paper/issues/25)

| 章节任务与交付 | 工单 |
|---|---|
| T01 核对开题五项及指标去向 | [#26](https://github.com/Freeloop993/paper/issues/26) |
| T02 固定研究问题与证据单位 | [#27](https://github.com/Freeloop993/paper/issues/27) |
| T03 补齐理论与任务来源 | [#28](https://github.com/Freeloop993/paper/issues/28) |
| T04 对真实评论做双人编码 | [#29](https://github.com/Freeloop993/paper/issues/29) |
| T05 锁定语义差异词对 | [#30](https://github.com/Freeloop993/paper/issues/30) |
| T06 编制两案规格和任务卡 | [#31](https://github.com/Freeloop993/paper/issues/31) |
| T07 定义几何变量与条件图 | [#32](https://github.com/Freeloop993/paper/issues/32) |
| T08 编入E1同信息量对照 | [#33](https://github.com/Freeloop993/paper/issues/33) |
| T09 固定独立量尺和读数误差 | [#34](https://github.com/Freeloop993/paper/issues/34) |
| T10 按E1检验两个参数响应 | [#35](https://github.com/Freeloop993/paper/issues/35) |
| T11 由作者筛选四旋候选 | [#36](https://github.com/Freeloop993/paper/issues/36) |
| T12 记录作者的一案修订 | [#37](https://github.com/Freeloop993/paper/issues/37) |
| T13 完成一案深化表达 | [#38](https://github.com/Freeloop993/paper/issues/38) |
| T14 实施植保六旋单案 | [#39](https://github.com/Freeloop993/paper/issues/39) |
| T15 冻结三组参与者和协议 | [#40](https://github.com/Freeloop993/paper/issues/40) |
| T16 核对D/S动作与机会 | [#41](https://github.com/Freeloop993/paper/issues/41) |
| T17 采集另招设计者的配对场次 | [#42](https://github.com/Freeloop993/paper/issues/42) |
| T18 用r3开展独立顶视盲评 | [#43](https://github.com/Freeloop993/paper/issues/43) |
| T19 复算参数误差与效应 | [#44](https://github.com/Freeloop993/paper/issues/44) |
| T20 归纳协同效果与代价 | [#45](https://github.com/Freeloop993/paper/issues/45) |
| T21 做E6归一化响应比较 | [#46](https://github.com/Freeloop993/paper/issues/46) |
| T22 封存原件与分母 | [#47](https://github.com/Freeloop993/paper/issues/47) |
| T23 把证据写入六章 | [#48](https://github.com/Freeloop993/paper/issues/48) |
| T24 汇总结论与适用范围 | [#49](https://github.com/Freeloop993/paper/issues/49) |

## 写作与数据边界

Claude先查第8节五份稿件，另补T01开题对照与2.1文献页证。Codex等待复核后再准备E0冻结包。E3由作者设计，E4为另招设计者；E5在E6以后统一评锁定终稿。原件、请求、失败与缺失逐实验保留。AI知条件初读与独立真人分列；仅合成检查或历史图不能填正式分母。历史#4—#13保留各自原始回执，#14工具可用于T18改版。

[原型](../prototypes/drone-configurator/README.md) · [证据矩阵](../manuscript/evidence-matrix.md) · [旧批原始分母](../evidence/denominators/README.md) · [上版接手快照](https://github.com/Freeloop993/paper/blob/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/docs/handoff.md)

## 6. 新会话怎样接上（操作备忘）

- **读：** 克隆或拉取 main，按 README → 本页 → STATUS → 开放 Issues 的顺序。复算脚本在 evidence/ 与 experiments/ 各目录，标准库或 Pillow 即可运行；evidence/denominators/recount.py 需私有原件。
- **写（Claude 云端会话）：** 会话若无该仓库的推送凭证，git push 会被拒。做法是请作者在 Claude 内置浏览器登录 GitHub，然后用网页编辑器提交、在 Issue 留言；网页提交显示为作者账号，所以评论开头一律标“Claude：”。提交后拉回远端与本地逐字节比对。提交对话框会被 Copilot 自动填入英文说明，等它填完再改回自己的提交信息。
- **只保留一个 Claude 写稿会话（作者 11/10 决定）。** 11/10 晚曾有两个 Claude 会话并行：一个走分支与 PR（#15、#16），另一个直接向 main 提交了 `f1695cd`（3.6.2 题目分层）与 `8216631`（2.1 六旋段），两边内容已核对无冲突。新会话开工先看最近提交的 Claude-Session 尾注：若有另一个会话在近一小时内提交，先在 #1 说明并停手，由作者指定主会话。
- **合并：** Claude 的改动走 `claude/` 开头的分支与 PR，每轮一个；由 Codex 复核后合并（[分工记录](https://github.com/Freeloop993/paper/issues/1#issuecomment-6767487783)），作者也可自行合并。若会话带有仓库推送凭证（新建任务时选中本仓库；Claude 的 GitHub 应用已于 11/10 授权本仓库），用 git push 推分支，不必走网页编辑器。
- **不做：** 不启动生成、开机、招募、训练；不代对方助手回执；不倒改已运行批次的判据与读数；非盲看图不计入读者分母。
