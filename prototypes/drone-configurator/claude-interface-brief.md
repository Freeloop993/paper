# Claude 接手五页签配置器

本页留存当时的界面简报。接手当前版本请先看[双机交接与研究依据](../../planning/workbench-handoff/README.md)。

**本轮交付是改进作者的配置器，让设计者能从任务出发选择参数、看到参数怎样改变顶视布局、核对将要发给模型的内容，并导出自己的方案。** 开发入口是 `prototypes/drone-configurator/src/App.tsx`。先打开同目录离线版，实际走一遍，再从这个程序改。11 月 17 日工单早先贴出的 C1 包属于另一套试作界面，已从当前入口撤下。

## 先明确设计者在做什么

主任务是日常随行航拍四旋翼。设计者可以提出“展开时，从正上方看显得紧凑”的意图，在保证四轴布局的同时探索机身轮廓、相机与机身如何整合、机臂怎样过渡到机身。**把任务交代清楚，把造型决定留给人。** 机身长宽可以选，具体曲面、相机安装和色材可以留白。A/B/C 是既往探索中的方向组合，不能充当机身分类依据。B2 是作者选出的深化个案。农业植保六旋翼用于可行性探测，观察药箱、喷洒部件与机架的整合；消费航拍评论的结论仅适用于有相应证据的任务。

在论文里，这段操作承接第 3 章的需求转译和参数定义，第 4 章记录设计者怎样产生、比较、修改和保留方案，第 5 章才用量测和盲评回答设计是否达标、两种工作方式各花多少时间。系统速度、造型质量以及“哪种比例看起来更紧凑”都是待检验的问题。[修订目录][outline] · [开题第 6–7 页][proposal] · [作者决定与任务清单][todo]

## 按这个顺序读 GitHub

| 顺序 | 阅读入口 | 读完要能回答 |
| --- | --- | --- |
| 1 | [配置器使用说明与离线包][ui]、[App.tsx][app]、[最初的需求][brief] | 机架、动力、机身、起落架、配件五页签如何联动？改一个值后，用户在哪里看见并导出结果？ |
| 2 | [目录][outline]、[研究方向清单的「作者最新决定」][todo]、[配置器与研究实施方案][plan] | 哪些功能服务于参数验证，哪些服务于设计者取舍？哪些仍在规划？涉及界面版本时，以恢复后的源码为准。 |
| 3 | [评论数据审查][crawl]、[公开证据卡][cards]、[旧库匹配复算][ragcounts]、[知识库代码][rag]和[服务入口][ragapi] | 评论来自谁、说的是哪种产品、支持哪种设计意图？私有旧库与公开证据卡能连到什么程度？ |
| 4 | [厂商规格及缺项][a1]、[手册图面量测][a2]、[布局开发位置表][a4] | 哪些值由厂商公布，哪些是图面量得，哪些仅是研究者选择的试验档？ |
| 5 | [参数状态][store]、[示意图代码][preview]、[提示词生成器][prompt]、[独立审查及验收项][review] | 每一项选择在图、文本和 JSON 中如何体现？默认文字有没有暗中替用户作决定？ |
| 6 | [E1 历史条件图实验][e1]、[B2 评价的原题与解释][b2]、[配置器研究方案的配对试验部分][plan] | 现有证据能回答什么？正式比较还要记录什么？ |

## 已核实的现状和对应的界面决定

**交互。** 恢复版能离线切换五页签，选择构型，调整机身尺寸，导出配置 JSON 与提示词；105 mm 的机身长度已经从操作到两种导出实测过。优化时优先用选项、色板、滑块和数值微调。自定义文字用于补充委托或说明某次修改。让用户在调参时就能看清预览、当前选择与最终文本。保留中途改主意、清除一个选择、把外形留给后续设计的空间。[源码入口][ui]

**需求与 RAG。** 7,443 条是跨品类去重文本，1,318 条所属商品标题范围含消费航拍机，228 条是保留的机体造型表述。后两者和旧 RAG 里的 5,614 个片段属于不同口径。旧片段有 3,603 个不同的非空评论 ID；旧 ID 与正式台账直接比对没有交集。归一化后有 109 条保留文本获得字符串匹配候选，商品与使用状态的对应仍需核实。当前主程序没有启用向量检索。首版可用公开证据卡实现离线“查看需求依据”，展示卡号、摘意、适用对象和限定，允许采纳、忽略或自定意图；没有合适卡就返回空。选中一条“小巧、方便携带”的依据，可以据此提出视觉紧凑的目标，具体毫米数须另找工程依据。把资料来源和采纳记录保存在导出中。[语料复核][crawl] · [匹配口径][ragcounts] · [公开证据卡][cards]

**工程参数。** A1 汇集 24 款机型的官方规格，含 14 款四旋和 10 款六旋；A2 已有 6 款手册图面量测，含 4 款四旋。区分整机展开外包络、机身主体宽度和电机中心距。W/L 表示顶视轴心水平跨度除以纵向跨度；d/D 表示桨径与登记轴距之比。新量测方案对四旋使用两条对角电机中心距的均值作 D，并另外记录最大两轴距；界面若以最大距缩放，需标明定义。机身宽/D 是要检验的另一项比例。W/L 的 0.70、1.00、1.30 是实验档位。先共用一组轴心数据驱动示意、夹角、点线条件图与 JSON，生成后的轴心则在实际回图上另量。[A1][a1] · [A2][a2] · [量测定义和限制][plan]

