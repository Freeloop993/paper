"""两份编码回件的一致性。只用标准库。
用法：python3 score_s6.py <编码者甲.json 或 .txt> <编码者乙.json 或 .txt> > s6-result.md
读法在看到回件之前写定，见 README 第三节：
- 主要结果：35 条入卡短句上，四个方面各按四类（偏左、偏右、谈到了但看不出、没谈到）报告混淆矩阵、一致条数、Cohen κ 和 Gwet AC1。
- 同时报告：把“谈到了但看不出”与“没谈到”合为“未表态”后的三类结果；加上 5 条干扰句的 40 条结果。
- 区间：按条目自助重抽 2,000 次的 2.5% 到 97.5% 分位，种子固定。
- 两位编码者各自与证据卡换算出的第一编码的对照，只作描述。"""
import base64, collections, json, pathlib, random, sys

HERE = pathlib.Path(__file__).resolve().parent
PAIRS = [('span', '紧凑—舒展'), ('plain', '简洁—繁复'), ('whole', '整体—拼凑'), ('color', '低调—醒目')]
CATS = ['L', 'R', 'U', 'N']; LAB = {'L': '偏左', 'R': '偏右', 'U': '谈到了但看不出', 'N': '没谈到', 'X': '未表态'}
# 第一编码：按 11 月 15 日登记的换算规则由证据卡得到（experiments/semantic40-pairing/README.md）；“低调—醒目”当时没有换算规则，这里按词对 v1 第 2 节补上，写于回件之前。
FIRST = {'span': {'L': ['E001', 'E010', 'E003', 'E009'], 'R': ['E002', 'E006', 'E007'], 'U': ['E004', 'E005']},
         'plain': {'L': ['E011', 'E012', 'E013', 'E014', 'E015', 'E016']},
         'whole': {'L': ['E016', 'E023'], 'R': ['E006', 'E007'], 'U': ['E024', 'E025']},
         'color': {'R': ['E029', 'E034'], 'L': ['E031'], 'U': ['E030', 'E027']}}


def load(path):
    t = pathlib.Path(path).read_text(encoding='utf-8-sig').strip()
    if t.startswith('S6C1:'): t = base64.b64decode(t[5:]).decode('utf-8')
    return json.loads(t)


def kappa(xs, ys, cats):
    n = len(xs); po = sum(x == y for x, y in zip(xs, ys)) / n
    pe = sum((xs.count(c) / n) * (ys.count(c) / n) for c in cats)
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


def ac1(xs, ys, cats):
    """Gwet 的 AC1：机会一致按各类的平均占比算，类别分布很偏时不像 κ 那样塌下去。"""
    n = len(xs); q = len(cats); po = sum(x == y for x, y in zip(xs, ys)) / n
    pi = [(xs.count(c) + ys.count(c)) / (2 * n) for c in cats]
    pe = sum(p * (1 - p) for p in pi) / (q - 1)
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


def interval(xs, ys, cats, fn, seed=20261120, reps=2000):
    r = random.Random(seed); n = len(xs); vals = []
    for _ in range(reps):
        idx = [r.randrange(n) for _ in range(n)]
        vals.append(fn([xs[i] for i in idx], [ys[i] for i in idx], cats))
    vals.sort(); return vals[int(.025 * reps)], vals[int(.975 * reps) - 1]


def first_coding(cards):
    """B 编号 → 四个方面的第一编码；干扰句没有第一编码。合并行两张卡取值不同记为 U。"""
    out = {}
    for b, c in cards.items():
        if c == 'distractor': continue
        out[b] = {}
        for k, rule in FIRST.items():
            vals = {next((code for code, es in rule.items() if e in es), 'N') for e in c.split('+')}
            out[b][k] = vals.pop() if len(vals) == 1 else 'U'
    return out


def three(v): return 'X' if v in ('U', 'N') else v


def block(P, title, ids, a, b, k):
    xs = [a[i][k] for i in ids]; ys = [b[i][k] for i in ids]
    P('**%s，%d 条。**\n' % (title, len(ids)))
    P('| 甲 ＼ 乙 | ' + ' | '.join(LAB[c] for c in CATS) + ' | 合计 |\n| --- | ' + ' | '.join('---:' for _ in CATS) + ' | ---: |')
    for c in CATS: P('| %s | %s | %d |' % (LAB[c], ' | '.join(str(sum(x == c and y == d for x, y in zip(xs, ys))) for d in CATS), xs.count(c)))
    P('| 合计 | %s | %d |\n' % (' | '.join(str(ys.count(d)) for d in CATS), len(ids)))
    for name, cats, fx in (('四类', CATS, lambda v: v), ('三类（看不出与没谈到合并）', ['L', 'R', 'X'], three)):
        x2 = [fx(v) for v in xs]; y2 = [fx(v) for v in ys]; agree = sum(p == q for p, q in zip(x2, y2))
        k1, k2 = interval(x2, y2, cats, kappa); g1, g2 = interval(x2, y2, cats, ac1)
        P('- %s：一致 %d/%d；κ = %.2f（%.2f 到 %.2f）；AC1 = %.2f（%.2f 到 %.2f）' % (name, agree, len(ids), kappa(x2, y2, cats), k1, k2, ac1(x2, y2, cats), g1, g2))
    P('')


