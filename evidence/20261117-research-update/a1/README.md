# 消费航拍四旋的官方规格与顶视轴心量测

2026-11-17。A1 新核六款、14 条尺寸状态记录，合并后为 **20 款四旋、10 款六旋，共 30 款、64 行**。A2 从六款新增机型及原有 Mini 4 Pro 的官方手册中，实际读取了 **28 个电机轴心**。原有两批 A2 已量四旋 Air 3、Mavic 3 Pro、Neo、Neo 2，合计有图面量测的四旋现为 **11/20 款**。既有六旋量测另有两款。

[合并规格表](a1-all-models.csv) · [本次新增规格](a1-additions.csv) · [逐型号去重对照](crosswalk.csv) · [官方来源及哈希](sources.csv)

## A1 的六款新增机型

下表以 mm 记尺寸，DJI 采用长 × 宽 × 高，道通保留厂家原序。括号中的页码依次为印刷页和 PDF 文件页。原表以厂商及产品型号计数，同机的尺寸状态、地区、电池或相机版本分别登记在相应字段。

| 型号 | 折叠 | 展开 | 重量（g） | 官方规格定位 |
|---|---|---|---:|---|
| DJI Mavic Air | 168 × 83 × 49 | 168 × 184 × 64 | 430 | [手册 53 / 54](https://dl.djicdn.com/downloads/Mavic%20Air/Mavic_Air_User_Manual_v1.2_en.pdf#page=54) |
| DJI Mavic Air 2 | 180 × 97 × 84 | 183 × 253 × 77 | 570 | [手册 47 / 48](https://dl.djicdn.com/downloads/Mavic_Air_2/20240528UM/Mavic_Air_2_User_Manual_v1.6_EN.pdf#page=48) |
| DJI Mavic 2 Pro | 214 × 91 × 84 | 322 × 242 × 84 | 907 | [手册 62 / 62](https://dl.djicdn.com/downloads/Mavic_2/201911um/Mavic_2_Pro_Zoom_User_Manual_v2.0_en.pdf#page=62) |
| DJI Mavic Mini | 140 × 81 × 57 | 159 × 202 × 55；245 × 289 × 55（含桨） | 249 | [手册 41 / 42](https://dl.djicdn.com/downloads/Mavic_Mini/20240103/2/Mavic_Mini_User_Manual_v1.2_EN.pdf#page=42) |
| DJI Mini 3 Pro | 145 × 90 × 62 | 171 × 245 × 62（不含桨）；251 × 362 × 70（含桨） | &lt;249 | [手册 66 / 67](https://dl.djicdn.com/downloads/DJI_Mini_3_Pro/UM/DJI_Mini_3_Pro_User_Manual_EN.pdf#page=67) |
| Autel Robotics EVO Nano+ | 142 × 94 × 55 | 260 × 325 × 55（含桨） | 249 | [手册 77 / 88](https://www.autelrobotics.cn/wp-content/uploads/2023/06/%E7%AE%80%E4%B8%AD_EVO-Nano%E7%B3%BB%E5%88%97%E9%A3%9E%E8%A1%8C%E5%99%A8%E7%94%A8%E6%88%B7%E6%89%8B%E5%86%8C_V3.0.9.pdf#page=88)、[商城含桨尺寸](https://shop.autelrobotics.com/products/drones-evo-nano-plus) |

- Mavic Air、Mavic Air 2、Mavic 2 Pro 的规格页列出折叠和展开两态，尺寸表本身没有交代量到桨尖与否。Mavic Mini 将普通展开与含桨展开分列，Mini 3 Pro 明确分别标出不含桨和含桨。重量表述保留等值、上限和部件配置。Mavic Mini 的 249 g 是该版手册的最大起飞质量，Mini 3 Pro 的 <249 g 是标准电池配置的起飞重量。
- EVO Nano+ 在官方商城有明确的含桨折展尺寸，同版本中文手册表 1-3 对 Nano+ 列的最大尺寸也写作 260 × 325 × 55 mm。附录 A.1 的系列尺寸却写作展开 325 × 260 × 62 mm、折叠 142 × 94 × 62 mm，轴序和计桨状态均未注明。表内用有计桨说明的商城值，附录读数保存在分歧列。轴距和整机重量分别取自附录。纳入 Nano+ 一款，系列共用机架说明见印刷 27 / PDF 38。[官方 Nano+ 规格对照](https://shop.autelrobotics.com/products/drones-evo-nano-plus)
- 六款的官方轴距或对角线距离都有出处。只有明确写明**最大**对角轴距时才填相应列。桨径列包括手册、厂商标称桨尺寸和兼容配件规格，具体型号与换算见“桨径定位”。Mavic Mini 的配件页当前只显示地区不可用，桨径留空。六款的主体长宽及实物量测列均留空。
- 去重底表为既有的 `c1-ux-a2/A1-extension/a1-all-models.csv`（SHA-256 `c63edd03fef297d8441e8405f6f622e57cfbed6060239bf9af5bac7a883a4c9e`），其中已经包含 `A1-A4-C1/a1-model-specs.csv` 首批记录。前者的 50 行、42 个原字段已逐值回查。本次追加 14 行，并在表尾补充字段级出处。[逐型号对照表](crosswalk.csv) 给出两表的行号，表头计作第 1 行。Mavic 2 Pro 用 Pro 的重量，共用 Pro/Zoom 手册只计一次；Mini 4 Pro 只补 A2。各型号属于有原件可核的便利样本。

## A2 的七张顶视图

[原始轴心坐标、裁框与 PDF 哈希](a2-points.json) · [两条对角距和均值](a2-metrics.csv) · [复算脚本](verify.py)

W 和 L 依次为四个轴心在机体左右、前后方向上的投影极差。D 取左前至右后与右前至左后两条直线距离的算术平均。各图机头均朝上，距离单位为图内像素。表中 D 用于同图归一化，跨图比较可用 W/L。

| 型号 | 原厂图位置（印刷 / PDF） | W × L（px） | W/L | D 均值（px） |
|---|---|---:|---:|---:|
| DJI Mavic Air | [6 / 7](https://dl.djicdn.com/downloads/Mavic%20Air/Mavic_Air_User_Manual_v1.2_en.pdf#page=7) | 253 × 219 | 1.155 | 334.62 |
| DJI Mavic Air 2 | [16 / 17](https://dl.djicdn.com/downloads/Mavic_Air_2/20240528UM/Mavic_Air_2_User_Manual_v1.6_EN.pdf#page=17) | 505 × 369 | 1.369 | 602.85 |
| DJI Mavic 2 Pro | [9 / 9](https://dl.djicdn.com/downloads/Mavic_2/201911um/Mavic_2_Pro_Zoom_User_Manual_v2.0_en.pdf#page=9) | 667 × 490 | 1.361 | 792.61 |
| DJI Mavic Mini | [28 / 29](https://dl.djicdn.com/downloads/Mavic_Mini/20240103/2/Mavic_Mini_User_Manual_v1.2_EN.pdf#page=29) | 266 × 189 | 1.407 | 322.25 |
| DJI Mini 3 Pro | [7 / 8](https://dl.djicdn.com/downloads/DJI_Mini_3_Pro/UM/DJI_Mini_3_Pro_User_Manual_EN.pdf#page=8) | 479 × 316 | 1.516 | 518.83 |
| DJI Mini 4 Pro | [11 / 11](https://dl.djicdn.com/downloads/DJI_Mini_4_Pro/20240627/DJI_Mini_4_Pro_User_Manual_en.pdf#page=11) | 655 × 441 | 1.485 | 717.70 |
| Autel Robotics EVO Nano+ | [封面（无印刷页码） / 1](https://www.autelrobotics.cn/wp-content/uploads/2023/06/%E7%AE%80%E4%B8%AD_EVO-Nano%E7%B3%BB%E5%88%97%E9%A3%9E%E8%A1%8C%E5%99%A8%E7%94%A8%E6%88%B7%E6%89%8B%E5%86%8C_V3.0.9.pdf#page=1) | 1409 × 957 | 1.472 | 1668.28 |

### 如何复量

1. 按点表中的 URL 和 SHA-256 锁定手册版本，用 Poppler `pdftoppm 26.07.0`、576 dpi、默认 RGB PPM 渲染指定页。PDF 页从 1 开始，未旋转或拉伸。
2. 用记录的整页框 [左、上、右、下) 裁图。坐标是裁图左上为原点的整数像素，向右为 x 正向，向下为 y 正向。FL、FR、RL、RR 分别指机体的左前、右前、左后、右后。点表逐图说明轴心识别依据、装桨状态及定向。
3. 本批逐图检查了机背、四臂和四个桨毂。Mavic Mini 的状态灯图露出腹面，采用有机头箭头的操纵模式图；Mavic Air 2 的装桨示意覆盖了放大细节，采用感知范围图；Mavic 2 Pro 的上下两幅分别显示机背和腹面，取带电池键的机背图。Nano+ 的封面为系列共图，放大可见原始位图的像素块。
4. 例如 Mavic Air 的 W = 360 − 107 = 253 px，L = 361 − 142 = 219 px，两条对角均为 √(253² + 219²) = 334.62 px。其余机型均从各自四点独立计算两条对角后取均值。CSV 保留六位小数供复算，报告宜保留更少位数。

在本目录运行下列命令。第一行用 Python 标准库核查型号、原表行号、点位范围、两条对角和均值。第二行还按原厂 PDF 重渲染并核对七张裁图像素摘要，需要 Pillow、Poppler 和已下载的原件。PDF 下载网址、版本、文件名与哈希见[来源清单](sources.csv)。将原件保存在指定的本地目录后，用 --pdf-dir 传入该目录。

```powershell
python verify.py
python verify.py --pdf-dir ../private
```

本批是单名知型号判读者对真实产品手册示意图的取点，独立第二判读为零。两次计算和像素摘要可检验录入与复现，图示比例、绘图简化和取点误差仍会影响外推。Mavic Air 2 与 Mavic 2 Pro 的图示很相近，厂商图稿是否独立绘制未核实。机身主体边界、桨尖及物理毫米轴距未作图面标定，毫米规格保留在 A1 原始口径中。
