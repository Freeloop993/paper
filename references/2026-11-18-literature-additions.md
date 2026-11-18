# 补充文献检索结果（2026-11-18）

> **Claude 抽查记录（2026-11-18）。** 本文件由一个不了解此前讨论的子代理按 Crossref、arXiv 与出版方页面逐条核对后写成。我另用 Crossref 抽查了 6 条关键文献（T1-1、T4-1、T6-2、T7-7、T8-3、T2-6），作者、刊名、年份、题名全部相符。T6-2 在 Crossref 登记的在线发表年为 2017，纸本为 2018 年 35(3)，著录时按纸本卷期。
>
> **对论文定位最重要的三处**（已写入[总体框架](../planning/2026-11-18-framework.md) 2.2 节）：
> 1. AutoGen-Insight（T1-1）与 Parametric-ControlNet（T4-1）已经做了“评论→参数→生成”和“参数→可控生成＋依从量测”，本文不能把这两件事本身当作创新。
> 2. LayoutBench（T2-6）检验了分布外布局的控制效果，Quan（T8-1）给出四旋 d/D 的工程范围约 0.59—0.67：这两条直接支撑“编辑通路的偏差朝向真实产品比例”的解释与档位重定。
> 3. Mugge 等（T6-2）把“紧凑”列为产品外观感知的五个维度之一，支撑把“紧凑”作为首要语义目标。
>
> 目录中的“ParamDrone 参数驱动的四旋翼无人机智能设计系统”（C21）**经作者 11/18 确认由 Codex 撰写，不是文献，已从建议引用中撤下**（#3 第 15 题）。


论文：《人智协同驱动的多旋翼无人机造型参数化可控生成方法研究》

## 说明

- **去重范围**：已对照 `manuscript/thesis/src/references.json`（47 条）以及 `references/catalogs/` 下的 `reviewed-100.csv`、`industrial-design-100.csv`、`additions.csv`、`archive-references.csv`、`feishu-100.csv`。下面各主题表只列**两处都没有**的文献。已在目录中但尚未引用的文献单独列在末节。
- **核实方式代码**（“核实情况”列使用）：
  - **CR**：打开 `https://api.crossref.org/works/{DOI}`（或 Crossref 题名检索返回的同一记录），核对作者、题名、刊名/会议、年、卷期、页码或文章号。
  - **AX**：打开 `http://export.arxiv.org/api/query?id_list={编号}`，核对作者、题名、提交日期和作者注明的发表信息。
  - **PUB**：打开出版方或会议官网页面（URL 写在单元格里）。
  - **ABS**：通过 Crossref 或 Semantic Scholar 读到作者摘要，用来核对“与本文的关系”一列的内容表述。
- **章节号**：检索者不了解实际目录，表中“第几章”是按题意推定的。实际对应：第2章相关研究；第3章方法（含评价协议）；第4章四旋设计应用；第5章验证（布局、造型、修订、评议、E4 协同、六旋可行性）。
- **著录格式**：按 GB/T 7714-2015 著录，作者超过 3 人写“et al.”或“等”。作者姓名写法与现有 references.json 一致。

---

## 主题1　生成式AI用于产品造型（需求、评论或感性驱动）

| 编号 | 文献（GB/T 7714） | DOI/URL | 核实情况 | 与本文的关系 | 优先级 |
|---|---|---|---|---|---|
| T1-1 | WANG L, CHEN C H, CHANG D. AutoGen-Insight: translating consumer reviews into probabilistic visual design parameters for generative electric vehicle concept generation[J]. International Journal of AI for Materials and Design, 2026, 3(2): 026190015. DOI: 10.36922/IJAMD026190015. | https://doi.org/10.36922/IJAMD026190015 | 已核实：CR；PUB https://accscience.com/journal/IJAMD/3/2/10.36922/IJAMD026190015 （方法见摘要）。该刊 2026 年为第 3 卷，属新刊，宜作为“相近工作”引用，不宜作为权威依据。 | 流程是“评论→人物画像→比例、造型等概率参数向量→参数化提示词→扩散生成”，并与直接、关键词、LLM 提示基线比较。这是与本文“用户语言→可编辑规格→生成”最接近的新工作，第2章对比，第3章说明差异。 | 必引 |
| T1-2 | ZHOU M, ZHU H, CAI C, et al. Stakeholder-informed Kansei modeling for generative product design in online retail[J]. Displays, 2026, 94: 103503. DOI: 10.1016/j.displa.2026.103503. | https://doi.org/10.1016/j.displa.2026.103503 | 部分核实：书目已用 CR 核对。出版方页面返回 403，方法内容（评论语义特征与权重→造型特征→LoRA 扩散，VR 眼镜案例）只来自检索摘要片段，未读原页。 | 与本文同期、同属“评论驱动感性建模＋扩散生成”的工作，用于第2章说明同类工作多停留在文本或 LoRA 层面。 | 建议 |
| T1-3 | 路鹏, 吴凡, 唐建. 基于人工智能生成内容的产品造型设计与评价方法[J]. 图学学报, 2024, 45(6): 1277-1288. DOI: 10.11996/JG.j.2095-302X.2024061277. | https://search.napstic.cn/literature/periodical/010gctxxb202406015 | 部分核实：作者、卷期、页码、DOI 取自 napstic 书目页。doi.org 对该 DOI 返回“未登记”（404），引用前须在知网核对 DOI。 | 流程为 ChatGPT 归纳感性需求→Midjourney 参考库→感性问卷与 GRA/AHP 择优→Rhino 优化→SD 渲染。可作为国内“文本驱动、事后筛选”路线的对照（第2章）。 | 建议 |
| T1-4 | SAADI J I, YANG M C. Generative design: reframing the role of the designer in early-stage design process[J]. Journal of Mechanical Design, 2023, 145(4): 041411. DOI: 10.1115/1.4056799. | https://doi.org/10.1115/1.4056799 | 已核实：CR | 实证说明生成式设计工具使设计者转向问题定义、评估与筛选。支撑本文设计者“保留、回退、手工收尾”的角色定位（第1、5章）。 | 建议 |

## 主题2　扩散模型的空间、结构控制与几何依从评估

