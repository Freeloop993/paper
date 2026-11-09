# 近期研究进展定向更新（2026-11-10）

**用途：** 为 G2 技术路线、LoRA 裁定（D1）、第2章 2.4/2.5 补写提供最近邻依据。**核读程度：** 下列条目只核了身份与摘要级信息（arXiv 页面、会议页面或模型发布页），**均未通读全文**；进入正文前须按 reading-map 规则核原文页码。不新增 R 编号，暂以 N 编号登记，入库后再合并。

## 一、直接改变技术决策的

| 编号 | 条目 | 已核信息 | 对本研究的含义 |
|---|---|---|---|
| N01 | Qwen-Image 2.1 Fun ControlNet Union（Alibaba PAI；ComfyUI 支持约 2026-09-28；[发布说明](https://comfyui-wiki.com/en/news/2026-09-24-qwen-image-2-1-fun-controlnet-union)） | 挂在冻结的 Qwen-Image 2.1 上，一个文件含 Canny、Depth、Grayscale、HED、Lineart、MLSD、Pose、Scribble 及局部重绘；发布说明的结果均用 `control_context_scale=1.0`；ComfyUI 用 Load Model Patch → Apply Qwen Image DiffSynth ControlNet；画布边长须为 16 的倍数；许可证页面未写 | 现行后端正是 `qwen_image_2.1`。S1 的 L/F 路线没有 ControlNet 节点。开题第（2）项原文写的就是“ControlNet Canny/Lineart 强约束”。**这是 G2 首选的控制路线**，前提是 Codex 核实模型卡、许可证、文件摘要与现有 ComfyUI 版本兼容 |
| N02 | InstantX Qwen-Image-ControlNet-Union（[模型页](https://huggingface.co/InstantX/Qwen-Image-ControlNet-Union)） | 面向 Qwen-Image 早期版本 | 与 2.1 是否兼容未核；仅作备选 |
| N03 | 7Bench：布局引导 T2I 基准（arXiv 2508.12919） | 用检测框与目标框 IoU 的 accuracy@k 曲线下面积计分，位置与尺度**不分开**；小框（占画面 3%—10%）最难 | 支持本研究把**尺度、位置、相对布局分开报告**，而不是只报一个重合度；S1 的主要误差恰是尺度 |

## 二、改变 LoRA 裁定（D1）论证的

| 编号 | 条目 | 已核信息 | 含义 |
|---|---|---|---|
| N04 | Liao、Lomas、Yu：以人类反馈做 LoRA 微调提升产品外观（arXiv 2507.02865，TU Delft） | SD 系底模；灯具约 1,600 张生成、405 张评分，按 like 率>70% 选 40／34 张分别训练两个 LoRA；like 率前后对比显著上升；无其他基线，统计方法有疑点 | 说明“小样本 LoRA 用于产品风格”有近期先例且数据量可小到几十张；也说明**只做前后对比、无基线**是常见缺陷。若 D1 选 A，必须设“有/无 LoRA”同条件对照 |
| N05 | QwenStyle：基于 Qwen-Image-Edit 的保内容风格迁移（arXiv 2601.06202，TeleAI） | 在 Qwen-Image-Edit-2509 上训练 rank-32 LoRA；作者自称实验性尝试，域外风格泛化不足 | Qwen 系列上做风格 LoRA 技术可行，但现行底模（2.1 文生图）与之不同；若选 A，需在 2.1 上另训，不能借用 |
| N06 | Qwen-Image-Edit 2509/2511 多图参考编辑（多方产品页） | 支持多张参考图进行一致性编辑 | 支持 D1 的选项 B（参考图库＋冻结模型承担风格稳定）在现行模型族中有现成通路；须 G3 实测“以参考图输入”是否真的生效 |

## 三、改变第2章定位与第5章讨论的

| 编号 | 条目 | 已核信息 | 含义 |
|---|---|---|---|
| N07 | Xu、Martelaro、McComb：Ceci N'est Pas un Drone（arXiv 2511.03131，DOI 前缀 ASME） | 比较渲染图、数值性能、二者结合三种表示对设计者在 AI 生成**无人机**概念中选择的影响；仅数值信息时最能选出最优；参与者偏好视觉上常规、轴对称的方案；样本量在摘要中未见 | **无人机领域最近邻**。提醒：视觉渲染会把选择拉向“常规对称”，与本研究的设计质量评议直接相关；评议材料须控制表示方式，并在 5.3 讨论 |
| N08 | Shi、Choo：草图构思中的人—多模态模型交互分类（CHI EA 2026，arXiv 2602.22171） | 12 人、烤面包机构思；四种模式中共同演化最常见；AI 主导时参与者让渡精细形态控制换取速度；AI 反复不符合机械/空间逻辑时退回纯人工 | 支持 RQ3 关注“控制权让渡与回退”；与 R08、R14 一并写 2.5。样本小、单编码者 |
| N09 | AGENT：基于大语言模型的飞行器生成设计工具（arXiv 2504.08981） | 面向工程参数生成 | 与本研究（外观造型）不同，用于 2.1 说明工程设计与造型设计的边界 |

## 四、尚未找到、需要继续检索的

- Qwen-Image 2.1 Fun ControlNet 的**定量空间精度**评估：发布说明未讨论。G2 本身就是在本任务上补这一证据。
- 无训练风格一致性在**产品**而非插画上的评估：检索到电商场景（arXiv 2409.04750）与 CVPR 2026 FREESTYLE 补充材料，尚未核读，留给 C02。
