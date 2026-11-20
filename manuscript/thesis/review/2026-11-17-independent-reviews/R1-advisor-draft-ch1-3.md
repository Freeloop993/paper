Independent blind review of the advisor draft (chapters 1–3), 2026-11-17. Block numbers refer to the text extracted from handoff-20261117/chapters-1-3.docx.

# Blind review: 《人智协同驱动的多旋翼无人机造型参数化可控生成方法研究》, chapters 1–3

I read both files in full: `advisor-draft-ch1-3.md` and `proposal-2025-12-18.txt`. I did not open `review-pack/full-draft/`, which holds chapters 4–6. Figures appear only as `[图片]`, so I could not review their content. I could not verify the 2026 references or the Qwen-Image 2.1 model cards; the student should re-check them.

## Critical

**C1. The title's key terms are defined away, and the one quantitative control experiment tests a pathway the design does not use.**
- [181] “‘可控生成’，指对输入目标与输出响应作可复核的比较，并不意味着模型实现了硬约束求解” redefines controllable generation as an evaluation activity.
- [298] fixes the layout in the design task: “横纵跨度比 1.00、对置轴距 250 mm”.
- [184] admits “双叶部件图实验的读数不能用作该设计通路的布局精度”; [365] confirms the design uses a different pathway (点线图 with reference editing).
- [293] and [309] report that the proposal's continuous parameters (臂宽、机身长宽比、轴距) produced no visible response.
- What remains "parametric" in the design is a menu of four categorical variables with 2–3 levels, entered as text.
- Fix: either retitle and re-scope (e.g. 造型规格化生成与修订), or measure W/L response blind on the design pathway and report it as the headline result.

**C2. The main measurement instrument for RQ2 is an unnamed, uncalibrated AI.**
- [346] “两个AI会话分开接收材料…重复使用同一模型仍可能产生相同的系统偏差”; [347] “早期真人点选…均不纳入这36张图的盲标统计”.
- The reader's model, version, prompt and coordinate output format are not given anywhere.
- Two sessions of one model give test–retest agreement, not independent rating.
- The proposal promised Labelme/OpenCV keypoints with KPE and IoU.
- Fix: name the reader and publish its prompt; calibrate it on the condition images, where W/L and d/D are known; add two human annotators or deterministic detection; report agreement.

**C3. RQ1's evidence base fails its own reliability check, and the abstract hides it.**
- Table 3.2 [269]: 简洁—繁复 κ = 0.23 and 整体—拼凑 κ = 0.17. These are the only two pairs mapped to parameters in Table 3.4 [292].
- The one acceptable pair (紧凑—舒展, κ = 0.60) has “无可控参数”.
- The abstract [38] reports only “κ＝0.60” and calls it “较为一致”.
- [267] “第一编码从原卡换算” means the first coding was converted after the fact, not coded under a shared scheme. [271] collapses categories post hoc (“事后将‘无关’和‘看不出’合为‘未表态’”) and gives raw agreement without a recomputed κ.
- 低调—醒目 was not second-coded at all.
- [283] concedes both mappings are the author's conjecture: “并非用户原话”, “是本研究的操作化”.
- Fix: recode with a written codebook and two independent coders; report confusion matrices and a prevalence-robust index; report all κ values in the abstract; describe the word pairs as designer hypotheses, not evidence-derived targets.

**C4. Sample sizes and decision rules cannot carry the claims.**
- [350] “条件图组每档4张，纯文字组每档2张”: the abstract's “纯文字组未呈同向变化” rests on six images, in an unbalanced design with no reason given.
- The text given to the text-only group about W/L is not stated. If it contains no ratio, the baseline is a straw man.
- [326] the ±0.10 hit tolerance has no source and, as the draft admits, “读数0.50对三档均在容差内”. A criterion known not to discriminate is kept.
- [327] “至少 3 次被判为目标档，且基准图…不超过四分之一”: under pure guessing on a two-level variable this passes about 10% of the time (5/16 × 5/16), or roughly 40% across five levels. How the two AI readers combine is not defined.
- E2 has one pair per target [366]; E5 has three respondents [352].
- The proposal promised normality tests, t/ANOVA or non-parametric tests, effect sizes and confidence intervals. None appears, and none is possible at these sizes.
- Fix: balance the design with at least 10 images per cell; set the tolerance below half the level spacing or derive it from measured reading error; use an ordered-trend or exact test with intervals; define the two-reader rule.

