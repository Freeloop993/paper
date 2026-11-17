# evidence/ 与 experiments/ 清点报告

- 审计对象：分支 `claude/direction-todo-20261117`， `700a9bc`（2026-11-17）。只读，没有修改、移动或提交任何文件。
- 范围：`evidence/` 下 47 个顶层条目，`experiments/` 下 26 个顶层条目，共 73 个。
- 大小：用 `git ls-tree -r -l HEAD <path>` 求和，1 MB = 1,048,576 B。
- 论文出处：在 `manuscript/thesis/src/*.md` 中检索文件夹名、实验代码和关键数字，标注为 `文件:行`。另参照 `manuscript/thesis/review/2026-11-17-independent-reviews/R3-numbers-vs-evidence.md`（以下称 R3），它逐项核对过正文数字与证据。

## 0. 先看这几条

1. **E3 及若干原件不在本 HEAD 中。** 下列分支都不是 HEAD 的祖先，因此不在本次 73 个条目里：
   - `claude/e3-quad-qwen`：有 `evidence/e3-quad-qwen-20261115`（30.1 MB）、`evidence/gpu-day-20261115`（105.7 MB，含 E2R 原图、六旋原图和 B2 修订）、`experiments/e3-deepening`、`experiments/e3-quad-qwen`，以及 GPU 日的登记文件（`experiments/gpu-day-20261115/README.md`、`TAKEOVER.md`、`manifest*.json`）。
   - `claude/gpu-tasks-20261117`：有 `experiments/20261117-local-edit-v2`。
   - `claude/extra-readings-20261117`：有 X/Y 读数，位于 `evidence/20261115-review-takeover/claude-XY-20261117/`。

   这些内容支撑第四章、附录 E 和 5.4.2，但在 HEAD 中都找不到证据。`appendix.md:1` 引用的 `experiments/e3-quad-qwen/round-3/dictionary-v16.json` 也不在 HEAD 中。见 ASK-5。
2. **“以双引号开头的条目”并不存在。** 那是 git 默认对非 ASCII 路径加引号转义（core.quotepath）造成的。HEAD 中只有 4 个中文文件名：
   - `evidence/20261115-review-takeover/九张开发图.jpg`
   - `experiments/gpu-day-20261115/analysis-247/247个排程位置.csv`
   - `experiments/gpu-day-20261115/analysis-247/旧负向词15张.json`
   - `experiments/gpu-day-20261115/analysis-247/说明.md`

   用 `git -c core.quotepath=false` 查看即可。顶层没有异常命名的条目。
3. **顶层没有 DELETE-CANDIDATE。** 唯一明确冗余的是条目内部同一批原件既有 ZIP 又有解包目录，见第 0.1 节和 ASK-3。
4. **`evidence/README.md` 已经过时。** 它只描述 2026-11-03 的旧六旋四图（`hexa4-ai.csv`），其余 46 个条目都没有说明。

### 0.1 超过 5 MB 的单个文件

| 文件 | MB | 内容 | 是否与他处重复 |
|---|---:|---|---|
| `evidence/e1-open-20261112/E1-originals.zip` | 28.81 | E1 36 个位置的请求、回执、history 和原 PNG | **重复。** 与同目录 `E1-actual/`（30.0 MB，181 个文件）逐图 SHA-256 36/36 一致 |
| `evidence/20261115-review-takeover/review15-wlq-extension24.zip` | 20.37 | 四旋点线通路 W/L 扩展 24 张原图（P2-WLQ） | HEAD 中唯一一份 |
| `evidence/20261115-review-takeover/review15-v16-shape24.zip` | 20.37 | v1.6 平行批 24 张原图 | HEAD 中唯一一份 |
| `evidence/20261115-review-takeover/review15-shape24.zip` | 19.42 | 正式造型响应 v1.2 的 24 张原图 | HEAD 中唯一一份 |
| `evidence/20261115-review-takeover/local-edit/localedit-dev-camera-cover-roots.zip` | 16.21 | 局部编辑 v1 的 9 张开发原图及合成图 | HEAD 中唯一一份 |
| `experiments/gpu-day-20261115/analysis-247/order09-originals.zip` | 13.62 | 16 张档位探索图（ch3.md:161） | HEAD 中唯一一份 |
| `evidence/20261115-review-takeover/review15-wlq12.zip` | 10.06 | 四旋点线通路 W/L 主批 12 张 | HEAD 中唯一一份 |
| `evidence/20261115-review-takeover/review15-afternoon9.zip` | 7.75 | 11/15 下午开发 9 张（机尾横杆、喷头、碳纹臂） | HEAD 中唯一一份 |
| `evidence/20261117-offline-review/design-review/participant-form-v1.zip` | 5.50 | N2 真人评者用的离线 HTML，内嵌 12 张图 | 内嵌图源自 shape24 原图，为发放件 |

另有两处 ZIP 与解包目录重复：

- `evidence/e0-open-20261112/E0-originals.zip`（4.47 MB）与 `E0-actual/` 一致，6/6。
- `evidence/r0-20261112/R0-originals.zip`（1.56 MB）与 `actual/` 一致，2/2。

E0、E1、R0 三处合计约 35 MB 重复。

还有两类“文件多”的大目录，它们的单个文件都小于 5 MB：

- `evidence/form342-h3-dev`：99.45 MB，455 个文件，其中 round-1 和 round-2 各约 44 MB 原 PNG。
- `experiments/gpu-day-20261115/recovered-originals-102`：84.2 MB，102 张 PNG。该批 ZIP 只记录了 SHA，ZIP 本身未入库。

用 blob 哈希对比，HEAD 与 `claude/e3-quad-qwen` 上上述三个大目录只有 2 个 blob 相同，没有成批重复。

### 0.2 README 与较新证据矛盾（计数过时）

