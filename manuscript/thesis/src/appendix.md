<!-- 附录：2026-11-15 由源数据生成。A 取自 experiments/e3-quad-qwen/round-3/dictionary-v16.json；B 取自方法冻结单第 2 节与读数记录字段；C 取自 5.1.3 节与 E5 补充登记；D 取自 evidence/qwen-shape-s4-20261114/shape-readings.csv。 -->

# 附录

## 附录A 造型参数字典与编译短语

E3 第三轮初稿与本文的设计深化使用造型字典 v1.6；5.2.1 节的造型响应实验沿用 v1.2，以便与开源后端造型预试采用同一版本的短语、结果可以对照。配置器按开头、布局、朝向、各参数档位、配色、结尾的固定顺序，将规格编译为一段英文提示词，作为生成模型的实际输入。表A.1 列出每次编译都加入的固定句，表A.2 列出各参数的档位短语；短语为空表示该档不追加语句。

表：表A.1 造型字典 v1.6 的固定句
| 位置 | 短语 |
|---|---|
| 开头 | Design a compact quadcopter for everyday aerial photography. Strict orthographic top view, nose toward the top edge, arms fully unfolded. |
| 布局 | Match the four motor centres and arm directions in the layout. True X, 250 mm opposite-motor span, equal horizontal and vertical spacing. Each motor carries one stationary two-blade, 5-inch propeller. The two blades of each propeller are identical in length and width and point in exactly opposite directions from the hub, forming one straight blade 180 degrees across, never a V shape; each propeller rests at its own natural angle. No propeller guards. |
| 朝向 | The nose points to the top edge of the image. The rear end of the fuselage is a closed, plain light grey shell: no dark part, opening, camera or module at the tail. |
| 配色（同色臂） | Matte light grey shell and arms in one continuous colour, dark grey motors, black propellers. |
| 配色（外露碳纹臂） | Matte light grey shell, dark grey motors, black propellers. |
| 结尾 | Show the complete product on a plain light background. Omit guide marks and lettering. |

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
| 表面 | 平整 | （空，不追加语句） |
| 表面 | 特征线与切面 | The top surface carries crisp character lines and subtly stepped side facets, so the shell reads as layered surfaces rather than one smooth block. |
| 臂材质 | 同色哑光 | Arms in the same matte light grey as the shell. |
| 臂材质 | 外露碳纹 | Exposed carbon-fibre arms with a visible weave, held by dark grey sockets at the shell. |
| 点缀 | 无 | （空，不追加语句） |
| 点缀 | 电机橙环 | Each dark grey motor carries a thin orange accent ring. |

负向提示词追加在模板通用项之后，内容为：camera lens visible from above, upward-facing lens, camera on a neck or stalk, camera on a post, camera at the tail, dark module at the tail, V-shaped propeller, blades at an acute angle, single-blade propeller, missing blade, unequal blades。其中与机尾、相机有关的词以四旋翼航拍相机和“画面上方为机头”为前提，因此不用于六旋翼任务，也不用于机头位于画面下端的深化底图（见 5.5 节与 4.4 节）。

## 附录B 顶视读图判据

各批图像均按同一张判读表（读法 v2.2）判读全部通用项，不因某一批次关注的问题而只判读其中一部分。判读者只查看以匿名编号呈现的原尺寸图，并约定画面上方为机头；无法看清的项目记为“不可判”，既不记为 0，也不按对称关系推断补值。

表：表B.1 判读表的项目与记录值
| 项目 | 判读方法 | 记录值 |
|---|---|---|
| 轴心坐标 | 逐个点选可见的电机或桨毂中心 | 像素坐标；不可见者记为缺失 |
| 每轴叶数 | 逐轴清点清晰可见的桨叶 | 每轴记一个整数；被遮挡时记“不可判” |
| 机身平面形 | 判断机身外轮廓为连续曲线还是直边切角 | 流线舱／方正机壳／不可判 |
| 臂根过渡 | 逐根观察机臂与机身的连接，仅有颜色变化不视为接缝 | 每根记无缝／承座／铰接／不可判 |
| 机鼻外突 | 判断机头端是否有超出壳体轮廓的相机舱 | 无外突／前伸／不可判 |
| 顶盖分件 | 判断是否有贯穿顶盖、将其分为多块的分型线，外周缝不计 | 单盖／多块／不可判 |
| 相机 | 观察相机的位置与可见的光学面，机尾端一并检查 | 可见相符／顶视不可见／实见错位／不可判 |
| 护圈与残留 | 是否有桨叶护圈；条件图中的点、线、文字是否残留在生成图中 | 有／无 |
| 产品感 | 判断是否像可制造的产品，而非示意图或拼贴 | 产品／示意／不可判，并注明依据部位 |
| 描述量 | 臂宽与对角毂距之比、壳长与中段宽之比、壳长与对角毂距之比 | 数值；仅作描述，不用于档位判定 |

