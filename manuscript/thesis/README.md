# 论文 Word 工作稿

**打开 [thesis-draft.docx](thesis-draft.docx)**：按南航研究生学位论文撰写要求排版的全文工作稿，含封面、承诺书、中英文摘要、目录、图表清单、注释表、第一章至第六章、参考文献、致谢、成果与附录。黄色底纹是待补或待核的内容。版式已与同门四篇硕士论文逐项对照，见 [FORMAT.md](FORMAT.md) 第六节。

用 Word 打开时会提示“更新域”，选“是”即生成目录与图表清单的页码。也可以右键目录，选“更新域”→“更新整个目录”。

## 文件

| 文件 | 内容 |
|---|---|
| `src/meta.json` | 题目、封面信息、各部分源文件的顺序 |
| `src/abstract-cn.md`、`src/abstract-en.md`、`src/symbols.md` | 中英文摘要、注释表 |
| `src/ch1.md`—`src/ch6.md` | 第一章至第六章正文 |
| `src/references.json` | 参考文献条目（GB/T 7714），`status` 为“待核”的条目在 Word 中标黄 |
| `src/acknowledgements.md`、`src/achievements.md`、`src/appendix.md` | 致谢、在学期间成果、附录 |
| `build.mjs` | 排版脚本 |
| `figures/make_figures.py` | 生成图 1.1、图 3.1、图 3.3（`python3 figures/make_figures.py`，需要 Pillow） |
| `FORMAT.md` | 排版依据与逐项设置 |
| `build-report.md` | 每次构建自动生成：各章字数、待补标记数、引用与图表清单 |

## 怎样更新

本轮修订以作者于 2026-11-14 交回的 [Word 批注稿](thesis-draft.docx) 为底稿。文中有 12 条批注，均已核对正文位置。请先在 Word「审阅」中逐条查看原话和所指段落，将已落实的改动同步到相应章节源文件，再构建下一版。当前构建脚本会覆盖同名 Word，也不会带入批注。

1. 改 `src/` 下的源文件。章节的标题、层级以 [现行目录](../outline.md) 为准，不在这里调整。
2. 在本目录运行：

   ```sh
   npm install
   npm run build
   ```

3. 把源文件、`thesis-draft.docx` 和 `build-report.md` 一起提交。

源文件的写法：

- `#` 章，`##` 节，`###` 小节；空行分段。
- 引用写 `[@键]`，多条用分号：`[@A001;@CN]`。键必须在 `src/references.json` 里。编号按全文首次出现的顺序自动生成。
- 表：先写一行 `表：表3.1 标题`，下一行起接 Markdown 表格。表下的注写 `注：……`。
- 图：`图：图3.1 标题 | 图片相对路径`。路径缺省或文件不存在时排一个“图待插”的占位框。
- 待补内容用六角括号 `〔……〕`，Word 中自动标黄，构建报告会计数。
- `>` 开头的行和 `<!-- -->` 是编辑备注，不进 Word。

## 分工

Claude 写正文并维护本目录。Codex 交回实验结果时，在 #1 发回执并附数据路径，由 Claude 写入对应小节；Codex 也可以直接改 `src/` 后运行构建，但不要改动已写好的结论措辞。作者的修改意见可以直接批注在 Word 里，或在 #1 说明章节号。

## 文献待办

`src/references.json` 中有 19 条“待核”，多为缺页码、缺作者全名或来自记忆的经典文献（Osgood、Nagamachi）。2.1 节还需补 4—6 篇无人机构型与造型文献，仓库里已有全文的候选：

- UAV-U001：QI B, ZHAO S, SUN X, et al. Design of plant protection unmanned aerial vehicles: quantitative research and virtual simulation. Advanced Design Research, 2024。全文在 `reference-fulltexts-20261109` 分支 `fulltexts/UAV-U001.pdf`，可支持六旋植保案例。
- ID-A005：WANG Z 等，Embrace the era of drones…，Applied Sciences。全文在同一分支 `fulltexts/ID-A005.pdf`。分类目录里的作者与年份与 PDF 不一致，引用前以 PDF 为准。
- 无全文、需另取：李洒等《面向平飞姿态的四旋翼无人机机身造型设计》（机械设计，2025）；刘帅《从工业设计角度谈多旋翼无人机的设计》（2020）；高俊杰《无人机造型设计层次灰关联评价方法研究》；梁健《六旋翼无人机造型设计》。
