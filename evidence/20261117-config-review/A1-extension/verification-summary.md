# 八款新增机型的逐机复核摘要

表中尺寸单位均为 mm。“缺”表示来源未给出可归到该状态的数值。质量优先保留厂商原单位。每行链接指向所核版本，原始网址和 SHA-256 在[来源清单](sources.csv)。

| 型号 | 展开 | 折叠 | 重量参考状态 | 核验位置及比较限制 |
|---|---|---|---|---|
| Hylio AG-216 | 1701.8 × 1498.6 × 609.6 | 889 × 1066.8 × 609.6 | 39 lb，不含电池 | [V4.0 英制规格 PDF 1](https://assets-global.website-files.com/5d3b17e74e1172272cd74eed/648b4070a5794318ac36196b_AG-216%20Spec%20Sheet%20Imperial%202023.pdf#page=1)。Configuration 为 X 型六旋，两态都不含桨。原序分别为 67 × 59 × 24 和 35 × 42 × 24 in，厂商未标轴序。 |
| Garuda GA-AD-V2 | 1988 × 1804 × 580，长×宽×高 | 平面 760 ± 2 × 760 ± 2，高缺 | 24.90 kg，含载荷的最大总重 | [图2和§3.3，印刷11–13 / PDF 10–12](https://www.garudaaerospace.com/pdf/products/agri-kisan-drone-v2/ga-ad-v2-user-manual.pdf#page=10)。六个臂端各一副桨。展开图的 1988 ± 1 标线连到桨尖，折叠图只给两向标注。 |
| Joyance JT20L-606 | 1950 × 1950 × 500 | 700 × 700 × 800 | 18.5 kg，净重；计电池状态未说明 | [Machine Size，宽×长×高](https://joyance.tech/9541.html)。[标型号的整机图](https://joyance.tech/wp-content/uploads/2021/12/2021122307184022.jpg)可数出六臂六桨。两态的计桨口径均未声明。 |
| Joyance JT30L-606 | 2200 × 1850 × 800 | 1250 × 900 × 800 | 27 kg，净重；计电池状态未说明 | [Machine Size，宽×长×高](https://www.joyancedrone.com/30Lfumigationdrone(JT30L-606).html)。[整机图](https://iororwxhqnprln5p.ldycdn.com/cloud/lmBpiKjlliSRpjpkjjnojo/30L.jpg)显示六个分立轴位，正文另列六套动力。两态的计桨口径均未声明。 |
| Nileworks Nile-JZ | 宽 2110、长 1916、高 727（液剂箱） | 宽 626、长 716，收臂后高度缺 | 最大起飞重量 ≤27 kg | [厂商手册](https://www.nileworks.co.jp/NileJZ_manual.pdf)印刷 2-25 的“機体”表列 6 枚、6X 排列、692 mm 桨径。2-29、2-30 列展开尺寸与液剂装置高度。收纳脚注只说明收臂。已核原文索引；整份 PDF 哈希缺。 |
| TTA M6E-X2 | 机架高 465，长宽缺 | 机架宽 400、高 601，长缺 | 9.5 kg，不含电池 | [印刷5–6 / PDF 9–10](https://www.ttaviation.org/wp-content/uploads/2022/03/M6E-X2-Manual202201.pdf#page=9)给出机架尺寸、1290 mm 对角轴距、585 mm 桨径；[印刷13–14 / PDF 17–18](https://www.ttaviation.org/wp-content/uploads/2022/03/M6E-X2-Manual202201.pdf#page=17)列 M1–M6 各臂的单桨旋向。 |
| TTA M6E-G200 | 机架高 710，长宽缺 | 机架宽 827.2、高 710，长缺 | 15.8 kg，不含电池 | [印刷10–11 / PDF 15–16](https://www.ttaviation.org/wp-content/uploads/2022/04/M6E-G200-Manual-V3.0%EF%BC%88H12%EF%BC%89.pdf#page=15)给出机架尺寸、1700 mm 对角轴距、762 mm 桨径；[印刷7–8 / PDF 12–13](https://www.ttaviation.org/wp-content/uploads/2022/04/M6E-G200-Manual-V3.0%EF%BC%88H12%EF%BC%89.pdf#page=12)按 M1–M6 区分每臂单桨旋向。两款 TTA 的尺寸字段均未说明是否计桨。 |
| DJI Mini 4 Pro | 298 × 373 × 101，含桨 | 148 × 94 × 64，不含桨 | <249 g，含标准智能飞行电池、桨和 microSD 卡 | [v1.4 手册 PDF 104](https://dl.djicdn.com/downloads/DJI_Mini_4_Pro/20240627/DJI_Mini_4_Pro_User_Manual_en.pdf#page=104)列两态尺寸，PDF 110 注[1]定义重量，[PDF 14](https://dl.djicdn.com/downloads/DJI_Mini_4_Pro/20240627/DJI_Mini_4_Pro_User_Manual_en.pdf#page=14)为四臂机体图。[官网尺寸栏](https://www.dji.com/mini-4-pro/specs)确认长×宽×高。 |

Garuda 的图2(c)另标 609 ± 0.6 mm，性能表印刷 14 / PDF 13 的螺旋桨规格写 23 in。两项无法互证为相同桨径，因此该机桨径数值留空。同样，手册的最大总重不能作为空机质量使用。

展开和折叠可直接按相同“不含桨”口径比较的新增机型是 AG-216。若统计六旋机的展开外廓，新增 7 款中有 5 款具备三维，其余 2 款 TTA 仅能贡献机架局部尺寸、对角轴距和桨径。
