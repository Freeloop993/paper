# 配置器第三轮 · 交接报告

2026-11-18，Claude。分支 `claude/configurator-ui-20261117`（已含方向分支 `119e1b0`）。

**这一轮做了什么。** 作者认为前两轮都没有做出应有的设计水准，要求放下此前所有具体要求，只守一条：贴合研究方向和目标，做一个精致、有辨识度、好用的系统界面。这一版把配置器重做成三段式的造型工作台——洞察、造型、交付——画布可以直接拖动，并加入布局空间图、设计提示、参考机型和并行方案。设计理由见[界面设计说明](../../interface-design.md)。底下的几何、提示词和导出沿用此前核对过的实现。

**这仍然是软件验收。** 走查由脚本驱动无界面 Chrome 完成，没有真人设计者参与；模型服务未接入，新增生成 0，新增评议 0。

## 一、需要作者先知道的两件事

1. **评论数据库这一轮没有读到。** 作者要求到数据库里实际检索值得用的短引文。私有阅读库 `Freeloop993/paper-reading-room` 对本机登录的 GitHub 账号不可见，本机也没有评论文件（`design_filtered_comments.json` 或早期爬取包）；公开仓库各分支里只有 36 张卡。所以界面里的短引文仍是这 36 条。能做的两件事已经做了：洞察页用语料的主题分布（228 条外形评论里小巧 99、便携 67、好看 61、轻 49……）作为比 36 条示例更可靠的依据；`npm run evidence -- --extra <文件>` 可以把新挑的短引文并入界面。**需要作者提供其一：** 给该账号开通阅读库权限，或把评论文件放到本机，我再去实际筛选。
2. **是否好用仍需要人来判断。** 我只对着截图和脚本结果做了判断。

## 二、可以直接打开的东西

| 内容 | 位置 |
| --- | --- |
| 离线包 | [configurator-offline.zip](../../configurator-offline.zip)：解压后打开 `index.html` |
| 桌面截图（1440×900） | [洞察](screenshots/desktop-01-insight.png) · [洞察：采纳依据并选定意图](screenshots/desktop-02-insight-brief.png) · [造型：真 X](screenshots/desktop-03-studio-true-x.png) · [宽 X 叠上方案 A 对比](screenshots/desktop-04-studio-wide-x-vs-variant-a.png) · [Deadcat](screenshots/desktop-05-studio-deadcat.png) · [条件图视图](screenshots/desktop-06-studio-guide-image.png) · [交付：臂宽 20 标黄](screenshots/desktop-07-handoff-arm-20.png) · [画布上拖动之后](screenshots/desktop-08-studio-dragged.png) · [指定造型](screenshots/desktop-09-studio-styling.png) · [侧视](screenshots/desktop-10-studio-side-view.png) · [交付：逐句来源](screenshots/desktop-11-handoff-sources.png) · [套用 Mini 3 Pro 比例](screenshots/desktop-12-studio-reference-aircraft.png) · [搜不到依据](screenshots/desktop-13-insight-no-match.png) |
| 窄屏截图（390×844，手机模拟） | [洞察](screenshots/narrow-01-insight.png) · [造型](screenshots/narrow-02-studio.png) · [交付](screenshots/narrow-03-handoff.png) · [交付整页](screenshots/narrow-04-handoff-full-page.png) |
| 同一次走查的导出件 | [exports/](exports/)：十步，每步含浏览器实际下载的条件图 PNG、提示词 TXT、规格 JSON，以及当时的屏幕读数 `screen.json` |
| 走查摘要与逐步核对 | [walkthrough.json](walkthrough.json) · [crosscheck.md](crosscheck.md)（150 项全部相符） |

## 三、复现

```sh
cd prototypes/drone-configurator
npm ci
npm run package-offline
npm run walkthrough
(cd review/20261118-round3 && python3 crosscheck.py)
npm run verify && npm run replay && npm run check-offline
```

`walkthrough` 的十步：① 洞察页搜“小巧”，收藏 E001、取消、再收藏，选「紧凑」，进入造型（方案 A，真 X）；② 复制为方案 B，改宽 X，把方案 A 叠上来；③ 改 Deadcat，看条件图；④ 臂宽 10；⑤ 臂宽 20；⑥ 回到宽 X，在画布上拖右前轴心，再拖机身宽度手柄；⑦ 选流线舱、橙红、机鼻下挂相机，看侧视；⑧ 套用 Mini 3 Pro 的比例；⑨ 回洞察页取消 E001；⑩ 重置，搜“防水”无结果，自写一句意图。每步都到交付页点「导出三件」。

## 四、实测结果

