# Qwen 造型小测 · 离线编译与复验

**12 份请求已编译，本次 Qwen 提交 0、成图 0；第 3 节待作者签署。** 范围为 S0–S5 各两份，字典 v1.2、读法 v2.1，六格共用一张常规 250 mm 红点蓝线 PNG。实机验收与后端选择待后续判读。[#1 当前安排](https://github.com/Freeloop993/paper/issues/1#issuecomment-6858488547) · [Qwen 编辑通路与门槛](https://github.com/Freeloop993/paper/issues/1#issuecomment-6854091119) · [PR #68 冻结单](https://github.com/Freeloop993/paper/blob/638db88bc08b1b828da88436d598061f3afe1ae4/docs/protocols/method-freeze-v1.md)

| 条件 | 相对 S0 的变化 | 份数 |
|---|---|---:|
| S0 | 圆舱、无缝臂根、机鼻无外突、单盖 | 2 |
| S1 | 方正机壳 | 2 |
| S2 | 承座臂根 | 2 |
| S3 | 铰接臂根 | 2 |
| S4 | 机鼻前伸云台 | 2 |
| S5 | 多块顶盖 | 2 |

**原图与参数。** 独立解包核对了 12 份请求、6 段正向词、1 张 1024² 条件图。正向词逐字匹配 H3 第二轮各格相应的实发请求。与 L1-F 两个对应重复的实际 history 比对，图中仅正向词、LoadImage 文件名和 SaveImage 前缀有变化。点线图进入 `TextEncodeQwenImage21.images.image_1`，VAE 同时接入。保留原负向词及 40 步、CFG 3、Euler/simple、denoise 1。工单未指定小测种子，本包沿用 L1-F 的两个种子 2026111301、2026111302，各条件按重复号配对。[历史 Qwen 实发图与回执](../../evidence/l1-layout-actual/L1-actual/L1-F-wl0.70-r1/) · [v1.2 字典和点线图来源](../../evidence/form342-h3-dev/round-2/)

**使用与校验。** 解包后 `manifest.json` 按位置记录请求、图、正向词的 SHA-256，以及历史来源和种子。编辑通路的三份 BF16 权重合计 32,440,124,920 字节，各自的历史摘要见 `weights.json`。在本目录执行以下离线命令即可从仓库原件复核；省略 `--check` 可生成缺少的包文件。

```text
python -B build.py --check
```

ZIP 共 16 项，82,995 字节，SHA-256 为 `168a1316e27eb7fb1848d011382b5619056d19ad80355e174beb727cc002ffc2`。[离线 ZIP](qwen-shape-pilot-offline.zip) · [清单](manifest.json) · [构建脚本](build.py)

**待确认。** H3 第三轮后，S0 机鼻两轮合计 4 张无外突、1 张前伸、2 张待判，标记为“H3 上判读不稳”。K 轴距组不进入这十二份。原实例身份、服务进程、节点插槽、当次加载权重的字节与 SHA、服务读到的条件图均待实机核对。签署前保留离线状态；受理、采样缓存、回执、费用与效果均无本批观测。后端判据保留为每个非基准档至少 1/2 命中，且 12 张里至少 9 张整体通过。[第三轮开发读数](../../evidence/form342-h3-dev/round-3/README.md) · [范围与签署前提](https://github.com/Freeloop993/paper/issues/3#issuecomment-6855511232)

**E2 本地复验。** 现有 E2 登记清单 SHA-256 为 `d0ecfd255ed258f82920ef0b6b5159fef8310341de7e7819785633f5dfe809b3`。从两张父图和条件图复核 6 份请求，使用现有打包器在仓库外生成并解包 15 项临时 ZIP，独立从包内再次校验。运行器 10 项、读者流程 8 项测试均在临时副本通过，覆盖原件校验与匿名交接。复验前后 E2 目录 25 个文件的路径与内容组合摘要相同。临时包已清理，E2 实机提交 0。[现有 E2 包](../e2-registered/)