**C5. The draft misdescribes the proposal and drops most of it without explanation.**
- [186] “表1.1从开题时提出的五项任务出发”, but row (3) in [193] is “方案的局部延续”. The proposal's task (3) was “小样本风格 LoRA 训练与应用”.
- Dropped silently:
  - Models and data: SD1.5/SDXL, ControlNet Canny/Lineart, IP-Adapter, both LoRAs, LLM mining of e-commerce reviews and sales data, the 30–40 quad / 15–25 hexa dataset, the 10–12 annotated top views for threshold calibration.
  - Metrics and comparisons: KPE, IoU/Chamfer, same-parameter seed variance, time-to-qualified-scheme, 可制造性 rating, the 有/无 LoRA and 有/无人反馈 ablations, the strength × CFG × seed grid, all statistics.
  - Deliverables: Y6/X8 transfer advice and the “评估体系”.
- Fix: correct row 3. Add one table of proposal item / kept / changed / dropped / reason, or remove proposal references from the thesis body and justify each design choice on its own terms.

**C6. Results are asserted in the abstract and chapters 1–3 that the draft does not show.**
- Abstract [38]–[39] and [43]–[44] state findings for E1, E2 and E5.
- Table 1.2 is titled “已实施的工作” [195] with final counts.
- Chapter 3 states outcomes without data: [293] three failed parameterisations; [309] outline and placeholder trials; [314] merged levels; [316] 16 exploratory images; [319] annotations drawn into images; [353] “3份答卷均选…更简洁”; [356] “B2终稿底图的机头实际朝向画面下方”; [359] an earlier blind review.
- Fix: move outcomes to chapter 5. Where a pilot result justifies a method decision, give the image count and point to an appendix. Write the abstract last.

**C7. "人智协同" (RQ3) has one undisclosed designer, no comparison, and no AI-side feedback.**
- [176] “以一名设计者…一次取舍为分析单位”, while [361] says the unit is “设计者×任务场次”. The two differ, and n is never stated.
- The designer is never identified. If it is the author, the same person selected the quotes, did the first coding, designed, and ran the experiments.
- [335] “配置器只列出可以改变的参数及其相邻档位”: the "修改建议" in the title of 3.5.2 is a menu. [259] “本文并未实现能够自主规划的智能体”.
- [194], [238], [363] and [368] each say active time was not recorded and no paired sessions exist. The proposal's key problem (2), a quantified efficiency–quality gain, is therefore unanswerable.
- Fix: disclose who the designer is. Run even a small within-subject study with the 3–5 designers the proposal named, or relabel RQ3 as a reflective design case and remove the efficiency language.

## Major

**M1. RQ4 has no method in chapter 3.**
- [177] “按本构型的基准归一化” is never defined. A regular hexagon has W/L of 0.866 or 1.155 depending on orientation, yet Table 3.6 [313] lists “六旋正六边形” next to three W/L levels.
- There is no hexacopter spec card and no level definitions for 药箱平面形、整合方式、喷洒组件 [187].
- [262] the requirement source is “设计者拟定的植保任务简报”, so the translation stage is not transferred.
- The hexacopter layout uses the 点线图 pathway and an unblinded reader [196], [347]; the quad uses ControlNet and blind reading. [191] “归一化跨度比可供两案例对照” does not hold.
- Fix: add a section 3.x with the hexa spec card, variables, normalisation formula and reading protocol, on the same pathway and blinding as the quad.

**M2. The intent → spec → generation → perception chain is never tested end to end.**
- [353] the top-cover stimulus is “人工增加两道横向分件线”; [356] the colour variants are “按区域换色”. Both are hand edits, and both outcomes are near-tautological (more lines look less simple; orange is more conspicuous).
- Only B2 is rated by observers. No human compares generated variants across levels or directions.
- [294] “臂根和机鼻的整体感尚无同等的单因素感知对照”.
- Fix: have blind observers rate generated images from opposed directions and from single-level changes on the word-pair scales.

