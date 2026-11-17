Independent blind review of the full working draft (abstract, chapters 1–6, appendix) against the 2025-12-18 proposal, 2026-11-17. File and line references are to manuscript/thesis/src/ at commit 3e71843.

# Blind review of the working draft against the 2025-12-18 proposal

I read both abstracts, ch1–ch6, the appendix, symbols, references and the proposal in full; nothing was modified. All `file:line` references are to files under:

`manuscript/thesis/src/`

The figures are not in the pack, so I could not judge image quality itself.

## Critical

**C1. The only strong quantitative result comes from a generation path the design case never used; in the path it did use, layout misses the tolerance.**
- Evidence: ch5.md:52–57 gives 12/12 hits for both ratios under ControlNet plus part diagram. ch5.md:87 and :90 give the dot-line edit path used in ch4: "三档中位数约1.03、1.16、1.36…窄档明显偏宽", extension "0.98、1.11、1.28". Even the 1.00 baseline lands at 1.11–1.16, outside ±0.10.
- These dot-line readings are "知条件 AI…尚无独立复测", carry no label in 表1.2, and are absent from the abstract (abstract-cn.md:7).
- Why it matters: the hold item "横纵跨度比 1.00" (ch3.md:111) was probably violated in the E3 images, B2 included, and nobody measured it. "参数化可控" is unsupported for the design workflow.
- Fix: make it a labelled, blind experiment (Experiment 1). Report slope and bias per path; from the draft's own numbers the slope is about 1.00 for ControlNet, 0.50–0.55 for quad dot-line, and 0.20–0.45 for hexa. Measure W/L on the 27 E3 drafts and the final. State the dot-line result in the abstract.

**C2. The shape-response claim rests on n=4 per level, read only by two sessions of one unnamed model, on a dictionary that is not the one used in the design.**
- Evidence: ch5.md:72–85. The human spot check promised at ch3.md:222 ("另由一名真人判读者对每个条件抽取 2 张") was not done.
- ch6.md:33 concedes that two-session agreement "不能…作为判读信度的依据", yet abstract-cn.md:7 and ch6.md:11 present "两位隔离的AI判读者" as two judges.
- appendix.md:7 says the formal batch used v1.2 while the design used v1.6; v1.2 phrases are printed nowhere.
- Why it matters: 4/4 has a 95% CI of [0.40, 1.00] and 2/4 has [0.07, 0.93]; "responsive" and "non-responsive" levels are statistically indistinguishable (Fisher p≈0.43). The socket verdict flips between sessions (2 vs 3).
- Fix: Experiment 2. Name the model, version and prompt. Print v1.2. Make v1.6 the formal dictionary, or justify why not.

**C3. The method's revision mechanism never succeeded; the final design was made outside the method.**
- Evidence: ch5.md:140 "B2 以父图为起点编辑的 9 张全部露出镜窗"; ch5.md:103 (no E2 nose edit read as both narrowed and rounded; rounding of arm roots not confirmed); ch5.md:146 (local compositing failed on all three parts).
- ch4.md:172 "深化阶段不再调用生成模型": the window was filled by hand, the camera pod pasted from another image, the shadow and recolour scripted.
- Why it matters: ch6.md:13 and :19 claim bounded parent-image revision as a contribution, but it has a 0% confirmed target success rate in this thesis.
- Fix: report that rate plainly. Either test a mechanism that can work (Experiment 5) or reframe the contribution as "when to stop generating and finish by hand".

**C4. RQ3 has no comparative evidence, and the single case is the author, with an undisclosed intermediary.**
- Evidence: E4 placeholders at ch5.md:183, :191, :205. Even the fallback at ch5.md:25 ("辅以 1—2 名设计者的试用") was not done.
- ch6.md:32 "该设计者同时承担研究工作"; ch5.md:189 "E3 未逐步记录设计者的主动操作时间".
- A "转译者" appears at ch6.md:21 and in passive voice at ch4.md:123, but is missing from 表3.1 (ch3.md:15–21). ch4.md:144 shows the designer needed the three directions explained before choosing.
- Why it matters: the title's "人智协同驱动" rests on one non-independent participant, and the actor structure is not what the method chapter describes.
- Fix: Experiment 3. Disclose who or what translated comments into prompts. Remove D-vs-S from RQ3 if E4 is not run.