| 位置 | 过时表述 | 较新证据 |
|---|---|---|
| `evidence/README.md` | 把整个 evidence 目录说成“六旋四图共享表” | 现有 46 个其他条目 |
| `evidence/20261115-review-takeover/README.md:5` | “原 X、Y 答卷尚无法核对”；“四旋布局 12 张…仍缺独立复测” | X/Y 在分支 `claude/extra-readings-20261117` |
| `evidence/e1-open-20261112/geometry-readout.json:3` | `"human_forms": 0` | 同目录 `point-return.md` 已收 1 份点选（R3 第 12 项） |
| `evidence/semantic-cards/README.md:15` | “目前第二位真人提交数为 0” | 第二编码已于 11/15 入库（`semantic40-second-coding-20261115`） |
| `evidence/real-product-topview/README.md` 首段 | “当前可追溯 4 个” | 同页末段和 `sources.json` 为 10 个型号 |
| `evidence/formal-reset/README.md` | “新正式集当前为 0” | 11/11 的口径；正式 24 张产生于 11/15 |
| `evidence/20261117-config-review/A1-extension` | A1 为 24 款 | `20261117-research-update/a1` 合表为 30 款、64 行，并以 A1-extension 为去重底表 |
| `experiments/gpu-day-20261115/analysis-247/说明.md:5` | “尚待逐图分析的 96 张” | N1 双 AI 盲读已在 `20261117-offline-review`（R3 第 6 点） |
| `experiments/hexa-plant-protection/README.md:15` | “正式初稿尚待生成” | E6 已有 39 张更正版输出，见 ch5.md:215 |
| `experiments/qwen-shape-pilot/README.md:3` | “Qwen 提交 0、成图 0” | 12＋2 张已在 `evidence/qwen-shape-s4-20261114` |
| `experiments/d2-tuning/README.md:3` | “0 次生成” | `evidence/d2-tuning` 已有 10 张（P 臂） |
| `experiments/l1-layout/README.md:3` | “0 次生成” | `evidence/l1-layout-actual` 已有 28 张 |
| `experiments/g3-reference/README.md` 标题 | “未执行” | `evidence/g3-actual` 已执行 |
| `experiments/semantic40-pairing/README.md:3` | “等对照键” | `key.json` 已入库（提交 4cce3bd） |
| `experiments/common-control/README.md` 标题 | “路线待 G2 判定” | G2 已判失败，见 `evidence/g2-six` |

### 0.3 登记（experiments）与结果（evidence）的配对

- `experiments/r0-e0-e1` ↔ `evidence/r0-20261112`、`evidence/e0-open-20261112`、`evidence/e1-open-20261112`
- `experiments/gpu-day-20261115` ↔ `evidence/20261115-review-takeover`、`evidence/20261117-offline-review`、`evidence/e2r-hub-readback`（GPU 日登记 README 只在分支上）
- `experiments/hexa-plant-protection`（E6 规格与条件图）↔ 六旋读数：`20261115-review-takeover` 中的六旋扩展量测、`20261117-offline-review` 中的 N4
- `experiments/20261115-local-edit` ↔ `evidence/20261115-review-takeover/local-edit`
- `experiments/e2-registered`（旧 E2）↔ `experiments/gpu-day-20261115/recovered-originals-102/01-old-E2`；同一 E2 谱系还有 `evidence/h3-e2-local-edit-20261113`（MiniMax 版）和 E2R
- `experiments/semantic40-pairing` ↔ `evidence/semantic40-second-coding-20261115`、`evidence/semantic-cards`
- `experiments/e5-paired-topview` ↔ `evidence/e5-individual-reviewed`、`evidence/real-product-topview`（同属 E5）
- `experiments/qwen-shape-pilot` ↔ `evidence/qwen-shape-s4-20261114`
- `experiments/g2-control` ↔ `evidence/g2-six`
- `experiments/g2b-screen` ↔ `evidence/g2b-actual`
- `experiments/g3-reference` ↔ `evidence/g3-actual`；`experiments/g3b` 未运行
- `experiments/l1-layout` ↔ `evidence/l1-layout-actual`、`evidence/l1-closed-reference-diagnostic`、`evidence/prompt-parameter-review`
- `experiments/hub-annotator` ↔ `evidence/s1-axis-repeat/human-pack`（`annotate.html` 与 `human-pack/index.html` 是同一 blob）；同组还有 `evidence/s1-decomposition`
- `experiments/rating-kit` ↔ `evidence/x12-calibration`
- `experiments/d2-tuning` ↔ `evidence/d2-tuning`、`evidence/d2-closed-six`
- `experiments/p1-param-prompt` ↔ `evidence/p1-param-prompt`
- `experiments/p2-spec-cards` ↔ `evidence/p2-spec-cards`（evidence 一侧没有 README）
- `experiments/minimax-junction-pilot` ↔ `evidence/minimax-junction-pilot`
- `experiments/form342-h3-pilot` ↔ `evidence/quad-author-selection`（对试作 A/B/C 的复看）；之后接 `evidence/form342-h3-dev` 的三轮
- `experiments/desktop-parameter-v2` ↔ `evidence/desktop-parameter-first-example`（v1）
- `experiments/gpt-image-b02-visual` ↔ `evidence/b02-parent-reference`、`experiments/b02-view-calibration`（文字输入取自后者的 `protocol.json`）
- 没有结果的登记：`experiments/common-control`、`experiments/g2d`、`experiments/g3b`、`experiments/b02-view-calibration`、`experiments/operator-workbench`（软件演练）

## 1. 总表

建议取值为 KEEP-FORMAL、KEEP-METHOD、ARCHIVE、DELETE-CANDIDATE 或 ASK；“大小”列为 MB / 文件数。

### 1a. evidence/（47）

