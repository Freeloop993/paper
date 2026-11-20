# Claude 接手说明

找文献从[文献库](literature/README.md)进：一张目录、一张关系图、按主题放的原件。每做一环先看[关系图第四节](literature/map.md#四按论证链每一环依据哪些文献)的依据文献；目录里标“未逐页核读”的，引用具体结论前先核原页。研究全貌见[总体研究蓝图](planning/research-panorama/README.md)。引用实验数据和图之前先看[哪些数据能进论文](evidence/usable-for-writing.md)：只从“可以进正文”一节取；给人看的图要先按[评议用图标准](experiments/s5-compactness-pilot/stimulus-review.md)审过。

**每一步开工前先对蓝图**（作者 2026-11-19 定）：回到蓝图和[登记任务表](planning/2026-11-17-direction-and-todo.md)，写明这一步对应哪一环、对象范围、人数、要对照的参数和交到哪一节，再动手；做完按同一张表报告到了哪、还差多少。范围只能由作者收窄。格式见[进度页第八节](planning/research-panorama/progress-20261119.md#八每一步开工前的对照)。

工作台需要读语义、论文或构型依据时，使用[研究资料库与 JSON 接口](planning/research-library/README.md)。[方法框架](planning/research-library/method.md)给出设计者确认、证据留存和回图验证的先后关系。

**接手工作台改版，请从[双机交接](planning/workbench-handoff/README.md)开始。** 当前源码、模型入口、界面研究、可核证据和离线包已汇入默认分支。作者看过现有界面，仍希望重新设计；从当前实现建分支，保留可验证的设计决定、候选来源和回退过程。先做系统与实验，再据真实结果写全文。下面的记录保留当时任务的日期与举证范围。

## 11 月 12 至 14 日历史分工与工单记录

下列写作分工和工单回执要求属于当时的任务。本次交付以新版工作台、操作走查及作者试用为准。

11 月 14 日实测已补齐：[Qwen 十二张＋S4 修订两张的原图、实际请求、逐图读数](evidence/qwen-shape-s4-20261114/README.md)。S4 仅见顶部 0/2 → 0/2，E3 仍为 0/9。[四篇同校硕士论文全文、结构和页码](references/peer-theses.md)。

[先核对论文原件、同专业四篇结构对照及其写作用途](planning/claude-materials.md)。其中列出全文分支、缺全文的条目及原件使用范围。

**2026-11-12 六章执行入口**　[打开24项任务、逐节对照、思维导图及验收条件](docs/execution-playbook.md)。Claude 从 T01–03 和 T23 接续。给各章写入可核查的主张与出处；原工单 #1 留写作和裁定回执。


请先读 [README](README.md)、[STATUS](STATUS.md) 和 [协作规则](CONTRIBUTING.md)。你的主责是全局、章节、文献证据、任务排序与写作；Codex负责实际技术执行和数据分析。不要另行启动同组生成。作者仍对设计目标、研究范围、经费与参与者安排作决定。

**首次接入验证：**打开 [C01](https://github.com/Freeloop993/paper/issues/1)，若能读写，评论“Claude 已接手 C01”并附实际读取的 commit 与首项交付；无写权限请向作者报告，勿称已同步。不要代另一位助手回执。已验证的四旋研究方向不再询问。先在现行目录中形成证据矩阵并交一个真正可用的修订片段，不以重写总计划代替论文写作。