**设计表达。** 正式量测、评议采用展开正交顶视。点线图表达轴心和机架连接，旧双叶部件条件图另有实验用途，图类型、朝向和来源随导出保存。四旋主试验每轴一副双叶桨，桨叶数量与电机数量分开。航拍相机朝机头前方，正俯视可以被遮住；把镜片画在机背上是朝向错误。设计者应能明确指定或留空机鼻、臂根、分件、颜色、材料和表面处理。默认不附加护圈、黑灰配色或碳纤维。参考图用于约束布局时，避免用预绘机壳把外形也锁定。[部件与几何的研究边界][plan] · [旧部件条件图实验][e1]

**参考图和父图要能分辨。** 第一次按参数设计时，用点线图说明电机轴心和连接关系即可。设计者决定沿某张候选继续修订，才把它登记为父图，记录图号、机头端、这次改哪个部位、希望保留什么。读图时以该图登记的前向为准。回看时将父图与修改稿同尺度并排，分别判断目标部位是否改到、其余部位是否保住。[配置器研究方案][plan]

## 第一轮改什么，怎么验

| 操作 | 当前源码中可复核的问题 | 从正常界面验收 |
| --- | --- | --- |
| 在同一设计轴距切换 True X、Wide X，再选 Deadcat | True X 与 Wide X 的轴心同为正方形，变化主要是大小；Deadcat 的桨位列表仅返回三点 | 显示四个可辨轴心；宽 X 的 W/L 与真 X 有区别；图、角度和导出坐标能互相复算。采用的几何规则写明出处，缺少依据的档位标成设计者输入。 |
| 只把臂宽由 10 mm 改为 20 mm | 当前最终文本没有使用可调的臂宽字段；部分语句自行添加护圈、黑灰色或碳纹 | 用户能指出改了哪一句。JSON 与文字同值，未选项不会随画像自动加入；默认值、用户选择、任务固定和自由项可区分。 |
| 从一张证据卡提出视觉紧凑目标，随后撤销 | 已有检索源码；恢复版的模型服务停用 | 查看、采纳、撤销、无匹配均可操作。卡号与选择进入配置，未经采用的建议不改参数。界面标清离线证据来源。 |
| 跨页签完成一次试配，调整后重新导出 | 五页签和离线导出已经可用，是本轮的回归基线 | 交付可打开的离线包、桌面和窄屏实际截图，以及同一次操作的配置、提示词和条件图。示例注明界面测试。模型服务保持停用。 |

**后续对照怎样接。** 计划先由作者在两个条件下各试一次，再由 3 位外部设计者每人完成结构化配置与直接提示词两种方式；独立评议目标为 10 人。两种方式匹配任务难度、后端、机会和计时规则。记录主动操作、转交与模型等待，绑定每次请求、原图、首次技术达标图和最终锁稿图。终稿的视觉紧凑感、协调性由盲评另判。首次技术达标的用时和最终设计的语义评价须分别报告。以上是试验安排；浏览器模拟和历史控制分支的命中率均不能替代这套系统的真人比较。[作者决定][todo] · [场次设计与计时][plan]

请把首轮改动交为一个 PR，附改动位置、上表的实测结果和遗留项。后续生成、正式评议及论文改稿按各自任务登记。

[outline]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/planning/outline-revised.docx
[proposal]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/planning/proposal-original.pdf
[todo]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/planning/2026-11-17-direction-and-todo.md
[ui]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/prototypes/drone-configurator/README.md
[app]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/prototypes/drone-configurator/src/App.tsx
[brief]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/prototypes/drone-configurator/original-design-brief.md
[plan]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/planning/configurator-research/README.md
[crawl]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/evidence/semantic-cards/early-crawl/claude-review-20261117/README.md
[cards]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/evidence/semantic-cards/cards.csv
[ragcounts]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/planning/configurator-research/rag-source-counts.json
[rag]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/prototypes/drone-configurator/rag_knowledge_base.py
[ragapi]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/prototypes/drone-configurator/rag_api_server.py
[a1]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/evidence/20261117-config-review/A1-extension/a1-all-models.csv
[a2]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/evidence/20261117-config-review/A2-extension/README.md
[a4]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/evidence/20261117-a1-a4-c1/a4-design.md
[store]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/prototypes/drone-configurator/src/store/droneStore.ts
[preview]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/prototypes/drone-configurator/src/components/DevPreview/InterfacePreview.tsx
[prompt]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/prototypes/drone-configurator/src/components/DevPreview/PromptGenerator.tsx
[review]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/planning/configurator-research/independent-review.md
[e1]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/evidence/e1-open-20261112/README.md
[b2]: https://github.com/Freeloop993/paper/blob/b69884129086083df995b903153097533b8404ae/evidence/e5-individual-reviewed/compactness-check.md
