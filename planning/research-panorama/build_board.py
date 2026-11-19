"""把研究全景写成白板元素。输出 board.json（全部元素）和 out/ 下逐个元素文件，供写入白板。
只描述布局与文字；左栏数字取自 STATUS.md、planning/2026-11-18-framework.md 和 planning/advisor-20261118/README.md（截至 2026-11-18），
右栏文献部分取自 literature/map.md 和 literature/check-20261119.md（2026-11-19）。
白板上的元素只增不重建：已有元素的编号不能变，所以新元素一律加在文件末尾。"""
import json, pathlib, sys

W = 1748
els, order = {}, []
def add(data):
    eid = 'e%d' % (len(els) + 1)
    els[eid] = data
    order.append(eid)
    return eid
def box(x, y, w, h, text, color='white', align='center', kind='rounded'):
    d = {'type': 'shape', 'kind': kind, 'x': x, 'y': y, 'w': w, 'h': h, 'color': color, 'size': 'body', 'text': text}
    if align != 'center': d['textAlign'] = align
    return add(d)
def section(y, h, title, x=0, w=W):
    return add({'type': 'container', 'x': x, 'y': y, 'w': w, 'h': h, 'text': title})
def text(x, y, s, size='body', wrap=None):
    d = {'type': 'text', 'x': x, 'y': y, 'text': s, 'size': size}
    if wrap: d['wrap'] = wrap
    return add(d)
arrows = []
def arrow(a, b, label=None, **more):
    d = {'type': 'arrow', 'from': a, 'to': b}
    if 'bends' not in more: d.update(fromSide='right', toSide='left')
    if label: d['label'] = label
    d.update(more)
    arrows.append(d)

# ---- 各分区先写（分区在最底层）----
Y1, H1 = 240, 198                # ① ②
Y3 = Y1 + H1 + 72; H3 = 418      # ③ 论证链
Y4 = Y3 + H3 + 72; H4 = 400      # ④ 表
Y5 = Y4 + H4 + 72; H5 = 178      # ⑤ 实际在做
Y6 = Y5 + H5 + 72; H6 = 318      # ⑥ 章节
Y7 = Y6 + H6 + 72; H7 = 218      # ⑦ 能说什么
Y8 = Y7 + H7 + 72; H8 = 256      # ⑧ 缺口
Y9 = Y8 + H8 + 72; H9 = 144      # ⑨ 顺序
section(Y1, H1, '① 我们在解决什么：三处断开', 0, 860)
section(Y1, H1, '② 要证明的一句话', 888, 860)
section(Y3, H3, '③ 一条论证链：每个研究问题检验其中一环（颜色是证据现状）')
section(Y4, H4, '④ 四个研究问题：怎么判、现在到哪、缺什么', 0, 1448)
section(Y5, H5, '⑤ 我们实际在做什么')
section(Y6, H6, '⑥ 六章各管链上的哪一段')
section(Y7, H7, '⑦ 能说什么，不能说什么')
section(Y8, H8, '⑧ 缺口，按影响排序')
section(Y9, H9, '⑨ 下一步的顺序（导师：先做系统、预试和评议，再写正文）')

# ---- 标题与图例 ----
text(0, 0, '多旋翼造型研究全景', 'title')
text(0, 84, '把说不清的外观意图，变成可检查、可修改、可追溯的造型方案', 'large')
text(0, 142, '《人智协同驱动的多旋翼无人机造型参数化可控生成方法研究》 · 主案例：日常随行航拍四旋翼 · 证据截至 2026-11-18 · 文献截至 2026-11-19', 'body', 1200)
box(1272, 14, 150, 44, '已有证据', 'green', kind='pill')
box(1432, 14, 150, 44, '部分 / 待证', 'yellow', kind='pill')
box(1592, 14, 150, 44, '缺口', 'pink', kind='pill')

# ---- ① 问题 ----
for i, s in enumerate(['**说不清**\n“紧凑”是折叠后小，还是展开时显得小？', '**控不住**\n文字提示管不住比例和部位', '**追不回**\n谁决定了什么？别人看得出意图吗？']):
    box(24 + i * 276, Y1 + 24, 252, 150, s)
# ---- ② 主张 ----
box(912, Y1 + 24, 812, 150, '设计者把用户语义和工程比例写成一份可编辑的**规格**；生成结果在这些参数上**量得到、读得出**；修订有边界，**取舍在设计者**；不知情的人能**读出意图**；与自由提示相比，有可量化的**收益或代价**。', align='left')