**C5. The RQ1 chain from reviews to parameters is broken at several links, and the read-back test the thesis set for itself is unanalysed and looks negative.**
- The two word pairs that drive parameters have κ=0.23 and 0.17 (ch3.md:44–45); the only moderate pair has "无可控参数" (ch3.md:94).
- Rule 4 excludes the best-evidenced theme, "桨叶防护感有七张卡" (ch3.md:63), but keeps 紧凑—舒展, which maps to none of the four parts either.
- The designer rejected the review-derived pole: "机身太平整，没有分型线，不够有设计感" (ch4.md:96), "像一块塑料" (ch4.md:101). The final uses the multi-panel level that 表3.4 maps to 繁复.
- No filled spec card with "依据卡号" is shown (ch3.md:115, ch4.md:21), and no evidence cards appear in the appendix.
- ch3.md:99 says raters must read the intended pole. Direction B targets "紧凑、简洁、整体" (ch4.md:75–76). Ratings on the neutral final (appendix.md:98–100) are 5/5/4, 4/3/4 and 4/5/4 on scales where 1 is the intended pole. Chapter 5 never analyses this.
- The real-product check promised at ch3.md:73 ("需要以真实产品图上的评分加以检验") stops at raw scores (ch5.md:164, appendix.md:112–119).
- Fix: state the final design's target poles. Report the read-back as a negative result. Code seam and colour-block counts on the eight products and test the association. Discuss the designer-versus-review conflict as a finding.

**C6. RQ4 rests entirely on readings the thesis's own rule excludes, and the "second case" is three images.**
- ch5.md:215 "均由知道实验条件的 AI…读数" against ch3.md:218 "知情判读…不作为正式结果".
- ch5.md:238 concludes "方向可控" from the main batch (3/4 seeds) and ignores the extension, where 5/8 seeds increase and the wide level is 1.01.
- ch5.md:238 says the quad same-path comparison is still needed, but ch5.md:87–90 already reports it.
- ch3.md:170 says E6 used the part diagram; ch5.md:238 says "该编辑通路".
- ch1.md:65 "完成一项农业植保设计" against ch5.md:217: three images, no selection, no final, no rating, no word pairs, one level combination.
- Fix: blind re-read all 36, pool both batches, compare with quad in the same path, and either build a hexa design to a final or rename it a feasibility probe.

**C7. "判定标准均在生成前预先设定，取得结果后不再调整" (ch1.md:93) is contradicted repeatedly.**
- The dictionary was rewritten twice during E3 with new parameters (ch4.md:108–121), despite "在正式实验之前固定下来" (ch4.md:48).
- E2 and E6 are both "更正版" (ch5.md:95, ch1.md:89); an earlier E2 set was discarded (ch5.md:13).
- "按四处皆可辨列数" (ch5.md:83) is not in ch3.md:180.
- The paired seam and colour test (ch5.md:150) is not in ch3.6.
- ch5.md:201 softens a pre-set failure after the designer's later preference.
- Fix: delete the blanket claim. Add a deviations table (planned, done, reason), and label each result confirmatory or exploratory.

**C8. For a design degree, the outcome is not yet a credible design.**
- The deliverable is one orthographic top view (ch4.md:196). There is no side or perspective view, section, dimension, CMF specification or use scenario.
- The camera is a pasted patch; the nose was flipped to the opposite end after generation (ch4.md:174), breaking the hold item "机头朝上".
- ch4.4 describes the design by pixel counts ("仅改动父图的 1305 个像素") instead of design reasoning.
- ch4.md:70: directions A and B are the same spec, so "three directions" were two.
- Fix: develop B2 into a three-view or simple 3D model with dimensions, folding logic, a gimbal section and CMF. Show rejected alternatives side by side. Show how each evidence card shaped a decision.

## Major

**M1. E1 has design flaws that weaken even its clean result.**
- The ±0.10 tolerance equals the d/D level spacing, so a constant 0.50 hits every level. The text group's "4 of 6" (abstract-cn.md:7) is that artefact; 12/12 against 4/6 gives Fisher p≈0.10.
- Text-only W/L is about 2.0 (ch5.md:58–60) because those images are not top views (ch5.md:70), so the control confounds view with ratio.
- The cells are unequal (4 vs 2 per level), and the E1 prompts are not printed.
- SDs of 0.001–0.003 show the output traces a control image that already contains the blades. That is a known ControlNet property, not a finding about drones.
- Fix: tighten d/D tolerance to ±0.05 or report slope only. Add a top-view-enforced text control. Print the prompts.

