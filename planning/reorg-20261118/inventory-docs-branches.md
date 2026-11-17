# 文档、分支、PR 与工单清点（2026-11-18，只读审计）

**审计对象。** 工作树 detached 于 `origin/claude/direction-todo-20261117`（`700a9bc`，11/18 00:19），以下简称“方向分支”。远端引用已用 `git ls-remote` 核对，与本地远端跟踪引用一致（另有远端标签 `guide-choice-evidence-20261113` → `6e8e306`，已被 main 等分支包含）。GitHub 仓库 `Freeloop993/paper`：开放 PR 9 个、开放工单 35 个，协作者只有 `Freeloop993`。

**本次未做的事。** 没有修改、提交、切换分支或在 GitHub 上留言。`prototypes/`、`evidence/`、`experiments/` 只在判断分支独有内容时抽查路径，未审内容。论文正文未审。按分支名的链接只扫描了方向分支的文件树和 16 个开放工单的正文与评论；已关闭的工单和 PR 评论未扫描。

**判断依据。** 现行计划 `planning/2026-11-17-direction-and-todo.md`（下称“11/17 计划”）的任务码 A/S/C/F/E/D/H/W/M 与作者决定；R3 两份核对（`manuscript/thesis/review/2026-11-17-independent-reviews/`）。

## 0. 先看这四条

1. **`main` 落后，而且缺少论文本身。** 方向分支比 `main` 多 49 个提交、334 个文件，包括 `manuscript/thesis/` 整个目录（论文源码、两份 Word、导师版前三章）和 11/17 计划本身。`main` 的 README 只靠固定提交 `b3b6fca`（方向分支上的提交）链接到这些文件。从 `main` 克隆的人拿不到论文。
2. **`main` 不是方向分支的祖先。** `main` 有 7 个提交不在方向分支：4 个是 11/17 首页、状态页与配置器入口改动的平行副本（最终内容只差固定链接的 SHA），2 个（`2e03a88` H3 相机原图、`723afe0` S4 机鼻两张）同时在 `claude/e3-quad-qwen` 上，只有 `DATA.md` 一个文件仅存于 `main`。
3. **论文与计划引用的证据有四处只在未合并分支上**：E3 全部证据与 v1.6 字典（`claude/e3-quad-qwen`），X/Y 两次判读（`claude/extra-readings-20261117`），局部编辑第二版登记（`claude/gpu-tasks-20261117`），词对 v1（`claude/word-pairs-v1`）。详见第 2 节。
4. **合并冲突很少。** 用 `git merge-tree` 试算：e3-quad-qwen 并入方向分支只在 `README.md`、`STATUS.md`、`docs/handoff.md` 三个入口文件冲突；main 并入另加 `prototypes/e4-ds-session/README.md`；gpu-tasks 在 e3 之后并入时 `experiments/preflight.py` 与 `experiments/approved-inputs.json` 双方新增冲突，gpu-tasks 版本是 e3 版本的超集。其余未合并分支与方向分支无冲突（semantic-tools、r1-render-freeze 只在 `docs/handoff.md` 冲突）。

---

## 1. 逐项清单

状态：CURRENT 现行依据｜SUPERSEDED 已被取代｜DUPLICATE 重复｜STALE 含被新文件推翻的数字或计划｜HISTORY 仅供追溯。“归档”指移入 `docs/archive/` 一类目录并在索引中注明取代者，不删除。

### 1.1 根目录文件

| 文件 | 是什么；最后更新 | 状态 | 建议 |
|---|---|---|---|
| `AGENTS.md` | 双助手协作约定（读入口、回执、隐私、不倒改节点）；11/09 | CURRENT（规则仍适用，但让人“研究状态变化更新 STATUS/PROGRESS”，PROGRESS 11/13 后已无人更新） | UPDATE：写明唯一基准分支与合并规则；删去更新 PROGRESS 的要求；并入 CONTRIBUTING 的事件表和 `docs/handoff.md` 的跨设备交付约定 |
| `CLAUDE.md` | Claude 接手说明；11/14 | STALE：入口仍是 11/12 的“24 项任务”和“Claude 从 T01–03、T23 接续”，与 11/17 任务码不符；“首次接入验证：在 #1 评论‘Claude 已接手 C01’”已过时 | UPDATE：缩为几行指针，指向 AGENTS.md、README、11/17 计划和论文写作规则（只写已完成、学术文风） |
| `CONTRIBUTING.md` | 事件触发的交接表、工单与回执字段；11/09 | DUPLICATE（与 AGENTS.md 同为协作规则；仍要求同步 PROGRESS） | MERGE-INTO `AGENTS.md` |
| `PROGRESS.md` | 进度日志；最后一条 11/13 | STALE：例如 11/11 条“当前正式样本仍为 0”，而 STATUS 已记 E1 36 张、v1.2 正式 24 张等。PR #75 还改写了此文件全部 31 行（是否只是换行符差异，未核） | ARCHIVE（冻结并加“截至 11/13”说明；此后靠 git 日志与 STATUS） |
| `README.md` | 首页入口表；11/17 | CURRENT。`main` 与方向分支两版只差最后一行固定链接的 SHA | UPDATE：整合后把固定 SHA 链接（5 处 `b3b6fca`）改为相对路径；写明基准分支；加一行早期数据入口（吸收 DATA.md） |
| `STATUS.md` | 实验索引；11/17 | CURRENT。有 5 处固定链接指向 `e96d419`（e3-quad-qwen）、1 处指向 `ca4b534`（gpu-tasks），合并前这些证据不在方向分支树内。R3 曾指出 `STATUS.md:11,25,37` 有旧计数（审的是 `3e71843` 版本）；11/17 改写后是否已全部清除，未逐项核对 | UPDATE：合并后改相对链接；按 M6 逐条复核计数 |
| `DATA.md`（仅在 `main`） | 早期评论与商品参数数据入口，指向私有阅读库；11/17 | CURRENT，但方向分支没有此文件，`main` 的现行 README 也不再链接它 | MERGE-INTO `README.md`（一行入口） |

### 1.2 `docs/`

