# 多旋翼造型研究资料库

**研究者从[方法框架与四个研究问题](method.md)进入；改工作台从[检索包示例](qa/generation/folded-bag.packet.json)进入。** 库把用户表达、文献方法、构型资料及设计过程放在同一套查询入口中。每次取用的材料带有来源、定位、适用范围和证据状态。

## 库里有什么

| 材料 | 已接入的范围 | 怎样使用 |
|---|---|---|
| 文献目录与引文 | 790 个导航条目，连接 1,242 条历史来源记录及 133 行会话、初筛与两稿对账关系；73 张文献证据卡可以按题名、方法和引用位置查找 | [790 条阅读导航](literature/relevance-index.csv)和[两份稿件的编号对应](literature/manuscript-crosswalk.csv)。同一作品存在多来源、多个旧组或多张卡，另有内部条目。阅读方向由题名规则初筛，引用须回到版本和原页 |
| 语义资料 | 公共部分含 36 张短引、35 个匿名来源、17 个设计话题。私有部分已在研究者电脑上按合并记录、正式文本簇、来源池、旧 RAG 片段分别建库 | [来源与覆盖](corpus/README.md)。7,443 个正式去重簇中，1,318 个属于消费航拍机标题范围，228 个保留。历史 RAG 的 5,614 个片段来自另一套编号。两套分别查，重合按文本和来源另记 |
| 构型与设计过程 | 97 张构型卡、9 张设计记录卡和 4 张协议卡。其中有 30 款产品的 64 条状态记录，13 套手册图面坐标和两张已知条件的回图试填 | [来源、度量口径与限制](design/README.md) · [匿名判读和四旋作者预试](design/pilot.md)。相同手册或同一作业可能被不同用途的卡引用，计算独立来源时应合并 |

提交中包含已建好的 [SQLite 资料库](public.sqlite3) 和建库程序。1,009 个条目均有词项索引和 BGE 向量。普通查找用 SQLite 的 BM25 和中文双字切分。混合查找另对向量作余弦排序，用倒数排名融合两组结果。开发题中混合排序未取得优于词项检索的结果，因此默认使用词项检索。[排序走查及错误明细](qa/README.md) · [SQLite FTS5](https://sqlite.org/fts5.html) · [BAAI 编码器](https://huggingface.co/BAAI/bge-small-zh-v1.5)

## 第二台电脑怎样打开

克隆或更新仓库后，进入 `planning/research-library`。Python 3.10+ 支持公共查询。查公开语义卡和运行完整校验还需要 Node.js 22+。普通查询不需要模型账号或下载模型。已有稀疏克隆的电脑可先在仓库根目录运行以下命令，补充本轮材料。

```sh
git sparse-checkout add planning/research-library planning/advisor-20261118 planning/workbench-handoff evidence/semantic-cards prototypes/drone-configurator/src/data/history
cd planning/research-library
python verify_library.py
python library.py stats
python library.py trace A09
python library.py search "局部修改后怎样检查其他部位保持" --route method
python library.py search "中性任务" --route protocol --layout flat_hex
python library.py packet "折叠后装进日用背包，有什么依据？" --route semantic --task consumer_camera --layout quad --topic bag_fit --state folded --out bag-packet.json
```

按 `trace W0040` 查找 GenAlign 在修订稿中的编号，用 `trace A08` 查看航拍需求论文的来源和页码。开放检索可选 `catalog`、`method`、`form`、`case`、`protocol`；默认搜索全库。目录线索、待核和背景文献可用于找资料，方法起草只接受相应类别的已审核材料。库中已有坐标和公开来源凭据；论文原件的下载与摘要核验另见[全文恢复入口](../workbench-handoff/literature/README.md)。

对本轮另行打开的 18 份材料，可用 `python literature/restore_editions.py --id KB-L03` 按版本取回一篇，或不带参数恢复整表。文件保存在本机，逐份比对[版本摘要及实际阅读页](literature/edition-checks.csv)。

## Claude 接入设计任务时

1. 从用户操作中记录任务、构型、部件、话题和观察状态。自然语言与所选字段明显冲突时返回 `clarify`。若对应来源不覆盖该条件，返回 `abstain`。公开语义路由对给定字段使用已核过的卡号映射，模型输出不能自行覆盖其适用限制。
2. 用 `library.py packet` 返回的 JSON 作为同次检索的记录。部件视图可展示一条依据，把反例、来源与范围放在详情里。证据只提出可查材料；用户采纳、改写或拒绝后，再将该动作、检索包摘要及规格版本连入设计记录。`parameter_changes` 初始为空。
3. 开放式研究问题默认返回 `review_candidates` 或 `abstain`。研究者核对候选原页后，在**同一查询**上用 `--select 卡号` 选定材料，可以重复选取。进入 `retrieve` 代表可起草；模型草稿仍需核实。选择了同机型的整机尺寸，并不能回答该机型的外壳壁厚。
4. 自动草稿从已保存的包生成；系统重新校验路由、证据和摘要。编号缺失或无效记为 `invalid_citation`；编号有效记为待核其是否支持陈述。原始材料和限制始终可以直接阅读。两次真实的小模型运行及失败回执见[生成诊断](qa/generation/README.md)。

## 可选的模型和重建

可直接交给 Claude 的最小接口是上述 CLI 与 JSON。以下功能供研究者复现语义排序和本地生成时按需启用，已在 Python 3.11 的 CPU 环境运行。模型分别约 96 MB 和 988 MB，下载程序逐文件验证摘要。权重各保存在本机的 `.cache/`。

```sh
python -m pip install -r requirements-ml.txt
python dense_model.py
python library.py search "怎样保留不需要修改的部件" --route method --ranker hybrid
python generate.py --fetch-model
python generate.py bag-packet.json --out bag-draft.json
```

从公开登记表重建时，可用 `python library.py --db rebuilt.sqlite3 build` 建单独的词项库；加 `--dense` 生成向量。私有原评论另用[导入工具与复算说明](corpus/README.md)在有权使用原件的设备上恢复。另一台电脑克隆公开库即可使用脱敏短引、工程外观来源和论文卡。
