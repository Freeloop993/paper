Independent replication audit of the thesis numbers against the evidence repository at commit 3e71843, 2026-11-17.

# Replication audit: thesis draft vs. evidence repository

**Audited tree.** The repository root, detached HEAD `3e71843` (= `origin/codex/thesis-source-e2r-20261115`). Every path below is relative to the repository root; thesis files are under `manuscript/thesis/src/`.

**Method.** Nothing was written inside the repository. Recompute scripts were kept in a scratch folder outside the repository (not archived). "Recomputed" means from raw JSON/CSV; "record-level" means it matches a README or summary whose raw data are not in the repo. Where evidence exists only on other branches it was read with `git show` and is marked so.

**Coverage.** 45 claims from the abstract, ch3, ch5 and Table 1.2. Not covered: ch4 tables beyond spot checks, ch6, appendices A/B. The S1 decomposition figures were not re-derived, the E0/E1 zips were not re-hashed, and no image was inspected visually.

## 1. Claim-by-claim table

### Mismatches, stale or conflicting

| # | Claim (file:line, quote) | Evidence | Status | Note |
|---|---|---|---|---|
| 1 | `ch5.md:11` "闭源后端仅生成 6 张"; `ch1.md:81` "开源与闭源两种后端，各 6 张…后端比较见4.1.3" | `evidence/e0-open-20261112/open-gate.json:6`; `STATUS.md:25`; `evidence/20261117-offline-review/design-review/README.md:42` | **Mismatch** | `"closed_submitted": 0`; "E0 闭源对照未采". `ch4.md` §4.1.3 has no closed-backend comparison. `evidence/d2-closed-six/` is a separate development sample. |
| 2 | `abstract-cn.md:7`, `ch5.md:81,85` 多块顶盖: target "4、4", baseline "0、0", "有响应" | `evidence/20261115-review-takeover/shape24/readings-unblinded.json` (R/T); branch `claude/extra-readings-20261117` (`e19a706`) `evidence/20261115-review-takeover/claude-XY-20261117/summary.md`; `evidence/20261117-offline-review/design-review/human-by-reader.json`; `evidence/20261117-offline-review/quad-unblinded.json` | **Verified for R/T; contradicted elsewhere** | X/Y (3rd/4th blind AI reads): baseline misread 2/4 and 2/4, "无响应". Humans: 3/4 (H01, exposed), 2/4, 1/4. Extension baseline r05–r12: 4/8 for both readers. Only the pair with 0/4 is in the thesis. |
| 3 | `ch5.md:78` 外露承座 "2、3" | same files | **Verified for R/T; conflicting** | X/Y 4, 4; humans 2/4, 4/4, 3/4; extension 7/8, 8/8. |
| 4 | `ch5.md:215` "两批均待独立复测"; `ch5.md:238` "以上均为 AI 知情判读"; `ch5.md:258` "尚未经过独立复核"; `ch1.md:89` | `evidence/20261117-offline-review/six-summary.json`, `six-unblinded.json` | **Stale** | An independent blind AI retest of all 36 exists (215/216 axes). Recomputed: main 0.849/0.975/1.133 (3/3 complete triplets increasing); extension 0.893/0.991/1.013, 6/8 increasing. |
| 5 | `ch5.md:219` "机尾横杆三张均可辨认横向部件与中间两臂分开" | `evidence/20261117-offline-review/afternoon-nine.json`; `evidence/20261117-offline-review/README.md:24` | **Mismatch** | All three `target_pass: false`; the bar sits at the nose end, "要求'后半部'的目标命中 0/3". The thesis reports separability and omits the registered-target failure. |
| 6 | `ch5.md:223` "0.70 档第 2 个种子的左中电机仅见单叶"; `ch5.md:231` seed 2026112326 at 1.30 = 0.98 | `six-unblinded.json` (HEXA3-wl0.70-r02, HEXA3-wl1.30-r04) | **Partial mismatch** | Independent reader: all six axes single-bladed in that image; the 1.30/seed-4 cell is unmeasurable (hub/motor offset). The "2 of 12" count agrees. |
| 7 | `ch5.md:87` "三档中位数约1.03、1.16、1.36" | `evidence/20261115-review-takeover/wlq-final.json` | **Minor mismatch** | Stored ratios give 1.025/1.162/1.357. 1.03 appears only under E1's range definition (1.030). 4/4 seeds increasing is verified. |
| 8 | `ch5.md:109` "另外两位隔离 AI 评者逐对描述了六组图" | `evidence/20261115-review-takeover/e2r-pairs-unblinded.json`, `shape24/reveal.json` | **Mismatch (likely duplication)** | The readings in `ch5.md:103` and `ch5.md:109` both match the same R/T pair. `ch1.md:85` says "两位 AI". |
| 9 | `ch5.md:99` "不能据此计算联合合格数" | branch `claude/extra-readings-20261117`, `…/claude-XY-20261117/summary.md` | **Stale (side branch)** | X/Y applied the registered joint rule: parent edits pass 0/4 (X), 1/4 (Y); non-target contour "未保持" in 6/6. |
| 10 | `ch3.md:222` "另由一名真人判读者对每个条件抽取 2 张进行判读" | `evidence/20261117-offline-review/README.md:7-11`; `design-review/human-readings.json` | **Mismatch (method vs execution)** | Executed: 3 readers × 12 images of S0/S2/S5 only, chosen after the AI disagreement. No human reads for S1/S3/S4; none reported in ch5. |
| 11 | `ch5.md:23` "同时报告非目标参数的漂移次数与通用项的符合比例" | `shape24/readings-unblinded.json`; `evidence/20261117-offline-review/quad-summary.json` | **Not delivered** | `ch5.md:85` reports only blade deviations. R reads cover = multi in 1/4 S1, 1/4 S2, 2/4 S3 targets; extension S2 cells read multi-cover 6–7/8. |
| 12 | `ch5.md:68` human vs AI medians "0.0041", "0.0125" | `evidence/e1-open-20261112/point-return.md`; `geometry-readout.json:3,9,67` | **Cannot verify; records conflict** | The JSON still has `human_forms: 0` and `passes_twice_calibrated_error: null`. The raw human form is "留在本地". |