**档位判定。** 某一非基准档在 4 次重复中至少有 3 次被判为目标档，且基准图被判为该档的比例不超过四分之一时，记为“有响应”。判读者写下的依据部位与原始描述随判读结果一并保存，档位判定与描述性记录分开。

## 附录C 独立评议表

独立评议在方案定稿之后进行。评议开始前，记录每位评议者的设计背景、与设计者的关系以及此前对评议材料的接触情况；评议过程中不向评议者出示设计过程、方法标签与判读结果，以免影响其判断。表C.1 按作答顺序列出各题。

表：表C.1 独立评议的题目与作答方式
| 顺序 | 题目 | 作答方式 |
|---|---|---|
| 0 | 小图辨向：在两种配色的终稿与 2 张真实产品的小图（宽 96 像素，随机旋转 90° 或 270°）中，判断哪一端是机头 | 指出一端或选“看不出”；结果仅作描述 |
| 1 | 对 8—10 张真实产品顶视图按四组词对评分 | 7 点量表，另设“看不出”选项 |
| 2 | 描述图中实际可见的机身、臂根，以及机鼻或药箱与喷洒部件 | 文字描述 |
| 3 | 判断该任务所需的实体部件是否可见，被遮挡者单列 | 是／否／遮挡，并注明部位 |
| 4 | 图中细节是否足以评价该任务的重点 | 是／否 |
| 5 | 按四组词对评分，并评价任务契合度与整体协调性 | 7 点量表，另设“看不出”选项，并注明依据部位 |
| 6 | 是否推荐沿当前造型继续深化 | 是／否，并说明理由 |
| 7 | 两张终稿外观评分均锁定后，分别说明该版的配色目标，询问其表达情况和依据 | 是／否／看不出，附理由 |

注：两种配色的终稿分页依次呈现，不并排展示，呈现顺序在评议者之间轮换；每张终稿单独作答第2—6题，第7题在两张终稿的评分都锁定后进行。本轮实拍8款。实发问卷的部件可辨选项为能辨认、未看到、可能被遮挡、看不出；细节充足程度分为足够、部分足够及不够。

**补充配对评图。** 此项在同一基础造型上分别检验局部配色与分型线。两图同屏、同尺度，点击任一部位可同步放大两图。下图仅供读者核对分件差异，评议者首先看到的是整机。表C.2按评议者选中的实际版本还原选择，依据栏为原话节录或简述。

图：图 C.1 同一中央顶盖的分件对照（等比例局部放大，左为原版，右为增加两道横向分型线后的版本） | ../figures/figC-paired-cover.png

表：表C.2 三位评议者的逐人选择及判断依据
| 评议者 | 第一眼更醒目 | 顶面更简洁 |
|---|---|---|
| R01 | 选橙色版。指出下半部橙色醒目，同时区分了醒目与好看。 | 选原版。指出上下各少一道横向分型线。 |
| R02 | 选橙色版。依据为“橙色”。 | 选原版。依据为“机顶线条”。 |
| R03 | 选橙色版。指出“机臂下方的橙色”。 | 选原版。认为两图“差不多”，同时指出另一张表面线条更多。 |

注：R01、R02 的橙色版在左、原顶盖在右，R03 两题的图序均相反。配色题有一人使用同步放大，分件题无人放大。

**逐图评议原始评分。** 表C.3与表C.4均按“中性版 / 橙色版”记数。词对从1到7依次由左端趋向右端。两表的三行对应本轮三份答卷。

