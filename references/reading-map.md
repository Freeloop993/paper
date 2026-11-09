# 阶段阅读地图

## 文献地图 R01—R14
以下是原研究地图中各条的版本、用途、页码与边界，不是把14篇统称为本轮全文通读，也不是本次向远端传了14篇PDF。精确引用前核原文；无法访问的，先标“待核”。补记：R02于11/9核本地PDF 10、12、13、20、21页相关片段；R08于11/9核作者版§4.2—4.4及§7.5—7.6有关段落。本轮新增[14篇原文版本交叉表](catalogs/priority-fulltexts.md)，其中 R14 已核原 PDF 身份，方法与结果待审读。
#### R01｜最直接近邻：需求到无人机生成

Chen等，Data–driven product form design integrating affective and functional requirements via TGRA–QFD and Stable Diffusion，2026；DOI 10.1299/jamdsm.2026jamdsm0008。身份与2026-03-16发布信息已由J-STAGE页面核实；本地原PDF相关页已定向核读，不称本轮全文通读。

节点P0/P1：读PDF1、13—14、18页的需求转译、图像筛选、评价与局限，形成“已有工作—我们还需验证什么”对照行。可支持需求/功能/感性到提示已有无人机先例；不能支持确定几何控制或飞行性能。正式写2.6/3.2时再核方法全链及样本/筛选分母。

原文：https://www.jstage.jst.go.jp/article/jamdsm/20/1/20_2026jamdsm0008/_article

#### R02｜可编辑意图与局部保持

GenAlign: Visual knowledge graphs as interactive substrates for property-aligned generative design；DOI 10.1016/j.aei.2026.105165。已有本地原PDF；标2026接受、期刊卷期2027年1月，首次在线日期未独立确认；不按卷期误称未来不可用，也不把2027卷期改成2026。

节点P3/P5：读PDF10、12—13、20—21页，提取部位—属性绑定、同后端比较、参与者任务和漂移指标局限。可借意图可检查/可修订的机制；图谱继承不等于生成图像保持，家具/室内结果不直接等于无人机有效。不能以使用类似表示本身宣称独创。

出版记录：https://www.sciencedirect.com/science/article/pii/S1474034626008578

#### R03｜多模态输入究竟如何进入模型

DesignPrompt，DIS 2024；DOI 10.1145/3643834.3661588。本地会议版式PDF已核方法相关段；P2/P3读PDF7—10页。重点区分输入图转成语义标签与空间条件控制，学习等信息/同工具基线、任务顺序和探索/操控的分开评价。不能拿该论文证明Canny理解彩色点或所有多模态输入都更好。

来源：https://doi.org/10.1145/3643834.3661588

#### R04｜强基线、设计美学与选优分母

AutoSpark，UIST 2024；DOI 10.1145/3654777.3676337。本地19页版本已定向核读；P2/P3/P5/P8读PDF12—13、15—17页的任务、工具、消费者/专家、结果与限制。

借鉴双方同等级工具、操作者与评图者分开、审美/新颖性/情感表达分别报告；评价的是参与者选出的最终图，不能当全部生成质量。原文提到的B.3完整量表不在本地文件中，因此本项目锚点标研究者自编，不冒称原量表复刻。

来源：https://doi.org/10.1145/3654777.3676337

#### R05｜Prompt脚手架与过度限定风险

DesignWeaver: Dimensional Scaffolding for Text-to-Image Product Design，CHI 2025关联DOI 10.1145/3706598.3714211；所读为arXiv:2502.09867v2。P1/P2/P3读PDF10—11、15页，或HTML第5节、6.2、6.3.3及局限；当前已定向核读、未称全文通读。

双方共享需求/人物与参考，评新颖性不等于意图契合；过多标签会妨碍精确改变。保留其样本/排除叙述的不一致，不能照抄不清的分母。用于解释为何不以长prompt和细节堆叠替代设计意图。

作者版本：https://arxiv.org/html/2502.09867v2

#### R06｜工业设计的整体、部件与过渡

《产品外观解构与情感设计变量识别方法研究》，2017；DOI 10.13837/j.issn.1006-8309.2017.03.0013。P1/P4/P6读PDF1—2、6页（印刷67、68、72）；已有定向原页核读。

提取主特征、附加特征、过渡特征、相关特征与先整体后局部的分析方法。用于建立体量、臂身关系和细节字典；SUV语义和性别结果不搬成无人机普适映射。不是证明任何一张图美观的外部背书。

来源：https://doi.org/10.13837/j.issn.1006-8309.2017.03.0013