**M3. The generation is not reproducible.**
- Missing: steps, guidance, sampler, output resolution, control strength, edge extractor and thresholds [321], seed list, prompt language, local or API access, and the instruction that accompanies the 点线图 reference [320].
- No compiled prompt is shown; [324] gives only the sentence order.
- The 配置器 first appears in [188] and is never described as software.
- [302] the designer may edit compiled text, which breaks “固定短语”. “三种文本不一致时…提示” would fire after every edit.
- Appendices A–C hold the phrases, judging criteria and rating form, but chapters 1–3 never cite an appendix.
- Fix: add a settings table, one full prompt per pathway, a configurator description, and appendix cross-references. State that formal experiments use unedited compiled text.

**M4. The requirement corpus has no provenance and the selection rules are weak.**
- [262] “7,443 个文本簇”: no platform, period, products, raw count or collection method.
- [266] “早期语料…补充语料” are undefined. “有目的地抽取” has no search terms, screening counts or selector.
- [277] rule (2) cannot fail: “找不到时注明‘未见反例’”. Rule (4) [279] is circular, because the four parts were fixed first.
- [280] “桨叶防护感有七张相关卡” is the largest theme, and it is excluded. [298] then fixes “无护圈”.
- The source of candidate word pairs is not given. Table 3.3 lists no card IDs or counts.
- Fix: document the corpus and screening; list cards per pair; justify or reverse the guard exclusion.

**M5. Levels and thresholds have no source, and "产品样本分析" is nominal.**
- Unsourced values: W/L 0.70/1.00/1.30; d/D 0.40/0.50/0.60; 250 mm; 41% of frame [320]; 至多两次; 3 张初稿 [331]; 三分之二 and 1 个刻度 [356].
- [314] “来源为配置器原有字段” is circular.
- 250 mm has no meaning in a scale-free image; [293] shows it only zooms.
- No feasibility rule is stated. At W/L = 0.70, propellers overlap once d/D exceeds about 0.57.
- 3.2.3 analyses no product features. [287] has 10 photos, 8 used, “7款来自同一品牌”, against the proposal's 30–40 and 15–25 models.
- Fix: derive ranges from a measured sample; replace 250 mm with dimensionless ratios; add a constraint rule; give a morphological table of the samples.

**M6. The specification tables do not match the text.**
- Table 3.4 [292] gives 机身平面形 and 臂材质 no word pair, yet [300] uses them to express directions.
- The three 臂根 levels have no order on 整体—拼凑.
- E2's “把机鼻收圆” [231] and “相机修订” (Appendix E title) are not levels in Table 3.6.
- Table 3.5 [298] has no 目标部位 or 可变项 field, although RQ1 [174] and the title of 3.3.2 claim them.
- [337] “场次剩余预算” and “时间与费用上限” are never quantified.

**M7. Chapter 2 makes commitments that chapter 3 does not operationalise.**
- [228] “将尺度、位置与相对布局分开测量”: chapter 3 measures only two ratios.
- [236] “区分有效修改与无效回合”: no criterion is given.
- [235] and [240] call for diversity and 主导感: no measure exists.
- [238] calls for separating active, waiting and preparation time, then says “无法据此还原设计者的主动工时”.
- [230] distinguishes three editing types, but 父图修订 is never classified.
- [249] “筛选前全部样本的完整统计”: Table 1.2 omits the 16 exploratory images [316], and leaves “修订字典的另24张” and “校正后的输入” unexplained.

**M8. The research gap and novelty do not follow.**
- [249] the four gaps are reporting practices, not a method gap.
- Two are contradicted by the draft's own citations: [232] says InstructPix2Pix and MagicBrush already separate preservation from instruction-following; [30]–[33] already record control.
- The closest work, Chen et al. [1], covers the same product and the same reviews-to-prompt route, but is only disclaimed. Qi [10] and Du [24] are not compared on input, control mechanism, evaluation or human role.
- Table 2.1 omits [9]–[11]; its caption says “研究空白” but no column lists gaps.
- “创新” appears nowhere in chapters 1–3.
- Fix: add a dimension-by-work comparison table and two or three positively stated contributions.