**M2. The AI reader is undocumented.**
- ch3.md:218 says only "多模态大模型". A two-session median difference of "0.0000" (ch5.md:66) suggests an algorithmic detector, not visual judgement.
- ch5.md:68 says of the one human checker "其与研究者的关系未作单独核实", which an author cannot write about their own study.
- Fix: describe the model, prompt and coordinate method, and state the checker's relationship.

**M3. E2 does not test the method.**
- Its edits ("收窄并收圆", "加宽并圆滑") are free-text instructions, not level changes (ch3.md:125).
- C1 was never selected by the designer.
- The "dot-line only" control receives an edit instruction with nothing to edit.
- The single human ticked "changed" for target and non-target parts in all six pairs (ch5.md:97–99), and there are no identical-pair catch trials.
- The pass count was never computed (ch5.md:99).
- Fix: fold into Experiment 5.

**M4. E5 is two manipulation checks with n=3.**
- Orange is more conspicuous than grey; a cover with two hand-drawn extra lines (583 pixels, ch5.md:150) is less simple. Neither tests generated output or the method.
- Rater 02 rates the orange version more "整体" and gives it 整体协调 5 while calling it "不协调" (ch5.md:160). That suggests a scale-direction or sensitivity problem, not "two separable judgements".
- The draft does not say whether the two panels of three overlap.
- Fix: Experiment 4.

**M5. E0 is never reported.**
- ch1.md:81 says "后端比较见4.1.3", but 4.1.3 contains no E0 outcome. The image count is 12 in one place and 6 in others.
- The backend decision therefore rests on 12 know-condition readings with a 1-of-2 pass rule (ch4.md:50, :64).

**M6. The method as practised differs from the method as described.**
- Revisions were sentence rewrites and negative prompts, not level changes. The parameters 表面, 点缀, 两段 and 切面紧凑壳 (appendix.md:24–38) are absent from 表3.6.
- "有边界" (ch1.md:45) had no stated time or cost ceiling. E3 used 43 calls, three full regeneration rounds and unbounded "开发样图".

**M7. Requirement data are undocumented.**
- The platform, period, products, raw review count and screening funnel behind "7,443 个…文本簇" (ch3.md:29) are missing.
- Cards were "有目的地抽取" (ch3.md:35).
- The first coding was derived by a conversion rule, not coded on the same instrument. The second coder saw only pre-selected excerpts, so the selection step is untested.

**M8. Statistics are almost absent, and the proposal promised tests, effect sizes and CIs.**
- Add exact binomial CIs to every count; 12/12 gives [0.74, 1.00] and 0/6 gives [0, 0.46].
- Add regression slope with CI for layout.
- Add CIs to κ. By my approximation, 0.60 gives about 0.3–0.9, and the CIs for 0.23 and 0.17 include 0. Add PABAK or AC1, since the kappa paradox is invoked (ch3.md:50).
- Add per-parameter confusion matrices over all 24 images, with human–human and human–AI κ.
- Add ICC for the 7-point ratings, and paired-seed analysis for E6.
- The non-target drift counts promised at ch5.md:23 are not reported.
- The v1.6 batch has more blade errors than v1.2 (3 vs 1, ch5.md:85); this is not discussed.

**M9. Large parts read as a process log.** Examples:
- ch4.md:29–64: the whole of 4.1.3, a three-round development diary.
- ch4.md:46 "最初只判读了目标项，补判…时发现".
- ch4.md:144: the designer needing an explanation.
- ch5.md:13: the discarded six.
- ch5.md:29 "此次…进入评议的是".
- ch5.md:95 "已回收核验", ch5.md:99 "本次回件", ch5.md:101 "登记界值".
- ch5.md:113–146: 5.2.3.
- ch5.md:215: 15 void images.
- Appendix E.
- Fix: compress into one screening table and a deviations table. Remove registry words (知条件, 回件, 登记, 分母, 过线, 确认批, 更正版, 首案).

**M10. Operational slips are reported as findings.**
- The "180°" misunderstanding (ch5.md:197 "整轮作废") is listed as RQ1 evidence at ch5.md:247, in ch6.md:9 and in ch6.md:21.
- The shared negative prompt is a "transfer condition" at ch5.md:238 and a design implication at ch6.md:21.
- The top-is-nose convention is also a design implication at ch6.md:21.
- These are lessons about this project's execution, not results about the method.

**M11. Distance from the proposal is large and mostly unexplained.**