| 文件 | 是什么；最后更新 | 状态 | 建议 |
|---|---|---|---|
| `docs/handoff.md` | 当前接手顺序（Claude 配置器、Codex 数据、作者 S2/预试、导师前三章）；11/17 | CURRENT，与 README“继续下一项任务”一行重叠 | MERGE-INTO `README.md`（第 1 段“跨设备交付约定”并入 AGENTS.md） |
| `docs/execution-playbook.md` | 六章执行总清单，24 项任务 T01–T24；11/12 | SUPERSEDED（11/17 计划）。STALE 例：E4“另招设计者≥4，目标6—8”，11/17 定为 3 位外部设计者 | ARCHIVE（CLAUDE.md、reading-map、methods、research-plan 的横幅链接随之改掉） |
| `docs/foundation.md` | 研究地基 v1.2，F1–F5 定案与最小实验集；11/12 | SUPERSEDED（方向与实验集由 11/17 计划取代）；F1 正交顶视、F2 Qwen 为主、F4 不训练 LoRA 仍有效。STALE 例：E4“≥4 名设计者”；F2 写闭源 API 作 E0 对照臂，作者 11/17 已将 E0 闭源六张剔出正式比较 | MERGE-INTO `planning/DECISIONS.md`（新建，只搬定案表），其余归档 |
| `docs/research-plan.md` | C01 全局计划第三版（按开题五项）；11/10，11/12 加横幅 | SUPERSEDED（foundation → 11/17 计划）。STALE 例：LoRA“待裁定，11/12 裁定”，11/17 已定全文省略 | ARCHIVE |
| `docs/requirements.md` | 研究范围与开题承诺对账；11/12 | SUPERSEDED（11/17 计划第一节对照表、W1 第 2 条）。STALE 例：LoRA 要求“找不到则由作者向导师核定”；六旋写“农业/测绘” | ARCHIVE |
| `docs/methods.md` | D/S 两种方法与任务卡 A/B；11/12 | SUPERSEDED（C1–C4 与 `evidence/20261117-research-update/method/paired-pilot.md`）。STALE 例：“设计者至少4人，目标6—8人……每人约75分钟” | ARCHIVE |
| `docs/research-variables.md` | 变量与测量口径；11/11 | SUPERSEDED（A1–A8）。STALE 例：“相对横纵轴位跨度比为唯一主要连续变量”，现行为 W/L、机身比例、d/D | ARCHIVE |
| `docs/roadmap-20261114.md` | 实验与写作路线图、字典 v1.3（臂材质）；11/14 | SUPERSEDED（11/17 计划）。STALE 例：以字典 v1.3 为准，F5 已定 v1.6 为正式字典；第 3 步“签署冻结单”未完成 | ARCHIVE（作者 11/14 臂材质决定先抄入 DECISIONS） |
| `docs/method-freeze-evidence-20261114.md` | 冻结单第 2 节的实测依据；11/14 | HISTORY。STALE 例：“紧凑—舒展……维持设计讨论地位”，与 S4 把“紧凑”定为首要待检验目标相反 | MERGE-INTO `docs/protocols/method-freeze-v1.md`（作附录，随 v2 一并处理） |
| `docs/configurator-realignment.md` | 找回配置器后的纠偏与 Claude 任务；11/11 | SUPERSEDED（`planning/configurator-research/README.md`，11/17） | ARCHIVE |
| `docs/claude-context-20261113.md` | 作者复盘用图与接手清单；11/13 | HISTORY | ARCHIVE |
| `docs/image-retrospective-20261113.md` | 逐图复盘表；11/13 | HISTORY | ARCHIVE |
| `docs/historical-development-index.md` | PR #65–#67 历史材料入口；11/14 | HISTORY；“当前方法以冻结单和路线图为准”一句已过时 | ARCHIVE |
| `docs/literature-update-2026-11.md` | N01–N08 近期文献；11/10–11 | CURRENT（`src/references.json` 仍用 N01、N03–N08 等键）。LoRA 裁定一节 STALE | MERGE-INTO `references/README.md`（新建的文献入口） |
| `docs/figures/motor-centers-two-views.png` | 顶视投影缩短示意；11/10。`methods.md` 于 `0e732e0` 撤下链接，现无引用 | HISTORY | ARCHIVE |
| `docs/protocols/method-freeze-v1.md` | 第 3 章方法冻结单 v1；11/14 | CURRENT（`ch3.md` 注明“方法版本以此为准”）但内容 STALE：以字典 v1.2 填写，“紧凑—舒展：目前没有通过开发判据的单项代理”，第 3 节仍“待作者签署”（R3 第 5 条） | UPDATE：出 v2 或改为 W1 第 10 条的偏离记录表（见 ASK 5） |
| `docs/protocols/E0-E1-guide-prompt-spec.md` | E0/E1 条件图与提示词规格；11/12 | HISTORY，但 E1 是现有唯一扎实定量结果的出图前规格 | KEEP（M4 复现包需要） |
| `docs/protocols/formal-collection-kit.md` | 招募说明、同意条款、评议材料包；11/12 | STALE：“设计者≥4、目标6—8”，每人约 75 分钟；11/17 为 3 位外部设计者、每场至多 9 张、主动操作 15 分钟，评议目标 10 人 | UPDATE：按 C1 与 E 组改写，作 M3 知情同意的底稿 |
| `docs/protocols/4.2.1-design-cards.md` | E3 三张规格卡（作者审阅稿）；11/13–14 | SUPERSEDED（`evidence/section421-h3-span/specs-after-review.md` 与 E3 三轮字典 v1.4–v1.6，后者在 e3-quad-qwen） | ARCHIVE |
| `docs/protocols/e3-spec-cards-draft.md` | E3 三方向草案与 E2–E6 缺口；11/13 | SUPERSEDED（4.2.1-design-cards） | ARCHIVE |
| `docs/protocols/semantic-to-E3-spec.md` | 评论语义到 E3 的规格（T04–T06）；11/12 | SUPERSEDED（词对 v1 与 S4、S6） | ARCHIVE |
| `docs/protocols/freeze-sheet-P3.md` | P3 冻结单模板；11/12 | SUPERSEDED（method-freeze-v1） | ARCHIVE |
| `docs/protocols/G2-axis-control-spec.md` | G2 规格（已按判据失败）；11/10 | HISTORY | ARCHIVE |
| `docs/protocols/G2b-structure-screen-spec.md` | G2b 规格；11/10 | HISTORY | ARCHIVE |
| `docs/protocols/G2d-G3b-spec.md` | G2d、G3b 规格；11/10 | HISTORY | ARCHIVE |
| `docs/protocols/G3b-amendment-orientation.md` | G3b 机头朝向修订建议；11/10，无引用 | HISTORY | ARCHIVE |
| `docs/tasks/codex-batch-01..03.md`（3 份） | Claude 给 Codex 的 X02–X11 派单；11/10，无引用 | HISTORY | ARCHIVE |