| 编号 | 文献（GB/T 7714） | DOI/URL | 核实情况 | 与本文的关系 | 优先级 |
|---|---|---|---|---|---|
| T2-1 | WU C, LI J, ZHOU J, et al. Qwen-Image technical report[EB/OL]. arXiv:2508.02324, 2025. https://arxiv.org/abs/2508.02324. | https://arxiv.org/abs/2508.02324 | 已核实：AX（作者 39 人） | 本文所用模型族的一手技术报告，补足现引的模型卡（N01、N06），用于第3章模型说明。 | 必引 |
| T2-2 | LI Y, LIU H, WU Q, et al. GLIGEN: open-set grounded text-to-image generation[C]//2023 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR). Piscataway: IEEE, 2023: 22511-22521. DOI: 10.1109/CVPR52729.2023.02156. | https://doi.org/10.1109/CVPR52729.2023.02156 | 已核实：CR | 以框、关键点作接地条件的位置控制代表。第2章用来对照本文以整幅部件图作条件。 | 建议 |
| T2-3 | YE H, ZHANG J, LIU S, et al. IP-Adapter: text compatible image prompt adapter for text-to-image diffusion models[EB/OL]. arXiv:2308.06721, 2023. https://arxiv.org/abs/2308.06721. | https://arxiv.org/abs/2308.06721 | 已核实：AX（仅预印本，未见正式发表信息） | 图像提示（参考图）条件的代表方法。第2、3章用来区分“参考图作风格/内容提示”与本文“原生参考图编辑保持构型”。 | 建议 |
| T2-4 | HUANG K, DUAN C, SUN K, et al. T2I-CompBench++: an enhanced and comprehensive benchmark for compositional text-to-image generation[J]. IEEE Transactions on Pattern Analysis and Machine Intelligence, 2025, 47(5): 3563-3579. DOI: 10.1109/TPAMI.2025.3531907. | https://doi.org/10.1109/TPAMI.2025.3531907 | 已核实：CR；AX 2307.06350v3 注明为期刊版 | 把属性绑定、2D/3D 空间关系、数量等分维评测。支撑本文分项报告，不合成单一总分（第4章）。 | 建议 |
| T2-5 | BINYAMIN L, TEWEL Y, SEGEV H, et al. Make it count: text-to-image generation with an accurate number of objects[C]//2025 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR). Piscataway: IEEE, 2025: 13242-13251. DOI: 10.1109/CVPR52734.2025.01236. | https://doi.org/10.1109/CVPR52734.2025.01236 | 已核实：CR | 说明纯文本条件难以保证对象数量。支撑旋翼数、臂数由条件图规定、不交给文字（第3章）。 | 建议 |
| T2-6 | CHO J, LI L, YANG Z, et al. Diagnostic benchmark and iterative inpainting for layout-guided image generation[C]//2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops (CVPRW). Piscataway: IEEE, 2024: 5280-5289. DOI: 10.1109/CVPRW63382.2024.00537. | https://doi.org/10.1109/CVPRW63382.2024.00537 | 已核实：CR；AX 2304.06671 | LayoutBench 按数量、位置、尺寸、形状四类测布局控制，并检验分布外布局。支撑对非常规比例档位单独报告依从率（第4章）。 | 建议 |
| T2-7 | REGENWETTER L, SRIVASTAVA A, GUTFREUND D, et al. Beyond statistical similarity: rethinking metrics for deep generative models in engineering design[J]. Computer-Aided Design, 2023, 165: 103609. DOI: 10.1016/j.cad.2023.103609. | https://doi.org/10.1016/j.cad.2023.103609 | 已核实：CR | 主张工程设计中的生成应评约束满足、目标达成与新颖性，不能只看分布相似。支撑本文“几何量测＋盲评”双轨评价（第4章）。 | 必引 |

## 主题3　指令式、掩码式编辑，以及“编辑达成”与“非编辑区保持”的分开评价

| 编号 | 文献（GB/T 7714） | DOI/URL | 核实情况 | 与本文的关系 | 优先级 |
|---|---|---|---|---|---|
| T3-1 | JU X, ZENG A, BIAN Y, et al. PnP inversion: boosting diffusion-based editing with 3 lines of code[C]//The Twelfth International Conference on Learning Representations (ICLR 2024). Vienna, 2024. https://proceedings.iclr.cc/paper_files/paper/2024/hash/661caac7729aa7d8c6b8ac0d39ccbc6a-Abstract-Conference.html. | 同左；arXiv:2310.01506（arXiv 版题名为“Direct Inversion…”） | 已核实：PUB（ICLR 论文集页）；评价指标据 https://arxiv.org/html/2310.01506v2 核对 | PIE-Bench（700 图，10 类编辑）把结构距离、掩码外背景保持（PSNR、LPIPS、MSE、SSIM）和整图/编辑区 CLIP 相似度分开报告。这是本文“目标达成 / 非目标保持”分评最直接的方法先例（第4章）。 | 必引 |
| T3-2 | WANG S, SAHARIA C, MONTGOMERY C, et al. Imagen Editor and EditBench: advancing and evaluating text-guided image inpainting[C]//2023 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR). Piscataway: IEEE, 2023: 18359-18369. DOI: 10.1109/CVPR52729.2023.01761. | https://doi.org/10.1109/CVPR52729.2023.01761 | 已核实：CR | 掩码式文本引导修补的基准，按对象、属性、数量分项人评。作为掩码编辑路线的评价参照（第2、4章）。 | 建议 |
| T3-3 | HERTZ A, MOKADY R, TENENBAUM J, et al. Prompt-to-prompt image editing with cross-attention control[C]//The Eleventh International Conference on Learning Representations (ICLR 2023). 2023. https://arxiv.org/abs/2208.01626. | https://mlanthology.org/iclr/2023/hertz2023iclr-prompttoprompt/ | 已核实：PUB（mlanthology ICLR 2023 条目）；AX | 以交叉注意力控制实现“只改提示词局部、其余结构不变”。可用来解释编辑为何会牵动非目标区（第2章）。 | 建议 |
| T3-4 | KU M, LI T, ZHANG K, et al. ImagenHub: standardizing the evaluation of conditional image generation models[C]//The Twelfth International Conference on Learning Representations (ICLR 2024). 2024. https://arxiv.org/abs/2310.01596. | https://mlanthology.org/iclr/2024/ku2024iclr-imagenhub/ | 已核实：PUB（mlanthology）；AX | 统一条件生成与编辑的人评协议：语义一致与感知质量分项评分，并报告评分者一致性。可借鉴为盲评量表和信度报告格式（第4章）。 | 建议 |
| T3-5 | BLACK FOREST LABS, BATIFOL S, BLATTMANN A, et al. FLUX.1 Kontext: flow matching for in-context image generation and editing in latent space[EB/OL]. arXiv:2506.15742, 2025. https://arxiv.org/abs/2506.15742. | https://arxiv.org/abs/2506.15742 | 已核实：AX（预印本） | 与 Qwen-Image-Edit 同类的“上下文参考图编辑”模型，关注多轮编辑中的一致性保持。第2章作同类对照。 | 可选 |
| T3-6 | HUANG Y, HUANG J, LIU Y, et al. Diffusion model-based image editing: a survey[J]. IEEE Transactions on Pattern Analysis and Machine Intelligence, 2025, 47(6): 4409-4437. DOI: 10.1109/TPAMI.2025.3541625. | https://doi.org/10.1109/TPAMI.2025.3541625 | 已核实：CR；AX 2402.17525 | 编辑方法分类（指令、掩码、参考图等）与评价指标综述，用于第2章概述。 | 建议 |

## 主题4　参数化、计算设计与经典人在回路造型生成

