# E3 四旋三个方向的规格卡（草案，待作者审阅）

**状态：** 2026-11-13，Claude 起草，0 次生成。作者确认前不编译请求、不出图。**输入版本：** main `af26c8c`，[Codex 的复盘索引](../claude-context-20261113.md)，[研究地基 v1.2](../foundation.md)，[词对 v1](https://github.com/Freeloop993/paper/blob/dad19783e8e798f3974f896ccb95e4a298685162/docs/protocols/word-pairs-v1-draft.md)，[36 张证据卡](../../evidence/semantic-cards/cards.csv)。

规格由作者决定。下面每一项取值都是我的提议，标“设计者判断”的没有评论依据，请作者直接改。

## 1. 为什么从规格卡开始

到今天为止的出图（E0、E1、L1、D2、P1）都在回答“电机位置是否跟随参数”。E1 的提示词故意不含造型内容；P1 用的是一句通用特征清单。没有一张图来自“使用任务 → 词对 → 目标部位”的规格，所以没有一张是第 4 章要的设计方案。规格卡是这条线的起点：先写清要设计什么，再谈怎么出图。

## 2. 三个方向共用的部分

**使用任务。** 日常随行航拍四旋翼：随身带，随手拍。携带语境的依据是 E001、E003/E004、E009。

**保持项（三张卡相同）。**

| 项 | 取值 |
|---|---|
| 构型 | 四个电机，X 布局，W/L = 1.00 |
| 对置轴距 | 250 mm（只进条件图的比例尺） |
| 桨 | 每轴一副双叶桨，完全展开，桨径 127 mm（d/D 取 0.50 档） |
| 视图 | 正交顶视，视线垂直向下，机头朝画面上沿 |
| 机载相机 | 在机鼻前缘下方，镜头水平朝前；顶视只看得到相机舱顶面和前缘 |
| 配色 | 浅灰哑光机壳，深石墨色机臂与桨，无强调色（“低调—醒目”留到配色深化） |
| 背景与光 | 浅色中性背景，柔和均匀的棚拍光，明暗能表现体积 |

**逐图核对项（每张图先过这五条，再谈造型）。** 各项记“可辨／不可判”并写依据。

1. 四个电机轴心都能定位。
2. 每轴两片桨叶，两侧等长。
3. 能判断哪一端是机头。
4. 没有参考图的线、点、文字残留。
5. 顶面没有朝向观察者的镜片。看不到镜片本身不算失败。

**三个方向的关系。** A 是基准。B 只改第一组词对。C 改第二、三组。这样盲评时能分别看每组词对的意图有没有被读出来。

| 方向 | 紧凑—舒展 | 简洁—繁复 | 整体—拼凑 |
|---|---|---|---|
| A 卵石一体 | 紧凑 | 简洁 | 整体 |
| B 舒展 | 舒展 | 简洁 | 整体 |
| C 分件 | 紧凑 | 繁复 | 拼凑一侧（见第 6 节第 4 条） |

## 3. 规格卡

### 卡 A　卵石一体

| 栏目 | 内容 |
|---|---|
| 语义目标 | 紧凑、简洁、整体 |
| 依据 | 紧凑：E001、E010；反例 E002。简洁：E011—E015，未见反例。整体：E016、E023；把它落到臂根和相机舱是研究者的推断 |
| 机身平面轮廓与比例 | 卵石形，长约为宽的 1.6 倍，最宽处在中段，外轮廓是一条连续曲线 |
| 臂根过渡 | 机臂从壳体长出，连续圆角过渡，根部没有接缝 |
| 机鼻相机舱前缘 | 相机舱收在机鼻轮廓内，前缘是一条连续圆弧 |
| 分件线与色块 | 顶面只有一条上盖分缝，没有开孔 |
| 改变项 | 机身轮廓、臂根 |
| 自由项 | 壳面曲率、机臂截面与宽度、电机座造型、桨叶细部 |
| 顶视判断标准 | 四个臂根处都指不出独立的接缝或台阶，机身外轮廓是一条不间断的曲线 |

### 卡 B　舒展

| 栏目 | 内容 |
|---|---|
| 语义目标 | 舒展、简洁、整体 |
| 依据 | 舒展一极没有直接支持的卡；E002 肯定较大的机身，是“紧凑”的反例。选这个方向是设计者判断 |
| 机身平面轮廓与比例 | 细长梭形，长约为宽的 2.6 倍，机身宽度不超过左右电机间距的四分之一 |
| 臂根过渡 | 细长机臂以长的渐缩过渡并入机身两侧，根部没有接缝 |
| 机鼻相机舱前缘 | 前缘收窄成小圆弧，相机舱在轮廓内 |
| 分件线与色块 | 一条沿机身纵向的分缝，没有开孔 |
| 改变项 | 机身比例、机臂的可见长度 |
| 自由项 | 同卡 A |
| 顶视判断标准 | 机身宽度不超过左右电机间距的四分之一，四条臂在机身外的可见长度都大于机身宽度 |

### 卡 C　分件

| 栏目 | 内容 |
|---|---|
| 语义目标 | 紧凑、繁复；第三组待作者定 |
| 依据 | 没有评论支持繁复或分件；评论偏向简洁（E011—E015）和集成（E016）。这是对照方向，设计者判断 |
| 机身平面轮廓与比例 | 切角长方形，长约为宽的 1.6 倍（与卡 A 相同，不混入比例差异） |
| 臂根过渡 | 机臂是独立构件，由可见的夹持座接在机身四角，根部有清楚的接缝和台阶 |
| 机鼻相机舱前缘 | 相机舱是独立的前置模块，比机身窄，与机身之间有一道可见分缝 |
| 分件线与色块 | 顶面至少四条分件线，两组散热开孔；颜色仍与另两卡相同 |
| 改变项 | 臂根、相机舱与机身的关系、分件数量 |
| 自由项 | 同卡 A |
| 顶视判断标准 | 每个臂根都能指出一道接缝或台阶，相机舱与机身之间有一道分缝，顶面分件线不少于四条 |

## 4. 参数去向

| 参数 | 取值 | 去哪里 |
|---|---|---|
| 电机数与布局 | 4，X | 条件图和提示词 |
| W/L | 1.00 | 条件图的轴心坐标 |
| 对置轴距 | 250 mm | 条件图的比例尺，不写进提示词 |
| d/D | 0.50 | 条件图（若画叶尖）；提示词只写每轴双叶、两侧等长 |
| 机身平面形与长宽比 | 各卡不同 | 提示词；出图后量测 |
| 臂根过渡 | 各卡不同 | 提示词 |
| 机鼻相机舱前缘 | 各卡不同 | 提示词 |
| 分件线数与开孔 | 各卡不同 | 提示词；出图后计数 |
| 配色、视图、背景、光 | 三卡相同 | 提示词的固定段 |
| 壳面曲率、机臂截面、电机座 | 自由 | 不写；出图后只记录 |

## 5. 提示词编译

规则：固定开头，加四个部位各一句，加固定结尾。三张卡用同一规则，只有中间四句不同。每句是“部位：取值”的短语，不写说明性长句。

**固定开头**

> Industrial design rendering of a compact quadcopter for everyday carry-along aerial photography. Strict orthographic top view, looking straight down, nose toward the top edge, light neutral background. X layout, four motors, one fully unfolded two-blade propeller on each motor, both blades the same length.

**卡 A**

> Fuselage: rounded pebble outline, about 1.6 times as long as wide, widest at mid-body, one unbroken curve. Arm roots: each arm grows out of the shell through a continuous fillet, no joint line. Nose: the camera pod stays inside the nose outline under one continuous rounded leading edge. Top shell: a single cover seam, no vents.

**卡 B**

> Fuselage: slender spindle outline, about 2.6 times as long as wide, narrower than a quarter of the motor spacing. Arm roots: long slender arms merge into the sides of the body through long tapered blends, no joint line. Nose: narrows to a small rounded tip with the camera pod inside the outline. Top shell: one lengthwise seam, no vents.

**卡 C**

> Fuselage: chamfered rectangular outline, about 1.6 times as long as wide. Arm roots: each arm is a separate member held by a visible clamp block at a corner of the body, with a clear step and joint line. Nose: the camera pod is a separate front module narrower than the body, with a visible gap line between pod and body. Top shell: at least four panel lines and two groups of cooling slots.

**固定结尾**

> A forward-facing camera sits under the nose with its lens pointing forward, so from above only the top of the camera pod shows. Matte light grey shell, dark graphite arms and propellers, no accent colour. Soft even studio light; shading shows the volume. No text, lines or markings.

## 6. 要作者裁定的地方

1. **哪张图算“符合预期”。** 我看到的候选有三张：一年前并排图的右半（深灰、有体积、臂根连贯）、桌面原型第一次接通的银色四旋（有机鼻相机舱）、蓝色上壳示范（作者说过配色材料模糊、不协调）。请指出一张作为质量参照，或说明都不是。
2. **提示词规则与旧规格冲突。** [E3 旧规格](semantic-to-E3-spec.md)第 7 节写的是“E1 的固定短提示词加不超过两句的方向句，不写数字”。作者 11/13 要求按参数分组写具体短语。本页按后者写。作者确认后我改第 7 节。
3. **初稿怎么出，现在没有可用的设置。** 旧规格要求“R1 选出的渲染设置”，R1 已作废；L1 七组没有一组通过几何判据；D2 中途取消。也就是说 Qwen 上还没有一个设置能同时保住布局和造型。出图方式要作者定，我的建议见[接手快照](../handoff.md)的“下一步”。
4. **卡 C 的第三组词对。** “拼凑”是贬义的一极，设计者通常不会以它为目标。可以写“拼凑一侧”作为对照，也可以写“不作要求”，或者不要这个对照方向，换成另一个真实的设计方向。
5. **三张卡的 W/L 和 d/D 都固定为 1.00 和 0.50。** 这样造型差异不会和布局差异混在一起；布局响应由 E1 承担。作者若想让某个方向用别的布局，请写明。
6. **初稿不出现配色差异。** “简洁—繁复”的释义里有“色块”，但词对 v1 规定配色留到深化阶段。本页初稿只用分件线和开孔表达这一组词对。

## 7. 按章节还要取的证据

| 章节 | 实验 | 现状 | 还缺 |
|---|---|---|---|
| 3.2 | T04 第二编码；真实产品顶视图 | 36 张卡已入库，词对 v1 已冻结 | 一位真人对 40 条的第二编码；8—10 张合格的真实产品顶视图 |
| 3.3、4.1.1 | T06 规格 | 本草案 | 作者确认或改写三张卡 |
| 3.4、5.2 | E0、E1 | 开源 E0 6 张、E1 36 张已核验，两名 AI 盲读 | 真人 12 张抽读；E0 闭源臂 0/6 |
| 3.5、5.4 | E2 父图修订 | 0（G3 小测不能充当 E2） | 2 张父图 × 2 种指令，另 2 张无父图对照 |
| 4.2—4.4 | E3 四旋应用 | 0 | 9 张初稿、作者逐张取舍理由、选 1、修订至多 2 次、锁稿、深化图 |
| 5.4 | E4 协同对照 | 0 | 至少 4 名设计者，每人 D、S 各一场，场后问卷 |
| 5.3 | E5 独立评议 | 0 | 至少 3 名评议者，先评真实产品图，再盲评锁定终稿 |
| 5.5 | E6 六旋植保 | 0（4 张旧测绘图只作历史资料） | 植保规格、1 个方向加 1 次修订、W/L 三档 × 2 次 |

## 8. 不能据此说的话

三张卡是草案，不是作者的设计决定。卡 B、卡 C 的方向没有评论依据。顶视图上看不到镜片、厚度和相机俯仰，相机舱只能评价可见的前缘、遮挡和接缝。