### 1.3 `planning/`

| 文件 | 是什么；最后更新 | 状态 | 建议 |
|---|---|---|---|
| `2026-11-17-direction-and-todo.md` | 现行方向、任务码、作者决定、数据门；11/18 | CURRENT | KEEP（整合后把 M1 一行与第二节“证据分散在未合并分支上”改为已处理） |
| `configurator-research/`（README、独立复核、RAG 计数脚本与结果） | 配置器与 E4 研究方案；11/17 | CURRENT（11/17 计划首行引用） | KEEP |
| `proposal-original.pdf` | 开题报告原件（2025-12） | CURRENT | KEEP |
| `outline-revised.docx` | 落实导师批注的修订目录；11/09 | CURRENT（原件） | KEEP |
| `claude-materials.md` | Claude 的资料入口（开题、同门论文、文献全文分支）；11/12 | STALE：“Claude先做T01–03和T23”，以 24 项清单为执行入口 | MERGE-INTO `references/README.md`（资料部分）；指向执行清单的部分删去 |
| `claude-review.md` | 11/09 全局评估委托 | HISTORY | ARCHIVE |
| `google-doc-snapshot.md` | Google Doc v0.7（11/07）快照；11/09 | HISTORY | ARCHIVE |
| `route-review-20261112/`（HTML 426 KB、思维导图、mmd） | 按 T01–T24 画的路线审核；11/12 | HISTORY | ARCHIVE |

### 1.4 `references/`

| 文件 | 是什么；最后更新 | 状态 | 建议 |
|---|---|---|---|
| `catalogs/`（README 与 10 份书目表） | 书目库、许可清单；全文在 `reference-fulltexts-20261109` 分支；11/09–12 | CURRENT | KEEP |
| `peer-theses.md` | 同门四篇硕士论文的原件与结构；11/14 | CURRENT（版式与篇幅参照） | KEEP |
| `reading-map.md` | R01–R14 阅读地图；11/12 | CURRENT 内容，顶部横幅仍指向 24 项清单 | UPDATE：删横幅；与 literature-update 的 N 条目合成一个文献入口 |

### 1.5 `manuscript/`

| 文件 | 是什么；最后更新 | 状态 | 建议 |
|---|---|---|---|
| `ch05-hexa-results.md` | 旧“巡检测绘六旋”4 张图的段落；11/09 | STALE：六旋已定为农业植保、可行性探测 | ARCHIVE |
| `evidence-matrix.md` | 六章写作证据矩阵；11/14 | SUPERSEDED（11/17 计划第七节数据门与 R3 核对） | ARCHIVE |
| `outline.md` | 现行六章目录；11/09 | CURRENT（论文 README 定为标题依据）。与 `src` 只有一处不一致：目录为“5.3 设计意图符合度与方案感知评价”及 5.3.1、5.3.2，`ch5.md` 为“5.3 设计意图的独立评议” | UPDATE（以哪个为准见 ASK 7） |
| `revisions/`（9 份修订片段） | C01–C04 修订片段；11/10–14 | HISTORY（已并入 `thesis/src`，src 的注释把它们记为来源） | ARCHIVE |
| `source-drafts/`（01–03、引注索引） | 历史正文素材；11/09–11 | HISTORY（ch1、ch2 注释引用为来源） | ARCHIVE |
| `thesis/src/` | 论文正文源（摘要、ch1–ch6、附录、references.json）；11/15 `836e0a7` | CURRENT。只在方向分支（及 thesis 相关分支），`main` 没有。附录引用的 `experiments/e3-quad-qwen/round-3/dictionary-v16.json` 只在 e3-quad-qwen | KEEP |
| `thesis/FORMAT.md`、`thesis/STYLE.md` | 南航排版依据、写作规范；11/15 | CURRENT | KEEP |
| `thesis/README.md` | 论文目录入口；11/15 | STALE：“本轮修订以作者于 2026-11-14 交回的 Word 批注稿为底稿”；“references.json 中有 19 条待核”，完成稿构建报告为 0 条；未提导师版前三章与 W1 修改规则 | UPDATE |
| `thesis/build.mjs`、`package.json`、`package-lock.json` | 构建脚本；11/15 | CURRENT | KEEP |
| `thesis/figures/`（16 幅 + make_figures.py） | 论文插图；11/15 | CURRENT。第四章图的原始证据只在 e3-quad-qwen | KEEP |
| `thesis/thesis-complete.docx` | 完成稿 Word，由当前 src（`836e0a7`）构建 | CURRENT | KEEP |
| `thesis/thesis-draft.docx` | 带黄色占位的工作稿；最后构建于 `677f8bf`（11/15 17:13） | STALE：此后 src 又改动 +1467/−1253 行，未重建 | UPDATE（重建，或按 ASK 6 停用） |
| `thesis/build-report.md` | 工作稿构建报告 | STALE（与工作稿同时停在 `677f8bf`：15 幅图、25 张表；完成稿报告为 16 幅、30 张） | UPDATE（随工作稿重建） |
| `thesis/build-report-complete.md` | 完成稿构建报告；11/15 | CURRENT | KEEP |
| `thesis/review/2026-11-15-*`（作者批注 docx、盲审批注 docx、逐条答复、修订方案） | 11/15 修订轮原件与答复 | HISTORY（修订方案中“E4 待作者决定做或不做”等已被 11/17 决定取代） | KEEP（原件留痕，不再作计划用） |
| `thesis/review/2026-11-17-independent-reviews/`（R1、R2、R3、R3 Codex 替代件） | 三份独立审稿；11/17–18 | CURRENT（W1 的依据） | KEEP |
| `thesis/review/handoff-20261117/`（README、`chapters-1-3.docx`） | 交导师的前三章与 11/17 交接；11/17 | CURRENT | KEEP |
| `thesis/review/literature-audit/`（4 份 JSON） | 文献 DOI/arXiv 核对；11/15 | CURRENT | KEEP |

