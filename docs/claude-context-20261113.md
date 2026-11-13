# 从早期配置器到 P1：作者复盘用的图、实参和接手清单

截至 2026-11-13，以作者看完 P1 后要求重新讨论方向为界。本页为讨论索引，沿用各批原始判据和分母。本轮应交付第四章规格草案，新增出图数为 0。

## 先看作者指的是哪张图

1. **一年前的并排图。** 左边是黑底、红色电机点、蓝色机臂方向线；右边是有壳体和臂根过渡的灰色四旋，也有坐标线和字形残留。作者原附件与历史 Git 文件的 SHA-256 相同（`be18a284d071da1ebeddf0f71d127ffa56ea329e1e20e5f5aedc4817d9e7cdb0`）。这是同一张并排截图，逐字请求、种子以及左右两份独立原件均未核实。按作者当时决定只作设计动机，故从 main 的实验证据目录撤下。用历史链接看图即可。[并排图](https://github.com/Freeloop993/paper/blob/4ffdd95206d6a724bd91d98159e1fef354144350/evidence/historic-guides/author-pilot/quad-layout-and-output.png) · [作者决定](https://github.com/Freeloop993/paper/issues/19#issuecomment-6826226433)
2. **有实际输入、输出可核的参数示例。** 看桌面原型的轴位图与对应输出，再看 E 盘配置器源码如何从任务、部件参数、设计者选项组装生成文本。早期蓝橙亲子户外简报可供理解短语分组和材料层次；本次四旋的任务是日常随行航拍。[第一组定位图、生成图与回执](../evidence/desktop-parameter-first-example/README.md) · [70°/110° 示例](../experiments/desktop-parameter-v2/README.md) · [源码地图](../prototypes/drone-configurator/README.md) · [配置器纠偏记录](configurator-realignment.md)
3. **后来的蓝色上壳 CMF 示范。** 页内有实际参考图、提示词、输出和双叶读数。参考与文字同轮改变，前摄整合仍不可判；作者曾指出其 CMF 模糊、不协调。能讨论材质分区，与获得作者的美学认可，是两件需要分别记录的事。[两代参考与输出并排](../evidence/quad-guide-cmf-review/reference-comparison.jpg) · [原图、提示词与限制](../evidence/quad-guide-cmf-review/README.md)

## 实验走到哪一步，哪些错误不能带进稿件

| 批次 | Claude 应打开的图或原始记录 | 已发生的问题与可保留的结论 |
|---|---|---|
| 历史造型批与 P04—P06 | [整组退出清单](../evidence/formal-reset/README.md)、[双叶预试](../evidence/p04-quad-biblade/README.md)、[相机姿态原文](../evidence/p06-quad-front-camera/README.md)、[实际历史控制图](../evidence/historic-guides/README.md) | 12 张旧造型图退出新版正式集，仍保留看图后排除的时间顺序及旧真人反馈。P04 出现同副两叶大小失衡；P05 把机载前摄与渲染视点的“朝向”混在一句，顶面出现朝观察者的圆镜片。P06 消除该表象后，机鼻整合仍缺可见线索。闭合切角壳是 S1-F 的画法；旧 C1 的机壳边界未描线。 |
| R0、E0、E1 | [E0 六张开源原图与局部](../evidence/e0-open-20261112/gallery.md)、[E1 同种子对照、读数与实际图](../evidence/e1-open-20261112/README.md) | R0 两张用于复现。E1 完成 36 张；两位独立 AI 读数下，带轮廓条件图的 W/L、d/D 各 12/12 在 ±0.10 内，纯文字分别为 0/6、4/6，均未随档递增。看 W/L=1.00、种子 2026111212：受控图的臂根有白缝，文字图有体积却露出机身前壁。造型差异可能同时来自条件图、边缘控制和文字；独立真人几何校准仍待回收。 |
| L1 | [28 张原件](../evidence/l1-layout-actual/README.md)、[实际 Canny 边缘图](../experiments/l1-layout/step0/README.md)、[两名 AI 的盲读](../evidence/l1-layout-actual/readings/README.md) | 已比较点线、桨叶轮廓、浮雕和编辑等通路。A/B 有 X 线或圈印进机身；G 的两档均值接近目标，仍有一张归一化轴位误差两读者都超过 0.05。七组均未通过整组几何判据。布局稀疏是作者的设计意图，哪一种传递方式适合正式任务仍须凭证据选。 |
| D2 与内置闭源诊断 | [逐图实发正负词、种子、CFG、控制强度与区间、输入和原 PNG](../evidence/prompt-parameter-review/by-image.md)、[P 臂十图](../evidence/d2-tuning/D2-P.jpg)、[闭源六图逐号图文](../evidence/d2-closed-six/README.md)、[停机回执](https://github.com/Freeloop993/paper/issues/19#issuecomment-6830744463) | D2 的 P 臂 10 张已核验；K/I 中断时最终数待回执，开源补充 18 份只编译、提交 0。闭源 03/04 共用父图，04 另加定位图；05/06 只用文字。应交叉查相机安装词、材料与灯光措辞、参考顺序和相互矛盾的要求，不凭一张失败图断言 prompt 或控制强度是唯一原因。 |
| P1 · MiniMax H3-Image | [三轮共 23 张、实际请求和响应](https://github.com/Freeloop993/paper/tree/88b60037760999802942015e60a05084b5c1c591/evidence/p1-param-prompt)、[三张总览与非盲读数](https://github.com/Freeloop993/paper/blob/88b60037760999802942015e60a05084b5c1c591/evidence/p1-param-prompt/README.md)、[参数预设](https://github.com/Freeloop993/paper/blob/88b60037760999802942015e60a05084b5c1c591/experiments/p1-param-prompt/param_prompt.py) | 13＋6＋4。T1-raw/enhanced 可查服务端改词后数值怎样变成画面标注；T2、G5 已有方向 A/B 和材质、配色取值；G2 带桨盘的块面被画成圆片或虚影，G3 宽档把蓝线画进机臂。G4/G5 的宽长比接近目标，读数知条件、每格一张、无种子。作者看后的反馈与旧交接中“产品级”的判断不一致，后者应标出判断者与范围。可讨论参数响应；三个正式方向的任务转译、机鼻相机舱整合、独立设计质量评价仍缺。 |
| G3 与正式评议 | [旧 G3 父图、两张改稿、匿名真人与 AI 原判](../evidence/g3-actual/README.md)、[正式研究地基与 E2—E6](foundation.md) | G3 已有一位非作者盲态真人与一位独立 AI。带父图时，真人判上盖与臂根保持、肩部不可判；两位对前摄改动的可辨性有分歧。这个小测不能充当 E2 或 E5。新正式终稿评议尚缺；不能把“盲评 0”推广到全部研究。 |

## 第四章从规格开始

先对照[六章目录](../manuscript/outline.md)、[研究地基 v1.2](foundation.md)、[真实评论证据卡](../evidence/semantic-cards/README.md)和[冻结词对 v1](https://github.com/Freeloop993/paper/blob/dad19783e8e798f3974f896ccb95e4a298685162/docs/protocols/word-pairs-v1-draft.md)。后者文件名仍带 draft，正文已记作者确认。顶视初稿用“紧凑—舒展、简洁—繁复、整体—拼凑”；“低调—醒目”只进配色深化。把用户对部件集成的愿望转到相机舱和臂根，是研究者作出的设计解释。两张 [Gephi 图](../evidence/semantic-cards/gephi/README.md)分别来自评论与商品详情页参数。

- 请先交三张**待作者审阅的规格卡**。每张写清使用任务、证据卡号及推断、目标词对、四个可见部位、改变项、保持项、自由项、参数去向和一句可以在顶视上判断的标准。四个部位为机身平面比例与轮廓、臂根与壳体的过渡、机鼻相机舱前缘、分件线与色块。每个方向附一份由这些字段编译的短提示词，明确渲染视线和机载前摄朝向；桨叶两侧等长、每轴双叶列入核对。
- 用条件图给电机轴心和必要的臂向关系；机壳外形、臂宽、臂根过渡的自由度写明。现行正式出图、修订、量测和评议均用正交顶视。相机舱只能评价可见的前缘、遮挡和接缝，镜头俯仰、真实厚度和飞行性能不能从顶视图推出。请逐图记录“可辨／不可判”及依据；“未看见镜片”不能自动判设计失败。
- 按章节列待取证内容：E2 的受控父图修订；E3 的作者选稿、理由、父子版本与锁稿；E4 的真实设计者 D/S 同条件对照；E5 的独立评议；E6 的农业植保六旋，任务部件为药箱、喷洒组件与六臂机架。请回交规格卡和缺口，作者审阅后再定下一次实验。本次交接没有授权 MiniMax 3×3、Qwen 确认批或重新开机。
