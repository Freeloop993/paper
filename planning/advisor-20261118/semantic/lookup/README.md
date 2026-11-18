# 公开语义卡的离线结构化检索

设计者给出任务、构型、意图和观察状态后，使用这个接口找回对应的原句与限制。它读取仓库已有的 36 张公开短引卡，按 35 个匿名来源组织。研究者按原卡建立了 17 个话题，覆盖部位、状态、正面与异向表达。话题标注及卡号可以直接审阅。[话题和适用状态](topics.mjs) · [原始公开卡](https://github.com/Freeloop993/paper/blob/9afe6903b0368cd86ced367c3675bb4a7adc98e2/evidence/semantic-cards/cards.csv)

## 本地查询

在本目录运行，使用 Node 22+、Python 3 和 Git。默认读取当前仓库 HEAD 中的公开 CSV，稀疏检出也可使用。也可传入 `--cards <cards.csv>`，或直接使用 PR #75 已随前端发布的 `--cards <evidenceCards.json>`；后一种只需 Node。运行时核对 36 张卡内容的统一摘要。

~~~text
node cli.mjs --vocabulary
node cli.mjs --task consumer_camera --layout quad --topic compactness --state unspecified
node cli.mjs --task consumer_camera --layout quad --topic bag_fit --state folded
node cli.mjs --task consumer_camera --layout quad --topic compactness --state unfolded_top
node cli.mjs --task consumer_camera --layout quad --topic pocket_fit --state carrying
node cli.mjs --task agricultural_spraying --layout flat_hex --topic compactness --state unfolded_top
~~~

## 接入设计系统

界面可由设计者选择结构化字段，也可在解析自由输入后让设计者确认字段。查询函数读取明确字段。对于“折起来能放进小包”，按整机、折叠和包内适配查询；“展开时希望机身显得紧凑”使用机身、展开顶视与紧凑意图。[浏览器可用模块](lookup.mjs)

~~~js
import { createLookup } from "./lookup.mjs";
import cards from "./data/evidenceCards.json";
const lookup = await createLookup(cards);
const result = lookup({
  task: "consumer_camera", layout: "quad", component: "whole_product",
  topic: "bag_fit", state: "folded"
});
~~~

`retrieve` 返回有来源的文字实例。`clarify` 给出澄清原因，可带语境短引以及下次要选的字段。`abstain` 表示当前任务、构型、部位或状态缺少直接依据。`layout=general` 专用于消费语料的一般性问题。针对平面六旋或共轴等构型的任务须传入其真实构型，才能显示该构型的覆盖缺口。原卡没有逐条标定构型；在四旋主任务中，返回卡可说明用户表达，构型所致的效应另测。

按 `groups` 展示匿名来源，同源卡放在一起。E003 和 E004 共述一人的小包与口袋体验。E008 的机型语境冲突随 E009 作为 `caution` 返回。每张保留原短引、对象、原记录状态、极性与限制。界面篇幅有限时可先展示前几个来源，保留同源的全部卡和显式限制。列表顺序沿用题表的编辑次序，尚无人工相关度标定。

`hypotheses` 记录研究端提出的待测关系。四旋、展开顶视、紧凑这一组合可指向已有 CW-1.0 壳宽操纵，其直接评论证据为空。`parameterChanges` 始终为空。设计者采纳、改写或拒绝后，宿主工作台保存查询字段、索引版本与摘要、原卡 ID、实际决定及下一版参数。查询操作本身不提交或修改方案。

## 开发复核

~~~text
node check.mjs
node check.mjs <PR75目录>/src/data/evidenceCards.json
~~~

复核覆盖全部公开卡、同源反例、折叠与展开、不同防护部件、构型或任务超范围、原卡遭改动、返还结果的隔离，以及原 CSV 与 PR #75 客户端数据逐话题的输出一致性。研究者参与过编写索引和样例。检索效果仍要用独立标注查询评价，真实作者预试及 RAG 对照另行登记。