### Not found in the audited worktree, or cannot verify

| # | Claim | Where looked | Status | Note |
|---|---|---|---|---|
| 13 | `ch5.md:187` "43 次…76—108 秒…3619.6 秒…84.2 秒" | no hit in `evidence/`, `experiments/`, `docs/` | **Not found** | E3 evidence exists only on branch `claude/e3-quad-qwen` (`evidence/e3-quad-qwen-20261115/`); no summary carrying 3619.6 there either. |
| 14 | `ch5.md:95-99` E2R human reader ("三张…后壳都被勾选为有变化", etc.) | — | **Not found** | No raw answer in the repo. Only a `.docx` on `origin/codex/e2r-human-review-20261115`. |
| 15 | `ch5.md:95` "6张原图已回收核验" | `evidence/e2r-hub-readback/readback.json` (hashes only) | **Cannot verify** | Images are on `claude/e3-quad-qwen` (`evidence/gpu-day-20261115/e2r/E2R-originals.zip`). |
| 16 | `ch5.md:225-232` Table 5.4 per-seed q (知情判读) | — | **Not found** | No source file. 11 of 12 cells agree within 0.01 with the independent retest. |
| 17 | `ch5.md:105`, `ch5.md:140` B2 revisions ("3张父图编辑保住…", "9 张全部露出镜窗，其中 3 张…机尾") | `experiments/gpu-day-20261115/analysis-247/247个排程位置.csv` rows 1–6 ("已判读") | **Not found** | Reading files only on `claude/e3-quad-qwen`. |
| 18 | `ch5.md:158-164`: backgrounds "1人有设计…2人没有"; post-reveal "否""是""看不出"; camera "可能被遮挡"; quote "橙色吸引了我，但是不好看" | `evidence/e5-individual-reviewed/README.md` | **Cannot verify** | Not in the README; raw answers local. |
| 19 | `ch5.md:217` first-case description; 39 E6 originals | CSV hashes only | **Cannot verify** | No hexa originals in the worktree. |
| 20 | `ch3.md:63` "桨叶防护感有七张卡" | `evidence/semantic-cards/cards.csv` | **Cannot verify** | A keyword scan gives 8–10 guard-related cards. The governing `docs/protocols/word-pairs-v1-draft.md` is absent from the worktree. |
| 21 | `ch3.md:37` "不了解本研究方向、未接触第一编码结果的研究生" | `evidence/semantic40-second-coding-20261115/` (CSV only) | **Cannot verify** | `receipt.json` exists only in commit `40d5506`: "同学一人；作者确认对方未看过第一编码". Nothing on knowledge of the research direction. |
| 22 | `ch3.md:29` "7,443 个非默认文本簇" | `evidence/semantic-cards/early-crawl/comment-audit.json:15` | **Record-level** | Carried over from the 9 Oct audit; raw corpus local. |

