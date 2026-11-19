"""汇总评议结果。用法：python3 summarize.py 答卷1.json 答卷2.txt …
答卷可以是下载的 JSON，也可以是存成文本的“复制结果”（以 S5P1: 开头）。输出计数和匿名的逐人数值。

2026-11-19 收到第一批回件后改过一次，读法没有变，改的是三处机械处理和一处补充，原因记在
responses/2026-11-19/README.md：
1. 4.0 版的回件也收：它的 32 张图与 5.0 版的前 32 张逐字节相同。
2. 文件结尾少一个右花括号的，补上再读，并在汇总里注明。
3. 看的图不一样的回件分成组，各组分开汇总，不合并。
4. 补充：评议者之间的一致程度（冻结的读法里没有这一项）。"""
import base64, collections, itertools, json, pathlib, statistics, sys

HERE = pathlib.Path(__file__).resolve().parent
KEY = json.loads((HERE / 'researcher-key.json').read_text(encoding='utf-8'))
# 与现行包共用同一批图的旧包。4.0 版 32 张图的 PNG 和嵌入页面的 JPEG 摘要与 5.0 版逐一相同（2026-11-19 核对）。
COMPATIBLE = {'9e157f56cc97': 'S5-pilot-4.0'}
IMG, TERMS = KEY['images'], KEY['terms']

def load(path):
    t = pathlib.Path(path).read_text(encoding='utf-8-sig').strip()
    if t.startswith('S5P1:'): t = base64.b64decode(t[5:]).decode('utf-8')
    try: return json.loads(t), False
    except json.JSONDecodeError:
        return json.loads(t + '}'), True      # 传输时丢了最后一个字符的情况；别的损坏仍然报错

def ranks(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
    while i < len(o):
        k = i
        while k + 1 < len(o) and v[o[k + 1]] == v[o[i]]: k += 1
        for m in range(i, k + 1): r[o[m]] = (i + k) / 2 + 1
        i = k + 1
    return r

def spearman(a, b):
    ra, rb = ranks(a), ranks(b); ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    num = sum((x - ma) * (y - mb) for x, y in zip(ra, rb)); den = (sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb)) ** 0.5
    return num / den if den else float('nan')

med = lambda v: statistics.median(v) if v else None

def score(resp, image, term):
    """换算后的读数：1 = 左极，7 = 右极；“看不出”返回 None。"""
    x = next(x for x in resp['singles'] if x['image'] == image); k = x['ratings'][term]
    if k == 'na': return None
    return 8 - k if x['flip'][term] else k