### 1.6 远端分支（35 个，不含 `origin/HEAD`）

“在 main”“在方向”指分支末端是否为 `origin/main`、方向分支的祖先。“链接”指方向分支文件树或开放工单中按分支名链接它的处数。

| 分支 | 末次提交 | 在 main | 在方向 | 独有内容（方向分支没有的） | 开放 PR | 建议 |
|---|---|---|---|---|---|---|
| `claude/direction-todo-20261117` | 11/18 `700a9bc` 原 R3 入库 | 否（领先 49 个提交） | — | 论文源码与 Word、11/17 计划、11/17 全部线下数据、三份审稿 | 无（没有指向 main 的 PR） | KEEP-ACTIVE（整合基准，见第 4 节） |
| `main` | 11/17 `40b7597` | — | 否（7 个提交不在方向） | `DATA.md`；`evidence/h3-camera-layout-originals/`（48 个文件）与 `evidence/qwen-shape-s4-20261114/s4-nose-edge-2/`，后两者也在 e3-quad-qwen | — | KEEP-ACTIVE（整合后的唯一主干） |
| `claude/e3-quad-qwen` | 11/15 `e96d419` | 否 | 否（38 个提交、738 个文件） | E3 三轮原图、请求、回执与比较图（`evidence/e3-quad-qwen-20261115/`、`experiments/e3-quad-qwen/`，含 `round-3/dictionary-v16.json`）；`experiments/e3-deepening/`（第四章像素数 1305、3028 的出处）；11/15 GPU 日 247 份排程请求（`experiments/gpu-day-20261115/queue` 等）；B2 盲读与 E6 交接（`evidence/gpu-day-20261115/`）；E2R 原图包；六旋更正批 `hexa-fix` | #73（→ main，冲突） | MERGE（并入基准分支；之后改为同名标签，见第 4 节） |
| `claude/gpu-tasks-20261117` | 11/17 `ca4b534` | 否 | 否（2 个提交，约 90 个文件） | `experiments/20261117-local-edit-v2/`（F1 开发 17 张、F2 确认 56 张的登记、遮罩、请求）；`experiments/preflight.py` 遮罩检查版；`approved-inputs.json` 加 B2 去窗父图 | 无 | MERGE（在 e3-quad-qwen 之后；它的输入引用 `experiments/e3-deepening/`） |
| `claude/extra-readings-20261117` | 11/17 `e19a706` | 否 | 否（1 个提交） | `evidence/20261115-review-takeover/claude-XY-20261117/`：正式造型 24 张与 E2R 6 对的第三、四次独立 AI 判读（X/Y） | 无 | MERGE |
| `codex/thesis-source-e2r-20261115` | 11/17 `5f92248` | 否 | 否（仅末提交 1 个） | 更正 `evidence/20261117-offline-review/README.md` 中六旋缺毂图的编号（3 行） | #74（→ thesis-docx） | MERGE（只需这 1 个提交） |
| `claude/word-pairs-v1` | 11/13 `dad1978` | 否 | 否（2 个提交） | `docs/protocols/word-pairs-v1-draft.md`：词对 v1，提交说明写作者已确认“低调—醒目”、桨叶防护不入选。方向分支有 5 个文件按固定 SHA 引用它（第二编码登记等），R3 第 20 条也提到它 | #62 | MERGE |
| `claude/ch03-3.2-3.3` | 11/14 `fd0aa42` | 否 | 否（1 个提交） | `manuscript/revisions/ch03-3.2-3.3-v2.md`（3.2–3.3 初稿）及对 `ch03-3.4-v2.md` 的 8 行改动；已被 `src/ch3.md` 吸收，`ch3.md` 注释按分支名记其为来源 | #71 | ARCHIVE-AS-TAG（同名标签，保住注释中的出处） |
| `claude/r1-r3-design` | 11/13 `e2dc0e6` | 否 | 否（1 个提交） | `docs/protocols/R1-R3-control-vs-form-spec.md`：R1–R3 三臂设计，从未执行；Codex 11/12 要求补“去掉桨叶轮廓”一组，未回应 | #60 | ARCHIVE-AS-TAG |
| `codex/r1-render-freeze` | 11/12 `370363c` | 否 | 否（3 个提交） | `experiments/r1-render/`：R1 渲染设置 24 位置冻结请求，实际提交 0 | #54 | ARCHIVE-AS-TAG |
| `codex/semantic-tools` | 11/14 `62a00b1` | 否 | 否（3 个提交） | `experiments/rating-kit/` 词对评分页（instrument）与分阶段打包；方向分支的 `evidence/real-product-topview/README.md` 按固定 SHA `21223be` 链接其 instrument.js。该分支的 `real-product-topview` 改动比方向分支旧 | #57 | ASK（ASK 3） |
| `codex/e2r-human-review-20261115` | 11/15 `5b1e4c6` | 否 | 否（1 个提交） | `manuscript/thesis/review/2026-11-15-codex-e2r-human-reading.docx`（3 MB，带第一份独立 E2R 判读的论文评阅稿）；无任何引用 | 无 | ASK（ASK 4） |
| `reference-fulltexts-20261109` | 11/09 `82fb03d` | 否 | 否（18 个提交） | 102 份有再分发许可的文献 PDF（约 806 MB）；`references/catalogs/` 内 250 余处按分支名链接 | 无 | KEEP-ACTIVE（长期数据分支，不并入 main） |
| `claude/thesis-docx` | 11/15 `677f8bf` | 否 | 是 | 无（全部在方向分支） | #72（→ main）；也是 #74 的目标 | ARCHIVE-AS-TAG（基准合入 main 后；开放工单评论 3 处、PR #72 正文按分支名链接） |
| `claude/guide-prompt-spec` | 11/12 `9781eff` | 是（#51） | 是 | 无 | 无 | ARCHIVE-AS-TAG（开放工单 1 处按分支名链接） |
| `codex/minimax-camera-roots` | 11/13 `d147f61` | 是（#67） | 是 | 无 | 无 | ARCHIVE-AS-TAG（开放工单 1 处按分支名链接） |
| `claude/c01-1111` | 11/10 `310abbf` | 是（#17） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/c01-review-1110` | 11/10 `d6bbdc0` | 是（#15） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/c01-review-1110b` | 11/10 `a5291ff` | 是（#16） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/d2-addendum` | 11/13 `f1b238b` | 是（#64） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/d2-tuning` | 11/13 `8170410` | 是（#63） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/e3-spec-cards` | 11/14 `5bbab1f` | 是（#66） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/foundation-v1` | 11/12 `223513b` | 是（#18） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/freeze-v1-sec2` | 11/14 `d3290eb` | 是（#70） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/l1-layout` | 11/12 `4ffdd95` | 是（#61） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/method-freeze-v1` | 11/14 `638db88` | 是（#68） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/p1-param-prompt` | 11/13 `2996f6b` | 是（#65） | 是 | 无（历史索引按 SHA 链接，SHA 在 main 上可达） | 无 | DELETE-CANDIDATE |
| `claude/roadmap-ch34` | 11/14 `6d36c27` | 是（#69） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `claude/semantic-to-e3` | 11/12 `48e586f` | 是（#55） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `codex/e0-image26-blind-read` | 11/12 `b4d46de` | 是（#53） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `codex/e1-actuals` | 11/12 `eb575d4` | 是（#58） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `codex/e1-design-audit` | 11/12 `a53653b` | 是（#59） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `codex/foundation-section8` | 11/12 `0e732e0` | 是（#50） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `codex/r0-e0-e1-freeze` | 11/12 `b17fc12` | 是（#52） | 是 | 无 | 无 | DELETE-CANDIDATE |
| `codex/semantic-card-delivery` | 11/12 `b720048` | 是（#56） | 是 | 无 | 无 | DELETE-CANDIDATE |

