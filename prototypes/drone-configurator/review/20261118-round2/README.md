# 五页签配置器第二轮 · 交接报告

2026-11-18，Claude。分支 `claude/configurator-ui-20261117`，已合入方向分支最新提交 `119e1b0`。

**这一轮改了什么。** 上一轮的界面按一份过细的验收单堆满了状态标签、来源图例和核对信息，三栏各自滚动，比作者原来的页面难用。作者要求放下那份验收单，重新对照论文和研究目标来做。这一版从原页面的样子和用法重新出发，底下沿用已经核对过的几何、提示词和导出；页面本身全部重做。设计理由见[界面设计说明](../../interface-design.md)。

**这仍然是软件验收。** 操作由脚本驱动无界面 Chrome 完成，没有真人设计者参与；模型服务未接入，新增生成 0，新增评议 0。“通过”只说明界面、导出和文字相互对得上。

## 一、可以直接打开的东西

| 内容 | 位置 |
| --- | --- |
| 离线包 | [configurator-offline.zip](../../configurator-offline.zip)：解压后打开 `index.html` |
| 桌面截图（1440×900） | [首屏](screenshots/desktop-01-start.png) · [整页](screenshots/desktop-01-start-full-page.png) · [评论依据已采纳](screenshots/desktop-02-evidence-adopted.png) · [真 X 对比宽 X](screenshots/desktop-03-true-x-vs-wide-x.png) · [Deadcat](screenshots/desktop-04-deadcat.png) · [Deadcat 的条件图](screenshots/desktop-05-deadcat-guide-image.png) · [臂宽 20，提示词标黄](screenshots/desktop-06-arm-20-prompt.png) · [机身页签](screenshots/desktop-07-fuselage-tab.png) · [配件页签与侧视](screenshots/desktop-08-accessories-side-view.png) · [逐句来源与规格卡](screenshots/desktop-09-prompt-sources-and-spec-card.png) · [搜不到依据](screenshots/desktop-10-no-matching-evidence.png) |
| 窄屏截图（390×844，2 倍像素） | [首屏](screenshots/narrow-01-start.png) · [Deadcat、臂宽 20](screenshots/narrow-02-deadcat-arm-20.png) · [配件页签与侧视](screenshots/narrow-03-accessories-side-view.png) · [评论依据](screenshots/narrow-04-evidence.png) · [整页](screenshots/narrow-05-full-page.png) |
| 同一次走查的导出件 | [exports/](exports/)：八步，每步一个文件夹，含浏览器实际下载的条件图 PNG、提示词 TXT、规格 JSON，以及点击导出前一刻的屏幕读数 `screen.json` |
| 走查摘要 | [walkthrough.json](walkthrough.json) |
| 逐步核对 | [crosscheck.md](crosscheck.md)：104 项全部相符，由 [crosscheck.py](crosscheck.py) 生成 |

## 二、复现

```sh
cd prototypes/drone-configurator
npm ci
npm run package-offline   # 构建并打包离线包
npm run walkthrough       # 真实点击走一遍，重新生成 exports/ 与 screenshots/
(cd review/20261118-round2 && python3 crosscheck.py)
npm run verify && npm run replay && npm run check-offline
```

`walkthrough` 走的八步，手动也可以照做，每步后点「导出三件」：

1. 点「看看用户怎么说」，搜“小巧”，对 E001 点采纳、再点取消、再点采纳；关掉抽屉，在设计意图里点「紧凑」。
2. 点预览右上的「对比」，在机架页签点「宽 X 型」。
3. 点「Deadcat 型」；预览切到「条件图」看导出的那张图。
4. 机臂宽度点「10 mm」。
5. 机臂宽度点「20 mm」。
6. 机身页签选「流线舱」；配件页签选橙红、相机「机鼻下挂」；预览切到「侧视」。
7. 在设计意图里点 E001 旁的 ×，取消采纳。
8. 点「重置参数」；再打开评论依据搜“防水”，没有结果；关掉抽屉，在补充意图里写一句话。

## 三、实测结果

