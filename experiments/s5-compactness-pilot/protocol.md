# S5 方案：真实多旋翼产品的紧凑感评议

2026-11-19，Claude 起草。现行版本 S5-pilot-5.0，包编号见 [researcher-key.json](researcher-key.json)，摘要记在 [freeze.json](freeze.json)。此前各版都没有发出，没有人作答，经过见[评议用图的审查与更换](stimulus-review.md)。作者把这项数据收集交给 Claude 安排，并要求样本用真实产品、品类尽量多样、靠检索图片取得。

## 一、回答什么

评论里最主要的诉求是小巧、便携。要把“紧凑”写成设计参数，先得知道人看一架多旋翼时凭什么觉得它紧凑。这一步只问一件事：**在一批真实产品里，哪些被看成紧凑，哪些被看成舒展，它和哪些比例有关。**

做法取自感性工学的常规：一组真实产品样本、一组评议者、按词对评分，再看评分与造型要素的关系。L044 用 30 人、5 级量表评 10 个产品样本，L005 对多旋翼外观也是先拆部件再调查偏好（页码见 [page-evidence.csv](../../literature/page-evidence.csv)）。只改一个比例的对照是下一步的事。

## 二、样本

44 款真实的多旋翼产品，来自 22 个品牌：3DR、Aurelia、Autel、DJI、FIMI、Freefly、GEPRC、GoPro、HOVERAir、Hubsan、Hylio、Inspired Flight、Insta360、Parrot、PowerVision、Ryze、Skydio、Skyfront、Sony、Yuneec、ZeroTech、iFlight。

按构型：四旋翼 32 款，六旋翼 8 款，八旋翼 3 款，共轴四轴八桨 1 款。四旋翼是主体，对应第四章的主案例；六旋翼、八旋翼和共轴机型对应论文题目里的“多旋翼”和第五章的跨构型应用，用来看换了旋翼数以后人对紧凑感的判断有没有变化。

按类型：折叠航拍 12 款，行业机 7 款，专业影视 6 款，农业植保 4 款，小型固定臂 3 款，全包护圈 3 款，经典固定臂 3 款，涵道穿越机 2 款，穿越机 2 款，小型折叠 1 款，异形 1 款。

| 编号 | 品牌 | 机型 | 构型 | 类型 | 图片来源 |
| --- | --- | --- | --- | --- | --- |
| P01 | DJI | Mavic 4 Pro | 四旋翼 | 折叠航拍 | apf-drones.com |
| P02 | DJI | Air 3S | 四旋翼 | 折叠航拍 | winfuture.de |
| P03 | DJI | Mini 5 Pro | 四旋翼 | 折叠航拍 | dronescan.cl |
| P04 | DJI | Mavic Pro | 四旋翼 | 折叠航拍 | www.pngall.com |
| P05 | DJI | Spark | 四旋翼 | 小型固定臂 | www.computertroopers.co.za |
| P06 | DJI | Neo | 四旋翼 | 全包护圈 | africadroneking.co.za |
| P07 | DJI | Flip | 四旋翼 | 全包护圈 | prizmatech.pe |
| P08 | DJI | Matrice 30 | 四旋翼 | 行业机 | pusatdrone.com |
| P09 | DJI | Inspire 3 | 四旋翼 | 专业影视 | www.ormsdirect.co.za |
| P10 | DJI | Avata 2 | 四旋翼 | 涵道穿越机 | DJI 官方商城 3D 模型 |
| P11 | DJI | FPV | 四旋翼 | 穿越机 | DJI 官方商城 3D 模型 |
| P12 | Autel | EVO II Pro | 四旋翼 | 折叠航拍 | es.autelpilot.eu |
| P13 | Parrot | ANAFI | 四旋翼 | 折叠航拍 | www.dronesdirect.co.uk |
| P14 | Parrot | ANAFI Ai | 四旋翼 | 折叠航拍 | enterprise.dronenerds.com |
| P15 | Parrot | Bebop 2 | 四旋翼 | 经典固定臂 | www.bestbuy.com |
| P16 | Skydio | Skydio 2 | 四旋翼 | 小型固定臂 | support.skydio.com |
| P17 | Skydio | X10 | 四旋翼 | 行业机 | www.tradewheel.com |
| P18 | Hubsan | Zino Mini Pro | 四旋翼 | 折叠航拍 | www.puhy.cz |
| P19 | FIMI | X8 Mini | 四旋翼 | 折叠航拍 | www.neostore.com.np |
| P20 | Yuneec | Mantis Q | 四旋翼 | 折叠航拍 | www.pccomponentes.pt |
| P21 | Yuneec | Typhoon Q500 4K | 四旋翼 | 经典固定臂 | www.emag.hu |
| P22 | 3DR | Solo | 四旋翼 | 经典固定臂 | www.pinterest.com |
| P23 | GoPro | Karma | 四旋翼 | 折叠航拍 | www.droneflyers.com |
| P24 | Insta360 | Antigravity A1 | 四旋翼 | 折叠航拍 | www.bestbuy.com |
| P25 | HOVERAir | X1 Pro Max | 四旋翼 | 全包护圈 | www.bestbuy.com |
| P26 | Ryze | Tello | 四旋翼 | 小型固定臂 | store.dji.com |
| P27 | ZeroTech | Dobby | 四旋翼 | 小型折叠 | dronomania.ru |
| P28 | PowerVision | PowerEgg X | 四旋翼 | 异形 | www.jib.co.th |
| P29 | iFlight | Nazgul5 | 四旋翼 | 穿越机 | rcdrone.top |
| P30 | GEPRC | CineLog35 | 四旋翼 | 涵道穿越机 | newbeedrone.com |
| P31 | Sony | Airpeak S1 | 四旋翼 | 专业影视 | photorumors.com |
| P32 | Freefly | Astro | 四旋翼 | 专业影视 | www.dslrpros.com |
| P33 | DJI | Matrice 600 Pro | 六旋翼 | 行业机 | www.crutchfield.com |
| P34 | DJI | S900 | 六旋翼 | 专业影视 | uk.pinterest.com |
| P35 | Yuneec | H520 | 六旋翼 | 行业机 | www.constructionequipment.com |
| P36 | Yuneec | Tornado H920 | 六旋翼 | 专业影视 | wacmag.com |
| P37 | DJI | Agras T30 | 六旋翼 | 农业植保 | www.crutchfield.com |
| P38 | Hylio | AG-216 | 六旋翼 | 农业植保 | shop.frontierprecision.com |
| P39 | Inspired Flight | IF1200 | 六旋翼 | 行业机 | advexure.com |
| P40 | Aurelia | X6 | 六旋翼 | 行业机 | uavsystemsinternational.com |
| P41 | DJI | Agras MG-1 | 八旋翼 | 农业植保 | www.tienda24hs.com |
| P42 | Freefly | Alta 8 | 八旋翼 | 专业影视 | pndstore.com |
| P43 | Skyfront | Perimeter 8 | 八旋翼 | 行业机 | skyfront.com |
| P44 | DJI | Agras T50 | 共轴四轴八桨 | 农业植保 | aagri-tech.com.au |