关于 19 个 DELETE-CANDIDATE：末端都已在 `main`，对应 PR 均已合并，方向分支文件树和开放工单中没有按分支名的链接。已关闭工单与 PR 的评论未扫描，删除前可再搜一次。

### 1.7 开放 PR（9 个）

| PR | 头 → 目标；更新 | 是什么 | 状态 | 建议 |
|---|---|---|---|---|
| #75 | fork `lucienzhu/paper:claude/configurator-ui-20261117` → 方向分支；11/17 | 五页签配置器界面两轮重做（88 个文件，含离线包、走查截图）；正文说是软件验收、新增生成 0；另改写 `PROGRESS.md` 全文 | 提交只在 fork 上，本仓库没有副本；`lucienzhu` 不是本仓库协作者；内容属 `prototypes/`，不在本次审阅范围 | ASK（ASK 2） |
| #74 | `codex/thesis-source-e2r-20261115` → `claude/thesis-docx`；11/17 | 以 E2 真人盲判稿为准合并论文源码与 Word | 13 个提交中 12 个已在方向分支，只剩 `5f92248` 一处证据编号更正；目标分支已过时 | CLOSE（把 `5f92248` 并入基准后关闭；目标是 thesis-docx，基准合入 main 不会自动关闭它） |
| #73 | `claude/e3-quad-qwen` → main；11/15 | E3 设计初稿三轮、B2 修订、GPU 日登记等 | CONFLICTING；内容是论文第四、五章的证据来源 | MERGE（改为并入基准分支；基准合入 main 后 GitHub 会把它标为已合并） |
| #72 | `claude/thesis-docx` → main；11/15 | 新建 `manuscript/thesis/` Word 工作稿 | 内容已全部在方向分支 | CLOSE（被基准分支整体合入取代；合入后也会自动标为已合并） |
| #71 | `claude/ch03-3.2-3.3` → main；11/14 | 3.2–3.3 初稿与 3.4 更新 | SUPERSEDED（`manuscript/thesis/src/ch3.md`） | CLOSE（分支打同名标签保留出处） |
| #62 | `claude/word-pairs-v1` → main；11/12 | 词对 v1 | CURRENT（仍被第二编码登记等按 SHA 引用；S4、S6 以它为起点） | MERGE（经基准分支） |
| #60 | `claude/r1-r3-design` → main；11/12 | R1–R3“可控与像产品能否兼得”设计 | SUPERSEDED：从未执行，此后路线改为 L1、H3 与 E3 点线图通路；Codex 的修改意见无回应 | CLOSE |
| #57 | `codex/semantic-tools` → main；11/13 | R1 三题、E5 词对评分页、T06 作者规格入口 | 评分页可能还能给 E 组 10 人评议用；能否沿用，无法判断 | ASK（ASK 3） |
| #54 | `codex/r1-render-freeze` → main；11/12 | R1 渲染设置冻结（24 位置） | SUPERSEDED：实际提交 0，R1 未再列入任何计划 | CLOSE |

### 1.8 开放工单（35 个）

