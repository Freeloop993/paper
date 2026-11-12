# 独立评议与场次分配工具（X12）

## 顶视渲染与语义评议

同一 `build_pack.py sources.json new-pack` 入口支持下列两种表。只分发 `participant`，保管 `researcher-key.json`。按 [11 月 12 日规格](../../docs/protocols/semantic-to-E3-spec.md)先冻结样本来源，再打包。每个输入均需 `key, path, sha256, evidence, block`，最外层填写 `mode, freezeReference, images`。

- `r1` 接收 16 个已核实的位置（含两张复用的 E1），均标 `block: render`。逐图保留产品感、相机、臂根三道三级题的原判。汇总输出逐项中位数；正式格内汇总及并列按 R1 冻结文件执行。
- `e5-semantic` 是 X12 评议的词对附表。先做 `block: product` 的实拍参考，再做 `block: final` 的锁定终稿。真实产品须登记 `permission`，少于 8 张时登记 `product_shortfall`。用 `terms_file` 指向作者已冻结的 JSON，内含 `version, freezeReference, pairs`，每对含 `id, left, right`。左右端逐评者逐题随机，同时保留呈现次序、屏幕原判、换算为固定方向的读数和“看不出”。每组单独报告。尚无冻结词对和锁定终稿。

用 `python summarize.py researcher-key.json 答卷.json` 复核答卷身份、覆盖和换向。工具不发送问卷或生图。参与者曝光史随答卷保留，独立人数在招募台账核实。

**11/11 新正式样本口径。** [旧批退役与新图清单](../../evidence/formal-reset/README.md)及[变量表](../../docs/research-variables.md)优先。下面旧批图、评分和计数仅用于历史追溯，正式效果表、评议发放及方案深化按新清单。

依据 [正式采集材料包第 5–7 节](../../docs/protocols/formal-collection-kit.md)。本版可用于离线校准。正式采集仍需作者落实人选、同意程序、抽签登记和评分规则。研究者保管本目录，评议者只收下述 participant 文件夹。

已收到[首份真实校准反馈](../../evidence/x12-calibration/README.md)。下列 calibration/participant 只供回看首轮已经取得的记录。当前 build_pack.py 新制包采用 X12-r3。先判断四项实体构型与任务细节是否可见，再分别评价造型及深化意愿。后续评议者使用同一版包。

## 复核已封存的旧校准包（已停止发放）

1. 下载或克隆仓库，将 `calibration/participant/` 整个文件夹拷出，可以压缩后交付。接收方先解压，再用桌面版 Edge、Chrome 或 Firefox 打开其中的 `index.html`。直接打开 GitHub 预览不能填写。网页离线运行，包含图片、两份脚本和 HTML。
2. 评议者填匿名背景、年限、与作者关系、是否见过标签或 AI 结论。每图先描述可见部位，再阅读任务卡，评价构型四项、任务契合、协调完成度、吸引力、新颖性与深化理由。数值题允许“不可判”，保留原选项。页面按每位读者独立打乱图序、对序和左右位置。
3. 成对页分别问表面分件、臂身连接、相机或载荷整合的保持情况，并记录部位依据。每份答卷含呈现顺序、匿名图号、逐页耗时与下载编号。时间包括阅读和临时离开页面的时间，不能直接解释为思考时间。请一次完成，中途刷新会丢失本次进度。
4. 最后下载 JSON，经约定的私密渠道交给研究者。重复下载同一编号只记一份。请勿将答卷、联系方式或真实分配表提交到此仓库。研究者以 pack 值关联同批密钥。禁止把校准模式答卷混入正式评价。

## 校准材料与解释

本包采用 G2b 的四张图与 J2 的两张图。六图均为已有顶视、浅色中性背景、1024 × 1024 的四旋翼整图。逐图保留 RGB 像素，移除原文件名和 PNG 元数据，采用相同画布和显示尺寸。局部深浅、阴影和原有图形均保留。六图均未取自 S1；未使用 S1 答卷或其原图作为评议材料。配对练习用同一文字、同一种子的 G2b-a/b。任务 A、B 在六图间交替，仅练习如何读题，不能据此评价这些历史生成是否完成了各自原任务。本组主要涵盖部件简略、缺失或难以判读的情况，这六张历史图仅用于表单预读。吸引力、新颖性和深化意愿的原始回答用于核查读题情况，阈值校准另取 B02 概念图。

