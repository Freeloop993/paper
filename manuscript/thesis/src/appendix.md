<!-- 附录：2026-11-15 由源数据生成。A 取自 experiments/e3-quad-qwen/round-3/dictionary-v16.json；B 取自方法冻结单第 2 节与读数记录字段；C 取自 5.1.3 节与 E5 补充登记；D 取自 evidence/qwen-shape-s4-20261114/shape-readings.csv。 -->

# 附录

## 附录A 造型参数字典与编译短语

第三轮初稿与本文的设计深化使用造型字典 v1.6；5.2.1 节的造型响应批仍按 v1.2，以保证与小测同口径。配置器按固定顺序（开头、布局、朝向、各参数档位、配色、结尾）把规格编译为一段文字，表A.1 为每次都加入的固定句，表A.2 为各参数的档位短语，空短语表示该档不加句。

表：表A.1 造型字典 v1.6 的固定句
| 位置 | 短语 |
|---|---|
| 开头 | Design a compact quadcopter for everyday aerial photography. Strict orthographic top view, nose toward the top edge, arms fully unfolded. |
| 布局 | Match the four motor centres and arm directions in the layout. True X, 250 mm opposite-motor span, equal horizontal and vertical spacing. Each motor carries one stationary two-blade, 5-inch propeller. The two blades of each propeller are identical in length and width and point in exactly opposite directions from the hub, forming one straight blade 180 degrees across, never a V shape; each propeller rests at its own natural angle. No propeller guards. |
| 朝向 | The nose points to the top edge of the image. The rear end of the fuselage is a closed, plain light grey shell: no dark part, opening, camera or module at the tail. |
| 配色（同色臂） | Matte light grey shell and arms in one continuous colour, dark grey motors, black propellers. |
| 结尾 | Show the complete product on a plain light background. Omit guide marks and lettering. |
| 配色（外露碳纹臂） | Matte light grey shell, dark grey motors, black propellers. |

表：表A.2 造型字典 v1.6 的参数档位与短语
| 参数 | 档位 | 短语 |
|---|---|---|
| 机身平面形 | 流线舱 | A rounded pod with a continuous curved outline. |
| 机身平面形 | 方正机壳 | A box-shaped shell with straight sides and clipped corners. |
| 机身平面形 | 切面紧凑壳 | A compact faceted shell: a rounded outline cut by chamfered facets with crisp edges, only slightly longer than it is wide. |
| 臂根过渡 | 无缝 | Each arm grows out of the shell through a smooth seamless blend, with no joint line at the root. |
| 臂根过渡 | 外露承座 | Each arm enters a distinct socket at the shell, with a visible transverse joint seam. |
| 臂根过渡 | 折叠铰接 | Each arm is attached to the shell by a visible folding hinge with a pivot pin. |
| 机鼻相机舱 | 内嵌（无外突） | The camera sits inside the nose, flush with the shell; from directly overhead only a thin dark strip of its front window shows at the very front edge of the nose. The camera faces horizontally forward. |
| 机鼻相机舱 | 前伸云台 | The gimbal camera hangs underneath the front of the fuselage, as on modern foldable camera drones. Seen from directly above, only the top edge of a small dark grey camera housing peeks out just ahead of the nose; the lens faces straight forward toward the top edge of the image, so no lens glass is visible from above. The camera sits low and tight against the nose, with no neck, stalk or post. |
| 顶盖分件 | 单盖 | A plain top cover with no seams crossing it. |
| 顶盖分件 | 两段 | The top cover is divided by one curved transverse parting line into a nose cap and a main cover. |
| 顶盖分件 | 多块 | Three or more distinct top cover panels separated by seams. |
| 表面 | 平整 | （空，不加句） |
| 表面 | 特征线与切面 | The top surface carries crisp character lines and subtly stepped side facets, so the shell reads as layered surfaces rather than one smooth block. |
| 臂材质 | 同色哑光 | Arms in the same matte light grey as the shell. |
| 臂材质 | 外露碳纹 | Exposed carbon-fibre arms with a visible weave, held by dark grey sockets at the shell. |
| 点缀 | 无 | （空，不加句） |
| 点缀 | 电机橙环 | Each dark grey motor carries a thin orange accent ring. |

负向词在模板的通用项之后追加：camera lens visible from above, upward-facing lens, camera on a neck or stalk, camera on a post, camera at the tail, dark module at the tail, V-shaped propeller, blades at an acute angle, single-blade propeller, missing blade, unequal blades。六旋翼任务与机头在画面下端的深化底图不使用其中与机尾、相机有关的词（见 5.5 节与 4.4 节）。

## 附录B 顶视读图判据

每一批图都按同一张读数表判读全部通用项，不因该批关注的问题只读一部分（读法 v2.2）。读者只看匿名编号的原尺寸图，约定画面上方为机头；看不清的项目记“不可判”，不记为 0，也不以对称推断补值。