def main(pa, pb):
    A, B = load(pa), load(pb); P = print
    import csv
    text = {r['id']: r['text'] for r in csv.DictReader((HERE / 'quotes.csv').open(encoding='utf-8-sig'))}
    cards = json.loads((HERE / 'b-to-card.json').read_text(encoding='utf-8'))
    for name, d in (('甲', A), ('乙', B)):
        if d.get('schema') != 's6-recode-v1': raise SystemExit('编码者%s的回件不是出自编码页面' % name)
        if set(d['answers']) != set(text) or d.get('complete') != 40: raise SystemExit('编码者%s的回件没有答完 40 条' % name)
    if A['pack'] != B['pack']: raise SystemExit('两份回件出自不同版本的页面，不能放在一起算')
    if A['coder_id'] == B['coder_id']: raise SystemExit('两份回件是同一个人的')
    a, b = A['answers'], B['answers']; src = sorted(i for i in text if cards[i] != 'distractor'); dis = sorted(i for i in text if cards[i] == 'distractor')
    P('# S6 词对重新编码：两位编码者的一致性\n')
    P('本页由 `score_s6.py` 从两份回件生成，不要手改。页面版本 %s。\n' % A['pack'])
    P('## 编码者\n\n| | 甲 | 乙 |\n| --- | --- | --- |')
    for key, lab in (('role', '身份'), ('field', '专业方向'), ('seen', '看过以前的编码结果、证据卡或论文稿'), ('repo', '打开过资料库'), ('coded_before', '以前给这 40 条做过编码')):
        P('| %s | %s | %s |' % (lab, A['respondent'].get(key), B['respondent'].get(key)))
    mins = lambda d: sum(v.get('ms', 0) for v in d['answers'].values()) / 60000
    P('| 各条用时相加 | %.1f 分钟 | %.1f 分钟 |' % (mins(A), mins(B)))
    P('| 开始（UTC） | %s | %s |\n' % (A['started_at'][:16].replace('T', ' '), B['started_at'][:16].replace('T', ' ')))
    P('## 四个方面\n\n括号里是按条目自助重抽 2,000 次得到的 95% 区间。主要结果是 35 条入卡短句上的四类结果。\n')
    for k, name in PAIRS:
        P('### %s\n' % name); block(P, '35 条入卡短句', src, a, b, k); block(P, '加上 5 条干扰句', src + dis, a, b, k)
    P('## 5 条干扰句\n\n干扰句是随机加进去的无关评论，理想的答案是四个方面都“没谈到”。\n\n| 短句 | 甲 | 乙 |\n| --- | --- | --- |')
    show = lambda r: '、'.join('%s %s' % (n, LAB[r[k]]) for k, n in PAIRS if r[k] != 'N') or '全部没谈到'
    for i in dis: P('| %s | %s | %s |' % (text[i][:40], show(a[i]), show(b[i])))
    P('\n## 与第一编码的对照（只作描述）\n\n第一编码是按登记的规则由证据卡换算的，不是照这份手册编的，所以这里的数只说明研究者当初的归类与独立编码者差多少。\n\n| 方面 | 甲与第一编码 | 乙与第一编码 |\n| --- | --- | --- |')
    F = first_coding(cards)
    for k, name in PAIRS:
        cell = lambda d: '一致 %d/35，κ = %.2f' % (sum(d[i][k] == F[i][k] for i in src), kappa([d[i][k] for i in src], [F[i][k] for i in src], CATS))
        P('| %s | %s | %s |' % (name, cell(a), cell(b)))
    P('\n## 两人判得不一样的条目\n')
    for k, name in PAIRS:
        diff = [i for i in src + dis if a[i][k] != b[i][k]]
        P('### %s（%d 条）\n' % (name, len(diff)))
        if diff:
            P('| 短句 | 甲 | 乙 | 甲的备注 | 乙的备注 |\n| --- | --- | --- | --- | --- |')
            for i in diff: P('| %s | %s | %s | %s | %s |' % (text[i].replace('|', '／')[:60], LAB[a[i][k]], LAB[b[i][k]], (a[i].get('note') or '').replace('|', '／'), (b[i].get('note') or '').replace('|', '／')))
            P('')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