| Promised | Status | Explained? |
|---|---|---|
| LLM mining of reviews and sales data, weighted keywords | Replaced by 36 hand-picked cards | Partly (ch3.md:31–35) |
| Dataset of 30–40 quad and 15–25 hexa models; 10–12 annotated; thresholds calibrated on real products | Absent (10 photos, 8 rated) | No |
| LoRA-A and LoRA-B, IP-Adapter, "有/无 LoRA" ablation | Absent; the word never appears; 表1.1 row (3) silently becomes "方案的局部延续" | No |
| ControlNet as the generation route | Only in E1; design uses a reference-edit path | Partly (ch1.md:49) |
| 轴距, 机身长宽比, 臂宽, body bounding box as controls | Dropped to descriptive | Yes (ch3.md:137, :157) |
| KPE, contour IoU/Chamfer, consistency variance, time to qualified design | KPE partly; the rest absent | Partly (ch3.md:212) |
| "有/无人反馈" ablation; four-dimension improvement | Absent | Deferred to E4 |
| 3–5 raters, Likert | Three raters | Yes |
| Significance tests, effect sizes, CIs | Absent | No |
| Three-view templates; Y6/X8 guidance | Top view only; future work | Partly |

Fix: add a short section in ch1 on changes from the proposal, and remove in-body references to "开题" (ch1.md:55, ch3.md:137, :212).

**M12. Contribution is overclaimed against the closest work.**
- A committee would accept today: a diagnostic protocol that separates target achievement, non-target preservation and visibility; evidence that layout compliance depends on the conditioning path; and an honest case showing review semantics do not map cleanly to controllable parameters.
- It would not accept "a method" (ch6.md:7), "transfer" (ch6.md:15) or collaboration benefits.
- Chen et al. [A001] and Du et al. [A008] both carry requirement-to-generation through to user evaluation; this draft has three raters and no weights.
- GenPara [L07] already covers explicit parameters with version trees.
- "ControlNet" is a keyword, although the design case did not use it.

## Minor

Internal inconsistencies:

| # | Location | Mismatch |
|---|---|---|
| 1 | ch3.md:48 | 23/35 plus 7 merged is 30; text says "31/35" |
| 2 | ch3.md:161 | Three groups of 4 make 12; text says "这16张探索图" |
| 3 | ch4.md:33 vs ch5.md:117 | "两种输入" vs three inputs (T/L/F), both 6 images |
| 4 | ch1.md:81 vs ch1.md:49, ch5.md:11, ch5.md:66 | E0 "各 6 张" (12) vs 6 closed only vs 6 inside "共 42 张" |
| 5 | ch5.md:13 vs ch4.md:144, :150 | "设计者选定的 B2 与 C1" vs only B2 selected |
| 6 | ch1.md:85 vs ch5.md:101, :103, :109 | "1名真人、两位 AI" vs two pairs of AI readers plus a know-condition reading; "八张原图" vs "6张" (ch5.md:95) |
| 7 | ch3.md:170 vs ch5.md:238 | E6 path: part diagram vs "该编辑通路" |
| 8 | ch5.md:238 vs ch5.md:87–90 | Quad comparison "needed" vs already reported |
| 9 | ch5.md:72, :75, :85; ch1.md:84 | Batch labels: 正式字典/修订字典, 正式组/v1.6, 修订组, v1.6平行批 |
| 10 | ch3.md:150; ch4.md:77; ch5.md:77; appendix.md:23–24; ch3.md:161 | Body level: 方正机壳 / 切角方壳 / 切角机身 / 切面紧凑壳 / 切面机壳 |
| 11 | ch3.md:152–153 vs appendix.md:28–31; ch5.md:80 | Nose 无外突 vs 内嵌 vs 机鼻前伸; cover two levels vs three |
| 12 | ch5.md:211 vs ch3.md:151 | Hexa arm "固定与折叠铰接两档" vs quad 无缝/承座/铰接 |
| 13 | ch1.md:35 vs ch1.md:15, ch5.md:249 | RQ3 worded as "when keep/revert" vs "收益与代价" |
| 14 | ch5.md:242 vs ch5.md:248–249 | Four evidence grades promised; RQ2 and RQ3 answered in prose |
| 15 | ch5.md:11 vs ch5.md:29 | E5 to rate E3, E4, E6 finals vs E3 only |
| 16 | ch6.md:19 vs ch5.md:189 | "收益与代价都有据可查" vs designer time not recorded |
| 17 | abstract-en.md:5 vs abstract-cn.md:5 | English omits the first Chinese sentence and "允许的变化"; both omit the socket result |
| 18 | ch4.md:83 vs ch5.md:187 | "80—95 秒" vs "76—108 秒", scope unstated |
| 19 | ch4.md:216 | "以下四点", first point unnumbered |
| 20 | symbols.md:19–23 | q and κ undefined; AIGC and QFD listed but unused; table broken at line 21 |

