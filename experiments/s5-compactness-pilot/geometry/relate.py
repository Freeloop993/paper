"""评分与规格比例的等级相关。在上一级目录运行：
python3 geometry/relate.py responses/2026-11-19/*.json responses/2026-11-20/*.json
三组：四旋翼 32 款（44 张混排的答卷与只看 32 张的答卷合并）；44 款混排；混排答卷里的非四旋翼 12 款。
比例分别取两位判读者的读数（判读者二的回件在 geometry/returns/）。正值表示比例越大越被评为舒展。只用来挑下一步要检验的比例。"""
import collections, csv, pathlib, statistics, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import summarize as S
import compare, metrics

HERE = pathlib.Path(__file__).resolve().parent
MEASURES = [('W_over_L', '电机布局宽长比 W/L'), ('PV01_body_length_over_width', '机壳长宽比'), ('PV02_body_width_over_D', '机壳宽 / 对角电机距'), ('PV03_d_over_D', '桨径 / 对角电机距 d/D'), ('fill_of_bbox', '（对照）整机占外接框面积')]

def readers():
    """返回 [(名称, {图号: 比例})]。判读者一是 points.csv；其余来自 returns/ 里的回件。"""
    base = {r['image_id']: r for r in csv.DictReader(open(HERE / 'points.csv', encoding='utf-8-sig'))}
    out = [('判读者一', {p: metrics.compute(r) for p, r in base.items()})]
    name = {c: S.IMG[c]['name'].split()[0] for c in S.KEY['singles']}
    for f in sorted((HERE / 'returns').glob('*.json')):
        d = compare.load(f); m = {}
        for c, r in d['images'].items():
            if len(r['hubs']) == int(base[name[c]]['rotors']) and all(k in r for k in ('front', 'rear', 'left', 'right', 'tip')): m[name[c]] = metrics.compute(compare.to_row(base[name[c]], r)[0])
        out.append(('判读者二', m))
    return out

def value(m, pid, c, key):
    if key == 'fill_of_bbox': return S.IMG[c].get(key)
    v = m.get(pid, {}).get(key, '')
    return None if v == '' else float(v)

def section(title, images, rs, R, out):
    pid = {c: S.IMG[c]['name'].split()[0] for c in images}
    sc = {c: [S.score(r, c, 'span') for r in rs] for c in images}
    med = lambda c, keep=None: S.med([v for i, v in enumerate(sc[c]) if v is not None and (keep is None or i in keep)])
    mr = S.mean_rho(images, rs); low = min(range(len(rs)), key=lambda i: mr[i]); keep = [i for i in range(len(rs)) if i != low]
    bad = [c for c in images if S.flag(c)]; guard = [c for c in images if S.IMG[c].get('type') in ('全包护圈', '涵道穿越机')]
    out += ['', '## ' + title, '', '%d 款，%d 份答卷。后三栏用判读者一的读数：去掉有瑕疵的 %d 款；去掉带护圈和涵道的 %d 款；去掉与其余人平均相关最低的一份（%s，%+.2f）。' % (len(images), len(rs), len(bad), len(guard), rs[low]['response_id'], mr[low]), '',
            '| 比例 | ' + ' | '.join(n for n, _ in R) + ' | 去掉有瑕疵的图 | 去掉护圈和涵道 | 去掉最不一致的一份 |', '| --- |' + ' ---: |' * (len(R) + 3)]
    def rho(m, key, use=None, k=None):
        pts = [(value(m, pid[c], c, key), med(c, k)) for c in images if use is None or c in use]; pts = [(a, b) for a, b in pts if a is not None and b is not None]
        return '%+.2f（%d）' % (S.spearman([a for a, _ in pts], [b for _, b in pts]), len(pts)) if len(pts) >= 8 else '—'
    m1 = R[0][1]
    for key, label in MEASURES:
        cells = [rho(m, key) if key != 'fill_of_bbox' or i == 0 else '同左' for i, (_, m) in enumerate(R)]
        cells += [rho(m1, key, use=[c for c in images if c not in bad]) if bad else '—', rho(m1, key, use=[c for c in images if c not in guard]) if guard else '—', rho(m1, key, k=keep)]
        out.append('| %s | %s |' % (label, ' | '.join(cells)))

def main(paths):
    R = readers(); blocks = collections.defaultdict(list)
    for p in paths:
        r, _ = S.load(p); blocks[frozenset(x['image'] for x in r['singles'])].append(r)
    for rs in blocks.values(): rs.sort(key=lambda r: r['started_at'])
    allimg = S.KEY['singles']; quad = [c for c in allimg if S.IMG[c]['config'] == '四旋翼']; other = [c for c in allimg if c not in quad]
    full = next((rs for b, rs in blocks.items() if len(b) == len(allimg)), []); only = next((rs for b, rs in blocks.items() if set(b) == set(quad)), [])
    out = ['# 评分与规格比例的等级相关', '', '斯皮尔曼等级相关，按各款“紧凑—舒展”的中位数算；正值表示比例越大越被评为舒展；括号里是可用的款数。只用来挑下一步要检验的比例。']
    if full or only: section('四旋翼 32 款：混排答卷与只看 32 张的答卷合并', quad, sorted(full + only, key=lambda r: r['started_at']), R, out)
    if len(full) >= 3:
        section('44 款混排', allimg, full, R, out); section('混排答卷里的非四旋翼 12 款', other, full, R, out)
    print('\n'.join(out))

if __name__ == '__main__':
    main(sys.argv[1:])
