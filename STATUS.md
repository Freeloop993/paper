# 论文研究状态 · 11 月 17 日

**11 月 21 日，再续。** 作者审 PR #94 后定了五件事，交在新的分支和 PR 里：工作台 3.6.0 的起始值取自 32 款真实四旋翼，与实验条件分开；自由提示并进同一块画布，两种方式同一后端、同样的记录；第 6 篇文献不补，2.6 节只差“编辑达成与其余保持分开评”一行的原件；A8 做完：不知情的 AI 判读者与两位真人一样准，窄档 0/12 三人都复现，WLQ 中档命中在不知情的读数下是 3/12（此前 5/12），[读法](evidence/20261117-research-update/a8-ai/README.md)。[复核记录](prototypes/drone-configurator/review/20261121-defaults-free-prompt/README.md)。仍没有对真实 GPU 主机测过。

**11 月 21 日，续。** 分支上的第 4、5 章证据已回到主分支。两条规则定下（机壳端点取外轮廓；只谈做工和材料性能的评论不算造型语义）。最接近的 6 篇文献核完 5 篇。工作台 3.5.0 接上了 Qwen 后端，[复核记录](prototypes/drone-configurator/review/20261121-research-logic.md)；没有对真实 GPU 主机测过，开机后先验一张，再做作者的两场预试。

**11 月 21 日。** A8 两份真人取点回件已读：电机中心、W/L、机壳宽与对角电机距之比与读者无关，“目标 0.70 读成约 1.0”由两位不知情的读者复现；机壳长宽比两人差约 7%，A4 开机前要把“机壳上下端取外轮廓”写进规则，[读法](evidence/20261117-research-update/a8-click/returns/reading.md)。独立 AI 的读数仍是 0。S6 词对编码页面按作者意见删去了登记范围以外的两个小问题，结果只进 3.2 节现有的表 3.2，不新增小节。

**11 月 20 日，续。** A8 的真人取点可以开始：两个发放包各做成了一个可以直接点的页面，[怎么发、怎么收](evidence/20261117-research-update/a8-click/README.md)，不用 GPU；下一次开 GPU（F1，随后 A4）排在两份取点回件和独立 AI 读数之后。评论少算是否连累后面的步骤已用整层数据核过：谈大小、轻重的评论保留了 93%、96%，少算集中在做工和质量类，[说明](evidence/20261117-research-update/comments/README.md)。