| 编号 | 文献（GB/T 7714） | DOI/URL | 核实情况 | 与本文的关系 | 优先级 |
|---|---|---|---|---|---|
| T4-1 | ZHOU R, ZHANG Y, YUAN C, et al. Parametric-ControlNet: multimodal control in foundation models for precise engineering design synthesis[J]. Journal of Mechanical Design, 2025, 147(12): 121704. DOI: 10.1115/1.4068661. | https://doi.org/10.1115/1.4068661 | 已核实：CR；AX 2412.04707；全文 https://arxiv.org/html/2412.04707v1 核对数据集与指标 | 以参数、部件图组装和文本三模态训练控制模块（BIKED 自行车）。用代理 ResNet 从生成图回归参数，以 R²/准确率衡量依从，未做设计者研究。是本文“参数化可控生成＋依从量测”的最近对照（第2章）。 | 必引 |
| T4-2 | MCCORMACK J P, CAGAN J, VOGEL C M. Speaking the Buick language: capturing, understanding, and exploring brand identity with shape grammars[J]. Design Studies, 2004, 25(1): 1-29. DOI: 10.1016/S0142-694X(03)00023-1. | https://doi.org/10.1016/S0142-694X(03)00023-1 | 已核实：CR | 把品牌造型特征编码为形状文法规则并探索变体。说明“造型特征作为可编辑规则或参数”的经典来源（第2、3章）。 | 必引 |
| T4-3 | STINY G. Introduction to shape and shape grammars[J]. Environment and Planning B: Planning and Design, 1980, 7(3): 343-351. DOI: 10.1068/b070343. | https://doi.org/10.1068/b070343 | 已核实：CR | 形状文法的基础文献，可与已引的厉茜茜、朱天燕两文配套（第2章）。 | 建议 |
| T4-4 | ORSBORN S, CAGAN J, BOATWRIGHT P. Quantifying aesthetic form preference in a utility function[J]. Journal of Mechanical Design, 2009, 131(6): 061001. DOI: 10.1115/1.3116260. | https://doi.org/10.1115/1.3116260 | 已核实：CR | 把造型参数与审美偏好用效用函数联系起来。支撑“比例参数→感知评价”可量化（第3章）。 | 建议 |
| T4-5 | TAKAGI H. Interactive evolutionary computation: fusion of the capabilities of EC optimization and human evaluation[J]. Proceedings of the IEEE, 2001, 89(9): 1275-1296. DOI: 10.1109/5.949485. | https://doi.org/10.1109/5.949485 | 已核实：CR | 交互式进化计算综述，是人评驱动生成的经典范式。用于第2章说明本文“设计者保留/回退”与 IEC 的异同。 | 建议 |
| T4-6 | KRISH S. A practical generative design method[J]. Computer-Aided Design, 2011, 43(1): 88-100. DOI: 10.1016/j.cad.2010.09.009. | https://doi.org/10.1016/j.cad.2010.09.009 | 已核实：CR | 在参数化 CAD 模型上抽样、由设计者筛选。是“参数化设计空间＋人筛选”的直接先例（第2、3章）。 | 建议 |
| T4-7 | YUMER M E, CHAUDHURI S, HODGINS J K, et al. Semantic shape editing using deformation handles[J]. ACM Transactions on Graphics, 2015, 34(4): 1-12. DOI: 10.1145/2766908. | https://doi.org/10.1145/2766908 | 已核实：CR（TOG 文章号未在元数据中给出，未核实） | 把语义形容词映射为连续形变滑块。与本文“用户语言→造型参数档位”同构，用于第2章说明语义到参数映射的先例。 | 建议 |
| T4-8 | CHAUDHURI S, KALOGERAKIS E, GIGUERE S, et al. AttribIt: content creation with semantic attributes[C]//Proceedings of the 26th Annual ACM Symposium on User Interface Software and Technology. New York: ACM, 2013: 193-202. DOI: 10.1145/2501988.2502008. | https://doi.org/10.1145/2501988.2502008 | 已核实：CR | 以语义属性滑块装配部件生成造型。可作“配置器/滑块式设计空间”的 HCI 先例（第2章）。 | 建议 |

## 主题5　人智共创：效率、迭代、固着、控制与提示方式

> 该主题的核心对照文献（Davis 2024、DesignWeaver 2025、Wadinambiarachchi 2024、Lee 2024、Issak 2026、Liu & Chilton 2022）已在目录中，见末节。

| 编号 | 文献（GB/T 7714） | DOI/URL | 核实情况 | 与本文的关系 | 优先级 |
|---|---|---|---|---|---|
| T5-1 | KIKUCHI K, OGAWA N. Brief2Design: a multi-phased, compositional approach to prompt-based graphic design[EB/OL]. arXiv:2604.11019, 2026. https://arxiv.org/abs/2604.11019. | https://arxiv.org/abs/2604.11019 | 已核实：AX；摘要见 https://arxiv.org/abs/2604.11019 （预印本） | 12 名设计师被试内比较结构化多阶段提示工具与对话式基线。结构化组提示多样性提高，但生成时间更长，图像多样性相当。与本文“配置器 vs 自由文本”研究同构，可借鉴指标并对照结果（第5章）。 | 建议 |
| T5-2 | OPPENLAENDER J. A taxonomy of prompt modifiers for text-to-image generation[J]. Behaviour & Information Technology, 2024, 43(15): 3763-3776. DOI: 10.1080/0144929X.2023.2286532. | https://doi.org/10.1080/0144929X.2023.2286532 | 已核实：CR | 把提示修饰词分为主体、风格、质量增强等类型。支撑本文“固定短语”的分类与可复现（第3章）。 | 建议 |
| T5-3 | WANG Z, HUANG Y, SONG D, et al. PromptCharm: text-to-image generation through multi-modal prompting and refinement[C]//Proceedings of the 2024 CHI Conference on Human Factors in Computing Systems. New York: ACM, 2024: 1-21. DOI: 10.1145/3613904.3642803. | https://doi.org/10.1145/3613904.3642803 | 已核实：CR；AX 2403.04014 | 被试内研究，以“匹配目标图”任务比较精修工具与基线。其任务设计可借鉴为本文“达到规格”的通过判定（第5章）。 | 可选 |
| T5-4 | MAHDAVI GOLOUJEH A, SULLIVAN A, MAGERKO B. Is it AI or is it me? Understanding users' prompt journey with text-to-image generative AI tools[C]//Proceedings of the 2024 CHI Conference on Human Factors in Computing Systems. New York: ACM, 2024: 1-13. DOI: 10.1145/3613904.3642861. | https://doi.org/10.1145/3613904.3642861 | 已核实：CR | 描述用户提示迭代过程及对失败的归因。支撑把“尝试次数”与失败归因一起记录（第5章）。 | 可选 |
| T5-5 | BARROS M, AI Q. Designing with words: exploring the integration of text-to-image models in industrial design[J]. Digital Creativity, 2024, 35(4): 378-391. DOI: 10.1080/14626268.2024.2411223. | https://doi.org/10.1080/14626268.2024.2411223 | 已核实：CR＋ABS | 用 Stable Diffusion 生成椅子概念的行动研究：T2I 适合模糊探索和草图改进，但难以给出可深化的一致方案。支撑本文为什么需要几何条件（第2章）。 | 可选 |

## 主题6　用户语言到造型：语义、评论挖掘与“小巧/简约”等感知