# ---- ③ 论证链 ----
r1, r2 = Y3 + 24, Y3 + 24 + 120 + 130
xs = [24 + i * 364 for i in range(5)]
c1 = box(xs[0], r1, 220, 120, '**用户评论**\n7,443 → 1,318 → 228 个文本簇', 'green')
c2 = box(xs[1], r1, 220, 120, '**确认的意图**\n采用 · 驳回 · 自定', 'yellow')
c3 = box(xs[2], r1, 220, 120, '**规格**\n语义词对 + 工程比例 + 造型档位', 'yellow')
c4 = box(xs[3], r1, 220, 120, '**条件图 + 文字**\n配置器编译，不训练模型', 'green')
c5 = box(xs[4], r1, 220, 120, '**候选图**\n每张可追到输入与种子', 'green')
c6 = box(xs[0], r2, 220, 120, '**量测与判读**\n部件图 12/12\n设计通路窄档 0/12', 'pink')
c7 = box(xs[1], r2, 220, 120, '**取舍 · 修订 · 接手**\n只有作者的 B2 记录', 'yellow')
c8 = box(xs[2], r2, 220, 120, '**终稿**\n目前只有一张顶视图', 'pink')
c9 = box(xs[3], r2, 220, 120, '**读出意图**\n醒目 3/3，紧凑未读出\n只有 3 人', 'pink')
box(xs[4], r2, 220, 120, '**RQ4 换构型**\n这条链还成立多少？\n六旋 39 张，任务也变了', 'yellow')
arrow(c1, c2, 'RQ1'); arrow(c2, c3); arrow(c3, c4, '编译'); arrow(c4, c5, '生成')
arrow(c5, c6, 'RQ2', bends=['v', 125])
arrow(c6, c7, 'RQ3'); arrow(c7, c8); arrow(c8, c9, 'RQ1′')

# ---- ④ 表 ----
rows = [
    ('问题', '怎么判', '现在到哪', '缺什么'),
    ('RQ1 “紧凑”指什么，怎样确认', '检索命中 · 错引 · 该拒答', '228 个造型表述簇；36 张卡；κ 0.17–0.60', '语义还没接到参数上'),
    ('RQ2a 布局比例控得住吗', '目标值对实测值，逐张量', '部件图 12/12；设计通路窄档 0/12', '设计通路的独立盲测为 0'),
    ('RQ2b 造型档位出得来吗', '匿名判读部件是否出现', '96 张两次 AI 盲读；真人只读 12 张', '真人判读少，且有分歧'),
    ('RQ2c 改得对、保得住吗', '目标达成与其余保持分开判', '没有一例目标修改被确认', '第二版 73 份请求未运行'),
    ('RQ1′ 意图读得出吗', '不知情的人逐图评分', '醒目 3/3；紧凑 5、5、4；共 3 人', '还差 7 人和比例对照图'),
    ('RQ3 协同的收益与代价', '同一人两种方式配对', '作者预试 0 场；外部设计者 0/3', '全部真人场次'),
    ('RQ4 换构型还成立吗', '同一中性任务比构型', '农业六旋 39 张，36 张 AI 复测', '任务与构型同时变了'),
]
widths = [330, 300, 440, 330]
add({'type': 'table', 'x': 24, 'y': Y4 + 24,
     'cols': {'c%d' % (i + 1): {'at': i + 1, 'w': w} for i, w in enumerate(widths)},
     'rows': {'r%d' % (j + 1): {'at': j + 1, **{'c%d' % (i + 1): cell for i, cell in enumerate(row)}} for j, row in enumerate(rows)}})

# ---- ⑤ 实际在做 ----
for i, s in enumerate([
    '**资料**\n评论 7,443 个文本簇 · 36 张证据卡\n真实机型 30 款 · 文献库 131 项（核心 37）',
    '**系统**\n一块画布的工作台：目标 → 依据 → 造型 → 生成 → 候选 → 取舍，每一步留记录',
    '**实验**\n已有：布局 36 张 · 设计三轮 27 张 · 造型 96 张 · 六旋 39 张\n缺：设计者场次 0，评议只有 3 人']):
    box(24 + i * 572, Y5 + 24, 556, 130, s, align='left')

