# evidence：现行的证据

2026-11-20 整理后这里只留两类：写论文要引用的正式证据，和说明设计决定由来的方法开发记录。哪一批能进正文、哪一批只能以数字出现，以[哪些数据能进论文](usable-for-writing.md)为准。退役的批次在 [archive/evidence](../archive/evidence/)。

## 正式证据

| 文件夹 | 是什么 |
| --- | --- |
| [semantic-cards](semantic-cards/) | 评论语料的证据卡 |
| [r0-20261112](r0-20261112/)、[e0-open-20261112](e0-open-20261112/)、[e1-open-20261112](e1-open-20261112/) | R0、E0、E1：部件图条件控制的比例批。图已退役，只留读数（E1 的图已删） |
| [real-product-topview](real-product-topview/) | 真实机型的顶视图 |
| [20261117-research-update](20261117-research-update/README.md) | 11 月 17 日的线下数据：真实机型规格与手册量测、设计图复测、评论复算与 S2 题面 |

人的评议数据不在这里，在 [experiments/s5-compactness-pilot](../experiments/s5-compactness-pilot/README.md)（S5）。

## 方法开发

| 文件夹 | 说明什么 |
| --- | --- |
| [historic-guides](historic-guides/)、[s1-axis-repeat](s1-axis-repeat/)、[s1-decomposition](s1-decomposition/)、[g2-six](g2-six/)、[g2b-actual](g2b-actual/)、[l1-layout-actual](l1-layout-actual/)、[prompt-parameter-review](prompt-parameter-review/) | 条件图的画法和强度是怎么选出来的 |
| [guide-choice-20261113](guide-choice-20261113/) | 条件图的分工 |
| [form342-h3-dev](form342-h3-dev/)、[qwen-shape-s4-20261114](qwen-shape-s4-20261114/README.md)、[h3-camera-layout-originals](h3-camera-layout-originals/) | 造型字典的开发，含 H3 的相机布局原图 |
| [section421-h3-span](section421-h3-span/)、[section421-minimax-review](section421-minimax-review/)、[quad-author-selection](quad-author-selection/) | E3 三个设计方向的来源 |
| [g3-actual](g3-actual/)、[x12-calibration](x12-calibration/) | 评议工具的校准 |

## 还不在主分支上的正式证据

11 月 18 日清单列为“正式证据”的下列文件夹，主分支上没有，仍在没有合并的分支里（主要是 `claude/e3-quad-qwen` 和 `claude/direction-todo-20261117`）：`gpu-day-20261115`、`20261115-review-takeover`、`20261117-offline-review`、`e2r-hub-readback`、`e5-paired-topview`、`e5-individual-reviewed`、`semantic40-second-coding-20261115`、`semantic40-pairing`、`20261117-config-review`、`20261117-a1-a4-c1`、`20261115-local-edit`。第四章要用的 E3 三轮设计、GPU 日的记录和评议答卷都在其中。合并顺序见[整理清单](../planning/2026-11-18-cleanup-list.md)第二节，还没有执行。