| 工单 | 是什么；最后更新 | 状态 | 建议 |
|---|---|---|---|
| #1 C01 协作 | Claude 写作与交接主线，100 条评论；11/17 | CURRENT（11/17 计划按 #1 的分工执行，多处引用其评论） | KEEP-OPEN（评论太长，是否另开新串见 ASK 9） |
| #3 A01 作者决策 | 作者决定登记，40 条评论；11/17 | CURRENT | KEEP-OPEN |
| #2 X01 | Codex 离线改稿台（D/S 两流程）；11/12 | SUPERSEDED（C1 作者预试工作台，`evidence/20261117-a1-a4-c1/`） | CLOSE |
| #14 X12 | 评议表、抽签、校准包；11/10 | SUPERSEDED（E 组评议，11/17 计划 E1–E4′） | CLOSE |
| #19 E0 后端对照 | 开源 6 张已做，闭源 6 张未采；11/13 | 作者 11/17 定闭源 6 张剔出正式比较、不补采（计划“作者最新决定”第 5 条，M2） | CLOSE |
| #20 E1 参数响应 | 36 张已完成，结果写入第五章；11/12 | 后续由 A3、A7、A8 承接 | CLOSE |
| #21 E2 父图修订 | E2R 已完成；E2 第二版 8 张待跑；11/14 | CURRENT（F1、F2、F7 未完成） | KEEP-OPEN（改标题对应 F1/F2/F7） |
| #22 E3 方案展开 | 三轮初稿、B2 已选；11/13 | 已完成，深化转 D1、D2 | CLOSE（等 e3-quad-qwen 合入后关，工单评论里有 13 处按该分支名的链接） |
| #23 E4 D/S 对照 | 11/13 | CURRENT 但正文 STALE：“另招设计者≥4，目标6—8”，现为 3 位外部设计者 | KEEP-OPEN（按 C1–C3 改正文） |
| #24 E5 独立评议 | 11/13 | CURRENT 但正文 STALE：“评议者≥3，目标5”，现目标 10 人 | KEEP-OPEN（按 E 组改正文） |
| #25 E6 植保六旋 | 39 张更正输出已回收；11/15 | CURRENT（H1 待做、H3 待定、A6 可选） | KEEP-OPEN（改标题对应 H 组） |
| #26 T01 核对开题五项 | 11/12，0 评论 | SUPERSEDED（计划第一节对照表、W1 第 2 条） | CLOSE |
| #27 T02 研究问题与证据单位 | 0 评论 | SUPERSEDED（计划第一节三条证据链、第七节数据门） | CLOSE |
| #28 T03 理论与任务来源 | 0 评论 | SUPERSEDED（W1 第 9 条） | CLOSE |
| #29 T04 双人编码 | 1 评论；40 条第二编码已回收 | SUPERSEDED（S6） | CLOSE |
| #30 T05 锁定词对 | 2 评论；词对 v1 已定 | SUPERSEDED（S4、S5；真实产品图转 A1/A2） | CLOSE |
| #31 T06 两案规格与任务卡 | 1 评论 | 已完成（E3 规格卡）；后续 C1 任务卡、H1 | CLOSE |
| #32 T07 几何变量与条件图 | 0 评论 | SUPERSEDED（A2、A4） | CLOSE |
| #33 T08 E1 纯文字对照 | 0 评论 | 已在 E1 完成 | CLOSE |
| #34 T09 独立量尺与读数误差 | 0 评论 | SUPERSEDED（A8） | CLOSE |
| #35 T10 E1 检验 | 0 评论 | 已完成；后续 A3、A7 | CLOSE |
| #36 T11 作者筛选四旋候选 | 7 评论 | 已完成（E3R3-B2） | CLOSE |
| #37 T12 一案修订 | 0 评论 | 已完成（B2 修订记录）；后续 F 组、D2 | CLOSE |
| #38 T13 一案深化表达 | 0 评论 | SUPERSEDED（D1） | CLOSE |
| #39 T14 植保六旋单案 | 2 评论；首案已出 | SUPERSEDED（H2） | CLOSE |
| #40 T15 三组参与者与协议 | 0 评论 | SUPERSEDED（C1、E1、M3） | CLOSE |
| #41 T16 D/S 动作与机会 | 0 评论 | SUPERSEDED（C1、C2） | CLOSE |
| #42 T17 配对场次 | 0 评论 | SUPERSEDED（C3） | CLOSE |
| #43 T18 r3 顶视盲评 | 0 评论 | SUPERSEDED（E1–E4′、S5） | CLOSE |
| #44 T19 参数误差与效应 | 0 评论 | SUPERSEDED（A7） | CLOSE |
| #45 T20 协同效果与代价 | 0 评论 | SUPERSEDED（C3，5.4 节） | CLOSE |
| #46 T21 E6 归一化响应 | 0 评论 | SUPERSEDED（A6） | CLOSE |
| #47 T22 封存原件与分母 | 0 评论 | SUPERSEDED（M4、M5、M6） | CLOSE |
| #48 T23 证据写入六章 | 0 评论 | SUPERSEDED（W1、W2–W8） | CLOSE |
| #49 T24 结论与适用范围 | 0 评论 | SUPERSEDED（W 组；第六章与摘要的数据门） | CLOSE |

关闭 T 单时，建议在关闭评论里写一句“由 11/17 计划的 ×× 承接”，对应关系即上表。

---

## 2. 有风险的独有内容

指只在未合并分支上、又被论文或现行计划引用的内容。

| 内容 | 所在位置 | 谁在引用 | 若分支被删或继续分散的后果 |
|---|---|---|---|
| **论文本身与现行计划**：`manuscript/thesis/`（源码、两份 Word、导师版前三章、三份审稿）、`planning/2026-11-17-direction-and-todo.md`、11/17 全部线下数据 | 方向分支（论文部分也在 thesis-docx、thesis-source-e2r） | `main` 的 README 通过固定 SHA `b3b6fca` 链接 | `main` 上没有论文；按 `main` 工作的人会在没有论文的树上做事 |
| E3 三轮原图、请求、回执，字典 v1.4–v1.6（`experiments/e3-quad-qwen/round-3/dictionary-v16.json`） | `claude/e3-quad-qwen` | 论文附录 A（`appendix.md:1` 注明取自该文件）；STATUS 5 处固定链接 `e96d419`；R3 第 4 条；计划 M1、M7 | 附录字典无源可复算；第四章图 4.2–4.9 只剩 `thesis/figures/` 中的副本 |
| 第四章像素数（1305、3028，0.11%/0.37%）的出处 `experiments/e3-deepening/` | `claude/e3-quad-qwen` | `ch4.md`；R3 第 139 行 | 数字无从核对 |
| 11/15 GPU 日 247 位置的排程登记与请求（`experiments/gpu-day-20261115/queue` 等）、B2 盲读（`evidence/gpu-day-20261115/dual-hexa-handoff/blind-b2`）、E2R 原图包 | `claude/e3-quad-qwen` | STATUS“局部编辑”行；R3 第 15、17 条；`evidence/20261117-offline-review/README.md` 按分支名链接 | 回收的 102 张原图（在方向分支）失去对应的请求与登记 |
| X/Y 第三、四次 AI 判读（`evidence/20261115-review-takeover/claude-XY-20261117/`） | `claude/extra-readings-20261117` | 计划 F5（“R/T、X/Y 四次 AI 与 N2 真人判读并列”）；R3 第 1、9 条 | F5 合并分析缺两组读数；摘要与第五章“只报最有利一组”的问题无法改正 |
| 局部编辑第二版登记（F1 开发 17 张、F2 确认 56 张；遮罩与请求）与 preflight 遮罩检查 | `claude/gpu-tasks-20261117` | 计划 F1（“已登记并通过出图前检查，等开机”）、第四节 GPU 用量；STATUS 固定链接 `ca4b534`；`evidence/20261117-r3-check/` | 开机时登记与请求不在主干，出图前检查无法在同一棵树上复核 |
| 词对 v1（`docs/protocols/word-pairs-v1-draft.md`） | `claude/word-pairs-v1` | `experiments/semantic40-pairing/README.md`（第二编码的第一编码定义）、e3-spec-cards-draft、claude-context、`evidence/form342-h3-dev/round-2-audit`、`evidence/quad-author-selection`，均按固定 SHA；R3 第 20 条；S4、S6 以它为起点 | 论文 3.2–3.3 的词对表与第二编码 κ 失去冻结依据 |
| 六旋缺毂图编号更正（3 行） | `codex/thesis-source-e2r-20261115`（`5f92248`） | `evidence/20261117-offline-review/README.md` 被 STATUS 与计划第二节第 7 条引用 | 六旋复测记录保留错误图号 |
| 配置器界面两轮重做 | 只在 fork `lucienzhu/paper`（PR #75） | README“改界面、试用原型”一行、handoff 第 1 条指向配置器工作 | fork 删除即丢失；本仓库没有副本 |
| E5 词对评分页（rating-kit instrument） | `codex/semantic-tools` | `evidence/real-product-topview/README.md` 按 SHA `21223be` 链接 | 若 E 组评议要沿用而分支被删，固定链接会失效 |
| `DATA.md` | 只在 `main` | 无现行引用 | 影响小；早期数据的另一入口 `evidence/semantic-cards/early-crawl/README.md` 在方向分支 |