**M9. Literature coverage is thin (chapter 2 is about 6,400 characters).**
- Missing: domestic UAV styling research; shape grammar and interactive genetic algorithms; control-adherence work (T2I-Adapter, GLIGEN, IP-Adapter, LoRA); the base model's technical report (only model cards [5], [6], [23] are cited).
- [225] describes the advisor's papers [20] and [21] without naming shape grammar or IGA, which are the nearest classical precedent for human-in-loop parametric form generation.
- [221] cites Amadori second-hand through [19].
- [231] disposes of [25] and [26] in one clause each.
- Of the proposal's 26 references, only Du et al. survives.
- 12 of 44 entries are preprints, model cards or manuals.

**M10. Threats to validity are missing or under-handled.**
- Orthographic top view is the only evaluation view [182]. It is not how users see drones, and it limits the design value expected of a professional-degree thesis.
- Real photos keep “原有光照和拍摄角度” [287] while finals are top views, so the two sets of ratings are not comparable.
- The final B2 violates a 保持项 (机头朝上) [356] and was still chosen.
- Lateral versus longitudinal is undefined when the output is rotated: a 90° turn inverts W/L.
- [352] records the evaluators' relation to the designer but does not report it.
- [359] the questionnaire changed after a first blind round, and the draft does not say which data came from which version.
- [177] E6 changes configuration, task, pathway and blinding together.

**M11. Structure.**
- The experiment inventory (Table 1.2) sits in the Introduction.
- Section 1.3 is titled 研究目标 but lists no objectives. [178] is a contingency plan (“…场次不足时…按设计案例报告”), not thesis prose.
- Repeated material:
  - the two-pathway explanation [183]–[184], [320]–[321], [365];
  - “至多两次” [189], [303], [337], [370];
  - the lack of active-time records [194], [238], [363], [368];
  - 紧凑—舒展 having no parameter [293], Table 3.4, [317], [371];
  - the Chen limitation [163], [182], [215], Table 2.1.
- Paragraphs are bolted on after section conclusions: [218], [225], [231]–[233], [241].
- [209]–[210] are working notes on reading manuals, not literature review.
- Run-in headings do not match their content: “一致性” [350], “风格稳定性” [357].

**M12. Experiment labelling and counts.**
- E4 is missing with no explanation. “后端预试” and “造型响应实验” have no code.
- The same experiment has four names ([315], [316], [348], [350]). Pilots have six: 预试, 前期试验, 前期比较, 条件选择阶段, 后端预试, E0.
- Evidence-card IDs (E003, E011) collide with experiment codes (E1…).
- B2 and C1 are used in [39], [196], [353] and [366] without definition.
- E1's design matrix is unclear: both series share the cell (1.00, 0.50), and the draft does not say whether it was generated twice.
- [352] does not say whether the two E5 tasks used the same three respondents.

**M13. Register.**
- Disclaimers dominate: “不能” appears 32 times, plus “并不/不意味着/不等于/不代替”. Examples: [166] “不能作为方法有效性的自证”; [170] “不以‘条件越多越好’…为前提”; [217] in full.
- Lab-log wording: “知条件AI初读” [347]; “按校正后的输入…首案3张、主比较12张、扩展24张” [196]; “同一请求按登记的种子提交一次” [331]; “回退或重开均不重置场次预算” [337]; “现有记录没有…” [194]; “1名真人” [196].
- Colloquial or rhetorical: “还认得出来吗？” [231]; “壳体保持了，但相机没有改对” [232]; “会遮住” [233].
- Weak “因此”: [165], [218], [272].
- Fix: state each limitation once, in 1.4 or 6.3; write what was done in affirmative sentences; replace coined terms with 非盲判读, 人工判读, 设计轮次.

**M14. Terminology.**
- Used interchangeably without definition: 设计意图 / 造型意图 / 造型意象 / 设计语义 / 需求语义 / 感性语义. 设计意图 is defined only at [289], and more narrowly than RQ1 uses it.
- 点线图 / 轴位点线图 / 定位图 / 条件图 / 部件图.
- 对置轴距 / 对角轴距 / 轴距; 桨径比 / 桨径轴距比.
- 不可见 / 不可判 / 未知 / 看不出 / 无关.
- 判读者 / 评议者 / 评者 / 真人.
- “两种协同方式” [367] is undefined at the point of use.

