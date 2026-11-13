# paper

**当前优先 · 4.2.1 规格复核。** H3 本轮实收四张，B 的 250／300 mm 轴距组与 A/B/C 组共用 B300。作者保留 B 曲面过渡，反馈新版 C 不如上一版。E0 开源 6/6、闭源正式位置尚缺 6，E1 开源 36/36，一份真人点选 12/12 可量；Qwen E2 正式 0/6，E3 正式 0/9。请先读[本轮原图、新旧 C 与按章节交接](evidence/section421-h3-span/claude-review.md)。以下较早的运行与待办记录按各自日期解读。

**当前进度（11 月 13 日）。** E0 开源 6/6，闭源六个正式位置尚无归档；E1 开源 36/36，E0/E1 的 12 图点选已回收一份。Qwen E2 正式提交 0/6，已登记两张 E1 父图并离线核对六份请求。E3 正式候选 0/9。第 4 章当前为 4.2.1 规格核对，H3 A/B/C 属开发图。作者认可 B 的曲面过渡，未辨出 A/B 的紧凑与舒展。已用配置器实际布局函数做完[轴距单因素同尺度示意](evidence/quad-author-selection/wheelbase-only.svg)，仍待核定方向规格。

**2026-11-12 六章执行入口**　[打开24项任务、逐节对照、思维导图及验收条件](docs/execution-playbook.md)。先看当班任务与前置，再回原工单领任务。各批当前数量见上方进度。


**11/11 新正式样本口径。** [旧批退役与新图清单](evidence/formal-reset/README.md)及[变量表](docs/research-variables.md)优先。下面旧批图、评分和计数仅用于历史追溯，正式效果表、评议发放及方案深化按新清单。
# 多旋翼无人机造型论文协作仓库

**当前：研究进行中；第1—3章和已核结果可以写，不能定稿整篇结论。** 本公开仓库是 Claude、Codex 和作者的跨设备交接入口。它保存共享进度、论文要求、可编辑文字与脱敏证据；原始研究档案仍按原权限保存。

1. 开工先读 [接手快照](docs/handoff.md)（一页全局看板与待决事项，每次工作结束前更新）和 [当前状态与写作门槛](STATUS.md)，再看 [开放工单](https://github.com/Freeloop993/paper/issues?q=is%3Aissue+is%3Aopen)。**Issues 是双方唯一共享待办**，不是每端再建一套。
2. **Claude｜全局规划与论文写作：**从 [C01 六章证据矩阵](https://github.com/Freeloop993/paper/issues/1) 接手，读[开题五项](docs/requirements.md)、[现行目录](manuscript/outline.md)和[文献阅读地图](references/reading-map.md)。[前三章既有草稿](manuscript/source-drafts/)供复用，不代表已定稿。
3. **Codex｜图像实验、数据处理与分析：**从 [X01 两种流程输入验收](https://github.com/Freeloop993/paper/issues/2) 接手，按[方法与限制](docs/methods.md)交回请求、原件校验、分母、失败和可支持的结论。已有[第5章六旋结果段](manuscript/ch05-hexa-results.md)与[可复算数据](evidence/README.md)。
4. **作者/必要时导师｜方向与范围决定：**见 [A01 六旋、LoRA与正式采集条件](https://github.com/Freeloop993/paper/issues/3)。Issue、日期和历史预算本身不授权开机、招募或训练。
5. 领取、交付、复核按[协作规则](CONTRIBUTING.md)。发生实质变化就在本次工作结束前提交并回读；没有变化不空刷。[进度日志](PROGRESS.md)按日期保留历史。

**作者找回的无人机配置器**：[可编辑源码和本地启动](prototypes/drone-configurator/README.md) · [研究纠偏和 Claude 首个修改任务](docs/configurator-realignment.md)。

Google 总记录、Obsidian、飞书文献库和原始材料是既有来源，不要求更改其权限。不能访问原件时仅使用仓库已提供的内容，并标明局限。

作者交办的[全局评估材料与执行要求](planning/claude-review.md)汇集开题原件、带修订的目录、Google Doc 快照、文献入口与最新 S1 复测。