### Verified

| # | Claim | Evidence | Status |
|---|---|---|---|
| 23 | `abstract-cn.md:7`, `ch3.md:35`: 36 cards, 35 sources; 21 supplement / 15 early | `evidence/semantic-cards/cards.csv` | Recomputed |
| 24 | `ch3.md:37`: 40 = 35 + 5 distractors, all coded | `experiments/semantic40-pairing/key.json`; second-coding CSV | Recomputed |
| 25 | `ch3.md:42-45` Table 3.2: 21/35 κ0.43; 29/35 κ0.60; 18/35 κ0.23; 23/35 κ0.17 | same + `cards.csv` | Recomputed (0.432/0.596/0.228/0.172) |
| 26 | `ch3.md:46`: 4 distractors all "无关", 1 "看不出" | same | Recomputed (B02) |
| 27 | `ch3.md:48`: 12 of 17 and 7 of 12 disagreements; merged 30/35, 31/35; no opposite poles | same | Recomputed |
| 28 | `ch3.md:54`: 16 / 12 / 8 | `cards.csv` | Recomputed |
| 29 | `ch3.md:81`: 10 models, 8 used, 7 of 8 one brand | `evidence/real-product-topview/README.md`; `evidence/e5-individual-reviewed/README.md` | Record-level |
| 30 | `ch3.md:161`: 16 exploration images; 8 read as both facet and ridge; orange only in 4 | `experiments/gpu-day-20261115/analysis-247/order09-unblinded.json` | Recomputed |
| 31 | `ch5.md:52-63` Table 5.1 (all 12 rows) | `evidence/e1-open-20261112/reader-A.json`, `reader-B.json`; `experiments/r0-e0-e1/manifest.json` | Recomputed, exact |
| 32 | `abstract-cn.md:7`: 12/12, 12/12; text-only 0/6, 4/6 | same | Recomputed |
| 33 | `ch5.md:66`: adjacent differences; 42-image medians 0.0000 / 0.0006 | same + `evidence/e0-open-20261112/` | Recomputed |
| 34 | `ch5.md:47`: 36/36, no retries | `evidence/e1-open-20261112/independent-verification.json` | Record-level |
| 35 | `ch5.md:77-81` Table 5.1a, formal and v1.6 columns | `shape24/` and `v16-shape24/readings-unblinded.json` | Recomputed for R/T |
| 36 | `ch5.md:85`: blade deviations 1 (formal), 3 (v1.6) per reader | same | Recomputed |
| 37 | `ch5.md:90`: extension 0.98/1.11/1.28, 8/8 increasing | `evidence/20261115-review-takeover/extension-48-measurements.json` | Recomputed |
| 38 | `ch5.md:101`: displacements 0.020, 0.032; four parent edits 0; bound 0.05 | `evidence/e2r-hub-readback/readback.json` | Record-level (single known-condition read) |
| 39 | `ch5.md:150-156`: 583 pixels; 3 answers; 3/3 and 3/3; 2 with design background | `experiments/e5-paired-topview/material-key.json`, `aggregate.json` | Record-level |
| 40 | `ch5.md:160-162`: +1, +2, +2; compact identical; 02号 5→3; coordination 5/5; only 01 recommends orange | `evidence/e5-individual-reviewed/README.md` | Record-level |
| 41 | `ch5.md:164`: small-image 3/3 and 3/3; Mini 3 3/3; Neo 2 0/3 | same | Record-level |
| 42 | `ch5.md:215`: 39 = 3 + 12 + 24; 15 superseded; extension 0.89/0.98/1.01, 5/8 | `247个排程位置.csv`; `旧负向词15张.json`; `extension-48-measurements.json` | Recomputed |
| 43 | `ch5.md:117-121`: S1 0/6, 1.81 px, 66.47–107.18 px, 71.5%–99.3%; G2 24 positions unreadable | `evidence/s1-axis-repeat/README.md`; `evidence/s1-decomposition/README.md`; `evidence/g2-six/README.md` | Record-level |
| 44 | `ch5.md:138-146`: 5 of 36, 1 of 8; pretrial camera 6/4/2; local composites 0 of 3 groups passed | `evidence/form342-h3-dev/round-2/README.md:29`; `evidence/qwen-shape-s4-20261114/shape-readings.csv`; `evidence/20261115-review-takeover/local-edit/development-outcome.json` | Recomputed / record-level |
| 45 | Handoff counts 247 / 223 + 39 = 262 / 145 / 96 / 102 | `247个排程位置.csv`; `experiments/gpu-day-20261115/recovered-originals-102/manifest.csv` | Recomputed; all 102 PNG SHA-256 match |

