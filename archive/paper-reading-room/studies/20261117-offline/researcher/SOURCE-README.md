# 研究者交接

本包保存 2026-11-17 离线研究的发放版。主持人自行下载并单独发送参与者的任务文件。仓库读权限覆盖全部目录；保持盲态时，请分发文件附件，勿给评者开通全库权限。A8 的 AI 会话只接收其盲包。

| 任务 | 材料与核对方法 | 现状 |
|---|---|---|
| S2 评论抽查 | [参与者 HTML](../participants/S2-review.html)、[研究者对应键](s2/key.json)、[评分脚本](s2/score.py)、[输入摘要](s2/summary.json)、[原始数据归档](https://github.com/Freeloop993/paper-reading-room/blob/1509ec8a0ced0fd9c5a7ebee28cd8ffeb2ff95a3/datasets/early-crawl/08-semantic-analysis.zip) | 从 228 个保留簇和 1,090 个其余簇分别抽 50、100 条。同一版本完整回件后运行 `python score.py key.json 完整答卷.json`；需 SciPy 和 jieba。 |
| A8 盲法校准 | [三个发放包](../participants/README.md)、[116 行映射](a8/PRIVATE-key.csv)、[68 图来源](a8/github-sources.csv)、[研究者恢复包](a8/A8-researcher-restore.zip)、[评分程序](a3/calibrate.py) | AI 共 68 张，H1/H2 各 24 张。两位真人的 20 个设计案例相同，另有 4 张条件图。每包匿名顺序独立。 |
| A3 四旋复核 | [复核说明及复算](a3/README.md)、[69 个原图入口](a3/originals.csv)、[历史点表与原始记录索引](a3/archive-sources.csv)、[逐图坐标](a3/points.csv)、[中位数及命中数](a3/summary.csv) | 69 份输入含 63 张生成图、B2 的两份终稿与 4 张条件图。A8 只取一份终稿。既有 W/L 是知条件 AI 读数。 |

下载到本地后在 a3 目录执行 `python -B recompute.py`。A8 实际回件请另作私有副本，按 AI、H1、H2 三个子目录保存各自的 response.csv，同级放 PRIVATE-key.csv，再执行 `python -B calibrate.py score 回件目录`。先封存原件、登记判读者和实际盲态。

S2 材料尚无此批真人答卷，A8 尚无本轮独立 AI、真人坐标或一致性结果。E3R2 的 C1–C3 壳长缺测。独立的 11 月 16 日归档目录仍待定位。旧解析图校准、软件测试和本次发布回读各有自己的分母。

[固定提交下载校验记录](verification.json)附逐文件 SHA-256、图像核对分母及复算结果。
