# 私有阅读库 → paper：实际迁移结果（2026-11-20）

原始库：`Freeloop993/paper-reading-room`，main 提交 `cc122ae8757f175cde92484da194b568fcbb7a3a`。原始库共 **129 个文件**，原始文件字节数合计 **136,283,243**。

| 结果 | 文件数 | 说明 |
|---|---:|---|
| 已在前一轮复制 | 42 | 四篇硕士论文及 S2/A3 等可公开材料 |
| 本轮新增 | 84 | 原始 ZIP 01–07、A8 匿名图与研究者数据、研究者键和旧原始 README |
| 尚未成功复制 | 3 | 见下方三个二进制包 |
| **合计** | **129** | [每个文件的 SHA、大小和目的位置](FILE-INDEX.json) |

## 仍缺少 3 个原始 ZIP（共 43,186,361 字节）

| 文件 | 原始字节数 | 源文件 |
|---|---:|---|
| `datasets/early-crawl/08-semantic-analysis.zip` | 13,876,021 | [源仓](https://github.com/Freeloop993/paper-reading-room/blob/main/datasets/early-crawl/08-semantic-analysis.zip) |
| `studies/20261117-offline/participants/a8-H1.zip` | 14,655,170 | [源仓](https://github.com/Freeloop993/paper-reading-room/blob/main/studies/20261117-offline/participants/a8-H1.zip) |
| `studies/20261117-offline/participants/a8-H2.zip` | 14,655,170 | [源仓](https://github.com/Freeloop993/paper-reading-room/blob/main/studies/20261117-offline/participants/a8-H2.zip) |

**阻塞原因**：GitHub 拒绝在目标仓库直接引用这三个尚未存在的对象（422 `not a valid blob`）。现有 GitHub 连接只能取得这些 ZIP 的哈希和大小，无法读取大体积二进制正文，因此不能声称它们已经上传。源仓三份仍然完好存在，主库没有创建同名空文件或占位 ZIP。

## 校验与覆盖策略

- 已发布的 126 个源文件均使用源 Git SHA，避免修改正文。
- 已存在的 `paper` 原始文件不删除、不覆盖。原始 `README.md` 冲突时副本改名 `SOURCE-README.md`。
- 研究者对应键、平台采集包和盲测材料按作者本次要求进入公开库；不是脱敏副本。公开提交会永久出现在 Git 历史中。
- 三个未完成项以 `pending_binary_transfer` 标记，避免误报 129/129。


## 2026-11-20 补传

上表所列三个 ZIP 已按源仓的 Git blob SHA 原样补传。原始文件、大小与内容摘要均已核对。FILE-INDEX.json 已更新为 129 项。