| 编号 | 文献（GB/T 7714） | DOI/URL | 核实情况 | 与本文的关系 | 优先级 |
|---|---|---|---|---|---|
| T6-1 | BLIJLEVENS J, CREUSEN M E H, SCHOORMANS J P L. How consumers perceive product appearance: the identification of three product appearance attributes[J]. International Journal of Design, 2009, 3(3): 27-35. | https://ijdesign.org/index.php/IJDesign/article/view/535 | 已核实：PUB（IJD 页面，无 DOI） | 识别消费者感知外观的三个属性：现代感、简洁、趣味。“简洁”可直接对应评论中的“简约”（第3章）。 | 必引 |
| T6-2 | MUGGE R, DAHL D W, SCHOORMANS J P L. "What you see, is what you get?" Guidelines for influencing consumers' perceptions of consumer durables through product appearance[J]. Journal of Product Innovation Management, 2018, 35(3): 309-329（2017 年在线发表）. DOI: 10.1111/jpim.12403. | https://doi.org/10.1111/jpim.12403 | 已核实：CR＋ABS | 基于 120 件耐用品和 31 项设计特征，得出和谐、新颖、自然、重量感、紧凑（compressed）五个维度，并与性能、易用、技术先进感的推断关联。支撑“小巧/便携/一体”到造型维度的映射（第3章）。 | 必引 |
| T6-3 | HSU S H, CHUANG M C, CHANG C C. A semantic differential study of designers' and users' product form perception[J]. International Journal of Industrial Ergonomics, 2000, 25(4): 375-391. DOI: 10.1016/S0169-8141(99)00026-8. | https://doi.org/10.1016/S0169-8141(99)00026-8 | 已核实：CR | 设计者与用户对同一造型的语义评价存在系统差异。支撑“外部评审能否读出设计意图”需要单独检验（第5章）。 | 建议 |
| T6-4 | TIMOSHENKO A, HAUSER J R. Identifying customer needs from user-generated content[J]. Marketing Science, 2019, 38(1): 1-20. DOI: 10.1287/mksc.2018.1123. | https://doi.org/10.1287/mksc.2018.1123 | 已核实：CR＋ABS | 论证用户生成内容可作为顾客需求来源，并可用机器学习提高效率。支撑以电商评论作为需求入口（第3章）。 | 建议 |
| T6-5 | HAN Y, MOGHADDAM M. Eliciting attribute-level user needs from online reviews with deep language models and information extraction[J]. Journal of Mechanical Design, 2021, 143(6): 061403. DOI: 10.1115/1.4048819. | https://doi.org/10.1115/1.4048819 | 已核实：CR | 从评论中抽取属性级需求。支撑把评论编码到部件级语义（第3章）。 | 建议 |
| T6-6 | PARK S, JOUNG J, KIM H. Large language model-based online review classification for subfeature-level customer opinion analysis[J]. Journal of Mechanical Design, 2026, 148(4): 041701. DOI: 10.1115/1.4069684. | https://doi.org/10.1115/1.4069684 | 已核实：CR＋ABS | 用 LLM 句向量做子特征级评论分类，F1 > 0.80。若本文用 LLM 辅助评论编码，可作方法依据（第3章）。 | 建议 |
| T6-7 | RAGHUBIR P, KRISHNA A. Vital dimensions in volume perception: can the eye fool the stomach?[J]. Journal of Marketing Research, 1999, 36(3): 313-326. DOI: 10.1177/002224379903600302. | https://doi.org/10.1177/002224379903600302 | 已核实：CR（另有 JSTOR DOI 10.2307/3152079 指向同文） | 体积知觉受伸长维度影响。可作为 W/L 比与“小巧”感知关系的假设来源；研究对象为容器，需加限定语（第3章）。 | 可选 |

## 主题7　测量信度、多模态模型评审与小样本报告

| 编号 | 文献（GB/T 7714） | DOI/URL | 核实情况 | 与本文的关系 | 优先级 |
|---|---|---|---|---|---|
| T7-1 | GWET K L. Computing inter-rater reliability and its variance in the presence of high agreement[J]. British Journal of Mathematical and Statistical Psychology, 2008, 61(1): 29-48. DOI: 10.1348/000711006X126600. | https://doi.org/10.1348/000711006X126600 | 已核实：CR | 提出 AC1 并给出方差估计，在高一致、类别不平衡时比 kappa 稳定。作为第4章盲评一致性的主报指标之一。 | 必引 |
| T7-2 | BYRT T, BISHOP J, CARLIN J B. Bias, prevalence and kappa[J]. Journal of Clinical Epidemiology, 1993, 46(5): 423-429. DOI: 10.1016/0895-4356(93)90018-V. | https://doi.org/10.1016/0895-4356(93)90018-V | 已核实：CR | 提出 PABAK，并分解患病率与偏倚对 kappa 的影响。与已引 Feinstein & Cicchetti（1990）配合解释 kappa 悖论（第4章）。 | 必引 |
| T7-3 | CLOPPER C J, PEARSON E S. The use of confidence or fiducial limits illustrated in the case of the binomial[J]. Biometrika, 1934, 26(4): 404-413. DOI: 10.1093/biomet/26.4.404. | https://doi.org/10.1093/biomet/26.4.404 | 已核实：CR | 精确二项区间。用于小样本通过率、达成率的区间报告（第4、5章）。 | 必引 |
| T7-4 | BROWN L D, CAI T T, DASGUPTA A. Interval estimation for a binomial proportion[J]. Statistical Science, 2001, 16(2): 101-133. DOI: 10.1214/ss/1009213286. | https://doi.org/10.1214/ss/1009213286 | 已核实：CR | 比较二项比例区间：小 n 下 Wald 区间失效，精确区间偏保守。用于说明区间方法的选择（第4章）。 | 建议 |
| T7-5 | MCDONALD N, SCHOENEBECK S, FORTE A. Reliability and inter-rater reliability in qualitative research: norms and guidelines for CSCW and HCI practice[J]. Proceedings of the ACM on Human-Computer Interaction, 2019, 3(CSCW): 1-23. DOI: 10.1145/3359174. | https://doi.org/10.1145/3359174 | 已核实：CR | 讨论何时、如何报告评分者一致性。支撑第4章盲评与第5章外部评审的信度报告方式。 | 建议 |
| T7-6 | CAINE K. Local standards for sample size at CHI[C]//Proceedings of the 2016 CHI Conference on Human Factors in Computing Systems. New York: ACM, 2016: 981-992. DOI: 10.1145/2858036.2858498. | https://doi.org/10.1145/2858036.2858498 | 已核实：CR | 统计 CHI 论文的样本量分布。用于把 3 名外部设计师的被试内研究定位为形成性、可行性验证（第5章）。 | 建议 |
| T7-7 | EDWARDS K M, TEHRANCHI F, MILLER S, et al. AI judges in design: toward expert-equivalent design evaluations with vision-language models and in-context learning[J]. Journal of Mechanical Design, 2026, 148(7): 071704. DOI: 10.1115/1.4071835. | https://doi.org/10.1115/1.4071835 | 已核实：CR＋ABS | 提出检验 VLM 评审与专家等效的统计框架（一致性、误差、相关、等效检验、Top 集重叠）。若本文用多模态模型预筛或辅助判读，应按此框架报告，且不能替代外部评审（第4章）。 | 必引 |
| T7-8 | CHEN D, CHEN R, ZHANG S, et al. MLLM-as-a-judge: assessing multimodal LLM-as-a-judge with vision-language benchmark[C]//Proceedings of the 41st International Conference on Machine Learning. PMLR, 2024, 235: 6562-6595. | https://proceedings.mlr.press/v235/chen24h.html | 已核实：PUB；AX 2402.04788 | 发现成对比较与人类判断较一致，绝对打分和批量排序时一致性明显下降。支撑模型辅助判读只用成对或分级形式（第4章）。 | 建议 |
| T7-9 | KU M, JIANG D, WEI C, et al. VIEScore: towards explainable metrics for conditional image synthesis evaluation[C]//Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers). Bangkok: ACL, 2024: 12268-12290. DOI: 10.18653/v1/2024.acl-long.663. | https://doi.org/10.18653/v1/2024.acl-long.663 | 已核实：CR | 用 MLLM 对条件生成与编辑分别评语义一致和感知质量，并报告与人评的相关。作为模型辅助判读的参照（第4章）。 | 建议 |