| path | 是什么 | 大小 | 支撑论文的位置 | 建议 | 理由 / 待问 |
|---|---|---|---|---|---|
| evidence/20261115-review-takeover | 11/15 GPU 日原图回收与补判。内含：正式 v1.2 造型 24 张、v1.6 平行 24 张、四旋点线通路 W/L 主批 12＋扩展 24 张的原图 ZIP；两次 R/T 双 AI 盲读；E2R 六对的揭盲描述；局部编辑 v1 开发 9 张；六旋扩展量测；下午开发 9 张 ZIP | 95.85 / 31 | ch5.md:72-90（表5.1a；1.03/1.16/1.36；0.98/1.11/1.28）、ch5.md:109、ch5.md:146、ch5.md:215（0.89/0.98/1.01）、ch5.md:219、ch1.md:84-85、abstract-cn.md:7 | KEEP-FORMAL | 正式造型响应与 E2R 读数的唯一原件。批次文件夹内混有多个实验，建议按实验代码登记索引 |
| evidence/20261117-a1-a4-c1 | 11/17 新任务交付：A1 首批 16 款官方规格（已被合表取代）、A4 开发矩阵草案、C1 两种方式的任务卡（E4 预试基础） | 0.03 / 6 | 正文未引用（在研） | KEEP-FORMAL | A4、C1 的现行任务定义；`research-update/method/paired-pilot.md` 写明“接续已存的 C1 任务卡”。其中 a1-model-specs.csv 已被合表取代，但合表以它为去重底表 |
| evidence/20261117-config-review | 11/17 真机与构型复核：A1 扩至 24 款（已被取代）；A2 手册图面量测 3＋3 款及两款复点；外审 21 项复核（120 张种子配对，48 对）；15 张早期构型截图索引 | 0.18 / 28 | 正文未引用（在研） | KEEP-FORMAL | A2 前两批点位只在这里，research-update 是在其上追加。A1-extension 已被 research-update/a1 取代 |
| evidence/20261117-offline-review | 11/17 离线读数：N1 为 96 张 COMBO/S12/S16 的双 AI 盲读；N2 为 3 位真人读正式 12 图（S0/S2/S5）；N3 为下午 9 张开发知条件初读；N4 为六旋 36 张独立 AI 复测；另有 73 份 GPU 请求离线审计和 N2 发放表单 | 7.14 / 32 | 正文尚未引用。R3 指出正文与之冲突：ch5.md:215、238、258 的“待复测”已过时；ch5.md:219 与 N3 的 0/3 不符；ch3.md:222 与 N2 的实际执行不符 | KEEP-FORMAL | 正式造型、E6 的独立复测与真人读数都在这里，正文需据此更正 |
| evidence/20261117-r3-check | 11/17 R3 后的说明文档，讲评论、工程比例与设计评价如何对应，附 checks.json、verify.py | 0.02 / 3 | 正文未引用 | ASK | 与 20261117-research-update 大量重叠（1,318 簇、228 条、真机紧凑评分对规格）。见 ASK-1 |
| evidence/20261117-research-update | 11/17 数据入口：A1 合表 30 款 64 行，A2 新增 28 个轴心；A3/A8 读数（36 张 WLQ、27 张 E3）；按 1,318 簇重算的评论共词图（图3.2 的替代图）及 S2 抽查题面；E4 作者预试约定；前三章核对清单 | 0.42 / 34 | 正文未引用。`method/chapters-1-3.md:10` 建议替换 ch3.md:31-33 的图3.2；STATUS、README、docs/handoff 以它为入口 | KEEP-FORMAL | A1–A3、S2、C1/C2 的现行版本 |
| evidence/README.md | evidence 目录说明，实际只讲 2026-11-03 旧六旋四图的 hexa4-ai.csv，以及开题、S1、六旋协议原件的 SHA | 0.00 / 1 | 无（链接 ../manuscript/ch05-hexa-results.md，不在 src 中） | ARCHIVE | 过时。随 hexa4 一起归档，另写新的总索引。其中的私有原件 SHA 须原样保留 |
| evidence/b02-parent-reference | 11/10 GPT Image 生成的四旋 B02 斜视概念图，以及作者选定的顶视父图（为 G3b 准备） | 3.58 / 4 | 无 | ARCHIVE | G3b 未运行，旧父图路线已被 E3 取代 |
| evidence/d2-closed-six | 11/13 由 Codex 内置 GPT Image（作者指定 2.6）生成的 6 张闭源开发图，带 D2 编号 | 9.47 / 19 | 无。R3 第 1 项：**它不是 E0 闭源臂**，ch1.md:81 和 ch5.md:11 所称“闭源 6 张”并无证据 | ARCHIVE | 开发样本；E0 闭源臂已撤销，不得改标为 E0 |
| evidence/d2-tuning | 11/12–13 D2 开发调参 P 臂 10 张 Qwen 原图（计划 42 张，K/I 臂中断），附拼图与核验，无 README | 9.97 / 73 | 无。docs/image-retrospective-20261113.md 用 D2-P1 说明“镜头朝上”现象 | ARCHIVE | 开发调参，“不进论文分母”；已被点线通路取代 |
| evidence/denominators | 11/09 旧主 18、旧追加 39、S1 6 的受理、回收、去重计数与复算脚本 | 0.01 / 3 | 无（manuscript/revisions/ch05-5.2.3-s1.md 曾用） | ARCHIVE | 旧批口径，README 自己写明“仅用于历史追溯” |
| evidence/desktop-parameter-first-example | 11/10 旧桌面配置器导出定位图，经 GPT Image 得到 1 张顶视输出的接通样例 | 1.87 / 5 | 无（ch4.md:19 只概述配置器沿用前期界面） | ARCHIVE | 单次、非盲读的样例，已被五页签配置器取代 |
| evidence/e0-open-20261112 | E0 开源臂 6 张（W/L 三档×2）的原图、请求、回执和双 AI 读数（open-gate.json）；ZIP 与解包目录重复 | 13.79 / 40 | ch5.md:66（E0＋E1 共 42 张的判读差中位数）、ch5.md:68（人工点选 12 张中 E0 占 4 张）、ch4.md:35、ch3.md:170 | KEEP-FORMAL | E0 开源臂是正式材料。ZIP 与 E0-actual 重复，见 ASK-3 |
| evidence/e1-open-20261112 | E1 36 张原件（ZIP 与解包重复）、双 AI 盲读、geometry-readout、配对图、人工点选回执 | 60.88 / 200 | ch5.md:47-70（表5.1）、abstract-cn.md:7、ch1.md:82、ch4.md:35、ch3.md:170 | KEEP-FORMAL | E1 结论的全部依据。geometry-readout.json 的 human_forms=0 已过时；ZIP 重复，见 ASK-3 |
| evidence/e2r-hub-readback | 更正版 E2 的 6 张结果与 2 张父图，知条件的轴心位移复核 | 0.39 / 3 | ch5.md:101（0.020、0.032、上界 0.05）、ch1.md:85 | KEEP-FORMAL | E2R 是现行正式局部编辑实验；原图在分支上（R3 第 15 项） |
| evidence/e5-individual-reviewed | E5 逐图评议 3 份答卷的揭盲读数（醒目、契合、词对、小图辨向、8 款实拍） | 0.00 / 2 | ch5.md:158-164、appendix.md:93-120（表C.3–C.5）、ch1.md:88 | KEEP-FORMAL | E5 正式结果 |
| evidence/form342-h3-dev | 11/13–14 MiniMax H3 开发三轮（36＋36＋8 张）的原图、盲读、复读与审计 | 99.45 / 455 | ch4.md:37-48（表4.1）、ch5.md:138（第二轮 5/36、第三轮 1/8）、ch5.md:142 | KEEP-METHOD | 造型字典档位的来由。体积大（两轮原 PNG 各约 44 MB），无顶层 README |
| evidence/formal-reset | 11/11 旧约束造型 12 张退出正式集的登记及 SHA | 0.01 / 2 | 无 | ARCHIVE | 正式集重置的决定记录，只供追溯 |
| evidence/g2-six | 11/10 G2（桨盘圆加十字线稿，强度 1.0）6 张原图与双 AI 盲读，24 个位置均不可辨 | 4.36 / 25 | ch4.md:33、ch5.md:121、ch5.md:127（表5.2 第二批） | KEEP-METHOD | 条件选择阶段被正文引用的失败批 |
| evidence/g2b-actual | 11/10 G2b 骨架/标记 4 种配置各 1 张，0/4 可用 | 3.47 / 15 | 间接：ch5.md:39 的“标记照搬”预试样例是 G2b-a（见 x12-calibration）；ch4.md:33 “标记被画进生成图” | KEEP-METHOD | 评议表预试所用失败样例的原件 |
| evidence/g3-actual | 11/10 G3 有父图与无父图修订各 1 张，1 位真人加 1 个 AI 盲评 | 2.43 / 12 | ch3.md:240（“前期的一次盲态评议…”，题目分层的来由） | KEEP-METHOD | 方法章引用的评议表修订依据 |
| evidence/guide-choice-20261113 | 11/13 点线图与双叶部件图的选用依据（H3 15 张对照、104 个位置的索引） | 1.43 / 11 | 未引用，但应支撑 ch3.md:165-172（两种条件图的分工）和 ch4.md:25 | KEEP-METHOD | 记录“点线图用于设计、部件图用于几何”这一决定的由来 |
| evidence/h3-e2-local-edit-20261113 | 11/13 MiniMax H3 版 E2 局部编辑预实验 6 张（以 E1 原图为父图） | 6.69 / 27 | 无 | ARCHIVE | 已被 E2R 取代；属于 E2 谱系历史（R3 第 6 点“三条 E2 谱系并存”） |
| evidence/hexa4-ai.csv | 2026-11-03 旧六旋 H1/H2 的 full 与 structure 两模式四图，共 8 条 AI 标注 | 0.00 / 1 | 无（只见于 manuscript/ch05-hexa-results.md） | ARCHIVE | 已被 E6 取代；与 summarize_hexa.py、旧 README 成组归档 |
| evidence/historic-guides | 旧 C1 三档控制图、S1 L/F 引导图，以及 13 份执行图核验 | 0.14 / 7 | ch5.md:117、ch5.md:126（表5.2 第一批 L/F，强度 0.35）；E0/E1 的部件图从 C1 画法演变而来（ch3.md:170） | KEEP-METHOD | 条件图演变链的原件 |
| evidence/l1-closed-reference-diagnostic | 11/13 L1 A/B 条件的 4 张 GPT Image 对照 | 5.29 / 7 | 无 | ARCHIVE | 闭源诊断，不进入分母 |
| evidence/l1-layout-actual | 11/12–13 L1 布局通路 7 个条件×4 张，共 28 张原图及双 AI 盲读；F/G（布局图编辑）是点线图编辑通路的雏形 | 25.25 / 183 | 未点名。ch3.md:165（标注被画入画面）有部分依据；qwen-shape-pilot 沿用了 L1-F 的种子和工作流 | KEEP-METHOD | 说明为什么转向“点线图＋原生编辑”，方法章应引用 |
| evidence/minimax-junction-pilot | 11/13 MiniMax 相机舱与臂根预试 20 张 | 25.10 / 92 | 无（docs/historical-development-index.md 以固定提交 d147f61 链接） | ARCHIVE | 开发历史，已有固定提交链接 |
| evidence/p04-quad-biblade | 11/11 GPT image_gen 双叶桨三档 6 张，作者全数否决 | 8.88 / 20 | 无 | ARCHIVE | README 写明“不作为调参依据” |
| evidence/p05-quad-equal-blades | 11/11 双叶对称性单图验证 | 1.54 / 8 | 无 | ARCHIVE | 同上 |
| evidence/p06-quad-front-camera | 11/11 前摄姿态单图（相机措辞的歧义） | 1.55 / 8 | 无（图像回顾文档引用） | ARCHIVE | 同上 |
| evidence/p1-param-prompt | 11/13 MiniMax P1 参数化提示词三轮 23 张，作者否决 | 30.21 / 74 | 无（历史索引以提交 2996f6b 链接） | ARCHIVE | “开发调参，不进论文分母” |
| evidence/p2-spec-cards | 11/13 MiniMax P2 规格卡首轮 9 张，无 README（登记见 experiments/p2-spec-cards） | 10.17 / 29 | 无（历史索引以提交 519821e 链接） | ARCHIVE | 已被 E3 规格卡取代 |
| evidence/prompt-parameter-review | 11/13 L1/D2/闭源诊断的逐图实参索引（by-image.md、actual-parameters.json） | 0.25 / 4 | 无 | KEEP-METHOD | l1-layout-actual/README 把它当作逐图索引，应随 L1 一起保存 |
| evidence/quad-author-selection | 11/13 作者对 form342-h3-pilot 三个方向的初看、2 张开发修订、轴距离线对照，另有 E1 点选摘要（与 e1 的 point-return.md 重复） | 2.43 / 7 | 无 | ARCHIVE | E3 之前的方向探索，已被 E3 取代 |
| evidence/quad-guide-cmf-review | 11/11 配置器结构预览、夹角、CMF 截图与 1 张原图 | 2.06 / 13 | 无 | ARCHIVE | README 写明“不作为调参依据”，界面已更新 |
| evidence/qwen-shape-s4-20261114 | 11/14 Qwen 开源后端造型预试 12 张，加 S4 相机措辞修订 2 张，均为知条件读数 | 11.86 / 39 | ch4.md:50-64（表4.2）、appendix.md:123-142（表D.1）、ch5.md:138、ch5.md:140、图3.3(a)（make_figures.py:114 用 layout.png）、ch1.md:83 | KEEP-METHOD | 后端选择的依据；附录 D 和图3.3 的数据源 |
| evidence/r0-20261112 | 11/12 R0 环境复现 2 张（旧 C1 L2 原种子与新种子），环境与权重 SHA，双 AI 门读数；ZIP 与解包重复 | 3.22 / 21 | 无直接引用；是 E0/E1 的前置门，提供环境凭据（prompt-parameter-review 链接其 environment/） | KEEP-FORMAL | 与 E0/E1 同一冻结单，是正式运行的环境证明。ZIP 重复，见 ASK-3 |
| evidence/real-product-topview | E5 实拍顶视图来源清单（10 个型号，原件未上传） | 0.01 / 2 | ch3.md:81、appendix.md:109（表C.5） | KEEP-FORMAL | E5 刺激材料来源；首段计数过时 |
| evidence/s1-axis-repeat | S1 六图（T/L/F×2 种子）原图、独立 AI 复测、真人包 | 11.37 / 22 | ch5.md:117（0/6、1.81 px、66.47—107.18 px）、ch4.md:33 | KEEP-METHOD | 条件选择阶段被正文引用 |
| evidence/s1-decomposition | S1 轴位误差的尺度、平移、残差分解 | 0.10 / 8 | ch5.md:119（1.19—1.36；71.5%—99.3%；3.9—26.5 px） | KEEP-METHOD | 同上 |
| evidence/section421-h3-span | 11/13 4.2.1 中 B 规格两档轴距与三方向的 H3 4 张，修订方向卡 specs-after-review.md | 5.10 / 46 | 无（docs/historical-development-index.md 称其方向卡为“当前”） | ASK | 见 ASK-2 |
| evidence/section421-minimax-review | 11/13 配置器到 MiniMax 三轮 9 张开发图（A/B/C 方向） | 10.48 / 34 | 无 | ARCHIVE | E3 之前的方向开发 |
| evidence/semantic-cards | 36 张证据卡（cards.csv）、早期爬取审计（7,443 簇）、Gephi 网络图 | 0.56 / 16 | ch3.md:29（7,443）、ch3.md:33（图3.2）、ch3.md:35（36 卡、35 源）、ch3.md:54-65、abstract-cn.md:7 | KEEP-FORMAL | 第三章语义部分的依据；README:15 过时。research-update/comments 的构建脚本读取 early-crawl/comments-cooccurrence.csv |
| evidence/semantic40-second-coding-20261115 | 40 条第二编码答卷 CSV | 0.01 / 1 | ch3.md:37-48（表3.2）、abstract-cn.md:7 | KEEP-FORMAL | 表3.2 原始数据 |
| evidence/summarize_hexa.py | hexa4-ai.csv 的复算脚本 | 0.00 / 1 | 无 | ARCHIVE | 与 hexa4 同组 |
| evidence/x12-calibration | 11/10 X12 评议表预读：1 人 2 份答卷，读 G2b/J2 六图 | 0.01 / 2 | ch5.md:39（“预试中，一名判读者…两次作答…评议表据此作了修订”） | KEEP-METHOD | 正文引用的评议表预试原始记录 |

