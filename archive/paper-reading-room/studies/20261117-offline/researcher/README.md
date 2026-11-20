# 研究者公开复核入口

- A3： [研究说明](a3/README.md) / [取点原表](a3/points.csv) / [历史校准档案](a3/archive/) / [复算脚本](a3/recompute.py)
- S2： [生成脚本](s2/build.py) / [计分脚本](s2/score.py) / [摘要](s2/summary.json)
- A8： [原图来源表](a8/github-sources.csv)；不包括匿名分发包或解盲映射。
- [源仓核验清单](verification.json)

S2 `key.json`、A8 `PRIVATE-key.csv` 和 `A8-researcher-restore.zip`、A3 的 `gold-private.json` 均只留在原私有仓。执行依赖键的评分时，请在单独的私有工作目录中使用；不得把键作为公开 PR 附件。

