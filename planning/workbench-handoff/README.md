# 多旋翼造型工作台 · 双机交接

请从默认分支 `main` 开始。应用在 [prototypes/drone-configurator](../../prototypes/drone-configurator/README.md)，关系画布、设计目标、参数编辑与候选生成属于同一套源码。作者看过上一版后仍希望改善设计体验。下一轮先在现版上改界面并让作者试用，再运行设计试验和写正文。

| Claude 要回答的问题 | 仓库里的依据 |
| --- | --- |
| 导师给定的章节、方法边界和实际完成情况是什么？ | [研究上下文、试验次序、流程图与运行证据](context/README.md) · [前一版代码审查与实测](v3.2-review.md) · [研究问题与验证协议](../advisor-20261118/README.md) |
| 部件对话、画布分支、改动预览和候选比较为什么这样做？ | [工作台设计依据与文献](literature/README.md) · [逐篇核读页码与适用边界](literature/论文与原页证据.csv) |
| 哪些论文可直接用于正文，另一台如何读到同一版本？ | [全文、原始来源及文件校验](literature/README.md) · [全库导航](literature/全库文献导航.csv) · [补充 BibTeX](literature/补充参考文献.bib) · [GenAlign 按底稿补录](literature/GenAlign-按底稿补录.bib) |
| 怎样试用源码，再对照另一个界面版本？ | [应用入口和启动方式](../../prototypes/drone-configurator/README.md) · [可直接解压的离线工作台](../../prototypes/drone-configurator/configurator-offline.zip?raw=true) |
| 怎样安排四旋主任务和跨构型验证？ | [HCI 作者预试与主持人记录](../advisor-20261118/pilot-bridge/README.md) · [中性任务与跨构型盲判](../advisor-20261118/cross-layout-protocol.md) |

## 第二台电脑启动

新电脑可以用以下命令取得工作台、交接文献和试验材料。若该电脑已有本仓库，在保存本机修改后执行 `git switch main` 和 `git pull --ff-only origin main` 即可。用 `git rev-parse HEAD` 对照远端提交。下面的稀疏检出只下载交接有关的目录。

```sh
git clone --branch main --filter=blob:none --sparse https://github.com/Freeloop993/paper.git
cd paper
git sparse-checkout set prototypes/drone-configurator planning/workbench-handoff planning/advisor-20261118 planning/configurator-research references/catalogs evidence/semantic-cards
python planning/workbench-handoff/verify_checkout.py
cd prototypes/drone-configurator
npm ci
npm run build
npm run studio:chat -- --port 4178
```

源码使用 Node.js 24，校验工具使用 Python 3.10 或更高版本。本版从 `studio:chat` 启动，打开[我的项目](http://127.0.0.1:4178/#step=canvas&board=project)即可试用。纯离线查看时，完整解压工作台 ZIP，打开 `index.html`。语义原句、可编辑规格和历史案例随应用提供。本机 HTTP 服务可以执行「只查依据」。在线模型的区域与密钥由使用者在自己的服务进程中设置，见应用说明。

如要复核实验材料，另需 Pillow。在仓库根目录按[研究材料复核命令](context/README.md#在另一台电脑复核研究材料)检查前端语义卡和作者预试记录。这两个检查均可无密钥运行。

旧库的 102 份已归档学术原件另有[固定版本全文目录](https://github.com/Freeloop993/paper/tree/82fb03d82cd6f88bf710a1425558e43c3d4e248f/fulltexts)和[含 SHA-256 的索引](../../references/catalogs/licensed-files.csv)。其中 101 份为普通 PDF，CORE-B034 的 3 段按编号拼接后可校验恢复。新一轮 21 项与旧库有重合，按全库导航的作品编号查重。

## 接下来怎样改

1. 用一个中性委托走完整个设计任务。先试四旋，再切到同任务的平面六旋。从设计者指定部件、确认目标、预览改动、生成候选到决定保留或修订，找出不清楚或多余的操作。历史 B2 图可以用于解释人工深化。
2. 减少设计者主流程的操作负担。来源、图像输入、规格版本与模型回执可放在可展开的研究详情里。保留可查的原句、真实引用、父图、采纳、主动驳回、撤销及其理由。让使用者分清自由输入、由参数编译的输入和真正提交给服务的输入。
3. 第四章用四旋案例验证设计过程。第五章在同一中性任务下检查迁移后回图的轴位、比例、非目标部位保持和视觉感知。农业六旋是另一种使用任务。共轴层数需要同一方案的补充观察。
4. 界面修改后运行几何检查、既有方案回放、设计对话与回图回归；再从正常入口试桌面和手机。把完成的软件检查、真实模型调用、作者场次和独立评议分别登记。

## 两台电脑之间的数据边界

提交中包含应用与锁文件、可离线运行的构建、文献及图页定位、原创流程稿、脱敏运行材料和研究协议。浏览器草稿、IndexedDB 候选原件、工作台本机作业目录以及服务账号凭据各随本机。需要交接某次具体试验时，从工作台导出该轮记录，通过研究者获授权的渠道传递；公开仓库中的示例和文献清单可直接由两台电脑读取。

老师批注稿的第 40 条为 Cohen，另一份 47 项修订稿筛查表的第 40 条为 GenAlign。同一条文献使用稳定引用键，合入实际写作底稿时再编号。