### 1b. experiments/（26）

| path | 是什么 | 大小 | 支撑论文的位置 | 建议 | 理由 / 待问 |
|---|---|---|---|---|---|
| experiments/20261115-local-edit | 局部编辑 v1 的出图前登记（相机、顶盖、臂根各 3 张开发加确认种子） | 1.60 / 34 | ch5.md:146 | KEEP-METHOD | 正文引用的开发对照登记；结果在 review-takeover/local-edit |
| experiments/b02-view-calibration | B02 斜视校准 6 个种子的登记；实例资源不足，0 张 | 0.01 / 8 | 无 | ARCHIVE | 未运行，但 `protocol.json` 是 gpt-image-b02-visual 的文字输入 |
| experiments/common-control | X05 四旋/六旋共同对照的 12 份候选请求，未运行 | 0.09 / 23 | 无 | ARCHIVE | 已放弃的路线（G2 失败） |
| experiments/d2-tuning | D2 开发调参登记（计划 42 张）与脚本 | 0.26 / 58 | 无 | ARCHIVE | 开发调参；状态行过时 |
| experiments/desktop-parameter-v2 | 11/10 桌面原型 v2 导出，加 1 次 GPT Image 调用 | 1.64 / 14 | 无 | ARCHIVE | 已被五页签配置器取代 |
| experiments/e2-registered | 旧 E2（以 E1 原图为父图）6 份 Qwen 请求的登记；原图在 gpu-day/recovered-originals-102/01-old-E2 | 0.03 / 12 | ch5.md:13（“这 6 张仅作为技术过程材料保留，不计入统计”） | ARCHIVE | 正文只承诺保留、不计入统计；与旧 E2 原图成组归档，必须保持可查 |
| experiments/e5-paired-topview | E5 配对评图（醒目、简洁）3 份汇总、材料键、聚合结果 | 2.80 / 6 | ch5.md:150-156、appendix.md:80-91（表C.2、图C.1） | KEEP-FORMAL | E5 正式结果 |
| experiments/form342-h3-pilot | 11/13 3.4.2 参数与 H3 首轮 5 张（R1/R2/A/B/C） | 6.46 / 46 | 无（表4.1 用的是之后的 form342-h3-dev） | ARCHIVE | 三轮开发之前的试作 |
| experiments/g2-control | G2 出图前请求包与构建脚本 | 0.06 / 22 | 支撑 ch5.md:121、ch5.md:127 的设置（强度 1.0、三档、种子） | KEEP-METHOD | 与 g2-six 配对 |
| experiments/g2b-screen | G2b 四配置筛选登记 | 0.04 / 12 | 间接（见 g2b-actual） | KEEP-METHOD | 与 g2b-actual 配对 |
| experiments/g2d | G2d 部件控制图 6 份请求；GPU 不足，未运行 | 0.13 / 18 | 无 | ARCHIVE | 未运行；部件图思路之后由 R0/E0/E1 实现 |
| experiments/g3-reference | G3 出图前判据与 2 份请求 | 0.01 / 6 | ch3.md:240 | KEEP-METHOD | 与 g3-actual 配对；标题“未执行”过时 |
| experiments/g3b | G3b 改稿力度 4 份请求的离线准备，未运行；含修订后的观察题与目标题分开设问的措辞 | 0.02 / 10 | 无（ch3.md:240 的修订思路相同，但正文未指向本批） | ARCHIVE | 未运行 |
| experiments/gpt-image-b02-visual | 11/10 GPT Image 生成的 B02 斜视概念图 6 张 | 10.79 / 8 | 无 | ARCHIVE | 外部概念材料，不进入分母 |
| experiments/gpu-day-20261115 | 11/15 GPU 日分析：247 个排程位置的 CSV、15 张误用旧负向词的六旋、16 张档位探索 ZIP 及 X/Y 读数、11/17 补回的 102 张原图（旧 E2 6、COMBO 24、S12 扩展 48、S16 扩展 24）、review-continuation 脚本 | 97.94 / 115 | ch3.md:161（16 张探索图）、ch5.md:215（39 张；15 张误用负向词）、ch5.md:13（旧 E2） | KEEP-FORMAL | 247 位置的总台账。登记 README、manifest 只在分支上；说明.md:5 过时。01-old-E2 子目录可归入 E2 历史 |
| experiments/hexa-plant-protection | E6 规格（作者确认的首案）、手册页、六轴点线/部件/边缘条件图三档 | 0.27 / 16 | ch5.md:209-211、ch5.md:215、ch1.md:89 | KEEP-FORMAL | E6 登记；状态行过时 |
| experiments/hub-annotator | S1 真人轴心复测工具，没有收到回件 | 0.01 / 7 | 无（ch5.md:115 说“未经人工复测”） | ARCHIVE | 工具未用；annotate.html 与 s1-axis-repeat/human-pack/index.html 是同一 blob；揭盲键随 S1 保留 |
| experiments/l1-layout | L1 出图前冻结包（A–G 七个条件、脚本、条件图） | 0.54 / 66 | 同 l1-layout-actual | KEEP-METHOD | 与 l1-layout-actual 配对 |
| experiments/minimax-junction-pilot | MiniMax 相机舱与臂根预试的登记 | 0.15 / 17 | 无 | ARCHIVE | 与 evidence 同名条目成组 |
| experiments/operator-workbench | 11/09 工单 #2 的离线改稿台，用于两种方法的软件演练 | 0.04 / 12 | 无（PROGRESS.md 有记载） | ARCHIVE | 已被 prototypes/e4-author-pilot 和 C1 取代 |
| experiments/p1-param-prompt | P1 脚本与说明 | 0.23 / 14 | 无 | ARCHIVE | 与 evidence 同名条目成组 |
| experiments/p2-spec-cards | P2 登记，也是 evidence/p2-spec-cards 唯一的 README | 0.03 / 3 | 无 | ARCHIVE | 与 evidence 同名条目成组 |
| experiments/qwen-shape-pilot | 后端预试 12 份请求的离线编译登记 | 0.17 / 20 | 支撑 ch4.md:50（“两个随机种子在生成前确定”） | KEEP-METHOD | 与 qwen-shape-s4-20261114 配对；状态行过时 |
| experiments/r0-e0-e1 | R0/E0/E1 冻结单、请求、编译与汇总脚本、点选工具、人工抽样计划 | 0.20 / 65 | ch5.md:47-68（R3 用其 manifest 复算出表5.1；human-sample-plan 对应 12 张点选） | KEEP-FORMAL | E0/E1 登记 |
| experiments/rating-kit | X12 评议工具与校准包 | 4.24 / 17 | ch5.md:39（预试所用的工具） | KEEP-METHOD | 与 x12-calibration 成组；正式 E5 没有用它 |
| experiments/semantic40-pairing | 第二编码配对规则、key.json、pair.py、summary.json | 0.01 / 5 | ch3.md:37-48（表3.2） | KEEP-FORMAL | 表3.2 的计算依据；状态行过时 |