**怎么找的。** 用图片检索逐个机型查“顶视图”，四轮共 90 个检索词、1,080 张候选，逐张看缩略图，再把入选的原图下载下来看大图。检索词、全部候选和每张入选图的来源页、原图地址、文件摘要都留在 `real/web/` 和 [real/samples.json](real/samples.json)。

**筛选标准。** 真顶视（不是斜视）；整机完整、不被画面裁切；臂展开、桨在位且不是转动的虚影；背景干净；没有水印；能判断来源是厂商或销售商的产品图。排除了三类：检索结果里混着的 AI 生成假图（比如机背上长着屏幕的“无人机”）；第三方 3D 模型站的图；原图太小、放大后发虚的图。筛掉和没收的机型及原因写在 `real/prepare_web.py` 开头和 `real/web/rejected.json`。

有两款检索不到够清楚的顶视图（DJI Avata 2、DJI FPV），用的是 DJI 官方商城 3D 模型从正上方的渲染。

**处理。** 抠成白底；去色，免得颜色和配色影响判断；机头朝上；整机外接框的长边占画面 80%，所以评的是比例和形状，不是整机大小。

## 三、流程

1. 说明与同意；背景五题（设计背景、年限、对无人机的熟悉程度、是否认识研究者、此前是否见过这些图）。
2. 44 张图一次一张，顺序逐人随机。每张评三组词：紧凑—舒展、简洁—繁复、整体—拼凑，7 级，另有“看不出”。词对和两端的说明取自词对 v1 草案，左右两端逐题随机对调。评分时图一直留在屏幕上。
3. 是否独自完成，自由意见；导出结果。

大约 15 到 20 分钟。

## 四、读法

1. 报告每款的逐人读数和中位数，按“紧凑—舒展”从紧凑到舒展排出顺序；按构型和类型汇总。构型之间的差别只作探索性描述：六旋翼和八旋翼多是行业机、农业机和专业影视机，用途和旋翼数是混在一起的。
2. 报告“紧凑—舒展”的中位数与各项比例的等级相关。比例有两个来源：图上量得的（整机外接框宽高比、占外接框面积的比例）和官方规格（[30 款机型表](../../evidence/20261117-research-update/README.md)里有的机型）。相关系数用来挑出值得在下一步检验的比例，不作为结论。
3. 只作描述，不设通过门槛。“看不出”保留为一类，不填补。按设计背景有无、对无人机的熟悉程度分开列出，不作组间检验。
4. 目标 10 人。收到 3 份可以先做描述，少于 3 份不报告。同一编号重复发回的算一份。

## 五、限度

- 图来自不同的厂商和销售商，拍摄或渲染的光照、清晰度不一样。去色和统一占幅去掉了一部分差别，去不掉全部。四款的原图偏小，放大了 1.7 到 2 倍：DJI Spark、DJI Matrice 600 Pro、Yuneec Tornado H920、Freefly Alta 8。
- 四旋翼以外只有 12 款，其中八旋翼 3 款、共轴 1 款。三旋翼、双旋翼和多数共轴机型检索不到合格的顶视图（太小、斜视，或只有自制机架），没有收。
- Skydio 2 的原图略带透视，不是严格的正顶视。
- 去色去掉了颜色，但深浅还在：白色机身和深色机身看上去不一样。机体平均灰度记在核对键里，汇总时一并给出相关。
- 统一占幅去掉了整机大小。真实使用里大小本身就是“紧凑”的一部分，这一步不涉及。
- 图上有品牌标识，熟悉无人机的人可能认出机型，按已有印象评分。背景题里问了熟悉程度，分开列出。
- 只有展开状态的顶视。折叠后的体积和携带体验不在内。
- 筛图是我一个人做的，没有第二个人复核。
