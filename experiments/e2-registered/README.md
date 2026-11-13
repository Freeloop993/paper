# E2 局部编辑 · 六份 Qwen 请求

本实验检验设计者能否单独修改机鼻或臂根，同时保留原布局。原文与量测判据见 [双父图登记](https://github.com/Freeloop993/paper/issues/21#issuecomment-6821671015)，运行范围见 [作者授权](https://github.com/Freeloop993/paper/issues/3#issuecomment-6851509121)。

| 位置 | 图片输入 | 正向提示词 | 种子 |
|---|---|---|---|
| P1-A、P1-B | E1 W/L=1.00 第一次的原 PNG | 分别取 A、B 原句 | 2026111401、2026111402 |
| P2-A、P2-B | E1 d/D=0.50 第一次的原 PNG | 分别取 A、B 原句 | 2026111403、2026111404 |
| 对照 P1-A | W/L=1.00、d/D=0.50 部件定位图 | 对应 E1 原文加 A | 2026111405 |
| 对照 P2-B | 同一张部件定位图 | 对应 E1 原文加 B | 2026111406 |

A 收窄、收圆机鼻前缘，相机窗随前缘变化。B 加宽四处臂根的圆滑过渡。登记原句见 [instructions.json](instructions.json)。两张父图都来自 E1 原件，文件摘要分别以 `ebc0f`、`0c51b` 结尾。完整 SHA-256、原图路径与请求摘要均见 [manifest.json](manifest.json)。

四个父图位置使用已归档的 Qwen 图像编辑工作流，两个无父图位置继承各自对应的 E1 ControlNet 请求。两个对照的基础提示词分别描述间距比与桨径比，种子各异；比较时须保留这些差异。正式编辑分母为四，对照分母为二。

在仓库根目录运行 `python -B experiments/e2-registered/compile.py --check` 可从原件重建并比对全部六份请求。[weights.json](weights.json) 是以往的机上摘要，实际运行应另存当次核验与逐图回执。MiniMax H3 的同题开发预实验单列，不占这六个位置。