`calibration/researcher-key.json` 含匿名图号、源文件名和原文件／匿名 PNG／RGB 像素摘要，仅供研究者。评议者若同时有仓库访问权，请仅发参与者文件夹，并照实记录既往曝光。工具没有预置评议结论。联合判定留给揭盲后的分析；材料包建议构型四项均“是”、任务细节足以作出至少部分判断，任务契合与协调中位数各至少 5。构型跨评者合并方式、最低有效人数、缺失处理与正式阈值都须事先冻结。吸引力、新颖性各自报告。

## 给另一批真实原图制包

研究机使用 Python 3.10+ 与 Pillow。将来源清单存成 UTF-8 JSON，path 相对清单目录或为本机绝对路径。按真实任务指定 A 或 B，使用经核的统一视角、背景与 1024² 图像；配对项必须来自同一风格意图。脚本校验尺寸，视角、背景与意图由研究者逐图核对。正式样本与校准样本分别制包。

```json
{"mode":"calibration","images":[{"key":"图甲","path":"甲.png","task":"A"},{"key":"图乙","path":"乙.png","task":"A"}],"pairs":[["图甲","图乙"]]}
```

```sh
python build_pack.py sources.json new-pack
```

新目录中仅交付 `participant`。正式材料另用 `mode: formal`。一次制包后封存全套，所有同批评者用同一包。重新制包会分配新编号。

## 四人块抽签与封存

作者在招募前确定种子与块数，在研究机写入 UTF-8 文件 plan.json，例如 `{"seed":"QA_ONLY","blocks":2}` 为软件测试示例。先登记正式计划文件的 SHA-256、块数、登记时间与版本；保密分配要求下对外仅登记摘要，种子及分配表由分配负责人保管。在独立复核登记后运行：

```sh
python -c "import hashlib,pathlib; print(hashlib.sha256(pathlib.Path('plan.json').read_bytes()).hexdigest())"
python allocate.py plan.json 已事先登记的64位摘要 新封存目录
```

每四人块中四种任务与方法顺序各一次，固定种子和计划可在另一台电脑重现。每人两个场次都列于 allocation.csv，seal.json 留有计划和表的 SHA-256。输出目录须为新目录。正式招募按封存槽位执行，记录退出与缺席，保留原分配。不要向评议者提供分配表。正式抽签仍待作者登记。


## 回收与研究者分析

研究者可运行 `python summarize.py calibration/researcher-key.json 答卷1.json 答卷2.json`，逐图输出四项构型计数、有效评分数、不可判数及中位数；缺少冻结规则时联合判定为 null。重复编号、错包、漏图、错任务会报错。配对三项与部位依据保存在原答卷，用于逐项定性对照。

若作者最终冻结“构型须所有评者均判是”及“要求完整回答，遇不可判或缺人即保留未知”的规则，另存 JSON，填写 pack、mode、freeze_reference、expected_readers、construction（all_readers_yes）、missing（undetermined）及 taskFit、coherence 两个 1–7 阈值。预先登记文件摘要，再加 `--registered-rule 文件 --registered-sha256 已登记摘要`。r3 还需显式登记 detailSufficiency 字段；当前支持 all_readers_at_least_partial，只要一人选“不够”，该图联合判定即为未知。该规则须经冻结才可用于正式采集。若最终采用的合并规则不同，应按正式冻结版本更新分析脚本。工具不自行设定正式门槛。

本机软件验收使用临时 Edge 配置从本地文件完成全部页面，成功下载并复读一份合成 JSON，覆盖空项拦截、六张图逐页观察与评分、成对图部位说明及不可判值。另核对六图 RGB、两个四人块的平衡、同种子复算、错摘要和重复输出目录拒绝。无真人答卷进入上述验收；跨设备尚未实机复测。