def block_report(images, rs, n_block, n_blocks):
    cfg = collections.Counter(IMG[c].get('config', '') for c in images)
    out = ['', '# 第 %d 组：%d 张图（%s），%d 份答卷' % (n_block, len(images), '、'.join('%s %d' % kv for kv in cfg.most_common()), len(rs)) if n_blocks > 1 else '']
    if len(rs) < 3:
        out += ['', '少于 3 份，按方案不报告。']; return out
    out += ['', '## 答卷', '', '| 序号 | 编号 | 页面版本 | 开始（UTC） | 各页用时相加（分钟） | 看不出 | 文件修补 |', '| ---: | --- | --- | --- | ---: | ---: | --- |']
    for i, r in enumerate(rs, 1):
        na = sum(score(r, c, t['id']) is None for c in images for t in TERMS)
        out.append('| %d | %s | %s | %s | %.1f | %d | %s |' % (i, r['response_id'], r['_version'], r['started_at'][:16].replace('T', ' '), sum(x['ms'] for x in r['singles']) / 60000, na, '补了结尾的花括号' if r['_repaired'] else '无'))
    out += ['', '## 评议者自报', '', '| 项目 | 分布 |', '| --- | --- |']
    for k, name in [('design', '设计背景'), ('years', '年限'), ('drone', '无人机熟悉程度'), ('relation', '与研究者'), ('exposure', '此前接触')]:
        c = collections.Counter(r['background'].get(k) for r in rs); out.append('| %s | %s |' % (name, '；'.join('%s %d' % kv for kv in c.most_common())))
    out.append('| 独自完成 | %s |' % '；'.join('%s %d' % kv for kv in collections.Counter(r['closing'].get('alone') for r in rs).most_common()))
    notes = [r['closing']['comment'].strip() for r in rs if r['closing'].get('comment', '').strip() not in ('', '无')]
    if notes: out += ['', '评议者留言：' + '；'.join('“%s”' % x for x in notes)]

    table = {c: {t['id']: [score(r, c, t['id']) for r in rs] for t in TERMS} for c in images}
    vals = lambda c, t: [v for v in table[c][t] if v is not None]
    out += ['', '## 各款的单图评分', '', '1 = 左极（紧凑、简洁、整体），7 = 右极（舒展、繁复、拼凑）。逐人读数按上表的序号排列，“—”是“看不出”，不计入中位数。按“紧凑—舒展”的中位数从紧凑到舒展排列。', '']
    order = sorted(images, key=lambda c: (med(vals(c, 'span')) is None, med(vals(c, 'span')) or 0, IMG[c]['name']))
    out += ['| 款 | 构型 | 类型 | ' + ' | '.join('%s—%s | 中位数' % (t['left'], t['right']) for t in TERMS) + ' |', '| --- | --- | --- |' + ' --- | ---: |' * len(TERMS)]
    for c in order:
        cells = []
        for t in TERMS:
            v = vals(c, t['id']); cells += [' '.join('—' if x is None else str(x) for x in table[c][t['id']]), ('%.1f' % med(v)).rstrip('0').rstrip('.') if v else '—']
        out.append('| %s | %s | %s | %s |' % (IMG[c]['name'], IMG[c].get('config', ''), IMG[c].get('type', ''), ' | '.join(cells)))

    out += ['', '## 评议者之间一致吗（补充项）', '', '方案冻结时没有这一项，收到回件后补的：只有几个人时，中位数靠不靠得住取决于他们彼此是否一致。两两之间的等级相关按两人都给了分的款计算；极差是同一款上最高与最低读数之差。', '',
            '| 词对 | 两两等级相关 | 极差 ≤ 1 的款 | 极差 2–3 | 极差 ≥ 4 |', '| --- | --- | ---: | ---: | ---: |']
    for t in TERMS:
        rho = []
        for a, b in itertools.combinations(range(len(rs)), 2):
            pts = [(table[c][t['id']][a], table[c][t['id']][b]) for c in images]; pts = [p for p in pts if None not in p]
            rho.append('%+.2f' % spearman([p[0] for p in pts], [p[1] for p in pts]) if len(pts) >= 5 else '—')
        spread = [max(vals(c, t['id'])) - min(vals(c, t['id'])) for c in images if len(vals(c, t['id'])) >= 2]
        out.append('| %s—%s | %s | %d | %d | %d |' % (t['left'], t['right'], '、'.join(rho), sum(s <= 1 for s in spread), sum(2 <= s <= 3 for s in spread), sum(s >= 4 for s in spread)))
    use = ['%d：%s' % (i, ' '.join('%d×%d' % (k, n) for k, n in sorted(collections.Counter(v for c in images for v in [table[c]['span'][i - 1]] if v is not None).items()))) for i in range(1, len(rs) + 1)]
    out += ['', '各人在“紧凑—舒展”上用到的分值（分值×次数）：' + '；'.join(use) + '。']

    for field, label in [('config', '构型'), ('type', '类型')]:
        groups = collections.defaultdict(list)
        for c in images:
            if IMG[c].get(field) and med(vals(c, 'span')) is not None: groups[IMG[c][field]].append(med(vals(c, 'span')))
        if len(groups) > 1:
            out += ['', '## 按%s看“紧凑—舒展”' % label, '', '各款中位数的中位数和范围。', '', '| %s | 款数 | 中位数 | 范围 |' % label, '| --- | ---: | ---: | --- |']
            for g, v in sorted(groups.items(), key=lambda kv: (statistics.median(kv[1]), kv[0])): out.append('| %s | %d | %.1f | %.1f–%.1f |' % (g, len(v), statistics.median(v), min(v), max(v)))
    out += ['', '## 评分与图上量得的读数', '', '斯皮尔曼等级相关，按各款“紧凑—舒展”的中位数算；正值表示读数越大越被评为舒展。%d 款、%d 人，只用来挑下一步值得检验的比例，不是结论。' % (len(images), len(rs)), '']
    for m, label in KEY['measures'].items():
        pts = [(IMG[c].get(m), med(vals(c, 'span'))) for c in images]; pts = [(a, b) for a, b in pts if a is not None and b is not None]
        if len(pts) >= 5: out.append('- %s：%+.2f（%d 款）' % (label, spearman([a for a, _ in pts], [b for _, b in pts]), len(pts)))
    out += ['', '这三项是程序在图上直接量的，不是规格里的参数。规格用的比例（电机中心的宽长比、机身长宽比、机身宽与对角电机距之比、桨径与轴距之比）要在图上标电机中心和机身外廓才有，这批图还没有标。']
    return out

def main(paths):
    seen, problems = {}, []
    for p in paths:
        name = pathlib.Path(p).name
        try: r, repaired = load(p)
        except Exception as e: problems.append('%s：读不出（%s）' % (name, e)); continue
        if r.get('pack') != KEY['pack'] and r.get('pack') not in COMPATIBLE: problems.append('%s：不是这一版或兼容版本的包（%s）' % (name, r.get('pack'))); continue
        if not r.get('finished_at') or not r.get('consent'): problems.append('%s：没有完成或没有同意' % name); continue
        if any(x['image'] not in IMG for x in r['singles']): problems.append('%s：含核对键里没有的图' % name); continue
        if r.get('pairs') or any(set(x.get('ratings', {})) != {t['id'] for t in TERMS} for x in r['singles']): problems.append('%s：有漏答或含成对题' % name); continue
        r['_version'] = COMPATIBLE.get(r['pack'], KEY['version']); r['_repaired'] = repaired
        old = seen.get(r['response_id'])
        if old: problems.append('%s：与另一份编号相同，保留完成时间较晚的一份' % name)
        if not old or r['finished_at'] > old['finished_at']: seen[r['response_id']] = r
    blocks = collections.defaultdict(list)
    for r in sorted(seen.values(), key=lambda r: r['started_at']): blocks[frozenset(x['image'] for x in r['singles'])].append(r)
    out = ['# 评议汇总（核对键 %s，包 %s）' % (KEY['version'], KEY['pack']), '', '读入 %d 份答卷，按所看的图分成 %d 组。各组分开汇总，不合并。' % (len(seen), len(blocks))]
    for b, rs in blocks.items():
        if len(b) != len(KEY['singles']): out.append('- %d 份只看了 %d 张图（现行页面是 %d 张）。' % (len(rs), len(b), len(KEY['singles'])))
    if problems: out += [''] + ['- ' + x for x in problems]
    order = sorted(blocks.items(), key=lambda kv: min(KEY['singles'].index(c) for c in kv[0]))
    for n, (b, rs) in enumerate(order, 1):
        out += block_report([c for c in KEY['singles'] if c in b], rs, n, max(2, len(order)))
    print('\n'.join(out))

if __name__ == '__main__':
    main(sys.argv[1:])
