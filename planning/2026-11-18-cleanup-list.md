# 仓库整理清单（作者逐项处理，2026-11-18）

**用法。** 每一项前有方框，处理完勾上。标 **【问】** 的项要先回答，答案写在 #3。本清单只提建议，没有删除、移动或关闭任何东西。

**依据。** 两份只读清点（审计对象为 `claude/direction-todo-20261117` 的 `700a9bc`），我抽查过其中的关键结论：
- [evidence 与 experiments 清点](reorg-20261118/inventory-evidence-experiments.md)：73 个条目、605 MB；
- [文档、分支、PR 与工单清点](reorg-20261118/inventory-docs-branches.md)：63 份文档、35 个分支、9 个 PR、35 个工单。

**为什么要整理。** 当前最大的问题不是文件多，而是：
- 论文、计划和证据分在不同分支上；
- `main` 里根本没有论文（`manuscript/thesis/` 为空），比工作分支落后 49 个提交；
- 第四章的全部证据只在一条未合并的分支上。

不先把这些收拢，之后的复测、统计和写作都会在不完整的树上做。

**建议的顺序。**
1. 回答第一节的 5 个问题。
2. Codex 按第二节合并分支。
3. 作者按第三至六节处理文件、PR、工单。

## 一、先回答的问题（决定后面怎么做）