| 核对内容 | 结果 |
| --- | --- |
| 同一轴距下真 X 与宽 X | W/L 1.00 与 1.30；W × L 由 176.8 × 176.8 变为 198.2 × 152.4 mm；提示词只有布局句改写。导出像素坐标与已登记的研究条件图三档相差不超过 0.23 px |
| Deadcat | 四个轴心：左前 (−128.8, 60.1)、右前 (128.8, 60.1)、右后 (66.9, −95.5)、左后 (−66.9, −95.5) mm。屏幕、规格 JSON、提示词和 PNG 里的四个红点一致 |
| 只把臂宽从 10 改为 20 mm | 预览里机臂线宽 10 → 20；提示词只有第 7 句改写并标黄；JSON 同值；轴心坐标不变 |
| 指定流线舱、橙红、机鼻下挂 | 提示词由 11 句变为 14 句，新增的正是这三句；规格卡的自由项相应减少；颜色只在这一步出现 |
| 未选的护圈、颜色、碳纹 | 八份导出里，凡未选的都没有出现在全文中。另有 864 种组合的自动扫描 |
| 评论依据 | 搜“小巧”得到 E001；采纳、取消、再采纳前后，轴心、比例和提示词逐项相同；卡号与先后记录进入规格 JSON。搜“防水”无结果，改写一句意图，导出记为“设计者自定” |
| 真实下载 | 每步点「导出三件」后，浏览器在磁盘上写出三个同一时间戳的文件，共 24 个 |
| 离线包 | 解压后以 `file://` 打开：首屏正常，控制台无报错，没有任何非本地请求 |
| 窄屏 | 390×844 下五个页签一行排开，预览吸顶且可收起；走查中的点击全部生效 |

自动复核：`npm run verify` 33 项通过；`npm run replay` 8 份规格读回后逐项相同；`crosscheck.py` 104 项相符；`npm run check-offline` 通过；本轮改动的文件 `eslint` 无报错（`src/services/` 等未改动的旧文件仍有接手前就存在的报错）。

## 四、还没有验证的

1. **真人使用。** 这一版是否确实比原版和上一轮好用，只有我对着截图的判断。请作者自己走一遍；配对试验前最好再请一位没见过它的设计者试 15 分钟。
2. **模型响应。** 提示词和条件图没有发给任何模型。臂宽等写进了文字，不代表生成图会变。
3. **浏览器范围。** 只在 macOS 的 Chrome 158（无界面模式）上跑过。Windows、Edge、Firefox、Safari 和真实触屏都没有试。
4. **截图里的手机是模拟的。** 用的是 Chrome 的设备模拟，不是真机。
5. **无障碍。** 有基本的角色与标签，没有做读屏或纯键盘走查。

## 五、需要作者确认的取舍

| 事项 | 现在的做法 | 说明 |
| --- | --- | --- |
| 轴距的定义 | 两条对角电机中心距的平均值 | 另导出任意两轴最大距。Deadcat 上两者相差约 3%（均值 250 时最大距 257.68） |
| 宽 X、伸展 X 的缺省 W/L | 1.30 与 0.70，可调 | 是研究登记的实验档；量过的 11 款消费航拍机为 1.16–1.52 |
| 提示词文字 | 本配置器自己的一套英文句子 | 短语取自附录 A 的 v1.6，但不是 E3 用过的那份。正式出图前要由作者审定并冻结 |
| 用户画像 | 不再使用，改为词对意图加评论依据 | 原画像会带入黑灰配色、碳纹和护圈 |
| 造型项缺省 | 全部“不指定” | 原先机臂材料缺省为碳纤维、主色有缺省值 |
| 起落架缺省 | 沿用原来的“低矮滑撬/支腿，40 mm” | 消费航拍机多数没有独立起落架，是否改由作者定 |
| 页面标题 | “无人机造型配置器” | 原为“交互式无人机造型参数化AI生图” |

## 六、没有做的

父图登记与候选并排比较；尝试编号、计时与回执；三种文本的一致性比较；植保六旋入口；按相邻夹角输入。原因和后续安排见[界面设计说明](../../interface-design.md)末节。论文正文哪些地方可以按这一版来写、哪些不能，见[对照表](thesis-alignment.md)。
