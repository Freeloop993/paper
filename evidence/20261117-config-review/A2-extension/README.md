# A2 扩样｜2026-11-17

**后续轴心复点**　两款共 10 个轴心已取得第二次独立 AI 读数。[逐机复点差与原始回件](repeat.md)。下文中的单次判读说明对应首轮记录。
新增 **2 款、10 个电机轴心**：DJI Neo 2（四旋），DJI AGRAS T20（六旋）。来自 A1 已归档的厂商原手册。这里记录的是具体型号的手册图面比例，不是拍照测绘或实机卡尺测量。旧批 Air 3、Mavic 3 Pro、Neo、AGRAS T30 均未计入。两批合计 6 款（四旋 4，六旋 2），没有就此增加任何评分样本。

| 型号 | 印刷 / PDF 页（从 1 起） | 轴心 W × L（px） | W/L | 对置轴距均值 D（px） | 主体长 × 宽（px） | PV01 | PV02 | PV03：d/D均；d/D最大 |
|---|---|---:|---:|---:|---|---:|---:|---|
| [手册原图](https://dl.djicdn.com/downloads/DJI_Neo_2/UM/20251210/DJI_Neo_2_User_Manual_v1.2_en.pdf#page=79) | 79 / 79 | 491 × 323 | 1.520124 | 587.441422 | 698 × 191 | 3.654450 | 0.325139 | 缺测 |
| [手册原图](https://dl.djicdn.com/downloads/t20/20201201/Agras_T20_User_Manual_v1.4_EN.pdf#page=31) | 29 / 31 | 1138 × 937 | 1.214514 | 1162.645694 | 缺测 | 缺测 | 缺测 | 0.494969；0.451186 |

**读图文件**：[原始点及来源](readings.json)（两份 PDF SHA-256、裁框 RGB SHA-256、版本、裁框和方向依据）、[逐机指标](metrics.csv)、[逐桨读数](rotors.csv)、[独立复算脚本](recompute.py)。[手册原图](https://dl.djicdn.com/downloads/DJI_Neo_2/UM/20251210/DJI_Neo_2_User_Manual_v1.2_en.pdf#page=79) · [手册原图](https://dl.djicdn.com/downloads/t20/20201201/Agras_T20_User_Manual_v1.4_EN.pdf#page=31)。本机标注副本用蓝点标电机轴心，红点标机身支撑点，绿线连同桨叶尖。仓库链接指向厂商原手册，坐标和复算脚本随表提供。两图均为机头向上。

## 手册与选页

| 筛查对象 | 实际看过的关键图（PDF 页） | 取舍 |
|---|---|---|
| [DJI Neo 2 原手册 v1.2](https://dl.djicdn.com/downloads/DJI_Neo_2/UM/20251210/DJI_Neo_2_User_Manual_v1.2_en.pdf) | [第 79 页](https://dl.djicdn.com/downloads/DJI_Neo_2/UM/20251210/DJI_Neo_2_User_Manual_v1.2_en.pdf#page=79)的电源键和电量指示图；另看第 10、17、73、74、75 页 | 79 页是固定四轴的完整背部顶视，云台端及中央电池可辨，四个桨夹圆弧可读。10 页手形遮住中央壳面；17 页右图显示下视部件；73 页下图是护罩安装视图；75 页用放大插图覆盖两处原轴位。17、73、75 页用于核对部件、前向及叶数。 |
| [DJI AGRAS T20 原手册 v1.4](https://dl.djicdn.com/downloads/t20/20201201/Agras_T20_User_Manual_v1.4_EN.pdf) | [第 31 页](https://dl.djicdn.com/downloads/t20/20201201/Agras_T20_User_Manual_v1.4_EN.pdf#page=31) Aircraft LEDs；第 10、11、13 页 | 31 页显示六臂、六副完整展开桨和 M1–M6；正文将 M1、M2、M6 指为前方三臂。第 10 页右图臂已展开但桨仍收拢，第 11 页才指示展开桨；13 页整机为斜视。 |
| [DJI AGRAS T16 原手册 v1.2](https://dl.djicdn.com/downloads/t16/20191230/Agras_T16_User_Manual_v1.2_EN.pdf) | [第 10 页](https://dl.djicdn.com/downloads/t16/20191230/Agras_T16_User_Manual_v1.2_EN.pdf#page=10)和第 13 页 | 第 10 页右图可作轴位候选，但桨折拢；13 页的整机是斜视。本轮选了可同时量布局及桨径的 T20，没有为 T16 记数，也未证实其余各页都不可用。 |

## 取点和适用边界

按旧 A2 用 Poppler 26.07.0 以 576 dpi 渲染整页原向 RGB，裁框左上含、右下不含。坐标原点在裁图左上，x 向右、y 向下。两图均为上视示意，桨轴不叠合、左右成对、毂部近圆；未据此认定工程投影等比例。只在同一张图内取比，不跨图比较像素长度。

- W、L 分别是全部轴心在机身右向、机头前向的投影极差。四旋对角距取 FL–RR、FR–RL；六旋对置距取 M1–M4、M2–M5、M3–M6。Neo 2 两条对角距为 587.72、587.17 px；T20 三条为 937.00、1275.47、1275.47 px。
- PV01 = 主体长 / 主体宽，PV02 = 主体宽 / D均。Neo 2 宽取齐装电池侧面外缘（同一截面 y=595），长从云台外侧的固定壳肩量到视觉模块后的尾壳，排除护圈及连桥；若研究改为裸壳尺寸须重读。T20 药箱、臂座及框架不能按同口径圈出一个连续中央外壳，两项都留空。
- PV03 的 d 是每副双叶桨两尖直距的机内均值。T20 所有 6 副均可辨，d = 575.474150 px；三条对置轴距不同，故 d/D均 与 d/D最大分列。各桨的两尖在轴心所张夹角为 179.23°–179.84°。Neo 2 三叶桨的两尖仅给出一条弦，不能沿用双叶法。CSV 空值不是零。
- Neo 2 护罩筋覆盖了一部分桨夹，以仍可见的小圆外缘估读中心，在局部窗口用环上灰度复核。T20 以桨夹两紧固点圆心的中点取整；叶尖沿用 A2 局部 ±18 px 窗口、灰度 ≤96、最远深色像素的选点规则。种子、最终点和方法均随点表存档。图线宽度和取点会影响末位；仅一位知型号的判读者，独立重复判读为 0。

## 本地复算

在本目录运行（第一行只需 Python 标准库；后两行需 Pillow 及 PATH 中可用的 pdftoppm，预览用 Windows Arial 字体）：

```powershell
python recompute.py
python recompute.py --verify-images
python recompute.py --preview
```

默认与现存两份 CSV 比较；加 `--write` 才重写 CSV。手册默认取 `../../A1-A4-C1/manuals.local`，可用 `--manuals` 指定。核验包含原 PDF 字节及重渲染裁框 RGB 摘要、取点范围、Neo 2 桨夹圆环、T20 轴心中点及 12 个叶尖。交付时另用旧 A2 的 measure 函数按相应四/六旋公式核对，两款逐机数值均与独立脚本在 CSV 精度内相符。沿用旧组名仅用于交叉核算；扩样数据保留 extension_quad / extension_hex 分组。