## 2. Most serious integrity and traceability problems

1. **The formal shape result is reported from the most favourable of several readings.** The four AI reads, three human reads and the extension batch disagree on 多块顶盖 and 外露承座 (rows 2–3), yet the abstract states the R/T outcome without qualification. `evidence/20261115-review-takeover/README.md:5` also admits "原 X、Y 答卷尚无法核对".
2. **Evidence is split across unmerged branches.** The audited HEAD lacks:
   - all E3 evidence, the E2R and hexa originals, and the GPU-day registration (branch `claude/e3-quad-qwen`);
   - the X/Y readings (`claude/extra-readings-20261117`);
   - the 11/17 registration (`claude/gpu-tasks-20261117`).

   `appendix.md:1` cites `experiments/e3-quad-qwen/round-3/dictionary-v16.json`, which does not exist in this tree.
3. **The E0 closed-backend arm is claimed but was never run** (row 1).
4. **`ch1.md:93` says "各实验的判定标准均在生成前预先设定，取得结果后不再调整"; the records are weaker than that.**
   - The second-coding conversion rule (`9cd90e7`) was committed three minutes after the coded CSV was archived (`40d5506`); `experiments/semantic40-pairing/README.md:3` admits four rows had been seen.
   - Freeze-sheet section 3 is still "待作者签署" (`docs/protocols/method-freeze-v1.md:3`).
   - The N2 human conditions were chosen after the AI disagreement.
   - The 11/17 registration states "E2R 的指令写成了整机重新描述", yet ch5 presents E2R as the formal local-edit experiment.
5. **Independence rests on self-report with raw data outside the repo.** This applies to the E1 point-pick, the E2R human, both E5 tasks and the second coder. One N2 reader (H01) self-reported prior exposure and is correctly listed separately.
6. **Stale or conflicting records of the same experiment.**
   - `evidence/e1-open-20261112/geometry-readout.json` shows 0 human forms.
   - `experiments/gpu-day-20261115/analysis-247/说明.md:5` and the CSV still mark 96 positions "待逐图判读", though both blind reads exist.
   - `STATUS.md:11,25,37` and `evidence/semantic-cards/README.md:15` carry superseded counts.
   - Three "E2" lineages coexist: `evidence/h3-e2-local-edit-20261113/`, `experiments/e2-registered/` plus `recovered-originals-102/01-old-E2/`, and E2R.