#### R07｜语义感知与真实使用性能的边界

《可供性与产品语义设计理论的交集与边界研究》，2022；DOI 10.19798/j.cnki.2096-6946.2022.04.003。P1/P6读PDF4、6—7页（印刷22、24—25）；已有定向核读。

用于区分看起来防护、便携、易用与实际行动条件。交付每份简报的“图像可评价/需实物验证”清单；不能用生成护罩证明安全，也不以理论论文替代用户测试。

来源：https://doi.org/10.19798/j.cnki.2096-6946.2022.04.003

#### R08｜当前协同研究的质量、多样性与人的主导权

Partnering with Generative AI: Experimental Evaluation of Human-Led and Model-Led Interaction in Human-AI Co-Creation，CHI 2026；DOI 10.1145/3772318.3791185；作者版arXiv:2510.23324v2，2026-02-09。已核身份、摘要/导论和7.5—7.6；完整方法尚需在P3核读。

P3/P5必读第4.1—4.4、5及7.5—7.6，回答质量、多样性、归属/负担怎样区分，人的主导权如何观察。文本任务与一般参与者限制了向专业无人机设计的外推。不能把“模型主导提升质量”当本研究应减少人参与的理由。

作者版本：https://arxiv.org/html/2510.23324v2

#### R09｜条件生成与筛选偏差

A Product’s Kansei Appearance Design Method Based on Conditional-Controlled AI Image Generation，2024；DOI 10.3390/su16208837。P4/P8读PDF17—21、23页；已有定向核读。关注160张中筛选20张及后续单案比较的口径：可借设计流程，不能用筛后好图证明全批稳定性或独立单因素因果。

来源：https://doi.org/10.3390/su16208837

#### R10｜涂画/批注编辑与计时边界

Enhancing Generative AI Image Refinement with Scribbles and Annotations: A Comparative Study of Multimodal Prompts；所读arXiv:2602.08830v1、标注IUI 2026接收的预印本。P5/P8读PDF7—9、14页；已有定向核读。

重点看输入先被多模态模型解释、到提交按钮的计时以及未做客观输出质量评价。我们因此需另计生成等待、端到端时间和独立成图质量；不从这篇推定本地Canny有效。

作者版本：https://arxiv.org/abs/2602.08830v1

#### R11｜概念共创体验不等于独立质量证据

AIdeation: Designing a Human-AI Collaborative Ideation System for Concept Designers；所读arXiv:2502.14747v1、标注CHI 2025接收。P5/P8读PDF12—15、20页；已有定向核读。核外部评价缺口、效率题忽略生成时间等边界；不把自评中性或不显著当方法等效。

作者版本：https://arxiv.org/abs/2502.14747v1

#### R12｜无人机设计深化与完整表达

Using FCE and FAHP to Explore the Multirotor Drone Appearance，DRS 2020；DOI 10.21606/drs.2020.164。P6/P7读PDF9、11、15—16页；文件含封面，PDF15对应论文后部设计发展，不套别版页码。已有定向核读和指定页视觉检查。

借部件/候选形态组织、设计发展及三视图/渲染表达；旧偏好样本和排名不能成为当前用户真值，不能据此证明安全或最优造型。不是建议本研究机械复制FCE/FAHP算分。

来源：https://doi.org/10.21606/drs.2020.164

#### R13｜可选局部深化与版本组织，不扩新系统

GenPara，CHI 2025；DOI 10.1145/3706598.3713502。既有库的局部参数/版本组织相关页定位为PDF1、5、12、20；P6真正需要时先按本地原件版本复核，未复核不引用精确结论。3D参数化场景不能直接证明二维图像结构保持；不为补此文另开发3D平台。

来源：https://doi.org/10.1145/3706598.3713502

#### R14｜有条件补读，不阻塞现有结果评价

When Designers Sweat: Behavioral Traces of GenAI Co-Creation，CHI 2026；DOI 10.1145/3772318.3791776。2026-11-09 核到 17 页本地原 PDF，第一页题名、作者与 DOI 相符，可从[原件表](catalogs/priority-fulltexts.md)读取；方法及结果尚待定向核读。若P3缺少专业设计师过程指标，可用一个限定时段获取并核方法/操作定义/局限；拿不到则保留候选，不凭摘要写正文结论。

作者仓储：https://air.iuav.it/handle/11578/377009

本文提供书目与选页用途而非PDF再分发。工作稿中的编号与此路线编号可能不同，请用题名、DOI和版本核对，不按序号猜。