# ---- ⑥ 章节 ----
chapters = [
    ('**第1章 绪论**\n问题 · 目标 · 四个研究问题 · 技术路线', 'yellow'),
    ('**第2章 相关研究与理论基础**\n- 2.2 语义与意图 → RQ1\n- 2.3–2.4 参数化与可控生成 → RQ2\n- 2.5 人智协同 → RQ3\n- 2.6 与最近工作的比较', 'yellow'),
    ('**第3章 造型意图转译与人智协同可控生成方法**\n- 3.2 需求资料 → RQ1\n- 3.3 意图 → 规格\n- 3.4 参数与条件图 → RQ2\n- 3.5 协同生成与反馈 → RQ3\n- 3.6 评价维度', 'yellow'),
    ('**第4章 四旋翼无人机的人智协同设计**\n- 任务与原型\n- 多方向候选与筛选\n- 取舍与迭代（B2）\n- 深化与设计表达\n- 外部设计者两种方式 → RQ3', 'yellow'),
    ('**第5章 关键设计指标验证与跨构型无人机设计应用**\n- 比例命中 → RQ2a\n- 部件造型 → RQ2b\n- 局部修改与保持 → RQ2c\n- 意图感知 → RQ1′\n- 跨构型 → RQ4', 'pink'),
    ('**第6章 结论与展望**\n逐问回答：支持到哪、在哪失效、哪些没验证', 'white'),
]
for i, (s, colour) in enumerate(chapters):
    box(24 + i * 287, Y6 + 24, 263, 270, s, colour, align='left')

# ---- ⑦ 能说什么 ----
box(24, Y7 + 24, 838, 170, '**不能说“首次”**\n- 评论 → 参数 → 生成：AutoGen-Insight 已做\n- 参数化可控生成：Parametric-ControlNet 已做\n- 生成式 AI 用于无人机造型：Chen 等已做\n- 结构化优于自由提示：已有 12–52 人的对照（CHI 2024、2025 等）', 'pink', align='left')
box(886, Y7 + 24, 838, 170, '**可以说（都还待证）**\n- 免训练、由配置器编译的双重参数规格\n- 两条生成通路各自的比例响应\n- 部件级评价 + 可追溯的设计证据\n- 合起来：能指出一次偏差出在链上的哪一段，以及换构型后的边界', 'yellow', align='left')