---

## 3. 建议的最小文档集（8 个入口）

| 入口 | 应包含什么 | 并入哪些现有文件 |
|---|---|---|
| `README.md` | 课题一句话；导师当前阅读范围与版本（前三章 Word）；唯一基准分支；入口表：计划、状态、论文、决定、协议、数据与文献；四步接手顺序 | `docs/handoff.md`、`DATA.md`、`planning/claude-materials.md` 的入口部分 |
| `AGENTS.md`（`CLAUDE.md` 只留几行指针） | 角色与决定权；分支规则（只在主干和短命分支上工作，合并后删分支）；回执最小字段；跨设备交付约定；数据与隐私；论文写作规则摘要（只写已完成、学术文风、W1） | `CONTRIBUTING.md`、`CLAUDE.md` 正文、`docs/handoff.md` 第 1 段 |
| `STATUS.md` | 每个实验一行：统一编号、材料、分母、读者、结论边界、证据相对链接、对应数据门；不再写过程日志 | `PROGRESS.md`（归档）、`manuscript/evidence-matrix.md`（归档）；按 M6 清理旧计数 |
| `planning/2026-11-17-direction-and-todo.md`（可改名为 `planning/PLAN.md`） | 方向、任务码表、GPU、顺序、数据门；只有一份 | 取代 `docs/foundation.md`、`research-plan.md`、`requirements.md`、`methods.md`、`research-variables.md`、`roadmap-20261114.md`、`execution-playbook.md`（全部归档） |
| `planning/DECISIONS.md`（新建） | 作者决定逐条：日期、原话出处（#3 评论链接）、影响范围、取代了哪条旧决定 | foundation 第 2 节 F1–F5；roadmap 第 0 节臂材质；词对 v1 确认；11/15 选 B2 与下端相机；11/17 六项决定；LoRA 省略；E0 闭源剔除。#3 继续作讨论串 |
| `docs/protocols/README.md` 与现行协议 | 只列现行：方法冻结单 v2（v1.6 字典、紧凑代理量、A8 判读者档案、偏离记录表）、词对 v1、E1 规格、C1 配对预试、更新后的采集与同意材料；其余移入 `docs/archive/protocols/` | method-freeze-v1 及其依据文件、word-pairs-v1（合并后）、E0-E1 规格、formal-collection-kit、`evidence/20261117-research-update/method/paired-pilot.md`（链接或移入） |
| `manuscript/thesis/README.md` | src 是唯一正文源；两份 Word 各是什么、何时重建；导师版前三章；review 目录索引（R1/R2/R3、11/15 原件）；目录标题依据 | `manuscript/outline.md`（可保留为标题表，由此 README 指向）；`revisions/`、`source-drafts/`、`ch05-hexa-results.md` 移入 `manuscript/archive/` |
| `references/README.md`（新建） | 文献入口：R01–R14、N01–N08、同门四篇、书目库、全文分支的用法与许可 | `reading-map.md`、`docs/literature-update-2026-11.md`、`planning/claude-materials.md` 的资料部分、`catalogs/README.md`（保留为子页） |

另设 `docs/archive/README.md` 一页，列出每份归档文件及取代它的入口。`planning/configurator-research/` 作为 E4 与配置器的专题方案保留，由计划链接，不算入口。

---

## 4. 建议的分支整合顺序