**11 月 18 日作者已答第 1—5 题**（[#3 登记](https://github.com/Freeloop993/paper/issues/3#issuecomment-6950220478)）：同意基准分支与合并顺序；归档移入 `archive/` 目录；大文件不移动；PR #75 是作者本人账号；新开协作工单 #76，#1 已逐字存档于 `archive/issues/issue-1-C01.md` 并关闭。

- [x] **【问 1】基准分支。** 是否以 `claude/direction-todo-20261117` 为基准，依次并入 `main`、`claude/e3-quad-qwen`、`claude/gpu-tasks-20261117`、`claude/extra-readings-20261117`、`codex/thesis-source-e2r-20261115` 的末提交 `5f92248`、`claude/word-pairs-v1`，再整体合入 `main`，此后只在 `main` 上工作？**已定：同意。** 试算冲突只在 README、STATUS、handoff 三个入口文件，以及 preflight 两个文件（取 gpu-tasks 版本）。
- [x] **【问 2】归档方式。** 二选一：
  - (a) 移入仓库内的 `archive/` 目录，工作树里仍留约 150 MB；
  - (b) 先打标签 `dev-archive-20261118`，再从 `main` 删除，需要时按标签查看。

  **已定：a，移入 `archive/` 目录。** 移动后要改的相对链接，见 evidence 清点第 2 节。
- [x] **【问 3】大文件。** 原图与压缩包约 450 MB，是否移到私有阅读库 `paper-reading-room`，公开库只留摘要与哈希？**已定：不移动。**
- [x] **【问 4】PR #75。** 它来自外部账号 `lucienzhu` 的 fork，该账号不是本仓库的协作者，内容是配置器界面重做，并改写了 `PROGRESS.md` 全文。这是你本人或你的助手用的账号吗？**已定：是作者本人账号。** 合并后在新基准上重放。
- [x] **【问 5】协作工单。** #1 已有 100 多条评论。是否新开一个协作工单承接 11 月 18 日以后的交接，#1 保留但不再追加？**已定：新开 #76；#1 已存档并关闭。**

## 二、分支（35 个）

**保留（3）：**
- `main`：整合后的唯一主干；
- `claude/direction-todo-20261117`：整合基准，合入 `main` 后改为标签；
- `reference-fulltexts-20261109`：102 份文献全文约 806 MB，作为长期数据分支，不并入 `main`。

**并入基准（按顺序，Codex 执行，作者确认问 1 后）：**
- [ ] `origin/main`：带入 `DATA.md`、H3 相机原图、S4 机鼻两张。
- [ ] `claude/e3-quad-qwen`：第四章全部证据、v1.6 字典、11/15 GPU 日登记、E2R 与六旋原图。**最要紧。**
- [ ] `claude/gpu-tasks-20261117`：局部编辑第二版与 E2 第二版的登记（F1、F2）。
- [ ] `claude/extra-readings-20261117`：X/Y 两次判读（F5 需要）。
- [ ] `codex/thesis-source-e2r-20261115`：只取 `5f92248`，即六旋缺毂图号的更正。
- [ ] `claude/word-pairs-v1`：词对 v1，第二编码的冻结依据。
- [ ] 合并后：重建两份论文 Word；运行链接检查；固定提交链接改为相对路径。

**并入后改为同名标签（链接不失效）：**
- [ ] `claude/e3-quad-qwen`、`claude/gpu-tasks-20261117`、`claude/extra-readings-20261117`、`claude/thesis-docx`、`claude/guide-prompt-spec`、`codex/minimax-camera-roots`、`claude/direction-todo-20261117`。

**不合并，只打标签存档：**
- [ ] `claude/ch03-3.2-3.3`：已被 `src/ch3.md` 吸收。
- [ ] `claude/r1-r3-design`：从未执行。
- [ ] `codex/r1-render-freeze`：实际提交 0。

**可以直接删除（19 个，已核对全部在 `main` 中）：**
- [ ] `claude/c01-1111`、`claude/c01-review-1110`、`claude/c01-review-1110b`、`claude/d2-addendum`、`claude/d2-tuning`、`claude/e3-spec-cards`、`claude/foundation-v1`、`claude/freeze-v1-sec2`、`claude/l1-layout`、`claude/method-freeze-v1`、`claude/p1-param-prompt`、`claude/roadmap-ch34`、`claude/semantic-to-e3`、`codex/e0-image26-blind-read`、`codex/e1-actuals`、`codex/e1-design-audit`、`codex/foundation-section8`、`codex/r0-e0-e1-freeze`、`codex/semantic-card-delivery`。

**【问】：**
- [ ] **【#3 第 22 题】`codex/semantic-tools`（PR #57）：** 词对评分页，1—7 分加“看不出”，先实拍后终稿。清单 E 组的 10 人评议是否沿用它？沿用就合并，不用就打标签后关闭。
- [ ] **【#3 第 23 题】`codex/e2r-human-review-20261115`：** 一份 3 MB 的评阅稿 Word。若含 E2R 真人答卷原文或可识别信息，应去标识后放私有库（M5）；否则打标签存档。

## 三、PR（9 个）

- [ ] **#73**（e3-quad-qwen → main）：改为并入基准，随整合标为已合并。
- [ ] **#62**（词对 v1）：随整合合并。
- [ ] **#72**（thesis-docx → main）：内容已在基准，整合后自动标为已合并，或手动关闭。
- [ ] **#74**（→ thesis-docx）：取 `5f92248` 后关闭。
- [ ] **#71**：关闭，已被 `ch3.md` 取代。
- [ ] **#60**：关闭，R1—R3 从未执行。
- [ ] **#54**：关闭，R1 冻结的实际提交为 0。
- [ ] **#57**：见上面的【问】。
- [ ] **#75**：作者本人账号；整合完成后由 Codex 在新基准上重放并合并。

## 四、工单（35 个）

**保留（6）：**
- #1：已存档并关闭（11 月 18 日），协作改在 #76；
- #3：作者决定；
- #21：E2，改标题对应 F1、F2、F7；
- #23：E4，正文改为 3 名外部设计者；
- #24：E5，正文改为 10 人；
- #25：E6，改标题对应 H 组。

**关闭（29）。** 关闭评论里写一句“由 11/17 计划的 ×× 承接”，对应关系见[文档清点 1.8 节](reorg-20261118/inventory-docs-branches.md)：
- [ ] T01—T24（#26—#49）：11 月 12 日的 24 项任务，已被 11/17 任务清单取代，其中 18 个从未有评论。
- [ ] #2（X01 离线改稿台）、#14（X12 评议工具）：已被 C1 工作台与清单 E 组取代。
- [ ] #19（E0）：作者已定剔除闭源 6 张、不补采。
- [ ] #20（E1）：已完成，后续由 A3、A7、A8 承接。
- [ ] #22（E3）：已完成；待 e3-quad-qwen 合入后再关，评论里有 13 处按分支名的链接。

## 五、文档（63 份）

**整理后只留 8 个入口。** 每个入口应包含什么，见[文档清点第 3 节](reorg-20261118/inventory-docs-branches.md)：

| 入口 | 并入或取代 |
|---|---|
| `README.md` | `docs/handoff.md`、`DATA.md`、`planning/claude-materials.md` 的入口部分 |
| `AGENTS.md`（`CLAUDE.md` 只留几行指针） | `CONTRIBUTING.md`；分支规则：只在 `main` 和短命分支上工作，合并后删分支 |
| `STATUS.md` | `PROGRESS.md`、`manuscript/evidence-matrix.md` |
| `planning/2026-11-17-direction-and-todo.md`（可改名 `PLAN.md`）＋ `planning/2026-11-18-framework.md` | 取代 7 份旧计划（见下） |
| `planning/DECISIONS.md`（新建） | 作者的历次决定：foundation 的 F1—F5、臂材质、词对 v1、选定 B2、11/17 六项、LoRA、E0 |
| `docs/protocols/README.md` | 只列现行协议 |
| `manuscript/thesis/README.md` | `manuscript/outline.md` 由此指向 |
| `references/README.md`（新建） | `reading-map.md`、`docs/literature-update-2026-11.md`、本次文献补充 |

**归档（移入 `archive/`，作者勾选后执行）：**
- [ ] **旧计划 7 份**：`docs/execution-playbook.md`、`docs/foundation.md`（先把定案表抄入 DECISIONS）、`docs/research-plan.md`、`docs/requirements.md`、`docs/methods.md`、`docs/research-variables.md`、`docs/roadmap-20261114.md`。
- [ ] **旧交接与复盘 4 份**：`docs/configurator-realignment.md`、`docs/claude-context-20261113.md`、`docs/image-retrospective-20261113.md`、`docs/historical-development-index.md`。
- [ ] **旧协议 9 份**：`4.2.1-design-cards`、`e3-spec-cards-draft`、`semantic-to-E3-spec`、`freeze-sheet-P3`、`G2-axis-control-spec`、`G2b-structure-screen-spec`、`G2d-G3b-spec`、`G3b-amendment-orientation`，以及 `docs/tasks/` 下的 3 份派单。
- [ ] **planning 下 3 份**：`claude-review.md`、`google-doc-snapshot.md`、`route-review-20261112/`。
- [ ] **manuscript 下 4 份**：`ch05-hexa-results.md`、`evidence-matrix.md`、`revisions/`、`source-drafts/`。
- [ ] **其余**：`PROGRESS.md`（冻结为 11/13 以前的日志）、`docs/figures/motor-centers-two-views.png`。

**更新：**
- [ ] `CLAUDE.md`：入口仍指向 11 月 12 日的 24 项任务。
- [ ] `STATUS.md`：合并后改相对链接，清掉旧计数（M6）。
- [ ] `manuscript/thesis/README.md`：底稿说明和待核文献条数已过时。
- [ ] `references/reading-map.md`：删去指向旧清单的横幅。
- [ ] `docs/protocols/formal-collection-kit.md`：改为 3 名设计者、10 名评议者，作为知情同意的底稿（M3）。

**【问】：**
- [ ] **`docs/protocols/method-freeze-v1.md`：** 第 3 节至今“待作者签署”。签署 v1，还是改为偏离记录表，出一版以 v1.6 字典为准的 v2？**我的建议：出 v2，并附偏离记录表（W1 第 10 条）。**
- [ ] **`thesis-draft.docx`：** 带黄色占位的工作稿停在 11 月 15 日，此后源码改了约 1,500 行。还需要吗？**我的建议：停用，只留完成稿与导师版前三章。**
- [ ] **5.3 节标题：** 用目录的“设计意图符合度与方案感知评价”，还是 `ch5.md` 的“设计意图的独立评议”？

## 六、evidence 与 experiments（73 个条目）

**正式证据，保留（18）：**
- 语义：`semantic-cards`、`semantic40-second-coding-20261115`、`semantic40-pairing`；
- E0/E1：`r0-e0-e1`、`r0-20261112`、`e0-open-20261112`、`e1-open-20261112`；
- GPU 日：`gpu-day-20261115`、`20261115-review-takeover`、`20261117-offline-review`、`e2r-hub-readback`、`hexa-plant-protection`；
- E5：`e5-paired-topview`、`e5-individual-reviewed`、`real-product-topview`；
- 11/17 任务：`20261117-research-update`、`20261117-config-review`、`20261117-a1-a4-c1`。

**方法开发，保留并归到一个文件夹（19）。** 第三、四章与附录引用它们说明设计决定的由来：
- 条件选择：`historic-guides`、`s1-axis-repeat`、`s1-decomposition`、`g2-control`、`g2-six`、`g2b-screen`、`g2b-actual`、`l1-layout`、`l1-layout-actual`、`prompt-parameter-review`；
- 条件图分工：`guide-choice-20261113`；
- 造型字典：`form342-h3-dev`、`qwen-shape-pilot`、`qwen-shape-s4-20261114`；
- 局部编辑：`20261115-local-edit`；
- 评议工具：`g3-reference`、`g3-actual`、`rating-kit`、`x12-calibration`。

**归档（34），约 149 MB，移入 `archive/`：**
- [ ] **GPT Image 与闭源诊断**：`gpt-image-b02-visual`、`b02-view-calibration`、`b02-parent-reference`、`d2-closed-six`、`l1-closed-reference-diagnostic`。注意 `d2-closed-six` 不是 E0 闭源组，归档时不能改标为 E0。
- [ ] **MiniMax 开发（11 月 13 日）**：`p1-param-prompt`（两处）、`p2-spec-cards`（两处）、`minimax-junction-pilot`（两处）、`form342-h3-pilot`、`quad-author-selection`、`section421-minimax-review`。
- [ ] **D2 调参**：`d2-tuning`（两处）。
- [ ] **E2 旧记录线**：`h3-e2-local-edit-20261113`、`e2-registered`；连同 `recovered-originals-102/01-old-E2` 写一份说明，指明 E2R 为现行。
- [ ] **11 月 9—11 日的旧口径与旧工具**：`denominators`、`formal-reset`、`desktop-parameter-first-example`、`desktop-parameter-v2`、`operator-workbench`、`quad-guide-cmf-review`、`p04-quad-biblade`、`p05-quad-equal-blades`、`p06-quad-front-camera`、`common-control`、`hub-annotator`。
- [ ] **从未运行的登记**：`g2d`、`g3b`。
- [ ] **旧六旋（11 月 3 日）**：`evidence/README.md`、`hexa4-ai.csv`、`summarize_hexa.py`。之后另写一份新的 evidence 总索引。

**可以删（重复，约 35 MB）：**
- [ ] E0、E1、R0 的原图各存了两份：一份 ZIP，一份解包目录。我按内容哈希核对过，36/36、6/6、2/2 完全一致。**【问】留哪一份？我的建议：留解包目录（复算脚本与逐图链接用它），删 ZIP，把 ZIP 的 SHA-256 写进 README。**

**README 与新证据矛盾，需更新（14 处，交 Codex，即 M6；第 15 处 `evidence/README.md` 随旧六旋归档）：**
- [ ] `evidence/20261115-review-takeover/README.md`、`e1-open-20261112/geometry-readout.json`、`semantic-cards/README.md`、`real-product-topview/README.md`、`formal-reset/README.md`、`20261117-config-review/A1-extension`、`gpu-day-20261115/analysis-247/说明.md`、`hexa-plant-protection/README.md`、`qwen-shape-pilot/README.md`、`d2-tuning/README.md`、`l1-layout/README.md`、`g3-reference/README.md`、`semantic40-pairing/README.md`、`common-control/README.md`。逐条说明见 [evidence 清点 0.2 节](reorg-20261118/inventory-evidence-experiments.md)。

**【问】：**
- [ ] **`evidence/20261117-r3-check`：** 与较晚的 `20261117-research-update` 大量重叠。今后以 research-update 为准吗？若是，r3-check 归档。
- [ ] **`evidence/section421-h3-span`：** E3 第一轮的 A/B/C 规格是不是由这里的方向卡演变来的？若是，它与相关的三个条目改为方法开发保留，第四章要说明方向的来源；若不是，一起归档。
- [ ] **图 3.2：** 是否换成按 1,318 簇重算、可复现的新共词图（`20261117-research-update/comments/cooccurrence.png`）？**我的建议：换。** 旧的 Gephi 图随之归档。

## 七、整理完成的标准

- `main` 包含论文、现行计划和全部正式证据，所有正文与附录引用的文件都能在 `main` 上找到。
- 根目录与 `docs/`、`planning/` 下只剩第五节的 8 个入口，以及现行协议。
- `evidence/` 只有正式证据与方法开发两类，各有一份索引，写明实验编号、文件夹、正文位置。
- 远端分支只剩 `main` 与 `reference-fulltexts-20261109`，其余为标签。
- 开放工单只剩 6 个，与 11/17 任务清单的任务组对应。