# ---- ⑧ 缺口 ----
gaps = [
    '**1 真人数据几乎为零**\n预试 0 场 · 设计者 0/3 · 评议 3/10',
    '**2 设计实际用的通路没控住比例**\n窄档 0/12，独立盲测为 0',
    '**3 “紧凑”没有接到参数上**\n文献都有“词 → 造型要素”映射，本文没有',
    '**4 局部修改没有一例被确认**\n第二版 73 份请求还没运行',
    '**5 设计成果只有一张顶视图**\n缺三视图、尺寸、折叠、色材',
    '**6 跨构型里任务和构型混在一起**\n需要同一中性任务的对照',
    '**7 目录没有对齐**\n第4、5章已改题，小节仍是旧的',
    '**8 系统刚改成一块画布**\n试验前要冻结版本和输入方式',
]
for i, s in enumerate(gaps):
    box(24 + (i % 4) * 431, Y8 + 24 + (i // 4) * 116, 407, 92, s, 'pink', align='left')

# ---- ⑨ 顺序 ----
steps = ['**补原件并核页**\n冻结系统版本', '**作者预试**\n两种方式各一场', '**独立复测比例**\n真人取点与校准', '**外部设计者 3 人**\n评议 10 人', '**中性任务跨构型**\nB2 设计表达', '写第4、5章']
ids = [box(24 + i * 284, Y9 + 24, 220, 96, s) for i, s in enumerate(steps)]
for a, b in zip(ids, ids[1:]): arrow(a, b)

for d in arrows: add(d)
arrows = []

# ==== 2026-11-19 增补：文献依据（右栏，蓝色）====
X0, WR = W + 72, 900
YA, HA = Y1, 688                 # ⑩ 三个圈子
YB, HB = YA + HA + 72, 448       # ⑪ 每一环先看哪些文献
YC, HC = YB + HB + 72, 486       # ⑫ 要改的五处
section(YA, HA, '⑩ 文献地图：三个圈子很少互引，本文在交点', X0, WR)
section(YB, HB, '⑪ 每一环先看哪些文献（编号见 literature/catalog.csv）', X0, WR)
section(YC, HC, '⑫ 读完文献后，研究要改的五处', X0, WR)
YD, HD = YC + HC + 72, 284       # ⑬ 等作者决定
section(YD, HD, '⑬ 需要作者做的事', X0, WR)
text(X0, 84, '文献依据：读完上传的 226 份之后', 'large')
text(X0, 142, '保留 131 项（核心 37）· 核过原页 44 项 · 目录与关系图在仓库 literature/', 'body', 880)
box(1112, 14, 150, 44, '文献', 'blue', kind='pill')

# ---- ⑩ 三个圈子 ----
k1 = box(X0 + 24, YA + 24, 354, 150, '**感性工学 → 生成式造型**\nK、G 簇 33 项 · 工程设计期刊\n评论 → 感性词 → 映射 → 训练出图', 'blue', align='left')
k2 = box(X0 + 522, YA + 24, 354, 150, '**生成式设计工具与设计者研究**\nT、H 簇 58 项 · CHI、UIST、DIS\n提示 · 画布探索 · 协同比较', 'blue', align='left')
me = box(X0 + 280, YA + 284, 340, 150, '**本文**\n用户语义 + 参数控制几何\n+ 可追溯取舍 + 多旋翼\n四件事同时做的，库里没有')
k3 = box(X0 + 273, YA + 524, 354, 136, '**无人机造型**\nU 簇 11 项 · 中文期刊与学位论文\n几乎是孤岛：只有 3 条互引\n没有跨构型比较', 'blue', align='left')
box(X0 + 24, YA + 524, 225, 136, '**两圈之间的桥**\nAutoSpark L056\nControlNet L053', align='left')
box(X0 + 651, YA + 524, 225, 136, '**导师课题组**\n形状文法 +\n交互式遗传算法\nL043–L046', align='left')
arrow(k1, k2, '12 条互引', head='both', dash=True)
arrow(k1, me, fromSide='bottom', toSide='left')
arrow(k2, me, fromSide='bottom', toSide='right')
arrow(k3, me, fromSide='top', toSide='bottom')

# ---- ⑪ 每一环先看哪些文献 ----
lit = [
    ('环节', '文献里怎么做', '先看'),
    ('评论 → 意图 RQ1', '取感性词，再定量评分', 'L012 L013 L018 A08'),
    ('意图 → 规格', '拆成造型要素，建“词 → 要素”映射', 'L005 L030 L043–L046'),
    ('规格 → 生成 RQ2', '多数训练模型；少数用条件控制并量几何', 'L053 L030 A07 A10'),
    ('修订 RQ2c', '改动与保持分开评', 'A06 B06 L057'),
    ('工作台', '步骤在画布上，侧栏随选中变化', 'B05 A03 A01 L056'),
    ('协同比较 RQ3', '同一后端比界面，16–79 人', 'L072 L057 L065'),
    ('读出意图 RQ1′', '统一刺激图，独立评分', 'L005 A11 L100'),
    ('跨构型 RQ4', '没有先例', 'L001–L011'),
]
lw = [200, 370, 282]
add({'type': 'table', 'x': X0 + 24, 'y': YB + 24,
     'cols': {'c%d' % (i + 1): {'at': i + 1, 'w': w} for i, w in enumerate(lw)},
     'rows': {'r%d' % (j + 1): {'at': j + 1, **{'c%d' % (i + 1): cell for i, cell in enumerate(row)}} for j, row in enumerate(lit)}})

# ---- ⑫ 要改的五处 ----
changes = [
    ('**1 定位换说法**\n评论加条件控制已有人做（L030）\n本文不同在免训练、量几何、记录取舍', 'white'),
    ('**2 “词 → 造型要素”靠 S5 接上**\n比例对照图的紧凑感评议已登记\n现有回件 0 份', 'white'),
    ('**3 接上导师课题组的线**\n形状文法加交互式遗传算法是早一代的“人在回路”', 'white'),
    ('**4 RQ3 只写形成性发现**\n同类对照 16–79 人，本文 3 人；量表沿用通行的', 'white'),
    ('**5 RQ4 的判据先登记**\n无人机造型文献没有跨构型比较可依', 'white'),
    ('**先核原页**\n最接近的工作里还有 6 篇没有核过原页\n2.6 比较表的初稿已写', 'pink'),
]
for i, (s, colour) in enumerate(changes):
    box(X0 + 24 + (i % 2) * 438, YC + 24 + (i // 2) * 154, 414, 130, s, colour, align='left')

# ---- ⑬ 等作者决定 ----
for i, s in enumerate([
    '**评议者与设计者**\n评议 10 人（现有 3 人）、外部设计者 3 人\n判读者 1–2 人',
    '**作者自己的两场预试**\n结构化方式与自由提示各一场',
    '**合并 PR，执行整理清单**\n#79 工作台、#81 文献库\n其余 PR 和分支的去留已定，尚未执行',
    '**定两件事**\n第 5 章 5.4 节留给什么\n重排日程（原定 11 月 22 日）']):
    box(X0 + 24 + (i % 2) * 438, YD + 24 + (i // 2) * 130, 414, 106, s, align='left')

for d in arrows: add(d)
order.sort(key=lambda i: els[i]['type'] != 'container')   # 分区垫底，其余保持先后
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'out')
out.mkdir(parents=True, exist_ok=True)
for eid, d in els.items(): (out / (eid + '.json')).write_text(json.dumps(d, ensure_ascii=False), encoding='utf-8')
meta = {'v': 1, 'title': '多旋翼造型研究全景', 'order': order}
(out / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False), encoding='utf-8')
pathlib.Path('board.json').write_text(json.dumps({'meta': meta, 'elements': els}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(len(els), 'elements; board', X0 + WR, 'x', Y9 + H9)