表：表C.3 两张终稿在四组词对上的逐人评分
| 场次 | 紧凑—舒展 | 简洁—繁复 | 整体—拼凑 | 低调—醒目 |
|---|---|---|---|---|
| 01 | 5 / 5 | 4 / 4 | 4 / 4 | 4 / 5 |
| 02 | 5 / 5 | 3 / 4 | 5 / 3 | 3 / 5 |
| 03 | 4 / 4 | 4 / 5 | 4 / 5 | 3 / 5 |

表：表C.4 任务契合、整体协调及深化判断
| 场次 | 任务契合 | 整体协调 | 建议深化 | 相机能否辨认 |
|---|---|---|---|---|
| 01 | 5 / 5 | 5 / 5 | 是 / 是 | 可能被遮挡 / 可能被遮挡 |
| 02 | 5 / 5 | 5 / 5 | 是 / 否 | 可能被遮挡 / 可能被遮挡 |
| 03 | 6 / 5 | 5 / 5 | 是 / 否 | 能辨认 / 能辨认 |

表：表C.5 八款真实产品的词对评分
| 实拍型号 | 01号 | 02号 | 03号 |
|---|---|---|---|
| DJI Air 3 | 6 / 2 / 3 / 3 | 6 / 2 / 4 / 3 | 3 / 5 / 3 / 4 |
| DJI Mavic 3 Pro | 4 / 4 / 4 / 4 | 5 / 2 / 4 / 2 | 4 / 4 / 4 / 4 |
| DJI Mavic Pro | 6 / 4 / 4 / 3 | 4 / 2 / 3 / 2 | 4 / 3 / 4 / 4 |
| DJI Mini 3系列 | 5 / 5 / 4 / 4 | 5 / 2 / 3 / 3 | 4 / 3 / 4 / 3 |
| DJI Neo | 2 / 6 / 6 / 6 | 3 / 4 / 3 / 3 | 2 / 5 / 3 / 4 |
| DJI Neo 2 | 2 / 5 / 5 / 6 | 3 / 4 / 3 / 5 | 2 / 3 / 4 / 5 |
| DJI Spark | 4 / 5 / 5 / 5 | 5 / 2 / 5 / 6 | 4 / 4 / 4 / 3 |
| Parrot ANAFI | 4 / 4 / 4 / 5 | 5 / 4 / 6 / 4 | 3 / 4 / 3 / 4 |

注：每格依次记录紧凑—舒展、简洁—繁复、整体—拼凑和低调—醒目。全部评分均在揭示配色目标前取得。

## 附录D 开源后端造型预试的逐张读数

表D.1 给出 4.1.3 节开源后端造型预试 12 张图的逐张判读结果。判读方式为知情判读，即 AI 判读者知道各图的生成条件，结果仅用于后端选择。图号中 S0 为基准，S1—S5 依次为方正机壳、外露承座、折叠铰接、前伸云台与多块顶盖五个非基准档，r1、r2 为两次重复。臂根一栏的四个字母依次对应四根机臂：B 为无缝，S 为承座，H 为铰接，U 为不可判。相机一栏的“待判”表示图中有疑似相机的深色部件，但无法确定其身份与朝向。“整体”一栏按 4.1.3 节的判据记录，即目标档命中、四轴双叶且相机不错位时记为通过。

表：表D.1 开源后端造型预试的逐张读数
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
注：r1、r2 两次重复分别使用随机种子 2026111301 与 2026111302，各条件共用这两个种子。

## 附录E B2 相机修订的历史对照与开发样图

以下图像保存当时的实验约定及设计取舍。修订按画面上端为机头判读；后续深化选定下端安装。两次判断各自沿用原条件。正文中的终稿采用人工深化结果。

图：图 E.1 B2 相机修订的同种子对照：上排为父图与编辑，下排为重新生成，各附机头局部 | ../figures/fig4-4.jpg

修订一包含三个配对种子，每一对各生成一张父图编辑图、一张按同一目标重新生成的图。三张编辑图保住非目标部位，三张重新生成图均改变了非目标部位。两组各三张均未达到事先约定的相机目标。该观察只适用于这次输入、写法与判据。

图：图 E.2 B2 相机修订的开发样图：文字指令与双参考图 | ../figures/fig4-5.jpg

修订二另外比较了两套开发写法，每套三张。文字指令下两张保持非目标部位，一张机尾内收；双参考下三张均在当时规定的机尾添加了模组。两套写法均未达到进入正式生成的要求。此处列出全部开发样图，单独留存，不与修订一合并计算。

