# 阅读库公开补档 / Public backfill

> 原仓库：[Freeloop993/paper-reading-room](https://github.com/Freeloop993/paper-reading-room)（私有，保留原样）
> 
> 来源分支与提交：`main` / `cc122ae8757f175cde92484da194b568fcbb7a3a`
> 
> 归档日期：2026-11-20

这个目录将私有阅读库中**可公开、可复算**的内容补入 `paper`，采用独立目录，既不改动主仓既有实验，也不改写原仓。逐个文件记录了 Git SHA-1、大小和是否已在主仓别处存在：见 [FILE-INDEX.json](FILE-INDEX.json)。

**本次从源仓复制 42 个文件。另 87 个文件不公开，仍在私有源仓。** 不是丢失，详见 [MIGRATION-STATUS.md](MIGRATION-STATUS.md)。

## 可用材料

- **四篇硕士学位论文 PDF 原件**：[原件目录](originals/) · [页数、SHA-256 与参考文献数](manifest.json)。其中三篇字节已存在于主仓文献库，第四篇（何彦）原先缺失。
- **S2 评论抽查题面（150 条匿名编号评论）**：[原始单文件 HTML](studies/20261117-offline/participants/S2-review.html)。仅含 `S001` 起的匿名项目编号及评论正文，**研究者对应键仍私有**。
- **A3 图面比例、历史校准与复算原始记录**：[A3 研究说明](studies/20261117-offline/researcher/a3/README.md) · [点表](studies/20261117-offline/researcher/a3/points.csv) · [归档](studies/20261117-offline/researcher/a3/archive/)。其中 `gold-private.json` 未公开。
- **A8 原图来源表（不含揭盲键）**：[github-sources.csv](studies/20261117-offline/researcher/a8/github-sources.csv)。
- **S2 处理、评分脚本与样本汇总**：[build.py](studies/20261117-offline/researcher/s2/build.py) · [score.py](studies/20261117-offline/researcher/s2/score.py) · [summary.json](studies/20261117-offline/researcher/s2/summary.json)。
- **早期爬取数据原件的文件级清单**：[数据说明](datasets/early-crawl/README.md) · [ZIP 校验与包内文件清单](datasets/early-crawl/manifest.json)。原始 ZIP 仍私有。

此前源仓的 [README 原文](SOURCE-README.md) 随档保存。它含指向原私有仓的绝对链接；在这里请优先使用上面的公开相对路径。原文档涉及的所有私有链接不等于授权公开。

请留意：公开的 S2 题面不包含答案、揭盲映射或参与者实际回件；A8 当前公开的也只是已有原图来源记录。**不能据此把待收实验写成已完成。**
