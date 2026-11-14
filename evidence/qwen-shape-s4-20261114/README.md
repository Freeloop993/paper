# Qwen 造型参数小测与 S4 相机措辞修订

本页是 11 月 14 日已回收的实测。每份请求与其对应的 PNG 均直接取自云端回收包，保留原字节；[逐图索引、种子和两种文件的 SHA-256](manifest.json)。十二张和后续两张各计各的分母。每个目录均以原图号命名，S4 配对跨两个目录同名。

| 批次 | 输入与判读材料 | 实收及判读 |
|---|---|---|
| 六档造型小测 | [12 张原图及实际请求](shape-12/) · [六档冻结请求](../../experiments/qwen-shape-pilot/) · [逐图实读](shape-readings.csv) · [前三档](shape-S0-S2.jpg) · [后三档](shape-S3-S5.jpg) | 12/12。S0 为基线；S1 方盒机身、S2 承座、S3 铰接、S5 分件各 2/2 命中；S4 机头前伸位置 1/2。全组原判据通过 10/12；12/12 四个旋翼均为双叶。相机顶视不可辨 6、待判 4、错误 2。 |
| S4 单句修订 | [2 张原图及实际请求](s4-revision-2/) · [整机前后](s4-before-after.jpg) · [等倍机头](s4-nose.jpg) · [逐种子判读](s4-paired-reading.json) | 2/2。两个种子分别和旧 S4 配对。机头前伸 1/2 → 2/2；满足“俯视只见云台顶部”0/2 → 0/2；四个旋翼均双叶 2/2 → 1/2。两张修订图均未判为机背镜头，但仍存在光学面或开口暴露的问题。 |

本批使用 Qwen 原生图像编辑输入同一[红点蓝线布局图](layout.png)。种子为 2026111301、2026111302，改动限定在正向提示词相机句；原句和修订句如下。相同种子也可能对非目标部件产生影响，已保留第一种子的少叶错误。

**原句**

> A small camera gimbal with visible side arms projects in front of the nose. The camera faces horizontally forward; its optical face is hidden from directly overhead.

**修订句**

> At the nose on the upper edge of the fuselage in the image, a small gimbal on two side arms projects upward in the image beyond the nose outline; its lens faces horizontally toward the top edge of the image, so the orthographic overhead view shows only the opaque top of the gimbal and the upper surfaces of its supports.

**论文使用范围。** 以上判读者为知条件 AI，未作独立真人读数。总体小测过线可以报告，S4 的具体失败也应报告。第 3 章和第 5 章可用这些数据说明指令作用的范围和错误。第 4 章的设计成果须由设计者检查和取舍；本页两张修订图未被采纳为父图或正式方案。E3 本次 0/9。

**云台实物与提示词。** [DJI Mini 3 Pro 官方手册，印刷页 9，图中部件 2](https://dl.djicdn.com/downloads/DJI_Mini_3_Pro/UM/20230328/DJI_Mini_3_Pro_User_Manual_v1.6_EN.pdf#page=10)给出了机头云台与相机的安装位置；印刷页 6 介绍了三轴增稳。它支持前置云台这一产品参照。图中出现的外伸双支架、上下两块具体形态以及可转动空间，没有与之匹配的结构验证。在图像读数中，第一种子可辨出面向观察者的镜面，第二种子上盖近机身一侧有深色圆窗；单张图不能量出光轴角度。论文的四旋顶视设计对象是机鼻相机舱的前缘轮廓、机身、臂根和分件。遮住镜头符合正常顶视情形。[F1/F1b 与章节路线](../../docs/foundation.md)