1. **基准：** `claude/direction-todo-20261117`。它包含 thesis-docx 的全部内容、论文源码、11/17 计划和全部 11/17–11/18 数据，是现有分支中内容最全的一支。整合期间两位助手只往基准分支提交。
2. **并入 `origin/main`。** 带入 `DATA.md`、H3 相机原图、S4 机鼻两张，并使基准成为 main 的后代，最后可以快进合入 main。冲突：README、STATUS、handoff 三处只差固定链接 SHA，保留基准版本；`prototypes/e4-ds-session/README.md` 由配置器负责人决定。
3. **并入 `claude/e3-quad-qwen`**（约 738 个文件）。冲突只在 README、STATUS、handoff，保留基准版本。随后：STATUS 的 5 处 `e96d419` 链接改相对路径；`evidence/20261117-offline-review/README.md` 的分支名链接改相对路径；核对附录引用的 `dictionary-v16.json` 已在树内。
4. **并入 `claude/gpu-tasks-20261117`。** `experiments/preflight.py`、`experiments/approved-inputs.json` 双方新增冲突，取 gpu-tasks 版本：其首个提交 `97b1a72` 的 preflight 与 e3 末端版本相同，approved-inputs 只多一条 B2 去窗父图。STATUS 的 `ca4b534` 链接改相对路径。
5. **并入 `claude/extra-readings-20261117`**（无冲突）。
6. **并入 `codex/thesis-source-e2r-20261115`**，只新增 `5f92248`（无冲突），然后关闭 #74。
7. **并入 `claude/word-pairs-v1`**（1 个文件，无冲突）。
8. **待作者答复后：** PR #75（fork 提交需先取回并基于整合后的基准重放）；PR #57 与 `codex/e2r-human-review-20261115` 按 ASK 3、4 处理。
9. **在基准上收尾：** 重建两份论文 Word 与构建报告；跑一次链接检查（固定 SHA 链接可改为相对路径）；更新 11/17 计划 M1、M7 与第二节第 4 条。
10. **开 PR：基准 → main，合并。** #62、#72、#73 的头提交进入 main 后会自动显示为已合并；#71、#60、#54、#74 手动关闭。
11. **改为同名标签（先删分支，再在原 SHA 上建同名标签，避免分支与标签重名）。** GitHub 的 `/blob/<名称>/` 与 `/tree/<名称>/` 链接对标签同样有效，所以已有链接不会失效。适用于：
    - 按分支名被引用、已并入的：`claude/direction-todo-20261117`（工单 5 处）、`claude/e3-quad-qwen`（13 处）、`claude/gpu-tasks-20261117`、`claude/extra-readings-20261117`、`claude/thesis-docx`、`claude/guide-prompt-spec`、`codex/minimax-camera-roots`；
    - 不合并、只存档的：`claude/ch03-3.2-3.3`、`claude/r1-r3-design`、`codex/r1-render-freeze`，以及待 ASK 结果的 `codex/semantic-tools`、`codex/e2r-human-review-20261115`。
12. **删除** 19 个已在 main、无分支名链接的分支（1.6 表中的 DELETE-CANDIDATE）。
13. **长期保留的分支只剩两个：** `main`、`reference-fulltexts-20261109`。

---

## 5. 需要作者回答的问题（ASK）

1. **基准分支与顺序。** 是否同意以 `claude/direction-todo-20261117` 为整合基准，按第 4 节依次并入 main、e3-quad-qwen、gpu-tasks、extra-readings、thesis-source-e2r 的末提交和 word-pairs-v1，再整体合入 main，此后只在 main 上工作？（计划 M1 写的是“Codex 提方案，作者定”。）
2. **PR #75。** fork 账号 `lucienzhu` 是你本人或某位助手在另一台电脑上用的账号吗？若可信，是否在整合完成后把第二轮界面（`8c3b1e2`）并入？该 PR 改写了 `PROGRESS.md` 全部 31 行，这部分是否接受？
3. **PR #57 评分页。** E 组 10 位独立评议是否沿用 `experiments/rating-kit` 的词对评分页（1–7 加“看不出”，先实拍后终稿）？沿用就合并；不沿用就关闭并打同名标签。
4. **`codex/e2r-human-review-20261115` 的 Word。** 这份 3 MB 评阅稿里是否有 E2R 真人答卷的原文或可识别信息？若有，应按 M5 去标识后放入私有阅读库，不进公开主干；若没有，是否只打标签存档？
5. **方法冻结单。** `docs/protocols/method-freeze-v1.md` 第 3 节至今“待作者签署”。是签署 v1，还是按 W1 第 10 条改为偏离记录表，出一版以 v1.6 字典和“紧凑”首要目标为准的 v2？
6. **工作稿 Word。** 还需要带黄色占位的 `thesis-draft.docx` 吗？它停在 11/15 17:13，此后源码有约 1,500 行改动。需要就重建；不需要就只保留 `thesis-complete.docx` 和导师版 `chapters-1-3.docx`。
7. **5.3 标题。** 以 `manuscript/outline.md` 的“5.3 设计意图符合度与方案感知评价（含 5.3.1、5.3.2）”为准，还是以 `ch5.md` 现名“5.3 设计意图的独立评议”为准？
8. **PROGRESS.md。** 冻结为 11/13 以前的历史日志，还是恢复为持续日志？按第 3 节的建议，持续记录改由 STATUS 和 git 日志承担。
9. **#1 协作工单。** #1 已有 100 条评论。是否新开一个协作工单承接 11/18 以后的交接，#1 保留但不再追加？
10. **工单清理。** 是否同意关闭 T01–T24（#26–#49）以及 #2、#14、#19、#20、#22，并在关闭评论里注明由 11/17 计划的哪个任务码承接（对应关系见 1.8）？#21、#23、#24、#25 保留，并按 F、C、E、H 组改标题和正文。
11. **全文分支。** `reference-fulltexts-20261109`（约 806 MB PDF）继续作为不并入 main 的长期数据分支，可以吗？
12. **归档方式。** 第 1 节标为 ARCHIVE 的文件，是移到 `docs/archive/`、`manuscript/archive/`（链接需随之改），还是原地保留、只在文件顶部加“已被××取代”？

---

## 建议计数

| 组 | 计数 |
|---|---|
| 根目录（7） | UPDATE 4、MERGE-INTO 2、ARCHIVE 1 |
| docs（27 行） | KEEP 1、UPDATE 2、MERGE-INTO 4、ARCHIVE 20 |
| planning（8） | KEEP 4、MERGE-INTO 1、ARCHIVE 3 |
| references（3） | KEEP 2、UPDATE 1 |
| manuscript（18 行） | KEEP 10、UPDATE 4、ARCHIVE 4 |
| 文档合计（63 行） | KEEP 17、UPDATE 11、MERGE-INTO 7、ARCHIVE 28；ASK 问题另列 12 条 |
| 分支（35） | KEEP-ACTIVE 3、MERGE 5、ARCHIVE-AS-TAG 6、DELETE-CANDIDATE 19、ASK 2 |
| PR（9） | MERGE 2、CLOSE 5、ASK 2 |
| 工单（35） | KEEP-OPEN 6、CLOSE 29 |