7. **E6 text is out of date and one development result is misdescribed** (rows 4–6).

Three checks came back clean:
- The ≥3/4 and ≤1/4 response rule predates the run (`docs/roadmap-20261114.md:47`).
- The r1–r4 formal denominator was registered in advance; no development images were found counted in the formal 24.
- All 15 figure files referenced by the thesis sources exist.

## 3. Registration vs execution, recent batches

| Batch | Registered | Ran | Judged | Still open |
|---|---|---|---|---|
| 11/15 GPU day | 247 positions (`claude/e3-quad-qwen:experiments/gpu-day-20261115/README.md`) | 247/247, plus 15 superseded hexa | 145 originally; the 96 combo/extension images now have two blind AI reads; 6 old E2 kept as history | Human reads only for S0/S2/S5; quad edit-path layout (36) is known-condition only |
| E2R | 6 (`TAKEOVER.md`, same branch) | 6 | 1 human (raw absent), R/T, X/Y (side branch), hub readback | Joint pass count absent from the thesis; replacement E2V2 not run |
| Afternoon dev | 9 (`e96d419`) | 9 | Known-condition first read: boom-at-rear 0/3, nozzles 3/3, carbon 1 pass / 1 fail / 1 doubtful | Independent re-read |
| Local edit v1 | 9 dev + 16 confirm (`experiments/20261115-local-edit/freeze.json`) | 9 dev | 0 of 3 groups passed; 16 confirmations correctly withheld | — |
| Local edit v2 / E2V2 | 17 dev + 56 confirm = 73 (`97b1a72`) | **0** (`evidence/20261117-offline-review/gpu-offline-audit.json`) | — | Everything |
| N2 human | Target of 3 unexposed readers | 3 returned, 1 exposed | Scored | One more reader needed |
| E0 closed / E4 | 6 images / paired sessions | 0 / 0 | — | Author decision pending |

## 4. Evidence not yet reflected in the thesis, and the reverse

**In evidence, not in the thesis**
- Two blind AI reads of the 96 combo/extension images (`quad-summary.json`):
  - COMBO: all three targets hit in 20/24 for each reader.
  - Extension baseline read as multi-cover in 4/8.
  - 前伸 hit in 3/8 under v1.2, with the camera at the bottom in 5/8; 4/4 under v1.6.
- Three human readings of S0/S2/S5 (`design-review/human-by-reader.json`).
- Independent six-rotor retest, including blade counts 205 / 6 / 5 of 216 axes.
- Nine-image afternoon development read (`afternoon-nine.json`).
- X/Y readings of the formal 24 and E2R (side branch).
- Non-target drift counts for the formal 24.
- ±0.10 hit counts on the edit pathway, computed from the stored ratios: main 0/4, 1/4, 4/4; extension 0/8, 3/8, 8/8.
- Early-crawl denominators (11,241 rows → 8,037 → 7,443) in `early-crawl/comment-audit.json`.
- The E1 human reader's unsolicited comments: 8 of 12 images, 6 about the camera.
- The 11/17 registration and its statement that the E2R instructions were flawed.

**In the thesis, without evidence in the audited tree**
- E0 closed-backend six.
- E3 call count and timings.
- E2R human answers and originals.
- Table 5.4 source values.
- B2 revision readings.
- E5 reviewer backgrounds and post-reveal answers.
- The "七张卡" count.
- The one-human, two-per-condition spot check described in `ch3.md:222`.
- ch4 pixel counts (1305, 3028, 0.11% / 0.37%), which trace only to `claude/e3-quad-qwen:experiments/e3-deepening/`.

The E4 placeholders at `ch5.md:183,191,205` are consistent with zero sessions.