**11 月 20 日。** 第一批真人数据到位：S5 紧凑感评议，四旋翼 32 款 10 名评议者、44 张混排 7 名，两位判读者各量了一遍规格比例。[结果和读法](experiments/s5-compactness-pilot/responses/README.md)：整机占外接框面积、机壳宽与对角电机距之比与紧凑感相关，电机布局宽长比无关；六、八旋翼上评议者的读法分成相反的两拨。原私有阅读库的材料已全部迁入 [archive/paper-reading-room](archive/paper-reading-room/README.md)（129 个文件）。**当晚补记：** S5 第一步收齐，筛除一份后四旋翼有效 10 人、混排有效 7 人；S2 评论核查做完，保留的 228 条是干净的（48/50），但少算了（召回 62.6%），漏掉的以做工、质量类评论为主，[读法](evidence/20261117-research-update/comments/README.md)。[按蓝图逐环还缺什么](planning/research-panorama/progress-20261119.md#十二两项人的数据收齐之后按蓝图还差什么2026-11-20-夜)。

**11 月 19 日。** 作者上传的 226 份文献已检查并整理成[文献库](literature/README.md)（131 项，44 项核过原页）；[研究进度与实际情况](planning/research-panorama/progress-20261119.md)按论证链逐环列出文献依据、现状和下一步。本日没有新增实验数据和真人场次。写作取图取数以[哪些数据能进论文](evidence/usable-for-writing.md)为准。

11 月 18 日已建成[跨设备研究资料库](planning/research-library/README.md)，核对文献、语料及构型，运行了结构化路由、自然语言排序和两次本地文字生成。两份草稿都缺有效卡号。18 份私有材料等待独立编码，本轮新增真人场次为 0。[实测与失败记录](planning/research-library/qa/README.md)

**11 月 18 日工作台交接。** [当前研究进度与已核运行记录](planning/workbench-handoff/context/README.md) · [源代码、文献和第二台电脑验收](planning/workbench-handoff/README.md)。下表为前一阶段的研究基线。

面向复核的实验索引。每行单独说明材料、样本和可回答的问题。相同原图在回收、读数和评议阶段多次出现；跨行相加会重复计数。[导师阅读稿与正文范围](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/manuscript/thesis/review/handoff-20261117/README.md)

| 研究环节 | 已取得的材料 | 解释或待验证项 |
| --- | --- | --- |
| 评论与需求 | 7,443 个检索文本簇中，1,318 个所属商品标题含航拍机标签；其中 228 个保留造型表述。已有 40 条第二编码。新共词表使用 1,318 簇；另有 150 条分层抽样人工核查题面。 | 150 条待真人作答；图词频不能给出造型参数权重。[新图及核查方法](evidence/20261117-research-update/comments/README.md) · [第二编码原登记](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/experiments/semantic40-pairing/README.md) |
| E0、E1 布局控制 | **11 月 19 日退役：图不合格，E1 原图已移除，只留读数，不作为本文方法的结果。** 四旋 E1 开源共 36 张；条件图的 W/L、d/D 按原容差各 12/12，纯文字各 0/6、4/6。 | 限双叶部件图及相应控制分支。E0 闭源六张按作者决定从正式比较剔除。[E1 原批](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/e1-open-20261112/README.md) · [范围决定](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/planning/2026-11-17-direction-and-todo.md) |
| E3 设计实践 | 首轮 A/B/C 共 9 张，后有第二、三轮及作者取舍。第三轮 B2 获选，深化采用去上端深窗、下端为机头的方向。 | 区分原始候选、人工作图与色材调整；开发结果不能替代效率比较。[首轮](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/evidence/e3-quad-qwen-20261115/README.md) · [第二轮](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/evidence/e3-quad-qwen-20261115/round-2/README.md) · [第三轮](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/evidence/e3-quad-qwen-20261115/round-3/README.md) · [深化稿](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/experiments/e3-deepening/README.md) |
| 局部编辑 | 旧 E2 六张作历史资料；E2R 六张有真人独立答卷和 AI 判读。B2 修订 12 张另有两次匿名 AI 判读。第一版三组局部编辑各三张，均未过开发门。 | 分报目标改变及非目标保持。第二版 73 份为离线请求，17 份开发、56 份有条件确认。本索引未取得其生成回执。[E2R 与部位量测](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/e2r-hub-readback/README.md) · [B2](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/evidence/gpu-day-20261115/dual-hexa-handoff/blind-b2/README.md) · [第一版](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261115-review-takeover/local-edit/README.md) · [第二版登记](https://github.com/Freeloop993/paper/blob/ca4b5349dbfdda162357e0c676c085345bd46b60/experiments/20261117-local-edit-v2/README.md) |
| 正式造型与字典 | v1.2 正式 24 张、v1.6 平行 24 张有原图与匿名读数；另有组合 24、S12 扩展 48、S16 扩展 24，共 96 张经两次 AI 盲读。 | 按字典、批次、种子和读数来源分开；同一图的复读不增加图数。表中的 96 张包含在末批 102 张回收件中。[正式与平行批](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261115-review-takeover/README.md) · [96 张读数](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261117-offline-review/README.md) · [102 张回收件](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/experiments/gpu-day-20261115/recovered-originals-102/README.md) |
| 真人评议 | 配对评图 3 份、逐图读图 3 份；另有结构观察 12 图的完整答卷 3 份，其中 2 份自报事前未接触条件。 | 各题独立计数。醒目度是原配色题的目标；两项任务的答卷不能相加推断不同人数。顶盖判读仍有分歧。[逐图评价](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/e5-individual-reviewed/README.md) · [结构观察](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261117-offline-review/design-review/README.md) |
| 农业植保六旋与材质开发 | 39 张更正后六旋输出，主比较 12 张与扩展 24 张有一次独立 AI 布局复测；两种喷洒部件改法及碳纹臂各 3 张另作开发，有知条件初读。 | 六旋仅作可行性探测。某喷头在俯视可辨不足以推断喷洒性能；碳纹开发未确认整组通过。[六旋与开发读数](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261117-offline-review/README.md) |
| 工程比例、真实产品与协同对照 | A1 官方资料、A2 手册图面和 A3 生成图读数的分母各异。E4 已有任务卡与计时约定；3 位外部设计者各两场及 10 人独立评议均为招募目标。 | 优先复用坐标、校准读数，冻结实际设计流程的比例任务后再确认。作者双条件实做之后才进入三人正式场次。[本轮数据](evidence/20261117-research-update/README.md) · [作者预试](evidence/20261117-research-update/method/paired-pilot.md) |

历史试跑、费用和旧签署节点保留在[整理前的状态页](https://github.com/Freeloop993/paper/blob/6b22143c39f7bc0969b616f43704cb4d24a20310/STATUS.md)。工作流的模拟测试、图像回收和独立真人结果按各自凭据登记。