## 2. 建议的目标结构（只是建议，没有执行）

原则：

- 登记（experiments）和结果（evidence）按实验代码放在同一处。
- 混合批次文件夹整体移动，不在内部拆分，以免打断 README 里的相对链接。
- ARCHIVE 一律放进 `archive/`，或者打 tag 后从 HEAD 移除，见 ASK-6。
- 移动后要跑一次相对链接检查。现有 README 大量使用 `../../experiments/...` 和 `../xxx/` 形式的链接。

```
evidence/
├── README.md                         新写：实验代码 → 文件夹 → 正文位置的索引
├── formal/
│   ├── 3.2-semantic/                 表3.2、图3.2、证据卡
│   │   ├── semantic-cards/
│   │   ├── semantic40-second-coding/
│   │   └── semantic40-pairing/
│   ├── E0-E1/                        表5.1
│   │   ├── registration/
│   │   ├── R0-environment/
│   │   ├── E0-open/
│   │   └── E1/
│   ├── gpu-day-20261115/             造型响应 v1.2/v1.6、点线通路 W/L、E2R、E6、COMBO 与扩展批
│   │   ├── schedule-and-recovered/
│   │   ├── recovery-review-1115/
│   │   ├── offline-reads-1117/
│   │   ├── E2R-hub-readback/
│   │   └── E6-spec/
│   ├── E3/                           待从 claude/e3-quad-qwen 合入（ASK-5）
│   ├── E5/
│   │   ├── paired-topview/
│   │   ├── individual-reviewed/
│   │   └── real-product-topview/
│   └── 1117-A-C-tasks/               A1–A3/A8、S2、C1/C2（在研）
│       ├── research-update/
│       ├── config-review/
│       ├── a1-a4-c1/
│       └── r3-check/                 视 ASK-1 而定
└── method-dev/
    ├── condition-selection/          4.1.3(1)、5.2.3、表5.2
    │   ├── historic-guides/
    │   ├── S1/{axis-repeat, decomposition}
    │   ├── G2/{registration, results}
    │   ├── G2b/{registration, results}
    │   └── L1/{registration, results, parameter-index}
    ├── guide-choice-20261113/        3.4.3 两种条件图的分工
    ├── shape-dictionary/             4.1.3(3)(4)、表4.1、表4.2、附录D
    │   ├── minimax-h3-rounds/
    │   └── qwen-backend-pretest/{registration, results}
    ├── local-edit-v1-registration/   5.2.3 末段
    └── rating-instruments/           ch3.md:240、ch5.md:39
        ├── G3/{registration, results}
        └── X12/{kit, calibration}
archive/                              或打 tag dev-archive-20261118 后从 HEAD 移除
├── E2-history/
├── hexa-20261103/
├── pre-reset-1109-1111/
├── unrun-registrations/
├── gpt-image/
├── D2/
└── minimax-1113/
```