## Minor

- **Abstract.** [37] opens with an anecdote; there is no purpose–method–result–conclusion order. [38] lists three shape parameters, the body four. “双叶部件图” and “B2” are undefined there.
- **Front matter.** [1] 论文编号 is incomplete. [47] is a note to the advisor and must go. [20] and [28] “Mechanical Engineering / Master of Engineering” should be checked against the professional-degree template (I am unsure of the required wording).
- **Notation.** [157] n, k, u are unused in chapters 1–3; W and L are not defined separately. [159] AIGC, CMF and QFD are never used in chapters 1–3; RQ, κ and the E-codes are missing.
- **Table captions.** Table 1.1 says “证据” but has no evidence column. Table 3.6 is titled 造型变量 but includes 构型; it uses “四旋/六旋”, merges two variables in one row, and lists three descriptive quantities where [311] and [371] name two.
- **Wording clashes.**
  - [271] “同方向有7条，反方向有1条” reads as contradicting the previous sentence (“均未出现…左极…右极”); it accounts for 8 of 12 disagreements and leaves 4 unexplained.
  - [274] the three counted groups do not match the three declared labels.
  - [259] and [337] give different stop conditions.
- **Figure 3.2.** [263] presents a co-word network with no parameters and then says it is not used. Give the settings or cut it.
- **Sources.**
  - [285] cites the Mini 4 Pro manual, a model not among the eight samples.
  - [230] cites Qwen-Image-Edit 2509/2511 while the thesis uses 2.1; [229] “属于同一系列” is vague.
  - [183] the licence sentence is irrelevant.
  - [306] and [188] lean on [44] and [7] for support those sources do not give.
- **Reference list.**
  - [23] puts two model cards and two URLs in one entry.
  - arXiv items [22], [25], [26], [32], [36] lack access dates.
  - [27] and [39] abbreviate proceedings names.
  - [28] and [29] give arXiv DOIs for NeurIPS papers, with no pages.
  - Hyphens and en-dashes are mixed in page ranges; title capitalisation is mixed.
  - Several [C] entries lack place and publisher.
  - There are no theses and only 8 Chinese sources.
- **Chapter title.** Chapter 3 says “造型意图转译”; section 3.3 says “设计意图转译”.

## Ten questions a defence committee would ask

1. In the pathway you actually design with, which parameter is controllable, and what is its measured accuracy?
2. Who is the "设计者"? If it is you, how is RQ3 more than a design diary, and why were the planned 3–5 participants and the with/without-feedback comparison dropped?
3. Which AI read the axes and levels, what is its error against known ground truth, and why were the human point annotations excluded?
4. With κ of 0.23 and 0.17, why are 简洁 and 整体 the two semantics you build parameters on?
5. With four and two images per level, how do you exclude chance, and what did the text-only prompt say about W/L?
6. Why was SD + ControlNet + LoRA replaced by Qwen-Image 2.1, and why does Table 1.1 list "局部延续" as a proposal task?
7. The seam and colour tests used hand-edited images and three respondents; what do they show about your generation method?
8. What can a designer do with your method that Chen et al. [1] or Qi et al. [10] cannot, and where is the comparison?
9. For the hexacopter, what is the spec card, how is W/L normalised, and what exactly transfers when the requirement source, pathway and blinding all change?
10. Seven cards concern prop guards, yet you fix "无护圈"; B2's nose points down, yet it is the final. How do these decisions follow from your own rules, and how does a top-view image become a complete industrial design?

## Verdict

The draft is unusually candid about its limits, but that candour has replaced the argument: the title's claims of parametric control and human–AI collaboration are each narrowed by definition until little is left to test. The evidence described so far (an unnamed AI reader, 2–4 images per cell, three respondents, one undisclosed designer, κ below 0.25 on the two semantics that carry the mapping) cannot support the results already written into the abstract. Before chapters 4–6 are drafted, the student should fix the proposal mismatch, calibrate the measurement, enlarge and balance the experiments, and restate the contribution positively against Chen et al. and the shape-grammar/IGA line.