## 主题8　多旋翼无人机：构型比例、造型感知与植保机

| 编号 | 文献（GB/T 7714） | DOI/URL | 核实情况 | 与本文的关系 | 优先级 |
|---|---|---|---|---|---|
| T8-1 | QUAN Q. Introduction to multicopter design and control[M]. Singapore: Springer, 2017: 57-72. DOI: 10.1007/978-981-10-3382-7. | https://doi.org/10.1007/978-981-10-3382-7 ；第3章 DOI 10.1007/978-981-10-3382-7_3（Airframe Design，pp. 57-72） | 已核实：书目与章节页码 CR。Springer 正文需登录，公式据作者课程讲义 https://rfly.buaa.edu.cn/course/en/Lesson_03_Airframe_Design.pdf 第10-11页核对。中文版为全权著、杜光勋等译，电子工业出版社 2018 年，书目未逐项核实。 | 讲义给出最大桨半径 r_max = R·sin(180°/n_r)（R 为机架半径、n_r 为臂数），并引 Harrington（2011）建议 r_max = (1.05~1.2)·r_p。以 D = 2R、d = 2r_p 推算：四旋翼 d/D 约为 0.59-0.67，六旋翼约为 0.42-0.48。可为本文 d/D 档位提供工程上限（第3、6章），推导值写入正文前须对原书第3章核对。 | 必引 |
| T8-2 | THEYS B, DIMITRIADIS G, HENDRICK P, et al. Influence of propeller configuration on propulsion system efficiency of multi-rotor unmanned aerial vehicles[C]//2016 International Conference on Unmanned Aircraft Systems (ICUAS). Piscataway: IEEE, 2016: 195-201. DOI: 10.1109/ICUAS.2016.7502520. | https://doi.org/10.1109/ICUAS.2016.7502520 | 已核实：CR；摘要据 ORBi 条目检索片段 https://orbi.uliege.be/handle/2268/200697 | 实验比较推/拉式、桨叶数、臂截面形状与尺寸、共轴及桨盘重叠对悬停效率的影响，结论之一是臂的细长度比截面形状更重要。支撑臂根造型档位和桨盘不重叠约束（第3章）。 | 建议 |
| T8-3 | YAMIN L J, CAUCHARD J R. Generative adversarial networks and data clustering for likable drone design[J]. Sensors, 2022, 22(17): 6433. DOI: 10.3390/s22176433. | https://doi.org/10.3390/s22176433 | 已核实：CR；PUB https://www.mdpi.com/1424-8220/22/17/6433 | 用 360 张无人机图像和 379 人的喜爱度评分识别外观特征，再以 StyleGAN2-ADA 生成新外观。说明“生成式无人机外观＋用户评价”已有先例（第2章）。 | 必引 |
| T8-4 | LAN Y, CHEN S. Current status and trends of plant protection UAV and its spraying technology in China[J]. International Journal of Precision Agricultural Aviation, 2018, 1(1): 1-9. DOI: 10.33440/j.ijpaa.20180101.0002. | https://doi.org/10.33440/j.ijpaa.20180101.0002 | 已核实：CR | 中国植保无人机机型与喷施技术现状。作为第6章六旋翼植保案例的背景依据。 | 建议 |
| T8-5 | YANG S, YANG X, MO J. The application of unmanned aircraft systems to plant protection in China[J]. Precision Agriculture, 2018, 19(2): 278-292. DOI: 10.1007/s11119-017-9516-7. | https://doi.org/10.1007/s11119-017-9516-7 | 已核实：CR | 植保无人机在中国的应用格局，第6章背景用。 | 建议 |
| T8-6 | YEH A, RATSAMEE P, KIYOKAWA K, et al. Exploring proxemics for human-drone interaction[C]//Proceedings of the 5th International Conference on Human Agent Interaction. New York: ACM, 2017: 81-88. DOI: 10.1145/3125739.3125773. | https://doi.org/10.1145/3125739.3125773 | 已核实：CR；摘要据 Chalmers 条目检索片段 https://research.chalmers.se/publication/254169 | 带社交化外形（造型、面部、声音）的无人机，使人可接受的接近距离比非社交外形更近。可作为“低调/亲和 vs 张扬”外观语义影响感知的旁证（第3章）。 | 可选 |

---

## 与本文最接近的5项工作（供第2章对比表）

| 工作 | 输入 | 控制机制 | 评价 | 人的角色 | 本文的差异 |
|---|---|---|---|---|---|
| ① CHEN J, ZHOU Z, QI J, et al. JAMDSM 2026（已引 A001） | 在线评论，经 TGRA-QFD 提取情感与功能需求 | Stable Diffusion 生成（是否使用空间条件请按 A001 原文核对） | 按原文核对 | 研究者整合需求后生成 | 同为无人机、同为评论驱动。本文另加工程比例约束，把规格编译为条件图与固定短语，生成后量测轴位与比例，并对编辑分评“达成/保持”。 |
| ② WANG L, CHEN C H, CHANG D. AutoGen-Insight, IJAMD 2026（T1-1） | 14,153 条电动车评论→4 类人物画像→比例、造型、灯、轮等概率参数向量（含冲突推理） | 参数化提示词（纯文本）驱动扩散，多视图生成 | 与直接、关键词、LLM 提示基线比较语义对齐、比例合理性、跨视图一致；消融；专家与用户评估 | 可检视推理链与参数向量 | 本文的几何不经文字传达，由配置器编译成俯视条件图，比例由像素量测而非“合理性”评分；含编辑分评与设计者保留/回退；对象为多旋翼。 |
| ③ ZHOU R, et al. Parametric-ControlNet, JMD 2025（T4-1） | 参数（可部分缺省）、部件图组装图、文本 | 训练参数编码器与部件编码器，ControlNet 式控制模块（SD） | 代理 ResNet 回归参数（R²/准确率），PSNR/SSIM/多样性，部件 IoC | 无设计者研究 | 本文不训练模型，用现成 Qwen-Image 的 ControlNet 或原生参考图编辑；依从量测直接取自图像几何；有盲评造型档位、外部可读性检验和设计者参与。 |
| ④ CHEN L, et al. AutoSpark, UIST 2024（目录 C3） | 汽车外观的感性需求，经 GenAI 感性工学引擎与语义网络处理 | 辅助撰写文本提示，图-图相似与文-图相关反馈 | 与基线系统的用户研究：情感需求契合、质量、体验 | 设计者主导迭代 | 本文把感性词落到可编辑的几何规格与条件图，而非只改写提示词；评价以几何依从与分项盲评为主。 |
| ⑤ TAO S, et al. DesignWeaver, CHI 2025（目录 C2），并列 DAVIS R L, et al. CHI 2024（目录 C1） | 从生成图中提取的设计维度调色板（DesignWeaver）；时装设计空间图形界面（Davis） | 结构化组装文本提示（DesignWeaver）；图形化设计空间探索 vs 文本提示（Davis） | DesignWeaver：52 名新手，比较提示长度、领域词汇、方案多样性与创新性。Davis：定性研究加两项定量追踪 | 新手或学徒设计者 | 本文的“结构化”同时规定几何与短语，而不只是更好的文字；被试为 3 名外部设计师，按规格通过率、用时、尝试次数比较，并记录外部可读性。 |

