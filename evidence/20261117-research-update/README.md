# 11 月 17 日研究资料与复算入口

本次补齐了消费航拍四旋的官方规格，复核了设计生成图的布局比例，并按航拍商品范围重算评论共词。图面量测、评论筛查和设计者实验各有自己的样本单位。

| 材料 | 本批覆盖 | 从哪里复核 |
|---|---|---|
| A1 官方规格与 A2 手册量图 | 新增 6 款消费四旋。合并后有 20 款四旋、10 款六旋，64 条状态记录。新增 7 张手册顶视图的 28 个轴心，四旋累计 11/20 款有图面量测。 | [官方来源和字段口径](a1/README.md) · [型号与原表行号](a1/crosswalk.csv) · [原始坐标](a1/a2-points.json) |
| A3 设计图与 A8 校准 | 36 张 WLQ、27 张 E3，另核 B2 同一造型的两份配色文件。E3 有 14/27 张落入 W/L＝1.00 ± 0.10。当前独立 AI 与真人几何回件均为 0。 | [分批读数与校准范围](a3/README.md) · [逐图坐标](a3/points.csv) · [按批次复算](a3/summary.csv) |
| 评论共词与 S2 抽查 | 从 7,443 个去重文本簇中取标题含航拍机标签的 1,318 簇，以固定的 137 个词重算。150 条分层抽查题面已准备，真人结果待收。 | [共词图、分词规则与抽样说明](comments/README.md) · [汇总](comments/summary.json) · [节点](comments/nodes.csv) · [边](comments/edges.csv) |
| 研究方法与导师稿 | 两项作者预试委托及计时约定；前三章中语料范围、图表和变量定义的逐处检查。外部设计者场次尚待执行。 | [配对预试](method/paired-pilot.md) · [前三章核对清单](method/chapters-1-3.md) |

持有原件的研究者可按各组 README 复算。A1 表保存厂商原始规格的出处、桨叶状态和缺项。A2 的 D 为同一手册图中两条电机对角距的均值，单位为像素。A3 的已知条件读数及历史校准各列分母。评论图按同一文本簇内共现计数。

A8 与 S2 的受限材料由各自交付者维护。已获权限的研究者从现有[私有阅读库](https://github.com/Freeloop993/paper-reading-room)查收相应版本，参与者由主持人单独领取题面。

<details>
<summary>逐文件发布清单（33 个附件）</summary>

- **A1 / A2（8）**　[README.md](a1/README.md) · [a1-additions.csv](a1/a1-additions.csv) · [a1-all-models.csv](a1/a1-all-models.csv) · [a2-metrics.csv](a1/a2-metrics.csv) · [a2-points.json](a1/a2-points.json) · [crosswalk.csv](a1/crosswalk.csv) · [sources.csv](a1/sources.csv) · [verify.py](a1/verify.py)
- **A3 / A8（14）**　[README.md](a3/README.md) · [archived-parent-points.csv](a3/archived-parent-points.csv) · [calibrate.py](a3/calibrate.py) · [guide-check.csv](a3/guide-check.csv) · [guide-pixels.csv](a3/guide-pixels.csv) · [image-metrics.csv](a3/image-metrics.csv) · [parent-check.csv](a3/parent-check.csv) · [points.csv](a3/points.csv) · [prior-calibration-scores.csv](a3/prior-calibration-scores.csv) · [prior-calibration.csv](a3/prior-calibration.csv) · [reader-register.csv](a3/reader-register.csv) · [recompute.py](a3/recompute.py) · [source-index.csv](a3/source-index.csv) · [summary.csv](a3/summary.csv)
- **研究方法（2）**　[chapters-1-3.md](method/chapters-1-3.md) · [paired-pilot.md](method/paired-pilot.md)
- **评论（9）**　[README.md](comments/README.md) · [build.py](comments/build.py) · [cooccurrence.png](comments/cooccurrence.png) · [edges.csv](comments/edges.csv) · [figure.py](comments/figure.py) · [form.template.html](comments/form.template.html) · [nodes.csv](comments/nodes.csv) · [score.py](comments/score.py) · [summary.json](comments/summary.json)

</details>