表：表B.1 读数表的项目与记录值
| 项目 | 读法 | 记录值 |
|---|---|---|
| 轴心坐标 | 逐个点选可见的电机或桨毂中心 | 像素坐标；不可见记缺失 |
| 每轴叶数 | 逐轴数清晰可见的桨叶 | 每轴一个整数；被遮挡记不可判 |
| 机身平面形 | 看机身外轮廓是连续曲线还是直边切角 | 流线舱／方正机壳／不可判 |
| 臂根过渡 | 逐根看机臂与机身的连接；只有颜色变化不算接缝 | 每根记无缝／承座／铰接／不可判 |
| 机鼻外突 | 看机头端是否有越出壳体轮廓的相机舱 | 无外突／前伸／不可判 |
| 顶盖分件 | 看是否有贯穿顶盖、把它分成多块的分型线；外周缝不计 | 单盖／多块／不可判 |
| 相机 | 看相机的位置与可见的光学面，包括机尾端 | 可见相符／顶视不可见／实见错位／不可判 |
| 护圈与残留 | 是否有桨叶护圈；条件图上的点、线、文字是否被画进成图 | 有／无 |
| 产品感 | 是否像可制造的产品，而非示意图或拼贴 | 产品／示意／不可判，并写依据部位 |
| 描述量 | 臂宽与对角毂距之比、壳长与中段宽之比、壳长与对角毂距之比 | 数值，只作描述，不作档位判定 |

**档位判定。** 一个非基准档在其 4 次重复中至少 3 次被判为目标档，且基准图被判为该档的比例不超过四分之一，记为“有响应”。读者写下的依据部位与原话随读数保存，判定与描述分开记录。

## 附录C 独立评议表

评议在锁稿之后进行。评议者事先登记设计背景、与作者的关系及既往曝光，评议中不出示过程、方法标签与读数。表C.1 按作答顺序列出题目。

表：表C.1 独立评议的题目与作答方式
| 顺序 | 题目 | 作答方式 |
|---|---|---|
| 0 | 小图辨向：两种配色的终稿与 2 张真实产品的小图（宽 96 像素，随机转 90° 或 270°），哪一端是机头 | 指出一端或“看不出”；只作描述 |
| 1 | 真实产品顶视图 8—10 张：按四组词对评分 | 7 点量表，另设“看不出” |
| 2 | 描述实际可见的机身、臂根以及机鼻或药箱与喷洒部件 | 文字 |
| 3 | 该任务所需的实体部件是否可见，遮挡单列 | 是／否／遮挡，写部位 |
| 4 | 图中细节是否足以评价任务重点 | 是／否 |
| 5 | 按四组词对评分；任务契合与整体协调 | 7 点量表，另设“看不出”，写依据部位 |
| 6 | 是否推荐沿当前造型继续深化 | 是／否，写理由 |
| 7 | 修订是否达成目标：先问看到了什么变化及其部位，再单独判断目标是否成形 | 文字与是／否／不可判 |

注：两种配色的终稿分页先后出现、不并排，先后顺序在评议者之间轮换；每张单独作答第 2—7 题。

## 附录D 开源后端造型小测的逐张读数

表D.1 为 4.1.3 节小测 12 张的逐张读数，读者为知条件的 AI，种子为 2026111301、2026111302。臂根的四个字母依次对应四根机臂：B 为无缝，S 为承座，H 为铰接，U 为不可判。

表：表D.1 开源后端造型小测的逐张读数
| 图号 | 机身 | 臂根 | 机鼻 | 顶盖 | 相机 | 每轴叶数 | 整体 |
|---|---|---|---|---|---|---|---|
| S0-r1 | 流线舱 | BBBB | 无外突 | 单盖 | 顶视不可见 | 2/2/2/2 | 通过 |
| S0-r2 | 流线舱 | BBBB | 无外突 | 单盖 | 顶视不可见 | 2/2/2/2 | 通过 |
| S1-r1 | 方正 | BBBB | 无外突 | 单盖 | 顶视不可见 | 2/2/2/2 | 通过 |
| S1-r2 | 方正 | BBBB | 无外突 | 单盖 | 顶视不可见 | 2/2/2/2 | 通过 |
| S2-r1 | 流线舱 | SSSS | 无外突 | 单盖 | 顶视不可见 | 2/2/2/2 | 通过 |
| S2-r2 | 流线舱 | SSSS | 无外突 | 不可判 | 待判 | 2/2/2/2 | 通过 |
| S3-r1 | 流线舱 | HHHH | 不可判 | 单盖 | 待判 | 2/2/2/2 | 通过 |
| S3-r2 | 流线舱 | HHHH | 无外突 | 单盖 | 待判 | 2/2/2/2 | 通过 |
| S4-r1 | 流线舱 | BBBB | 前伸 | 单盖 | 错位（机头前伸，镜面可见） | 2/2/2/2 | 未通过 |
| S4-r2 | 流线舱 | BBBB | 无外突 | 单盖 | 错位（云台在机尾，镜面朝上） | 2/2/2/2 | 未通过 |
| S5-r1 | 流线舱 | BBBB | 无外突 | 多块 | 顶视不可见 | 2/2/2/2 | 通过 |
| S5-r2 | 流线舱 | BBBB | 无外突 | 多块 | 待判 | 2/2/2/2 | 通过 |