次近：CHONG L, et al. CAD-prompted generative models（DETC 2024，目录 C4，CAD 图作图像提示，权重约 0.35 时可行性提高而新颖性不降）；DU Y, et al. Sustainability 2024（已引 A008，评论→感性词→SD＋ControlNet 线稿＋LoRA）；苏建宁等 2024（目录 C8，评论意象词→SDXL＋LoRA）。

## 可能削弱本文贡献的工作（坦率评估）

1. **AutoGen-Insight（T1-1）**：已完成“评论→可检视参数向量→参数化提示→扩散生成”，并与 LLM 提示基线比较，还评了“比例合理性”。本文不能把“把用户评论转成可编辑参数规格再生成”本身作为创新点。可主张的差异限于：几何由条件图而非文字约束；工程比例（W/L、d/D、机身/轴距）作为硬约束；像素级量测；编辑的达成与保持分评；多旋翼对象。
2. **Parametric-ControlNet（T4-1）**：已实现参数驱动的可控扩散生成，并做了定量依从量测（R²），见于 JMD。本文不宜声称“首次实现产品造型的参数化可控生成”，应强调免训练、配置器编译、人在回路和造型档位盲评。
3. **CHEN J et al. 2026（已引 A001）与 YAMIN & CAUCHARD 2022（T8-3）**：前者已把评论驱动的 SD 生成用于无人机，后者已用 GAN 生成无人机外观并做喜爱度评价。“首次将生成式 AI 用于无人机造型”的说法站不住。
4. **DAVIS 2024、DesignWeaver 2025、Brief2Design 2026、AutoSpark 2024、Lee 2024（草图 vs 提示）**：结构化或图形化界面与自由文本提示的比较已有多项研究，样本量都大于本文（如 DesignWeaver n=52，Brief2Design n=12 被试内）。本文 3 名外部设计师的被试内研究只能定位为形成性或可行性验证，结论措辞宜保守，并沿用这些研究的指标以便对照。
5. **PIE-Bench（T3-1）、EditBench（T3-2）、ImagenHub（T3-4）及已引 InstructPix2Pix、MagicBrush**：把编辑达成与非编辑区保持分开评价已是通行做法。本文的贡献只在把它落到部件级造型档位（臂根、机头、顶盖分件线等）。
6. **ControlNet++（目录 C15）**：已用“从生成图重新提取条件、与输入条件比对”的方式量化控制依从，与本文“从输出量测轴位与比例”同逻辑。应引用并说明本文量测的是工程比例而非通用条件图。
7. **CAD-prompted generative models（目录 C4）**：已证明用 CAD 或模板图作视觉提示可提高可行性，并讨论了权重与新颖性的权衡。本文的条件图思路与之接近，差异在于条件图由规格编译、含部件图并对应工程比例。
8. **EDWARDS et al. 2026（T7-7）**：若本文用多模态模型辅助判读，该做法及其等效性检验框架已有先例，不能作为方法贡献。
9. **KRISH 2011、McCORMACK 2004、YUMER 2015、AttribIt 2013**：“语义属性→参数化造型”的映射早已存在。本文的新意不在映射本身，而在把映射接到扩散生成和量测闭环上。
10. **目录中的“ParamDrone参数驱动的四旋翼无人机智能设计系统”**（`archive-references.csv`，5页，sha256 9e1afb92…）：题名与本文高度重合，但公开检索（中英文）均未找到出处，无法判断其内容。**11/18 作者确认：此件由 Codex 撰写，不是文献，不引用、不比较。**

---

## 已在目录中、建议引用（不在 references.json）

书目均按下列核实方式重新核对，目录中的中文译名已还原为原题。