Other minor points:
- "评者" (ch5.md:72–109) replaces the defined terms 判读者 and 评议者.
- 条件图, 定位图, 引导图 and 控制图 are used interchangeably.
- AI sessions are called "两位" and "两人".
- "RQ3", "机头相机。" and "配色。" are not bolded like their siblings.
- "图 4.4" and "图4.3" differ in spacing.
- The 图4.6 caption is ambiguous.
- There is no ethics or consent statement for coder and raters, and no source or licence note for product photos.
- ch5.md:15 describes E4 in the future tense inside a results chapter.

## Research questions

| RQ | Current evidence | Verdict | Missing |
|---|---|---|---|
| RQ1 translation | 36 cards from 35 sources; one second coder, 35+5 excerpts, κ 0.17–0.60; one author-designer's comments mapped to spec edits; three raters, not blind to nothing but self-reported naive | **Partly** — a traceable record exists, but the mapping is not shown to hold, and the read-back looks negative | Filled spec cards; analysis of 表C.3 against targets; real-product validation; a rater panel; an account of the designer overriding the evidence |
| RQ2 layout | E1: 36 images, two blind AI sessions, one human on 12; dot-line: 36 images, know-condition AI | **Supported** for ControlNet path only; **not yet** for the design path | Blind, human-checked layout test in the dot-line path; slope and bias; W/L on E3 images |
| RQ2 shape | 24 (+24) images, 4 per level, two blind sessions of one model, no human | **Partly** — suggestive for three levels | Human readers; n≥10 per level; the dictionary actually used; confusion matrices |
| RQ2 local edit | E2: 6 images, one blind human, AI sessions; 9 B2 edits, judge unstated | **Not yet** — positions preserved, targets not achieved | A working edit mechanism; catch trials; joint pass rate |
| RQ3 collaboration | One designer (the author), 43 calls, no active time; E4 absent | **Not yet** | External designers; timing; any comparison |
| RQ4 transfer | 3 + 12 + 24 hexa images, know-condition AI only | **Not yet** — observations only | Blind reading; pooled analysis; quad comparison in the same path; a hexa design carried to a final |

## Five additions that would most increase defensibility

1. **Layout control in the path the design uses.** Three arms (text with top view enforced, dot-line edit, part-diagram ControlNet) × three W/L levels × 8 shared seeds = 72 quad images, plus the two image arms for hexa (48). Two blind human annotators on all hubs, or the AI detector plus a 30% human sample. Report slope, bias and hit rate with CIs. Minimum: 8 seeds per cell.
2. **Shape response with human readers on v1.6.** Six conditions × 10 seeds = 60 images. Two blind human readers with design training, plus the AI. Report per-parameter confusion matrices and human–human and human–AI κ. Minimum: 10 per level, so 9/10 gives a lower bound near 0.55.
3. **External designers.** Preferably the planned crossover with 6 designers (minimum 4), two tasks, 25-minute sessions, logged active time, finals rated blind. If that is impossible, 3 external designers each run the structured flow once with recorded time, and RQ3 is reworded as a multi-case description.
4. **Intent read-back panel.** At least 12 raters (minimum 10, half with design training). They rate the final, two or three alternative finals from other directions and the 8 real products on the four pairs, with target poles declared in advance. Repeat the seam and colour pairs on at least three base designs. Report ICC, CIs and the seam-count association on real products.
5. **Revision mechanism test.** Whole-image parent edit vs masked inpainting vs regeneration, for three level-change edits (nose, arm root, cover) × 2 parents × 5 seeds = 90 images, plus 10 identical-pair catch trials. Two blind human raters; joint pass (target achieved and non-targets held) with CI. Minimum: 5 seeds per cell.

Much of M8 needs no new images: CIs, slopes, κ intervals, confusion matrices from existing readings, and the 表C.3 analysis can be done now.

## Overall verdict

The draft is unusually candid and its diagnostic framing is sound, but today it documents a sequence of small, mostly AI-read, partly post hoc trials, not a validated method. The one robust result belongs to a generation path the design never used, the revision mechanism did not work, and the collaboration and transfer claims have no admissible evidence. It becomes defensible if the claims are narrowed to an exploratory diagnostic study, experiments 1–4 are run with human readers, and the quadcopter is developed into a real multi-view design outcome.