### 旧路径 → 新路径

**formal/**

| 旧路径 | 新路径 |
|---|---|
| evidence/semantic-cards | evidence/formal/3.2-semantic/semantic-cards |
| evidence/semantic40-second-coding-20261115 | evidence/formal/3.2-semantic/semantic40-second-coding |
| experiments/semantic40-pairing | evidence/formal/3.2-semantic/semantic40-pairing |
| experiments/r0-e0-e1 | evidence/formal/E0-E1/registration |
| evidence/r0-20261112 | evidence/formal/E0-E1/R0-environment |
| evidence/e0-open-20261112 | evidence/formal/E0-E1/E0-open |
| evidence/e1-open-20261112 | evidence/formal/E0-E1/E1 |
| experiments/gpu-day-20261115 | evidence/formal/gpu-day-20261115/schedule-and-recovered（可选：其中 recovered-originals-102/01-old-E2 → archive/E2-history/old-E2-originals） |
| evidence/20261115-review-takeover | evidence/formal/gpu-day-20261115/recovery-review-1115 |
| evidence/20261117-offline-review | evidence/formal/gpu-day-20261115/offline-reads-1117 |
| evidence/e2r-hub-readback | evidence/formal/gpu-day-20261115/E2R-hub-readback |
| experiments/hexa-plant-protection | evidence/formal/gpu-day-20261115/E6-spec |
| experiments/e5-paired-topview | evidence/formal/E5/paired-topview |
| evidence/e5-individual-reviewed | evidence/formal/E5/individual-reviewed |
| evidence/real-product-topview | evidence/formal/E5/real-product-topview |
| evidence/20261117-research-update | evidence/formal/1117-A-C-tasks/research-update |
| evidence/20261117-config-review | evidence/formal/1117-A-C-tasks/config-review（可选：A1-extension 留作合表去重底表，不删） |
| evidence/20261117-a1-a4-c1 | evidence/formal/1117-A-C-tasks/a1-a4-c1 |
| evidence/20261117-r3-check | 视 ASK-1：evidence/formal/1117-A-C-tasks/r3-check，或 archive/1117-superseded/r3-check |

**method-dev/**

| 旧路径 | 新路径 |
|---|---|
| evidence/historic-guides | evidence/method-dev/condition-selection/historic-guides |
| evidence/s1-axis-repeat | evidence/method-dev/condition-selection/S1/axis-repeat |
| evidence/s1-decomposition | evidence/method-dev/condition-selection/S1/decomposition |
| experiments/g2-control | evidence/method-dev/condition-selection/G2/registration |
| evidence/g2-six | evidence/method-dev/condition-selection/G2/results |
| experiments/g2b-screen | evidence/method-dev/condition-selection/G2b/registration |
| evidence/g2b-actual | evidence/method-dev/condition-selection/G2b/results |
| experiments/l1-layout | evidence/method-dev/condition-selection/L1/registration |
| evidence/l1-layout-actual | evidence/method-dev/condition-selection/L1/results |
| evidence/prompt-parameter-review | evidence/method-dev/condition-selection/L1/parameter-index |
| evidence/guide-choice-20261113 | evidence/method-dev/guide-choice-20261113 |
| evidence/form342-h3-dev | evidence/method-dev/shape-dictionary/minimax-h3-rounds |
| experiments/qwen-shape-pilot | evidence/method-dev/shape-dictionary/qwen-backend-pretest/registration |
| evidence/qwen-shape-s4-20261114 | evidence/method-dev/shape-dictionary/qwen-backend-pretest/results（注意 make_figures.py:114 的路径要同步改） |
| experiments/20261115-local-edit | evidence/method-dev/local-edit-v1-registration |
| experiments/g3-reference | evidence/method-dev/rating-instruments/G3/registration |
| evidence/g3-actual | evidence/method-dev/rating-instruments/G3/results |
| experiments/rating-kit | evidence/method-dev/rating-instruments/X12/kit |
| evidence/x12-calibration | evidence/method-dev/rating-instruments/X12/calibration |
| evidence/section421-h3-span | 视 ASK-2：evidence/method-dev/e3-direction-origin/section421-h3-span，或 archive/minimax-1113/section421-h3-span |

**archive/**

| 旧路径 | 新路径 |
|---|---|
| evidence/h3-e2-local-edit-20261113 | archive/E2-history/h3-minimax-e2 |
| experiments/e2-registered | archive/E2-history/old-E2-registration |
| evidence/README.md | archive/hexa-20261103/README-old-evidence-index.md |
| evidence/hexa4-ai.csv | archive/hexa-20261103/hexa4-ai.csv |
| evidence/summarize_hexa.py | archive/hexa-20261103/summarize_hexa.py（脚本按同目录查找 CSV，必须与之同放） |
| evidence/denominators | archive/pre-reset-1109-1111/denominators |
| evidence/formal-reset | archive/pre-reset-1109-1111/formal-reset |
| evidence/desktop-parameter-first-example | archive/pre-reset-1109-1111/desktop-parameter-v1 |
| experiments/desktop-parameter-v2 | archive/pre-reset-1109-1111/desktop-parameter-v2 |
| experiments/operator-workbench | archive/pre-reset-1109-1111/operator-workbench |
| evidence/quad-guide-cmf-review | archive/pre-reset-1109-1111/quad-guide-cmf-review |
| evidence/p04-quad-biblade | archive/pre-reset-1109-1111/p04-quad-biblade |
| evidence/p05-quad-equal-blades | archive/pre-reset-1109-1111/p05-quad-equal-blades |
| evidence/p06-quad-front-camera | archive/pre-reset-1109-1111/p06-quad-front-camera |
| experiments/common-control | archive/pre-reset-1109-1111/common-control |
| experiments/hub-annotator | archive/pre-reset-1109-1111/s1-hub-annotator |
| experiments/g2d | archive/unrun-registrations/g2d |
| experiments/g3b | archive/unrun-registrations/g3b |
| experiments/b02-view-calibration | archive/gpt-image/b02-view-calibration（gpt-image-b02-visual 的文字输入，因此与之同放） |
| experiments/gpt-image-b02-visual | archive/gpt-image/b02-visual |
| evidence/b02-parent-reference | archive/gpt-image/b02-parent-reference |
| evidence/d2-closed-six | archive/gpt-image/d2-closed-six |
| evidence/l1-closed-reference-diagnostic | archive/gpt-image/l1-closed-reference-diagnostic |
| experiments/d2-tuning | archive/D2/registration |
| evidence/d2-tuning | archive/D2/results |
| experiments/p1-param-prompt | archive/minimax-1113/P1/registration |
| evidence/p1-param-prompt | archive/minimax-1113/P1/results |
| experiments/p2-spec-cards | archive/minimax-1113/P2/registration |
| evidence/p2-spec-cards | archive/minimax-1113/P2/results |
| experiments/minimax-junction-pilot | archive/minimax-1113/junction-pilot/registration |
| evidence/minimax-junction-pilot | archive/minimax-1113/junction-pilot/results |
| experiments/form342-h3-pilot | archive/minimax-1113/form342-h3-pilot |
| evidence/quad-author-selection | archive/minimax-1113/quad-author-selection |
| evidence/section421-minimax-review | archive/minimax-1113/section421-minimax-review |

## 3. 待作者回答（ASK）

1. **ASK-1 · evidence/20261117-r3-check**
   - 情况：它与较晚提交的 `evidence/20261117-research-update`（119e1b0 晚于 b805803）都讲 1,318 簇、228 条造型表述、真机紧凑评分对应官方规格、两种方法的任务。
   - 问题：今后以 research-update 为准吗？r3-check 的 `checks.json` 中“已评分实拍 ↔ 厂商规格”的配对，是否已被 `research-update/a1/crosswalk.csv` 完全覆盖？若两者都是，r3-check 归档；若否，r3-check 中哪部分仍在使用？
2. **ASK-2 · evidence/section421-h3-span**
   - 情况：`docs/historical-development-index.md` 仍称其中 `specs-after-review.md` 为“当前”的修订方向卡。
   - 问题：E3 第一轮 A/B/C 的规格（ch4.md:72 表4.3）是直接由这张方向卡演变来的吗？若是，4.2.1 应说明方向的来源，本条改为 KEEP-METHOD，`section421-minimax-review`、`quad-author-selection`、`form342-h3-pilot` 也宜一并提升。若 E3 规格卡是另起的（在 `claude/e3-quad-qwen` 上），则全部归档，并改正历史索引中的“当前”二字。
3. **ASK-3 · 原件 ZIP 与解包目录重复**
   - 情况：E1 有 28.81 MB 的 ZIP 和 30.0 MB 的 `E1-actual/`；E0 有 4.47 MB 的 ZIP 和 4.7 MB 的目录；R0 有 1.56 MB 的 ZIP 和 1.6 MB 的目录。逐图 SHA-256 完全一致。
   - 问题：保留哪一份？README 以 ZIP 的 SHA-256 作为来源凭据；逐图链接、`build_pair_figure.py` 和 R3 复算使用解包路径。两者择一，可减约 35 MB。被弃的一份即 DELETE-CANDIDATE，前提是在 README 中保留 ZIP 的 SHA。
4. **ASK-4 · 图3.2**
   - 情况：ch3.md:33 仍用 `evidence/semantic-cards/gephi/comments-network.png`；`research-update/method/chapters-1-3.md:10` 指出这张原图无法从存档的分词文本复现。
   - 问题：是否换成 `research-update/comments/cooccurrence.png`（按 1,318 簇和固定的 137 词重算）？若换，`semantic-cards/gephi/` 可降为 ARCHIVE；`cards.csv` 与 `early-crawl/` 无论如何都要保留。
5. **ASK-5 · 分支上的证据**
   - 情况：第四章（图4.2–4.9、表4.3–4.6）、附录 A（`appendix.md:1` 指向的 dictionary-v16.json）、附录 E、5.4.2（43 次调用、3619.6 秒）以及 E2R/E6 原图，都只在 `claude/e3-quad-qwen` 上；X/Y 读数在 `claude/extra-readings-20261117`；局部编辑 v2 的登记在 `claude/gpu-tasks-20261117`。
   - 问题：整理时是否把这三条分支的 evidence/experiments 合入主线的 `evidence/formal/E3/` 和 `gpu-day-20261115/`？不合入的话，按本清单整理后，第四章在主线中仍然没有证据。
6. **ASK-6 · ARCHIVE 的落地方式**
   - 选项 a：放进仓库内的 `archive/` 目录，工作树保留约 149 MB。
   - 选项 b：先打 tag（如 `dev-archive-20261118`），再从 HEAD 删除。
   - 说明：`docs/historical-development-index.md` 已用固定提交链接 P1、P2、MiniMax，选 b 不会让这些链接失效。但仓库内的相对链接会断，例如：
     - `l1-layout-actual` → `l1-closed-reference-diagnostic`
     - `gpt-image-b02-visual` → `b02-view-calibration/protocol.json`
     - `quad-author-selection` → `form342-h3-pilot`
     - `e2r` 相关文档 → `01-old-E2`

   选哪种？

（以下不属于本清单的分类问题，供改正文时参考：R3 已列出 E0 闭源 6 张（ch1.md:81、ch5.md:11）在证据中不存在，`d2-closed-six` 不能作为它的证据。）

## 4. 合计

| 建议 | 条目数 | 文件数 | MB |
|---|---:|---:|---:|
| KEEP-FORMAL | 18 | 623 | 283.70 |
| KEEP-METHOD | 19 | 960 | 166.77 |
| ARCHIVE | 34 | 678 | 149.23 |
| DELETE-CANDIDATE | 0 | 0 | 0.00 |
| ASK | 2 | 49 | 5.12 |
| **合计** | **73** | **2,310** | **604.83** |

条目内另有约 35 MB 的子项删除候选：E0/E1/R0 的 ZIP 或解包副本二选一，取决于 ASK-3。若 ASK-6 选择打 tag，可再从工作树移出 ARCHIVE 的 149 MB。