| 编号 | 文献（GB/T 7714） | 所在目录 | 核实情况 | 与本文的关系 | 优先级 |
|---|---|---|---|---|---|
| C1 | DAVIS R L, WAMBSGANSS T, JIANG W, et al. Fashioning creative expertise with generative AI: graphical interfaces for design space exploration better support ideation than text prompts[C]//Proceedings of the 2024 CHI Conference on Human Factors in Computing Systems. New York: ACM, 2024: 1-26. DOI: 10.1145/3613904.3642908. | archive-references.csv | 已核实：CR＋ABS | 图形化设计空间界面与文本提示的直接比较，结论为纯文本提示限制探索。是本文第5章研究问题的直接先例。 | 必引 |
| C2 | TAO S, LIANG I, PENG C, et al. DesignWeaver: dimensional scaffolding for text-to-image product design[C]//Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems. New York: ACM, 2025: 1-26. DOI: 10.1145/3706598.3714211. | reviewed-100.csv（HCI-C0026） | 已核实：CR＋ABS | 产品设计中以维度调色板结构化提示，n=52。第2、5章对照。 | 必引 |
| C3 | CHEN L, JING Q, TSANG Y, et al. AutoSpark: supporting automobile appearance design ideation with Kansei engineering and generative AI[C]//Proceedings of the 37th Annual ACM Symposium on User Interface Software and Technology. New York: ACM, 2024: 1-19. DOI: 10.1145/3654777.3676337. | feishu-100.csv；archive-references.csv | 已核实：CR＋ABS | 感性工学＋生成式 AI 支持外观构思，并与基线做用户研究。第2章对照。 | 必引 |
| C4 | CHONG L, RAYAN J, DOW S, et al. CAD-prompted generative models: a pathway to feasible and novel engineering designs[C]//Proceedings of the ASME 2024 IDETC/CIE, Vol. 3B: 50th Design Automation Conference. New York: ASME, 2024: V03BT03A060. DOI: 10.1115/DETC2024-146325. | archive-references.csv | 已核实：CR＋ABS | 以 CAD 图作视觉提示提高可行性，并讨论权重与新颖性的权衡。支撑本文条件图路线（第2、3章）。 | 必引 |
| C5 | CHONG L, LO I P, RAYAN J, et al. Prompting for products: investigating design space exploration strategies for text-to-image generative models[J]. Design Science, 2025, 11: e2. DOI: 10.1017/dsj.2024.51. | archive-references.csv；licensed-files.csv | 已核实：CR；AX 2408.03946 | 产品设计中的提示探索策略，第5章提示行为编码可参考。 | 建议 |
| C6 | WADINAMBIARACHCHI S, KELLY R M, PAREEK S, et al. The effects of generative AI on design fixation and divergent thinking[C]//Proceedings of the 2024 CHI Conference on Human Factors in Computing Systems. New York: ACM, 2024: 1-18. DOI: 10.1145/3613904.3642919. | archive-references.csv | 已核实：CR | 生成式 AI 导致设计固着的实验证据。与已引 Jansson & Smith 配套（第5章）。 | 必引 |
| C7 | LEE S W, JO T H, JIN S, et al. The impact of sketch-guided vs. prompt-guided 3D generative AIs on the design exploration process[C]//Proceedings of the 2024 CHI Conference on Human Factors in Computing Systems. New York: ACM, 2024: 1-18. DOI: 10.1145/3613904.3642218. | archive-references.csv | 已核实：CR＋ABS | 12 名设计师比较草图引导与提示引导，发现提示利于起始构思、草图利于具体化。第5章对照。 | 建议 |
| C8 | 苏建宁, 鱼宝银, 李雄, 等. 意象驱动的产品造型智能设计方法[J]. 机械设计, 2024, 41(8): 115-120. DOI: 10.13841/j.cnki.jxsj.2024.08.017. | archive-references.csv | 已核实：作者、题名与 DOI 见 chndoi 解析页 https://www.chndoi.org/Resolution/Handler?doi=10.13841/j.cnki.jxsj.2024.08.017 ；刊期页码见 napstic https://search.napstic.cn/literature/periodical/010jxsj202408017 | 评论意象词→语义差分→GoogLeNet 预测→SDXL＋LoRA。国内同类（第2章）。 | 建议 |
| C9 | 王愫, 刘月林, 孙利. 视觉感知数据驱动的产品造型智能生成设计方法[J]. 计算机辅助设计与图形学学报, 2026, 38(5): 846-863. DOI: 10.3724/SP.J.1089.2024-00459. | feishu-100.csv；archive-references.csv | 已核实：CR（飞书记 2025-02-17 为网络首发日期，正式卷期以 CR 为准） | 眼动数据→DreamBooth＋LoRA 微调 SD 生成造型。国内同类（第2章）。 | 建议 |
| C10 | YANG C, LIU F, YE J. A product form design method integrating Kansei engineering and diffusion model[J]. Advanced Engineering Informatics, 2023, 57: 102058. DOI: 10.1016/j.aei.2023.102058. | archive-references.csv（中文译名“一种集成感性工程和扩散模型的产品形态设计方法”） | 已核实：CR（摘要未读到，方法表述需对原件） | 感性工学＋扩散模型的早期 AEI 工作（第2章）。 | 建议 |
| C11 | WANG Z, LI J, PAN H, et al. Research on multimodal generative design of product appearance based on emotional and functional constraints[J]. Advanced Engineering Informatics, 2025, 65: 103106. DOI: 10.1016/j.aei.2024.103106. | feishu-100.csv；archive-references.csv | 已核实：CR | 同时约束情感与功能的多模态外观生成，与本文“感性语言＋工程比例”最接近的 AEI 工作之一（第2章）。 | 建议 |
| C12 | 李洒, 杨建明, 巩超. 面向平飞姿态的四旋翼无人机机身造型设计[J]. 机械设计, 2025, 42(2): 页码未核实. DOI: 10.13841/j.cnki.jxsj.2025.02.023. | reviewed-100.csv（UAV-U003） | 部分核实：作者、题名、DOI 见 chndoi 解析页；刊名卷期取自目录；页码未核实 | 国内四旋翼机身造型与飞行姿态的直接研究（第2、3章）。 | 必引 |
| C13 | MOU C, WANG X, XIE L, et al. T2I-Adapter: learning adapters to dig out more controllable ability for text-to-image diffusion models[J]. Proceedings of the AAAI Conference on Artificial Intelligence, 2024, 38(5): 4296-4304. DOI: 10.1609/aaai.v38i5.28226. | archive-references.csv | 已核实：CR | 与 ControlNet 并列的轻量空间条件方法（第2章）。 | 建议 |
| C14 | ZHAO S, CHEN D, CHEN Y C, et al. Uni-ControlNet: all-in-one control to text-to-image diffusion models[C]//Advances in Neural Information Processing Systems 36. 2023: 11127-11150. DOI: 10.52202/075280-0491. | archive-references.csv | 已核实：CR | 多条件统一控制，对应本文所用 Union 类 ControlNet（第2、3章）。 | 可选 |
| C15 | LI M, YANG T, KUANG H, et al. ControlNet++: improving conditional controls with efficient consistency feedback[C]//Computer Vision – ECCV 2024. Cham: Springer, 2025: 129-147. DOI: 10.1007/978-3-031-72667-5_8. | archive-references.csv | 已核实：CR（LNCS 卷号未在元数据中给出，未核实） | 用“从输出重提条件再比对”的方法量化可控性，与本文几何量测同逻辑（第4章）。 | 必引 |
| C16 | LIU V, CHILTON L B. Design guidelines for prompt engineering text-to-image generative models[C]//Proceedings of the 2022 CHI Conference on Human Factors in Computing Systems. New York: ACM, 2022: 1-23. DOI: 10.1145/3491102.3501825. | archive-references.csv（中文译名） | 已核实：CR | 提示词“主体＋风格”结构与试错成本，第3章固定短语设计依据。 | 建议 |
| C17 | ISSAK A, REZWANA J, HARTEVELD C. "Control is a trajectory, not a point": conceptualizing control in human-AI co-creativity[C]//Proceedings of the 2026 CHI Conference on Human Factors in Computing Systems. New York: ACM, 2026: 1-17. DOI: 10.1145/3772318.3790861. | archive-references.csv | 已核实：CR | 把控制感视为过程而非单点，支撑本文“保留、回退、手工收尾”的过程记录（第5章）。 | 建议 |
| C18 | HSIAO S W, CHIU F Y, LU S H. Product-form design model based on genetic algorithms[J]. International Journal of Industrial Ergonomics, 2010, 40(3): 237-246. DOI: 10.1016/j.ergon.2010.01.009. | archive-references.csv（中文译名“基于遗传算法的产品形态设计模型”，需确认是同一篇） | 已核实：CR | 遗传算法产品造型的代表，与已引朱天燕（IGA）配套（第2章）。 | 可选 |
| C19 | CHEN L, SONG Y, GUO J, et al. How generative AI supports human in conceptual design[J]. Design Science, 2025, 11: e9. DOI: 10.1017/dsj.2025.2. | archive-references.csv；licensed-files.csv | 已核实：CR；AX 2502.00283 | 生成式 AI 在概念设计中的作用实证（第1、5章）。 | 可选 |
| C20 | KARALI H, INALHAN G, TSOURDOS A. AI-driven multidisciplinary conceptual design of unmanned aerial vehicles[C]//AIAA SciTech 2024 Forum. Reston: AIAA, 2024. DOI: 10.2514/6.2024-1708. | reviewed-100.csv（HCI-V013） | 已核实：CR（页码无） | 无人机工程概念设计的 AI 方法，第2章用来区分工程设计自动化与造型生成。 | 可选 |
| ~~C21~~ | ~~ParamDrone参数驱动的四旋翼无人机智能设计系统~~ | archive-references.csv（本地 5 页） | **撤下**：作者 11/18 确认由 Codex 撰写 | 不是文献，不引用 | 不引用 |