| 核对内容 | 结果 |
| --- | --- |
| 真 X 与宽 X | W/L 1.00 与 1.30；提示词只有布局句改写；导出坐标与已登记研究条件图相差不超过 0.23 px |
| Deadcat | 四个轴心，画布、交付页条件图、规格 JSON、提示词和 PNG 红点一致 |
| 臂宽 10 → 20 mm | 画布线宽、提示词第 7 句（标黄）、JSON 同步变化，其余不变 |
| 画布拖动 | 真实鼠标拖右前轴心：W/L 1.30 → 1.39，轴距随之变化；拖机身宽度手柄：机身宽 ÷ 轴距 0.28 → 0.19。拖动期间画布比例锁定，数值不漂 |
| 套用真实机型 | 套用 Mini 3 Pro：W/L 1.52、轴距 247 mm、桨径 6.0 英寸，桨径 ÷ 轴距 0.62；设计提示给出“相邻桨盘重叠 17 mm（真实折叠机靠前后桨错层）” |
| 设计提示 | 真 X 提示前桨进入相机视野约 16°，宽 X 约 4°，Deadcat 在视野之外——与“Deadcat 让前桨避开画面”的常识一致 |
| 未选的护圈、颜色、碳纹 | 十份导出里凡未选的都没有出现；选了橙红后颜色才出现 |
| 评论依据 | 搜索、收藏、取消、再收藏均不改参数；搜不到时自写意图，导出记为“设计者自定” |
| 方案 | 复制为方案 B 后两份状态各自独立；导出的规格 JSON 带方案名 |
| 真实下载与离线包 | 每步浏览器实际写出三个文件，共 30 个；离线包以 `file://` 打开无报错、无非本地请求 |
| 窄屏 | 三个环节都能用；造型页画布吸顶 |

自动复核：`npm run verify` 33 项通过；`npm run replay` 10 份规格逐项相同；`crosscheck.py` 150 项相符；`npm run check-offline` 通过；本轮改动的文件 `eslint` 无报错。

## 五、还没有验证的

1. **真人使用。** 没有任何设计者用过。画布拖动的手感、三个环节的顺序是否顺手，都要人来试。
2. **模型响应。** 提示词和条件图没有发给任何模型。
3. **设计提示是近似。** 相机视野按 82° 水平视角、机身前缘中点为顶点的俯视二维近似；真实机型里相机高度、云台位置和桨的高度都会影响结果。只适合当提醒。
4. **浏览器范围。** 只在 macOS 的 Chrome 158（无界面模式）上跑过；手机是设备模拟，触屏拖动没有在真机上试。
5. **无障碍。** 画布拖动没有键盘替代操作（同样的参数可以在页签里用滑块和数字框改）。

## 六、需要作者确认的取舍

| 事项 | 现在的做法 |
| --- | --- |
| 整体框架 | 三个环节：洞察、造型、交付；默认从洞察开始 |
| 主题与词对的对应 | “小巧、便携、折叠 → 紧凑—舒展”“简洁 → 简洁—繁复”等，是按论文表3.4 的转译标在短引文上的提示，不是评论自己说的 |
| 相机视角 | 示意值 82°（Mini 4 Pro 标称 82.1°） |
| 轴距的定义 | 两条对角电机中心距的平均值，另导出最大两轴距 |
| 宽 X、伸展 X 的缺省 W/L | 1.30 与 0.70（实验档），可调可拖 |
| 提示词文字 | 本配置器自己的一套英文句子，短语取自附录 A 的 v1.6，不是 E3 用过的那份 |
| 用户画像 | 不再使用 |
| 起落架缺省 | 沿用原来的“低矮滑撬/支腿，40 mm” |

## 七、没有做的

父图登记与候选并排比较；尝试编号、计时与回执；三种文本的一致性比较；植保六旋入口；按相邻夹角输入；折叠状态。论文正文哪些地方可以按这一版来写、哪些不能，见[对照表](thesis-alignment.md)。

## 八、外部参考

- Lovart 的界面形态（大画布、右侧对话面板、点选直接改）：[Lovart 官方介绍](https://www.lovart.ai/features/infinite-chatcanvas-ai-collaboration)、[第三方评测](https://www.piclumen.com/blog/lovart-review/)
- DJI Mini 4 Pro 主摄 24 mm 等效、视角 82.1°：[TechRadar 评测](https://www.techradar.com/cameras/drones/dji-mini-4-pro-review)
- 真 X、宽 X、Deadcat 的区别与“Deadcat 让前桨避开画面”：[GetFPV 机架入门](https://www.getfpv.com/learn/new-to-fpv/all-about-multirotor-fpv-drone-frame/)、[hobbydrone 机架几何](https://www.hobbydrone.cz/en/blog/frame-geometry--deadcat--squished-x--or-true-x)（爱好者与厂商资料，仅作常识参考）
- 真实机型数据：仓库 `evidence/20261117-research-update/a1/` 与 `evidence/20261117-config-review/A2*`
