# S5 44 张图的第二次几何取点回件

## 收到的原始回件（2026-11-20）

- [标点电机.json](标点电机.json)：来自 `geometry/annotator/无人机取点.html` 的原始导出，保持原始 JSON 字节内容不变。
- `schema=s5-geometry-v1`，`pack=e4dcbb96a567`，`reader_id=0b8f82094f4c`。
- 开始至结束：`2026-11-20T02:16:56.314Z` 至 `2026-11-20T03:02:54.666Z`（UTC），用时约 46.0 分钟。
- 图数 **44/44**，包含 **204** 个电机中心点；每图机壳前后左右缘及桨尖取点均有记录，坐标基准为 **720×720**。
- 自报：`training=有`，`exposure=没有`。这些是答卷里的自报，尚未通过外部方式确认其身份与相对于第一判读者的实际独立性。
- 与 [annotator/order.json](../annotator/order.json) 对照：包编号、44 个图像编号及各图电机数量完全一致；全部坐标处于画面范围内。
- 原始文件 Git blob SHA-1：`9bf5785bd34470004102b32f7f9558d3fd15c799`。

## 下一步

现有第一判读者原始点在 [../points.csv](../points.csv)，其分析见 [几何取点说明](../README.md)。可在 `experiments/s5-compactness-pilot` 目录下运行：

```sh
python3 geometry/compare.py geometry/returns/标点电机.json
```

该比较程序将 720 像素坐标按比例换算为 1024 像素，对照 44 张图的电机中心、机壳边缘与四项规格比例。**此文件只归档了回件并完成基础格式核对，尚未把两位判读者的比较结果记为结论。**