---

## 已核实备选（未列入主表，需要时可补）

均已按 CR、AX 或 PUB 核对书目：

- SDEdit（MENG C, et al. ICLR 2022；https://mlanthology.org/iclr/2022/meng2022iclr-sdedit/）
- Emu Edit（SHEYNIN S, et al. CVPR 2024: 8871-8879. DOI 10.1109/CVPR52733.2024.00847）
- Davidsonian Scene Graph（CHO J, et al. ICLR 2024；mlanthology 已核）
- VQAScore（LIN Z, et al. ECCV 2024, LNCS: 366-384. DOI 10.1007/978-3-031-72673-6_20）
- Latent Diffusion（ROMBACH R, et al. CVPR 2022: 10674-10685. DOI 10.1109/CVPR52688.2022.01042）
- Proportion and Perspective Control for Flow-Based Image Generation（BOUDIER J, CASELLES-DUPRÉ H. arXiv:2510.21763）
- Step1X-Edit / GEdit-Bench（LIU S, et al. arXiv:2504.17761）
- ImgEdit（YE Y, et al. arXiv:2505.20275）
- Sequential line search（KOYAMA Y, et al. ACM TOG 2017, 36(4). DOI 10.1145/3072959.3073598）
- Design galleries（MARKS J, et al. SIGGRAPH 1997: 389-400. DOI 10.1145/258734.258887）
- Whither design space?（WOODBURY R F, BURROW A L. AI EDAM 2006, 20(2): 63-82. DOI 10.1017/S0890060406060057）
- Harley-Davidson shape grammar（PUGLIESE M J, CAGAN J. Res Eng Des 2002, 13(3): 139-156. DOI 10.1007/s00163-002-0013-1）
- Dream Lens（MATEJKA J, et al. CHI 2018: 1-12. DOI 10.1145/3173574.3173943）
- 以设计草图作输入的图像生成（ZHANG C, et al. Creativity and Cognition 2023: 254-261. DOI 10.1145/3591196.3596820）
- MAYER S, LANDWEHR J R. Psychology of Aesthetics, Creativity, and the Arts 2018, 12(4): 399-431. DOI 10.1037/aca0000187（简洁度、对称等算法化测度）
- JIN J, et al. JCISE 2019, 19(1): 010801. DOI 10.1115/1.4041087（评论挖掘综述）
- JIN J, JIA D, CHEN K. IJPR 2022, 60(22): 6708-6727. DOI 10.1080/00207543.2021.1949641
- BING Y, et al. Journal of Engineering Design 2026, 37(3): 981-1006. DOI 10.1080/09544828.2025.2515553（感性工学＋GAN）
- CICCHETTI D V, FEINSTEIN A R. J Clin Epidemiol 1990, 43(6): 551-558. DOI 10.1016/0895-4356(90)90159-M（kappa 悖论 II，与已引 I 配套）
- WONGPAKARAN N, et al. BMC Med Res Methodol 2013, 13: 61. DOI 10.1186/1471-2288-13-61（kappa 与 AC1 对比）
- HAYES A F, KRIPPENDORFF K. Communication Methods and Measures 2007, 1(1): 77-89. DOI 10.1080/19312450709336664
- GPTEval3D（WU T, et al. CVPR 2024: 22227-22238. DOI 10.1109/CVPR52733.2024.02098）
- PICARD C, et al. Artificial Intelligence Review 2025, 58(9): 288. DOI 10.1007/s10462-025-11290-y（VLM 工程设计评测）
- MAGNUSSEN Ø, OTTESTAD M, HOVLAND G. Modeling, Identification and Control 2015, 36(2): 67-79. DOI 10.4173/mic.2015.2.1
- SHI D, et al. IEEE/ASME TMech 2017, 22(3): 1337-1348. DOI 10.1109/TMECH.2017.2675913
- BERSHADSKY D, et al. AIAA SciTech 2016. DOI 10.2514/6.2016-0581
- ZHOU W, et al. AIAA Applied Aerodynamics Conf. 2017. DOI 10.2514/6.2017-3744（旋翼间距干扰）
- KARJALAINEN K D, et al. HAI 2017: 89-96. DOI 10.1145/3125739.3125774
- HAFEEZ A, et al. Information Processing in Agriculture 2023, 10(2): 192-203. DOI 10.1016/j.inpa.2022.02.002
- AGENT（SAMPLAWSKI C, et al. arXiv:2504.08981，LLM 无人机设计树）

## 已剔除（无法在真实页面核实，或来源质量不足）

1. 《基于意象认知的无人机参数化设计研究》（汉斯期刊）：页面无法加载，且为汉斯开放刊。
2. 《基于设计形态语义学的多旋翼无人机语义分析》（汉斯）：未打开原页。
3. 任丽、林丽，无人机色彩意象（Software Engineering and Applications, 2022，汉斯）：未打开原页。
4. “A Rapid CMF Design Method for Industrial Equipment Based on ControlNet”（ACM 2025）：未打开原页。
5. Computer-Aided Design & Applications 2025, 22(4): 629-639（Grasshopper＋SD 室内）：未打开原页。
6. “An Automated Quadcopter CAD based Design and Modeling Platform”（SCITEPRESS 2017）：未打开原页。
7. 《设计》2024 两篇（无人拖拉机感性造型、倾转翼植保无人机）：作者与卷期未核实。
8. AHFE “A Product Redesign Approach Based on Negative Text Mining and Kansei Engineering”：未打开原页。
9. AHFE “Brand Gene-Informed AIGC for the Styling Design of Motorcycle Headlights”：未打开原页。
10. “Generative Artificial Intelligence in Aircraft Design Optimization”（MDPI Processes）：未打开原页。
11. “Multi-objective Evolution of Drone Morphology”（arXiv 2502.01197）：未打开原页。
12. 灯具 T2I 设计教育案例两篇（ResearchGate）：刊名未确认。

## 计数

- 主表新增 52 条：完全核实 50 条，部分核实 2 条（T1-2 内容表述、T1-3 DOI）。
- 目录建议引用 20 条：完全核实 19 条，部分核实 1 条（C12 页码）。原列的 C21 ParamDrone 经作者确认由 Codex 撰写，已撤下。
- 已核实备选 30 条。
- 剔除 12 条。
