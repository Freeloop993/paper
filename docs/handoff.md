# 接手快照 · 2026-11-12

先读[研究地基](foundation.md)，再读[六章执行清单](execution-playbook.md)、[状态](../STATUS.md)、[Google执行总记录](https://docs.google.com/document/d/1Ek_Ne35sFQFC0FcMU4uNbeFCGl28ipOj9wYOQRN_2ro/edit)及[#1交接](https://github.com/Freeloop993/paper/issues/1)。

## 此刻从哪里接

<!-- e1-actual-start -->
11 月 12 日晚，[E1 原图和实际数据](../evidence/e1-open-20261112/README.md)已核验 36/36，条件图 24 张，纯文字 12 张。两名独立 AI 的逐点读数正在汇总。 真人 12 张抽读待回收，两倍独立读数误差的最终判定待补。E0 开源 6/6、闭源 0/6；作者可在[六张原图及相机与臂根局部](../evidence/e0-open-20261112/gallery.md)中对照。当前实例按作者要求保持开机。
<!-- e1-actual-end -->

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
