"""把第二位判读者的回件与 points.csv 对照。用法：python3 compare.py 回件.json [回件2.json …]
回件可以是下载的 JSON，也可以是存成文本的“复制结果”（以 S5G1: 开头）。页面按嵌入图的像素记坐标，这里先换算到 1024 像素。
输出：电机中心逐点距离、机壳四缘之差、四项比例两位判读者之差与等级相关。只用标准库。"""
import base64, csv, json, math, pathlib, statistics, sys
import metrics

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent)); import summarize as S   # 只借用等级相关

def load(path):
    t = pathlib.Path(path).read_text(encoding='utf-8-sig').strip()
    if t.startswith('S5G1:'): t = base64.b64decode(t[5:]).decode('utf-8')
    try: return json.loads(t)
    except json.JSONDecodeError: return json.loads(t + '}')

def to_row(base, r):
    """把一张图的回件写成 points.csv 的同一行格式，电机按离参照点最近配对。"""
    k = 1024 / r['natural'][0]; row = dict(base); n = int(base['rotors'])
    ref = [(float(base['hub%d_x' % i]), float(base['hub%d_y' % i])) for i in range(1, n + 1)]; mine = [(x * k, y * k) for x, y in r['hubs']]; dist = []
    for i, h in enumerate(ref, 1):
        j = min(range(len(mine)), key=lambda j: math.dist(h, mine[j])); dist.append(math.dist(h, mine[j])); row['hub%d_x' % i], row['hub%d_y' % i] = mine[j]
    for key, src, axis in [('body_top_y', 'front', 1), ('body_bottom_y', 'rear', 1), ('body_left_x', 'left', 0), ('body_right_x', 'right', 0)]: row[key] = '' if r.get(src) is None else r[src][axis] * k
    for i in range(1, 9): row['tip%d_x' % i] = row['tip%d_y' % i] = ''
    if r.get('tip'):
        t = (r['tip'][0] * k, r['tip'][1] * k); j = min(range(n), key=lambda j: math.dist(t, (row['hub%d_x' % (j + 1)], row['hub%d_y' % (j + 1)]))); row['tip%d_x' % (j + 1)], row['tip%d_y' % (j + 1)] = t
    return row, dist

def main(paths):
    base = {r['image_id']: r for r in csv.DictReader(open(HERE / 'points.csv', encoding='utf-8-sig'))}
    name = {c: S.IMG[c]['name'].split()[0] for c in S.KEY['singles']}; KEYS = ['W_over_L', 'PV01_body_length_over_width', 'PV02_body_width_over_D', 'PV03_d_over_D']
    for p in paths:
        d = load(p); full = [c for c, r in d['images'].items() if len(r['hubs']) == int(base[name[c]]['rotors']) and all(k in r for k in ('front', 'rear', 'left', 'right', 'tip'))]   # 键在就是答过了，null 表示“看不清”
        print('# 判读者 %s：标完 %d 张；自报：%s' % (d['reader_id'], len(full), json.dumps(d.get('background', {}), ensure_ascii=False)))
        dists, a, b, edges = [], {k: [] for k in KEYS}, {k: [] for k in KEYS}, []
        for c in full:
            row, dist = to_row(base[name[c]], d['images'][c]); dists += dist; m1, m2 = metrics.compute(base[name[c]]), metrics.compute(row)
            for key, src in [('body_top_y', 'body_top_y'), ('body_bottom_y', 'body_bottom_y'), ('body_left_x', 'body_left_x'), ('body_right_x', 'body_right_x')]:
                if row[key] != '' and base[name[c]][key] != '': edges.append(abs(float(row[key]) - float(base[name[c]][key])))
            for k in KEYS:
                if m1[k] != '' and m2[k] != '': a[k].append(float(m1[k])); b[k].append(float(m2[k]))
        if not dists: continue
        print('电机中心（%d 个）：两人相距中位数 %.1f 像素，最大 %.1f 像素（1024 像素的图）' % (len(dists), statistics.median(dists), max(dists)))
        if edges: print('机壳四缘（%d 条）：相差中位数 %.1f 像素，最大 %.1f 像素' % (len(edges), statistics.median(edges), max(edges)))
        for k in KEYS:
            if len(a[k]) >= 2:
                diff = [abs(x - y) for x, y in zip(a[k], b[k])]
                print('%s：%d 款两人都量了；绝对差中位数 %.3f，最大 %.3f%s' % (k, len(diff), statistics.median(diff), max(diff), '；等级相关 %+.2f' % S.spearman(a[k], b[k]) if len(diff) >= 5 else ''))

if __name__ == '__main__':
    main(sys.argv[1:])
