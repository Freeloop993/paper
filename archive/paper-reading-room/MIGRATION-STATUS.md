# 迁移范围与保密边界（2026-11-20）

源仓 `Freeloop993/paper-reading-room` 于 `cc122ae8757f175cde92484da194b568fcbb7a3a` 的文件总数：129。经逐文件 Git SHA 对照，目标仓 `main` 已有同字节文件 17 个（不一定同路径）。

| 分类 | 文件 | 处理 |
|---|---:|---|
| 公开补档 | 42 | 保留源内容的 Git blob SHA，在本目录归档。 |
| 暂留私有 | 87 | 未复制至公开仓，源仓不删除。 |
| 合计 | 129 | 全部进入 [逐文件对照表](FILE-INDEX.json)。 |

## 暂留私有的内容

1. **8 份早期爬取 ZIP（`datasets/early-crawl/01–08`）**：原仓说明其包含平台评论用户字段及商品原始记录；这些二进制档案未进行逐行脱敏审查，不自动公开。可在私有阅读库中访问。
2. **A8 盲测分发包和 68 张匿名图像**（`participants/a8-AI/`、`a8-H1.zip`、`a8-H2.zip`）：为避免在任务完成前公开独立评议材料，保留在私有库。
3. **研究者私钥/盲态真值/映射文件**：`researcher/s2/key.json`、`researcher/a8/PRIVATE-key.csv`、`researcher/a8/A8-researcher-restore.zip`、`researcher/a3/archive/analytic/gold-private.json` 均不公开。
4. **私有版目录导航**：源 `studies/20261117-offline/README.md`、`participants/README.md`、`researcher/README.md` 含私有领取入口，此处用公开版导航代替。

**这只是公开可用版本，不是整个私有仓的无差别镜像。** 后续如需将受限数据正式公开，应先核对平台/受试者数据、脱敏情况与实验盲态安排。原件保留在 [私有仓库](https://github.com/Freeloop993/paper-reading-room)。

## 校验方式

`FILE-INDEX.json` 每条包含 `source_path`、`bytes`、`git_blob_sha1`、`status`、`published_path` 与 `already_in_paper`。文件原样复制时，目标相同路径文件 Git SHA 与源 SHA 应一致。对已有同字节文件通过 blob SHA 去重，而不是用名称推测重复。主仓原有文件不删不覆盖。
