"""两份真人取点回件的读数：条件图上离真值多远、两人之间差多少、与 a3 已有读数差多少、按目标档位看 W/L。
独立 AI 的回件还没有，所以原评分程序 a3/calibrate.py score 跑不了；这里用同样的公式先算真人这一半。
用法：python3 human_pair.py <私有目录> > returns/human-pair.md      （私有目录里是 to_csv.py 写出的 H1/、H2/）"""
import csv, math, pathlib, statistics, sys

HERE = pathlib.Path(__file__).resolve().parent
A3 = HERE.parent / 'a3'
OFF = HERE.parents[2] / 'archive' / 'paper-reading-room' / 'studies' / '20261117-offline'
sys.path.insert(0, str(A3))
from recompute import ORDER, geometry, point      # 与 calibrate.py 用同一套取点和几何公式

SHELL = ('upper', 'lower', 'left', 'right')


def rows(p): return list(csv.DictReader(pathlib.Path(p).open(encoding='utf-8-sig', newline='')))


def measures(r):
    """与 calibrate.report 相同：W/L 取四轴外接范围；截面宽／对角距；壳长／截面宽。"""
    hubs = [point(r, p) for p in ORDER]; upper, lower, left, right = [point(r, p) for p in SHELL]
    wl = pv1 = pv2 = None
    if None not in hubs:
        w, length, _, _, d = geometry(hubs); wl = w / length
        if left and right: pv2 = (right[0] - left[0]) / d
    if left and right and upper and lower: pv1 = (lower[1] - upper[1]) / (right[0] - left[0])
    return dict(hubs=hubs, wl=wl, pv1=pv1, pv2=pv2)


def stat(vals, fmt='%.2f'):
    v = [x for x in vals if x is not None]
    return '%d | %s | %s | %s' % (len(v), fmt % statistics.median(v), fmt % statistics.mean(v), fmt % max(v)) if v else '0 | — | — | —'


def main(work):
    work = pathlib.Path(work); P = print
    key = rows(OFF / 'researcher' / 'a8' / 'PRIVATE-key.csv')
    truth = {}
    for r in rows(A3 / 'guide-pixels.csv'): truth.setdefault(r['file'], {})[r['hub']] = (int(r['sum_x']) / int(r['red_pixels']), int(r['sum_y']) / int(r['red_pixels']))
    known = {r['image_id'] + '.png': r for r in rows(A3 / 'points.csv')}
    read = {}
    for H in ('H1', 'H2'):
        m = {r['token']: r['file'] for r in key if r['reader'] == H}
        read[H] = {m[r['token']]: measures(r) for r in rows(work / H / 'response.csv')}
    designs = sorted(f for f in read['H1'] if f not in truth); guides = sorted(truth)
    assert len(designs) == 20 and set(read['H1']) == set(read['H2'])
    P('# A8 真人取点：两位判读者的读数\n')
    P('本页由 `human_pair.py` 生成，不要手改。公式与 `a3/calibrate.py` 相同。独立 AI 的回件还没有，AI 与真人的对照等它到了用原评分程序算。\n')
    P('## 一、条件图上离真值多远\n\n4 张条件图各有 4 个红点，真值是红色像素的质心。\n\n| 判读者 | 项目 | 个数 | 中位数 | 平均 | 最大 |\n| --- | --- | ---: | ---: | ---: | ---: |')
    for H in ('H1', 'H2'):
        err, wl_err = [], []
        for f in guides:
            t = [truth[f][h] for h in ORDER]; w, length, *_ = geometry(t)
            err += [math.dist(p, g) for p, g in zip(read[H][f]['hubs'], t)]; wl_err.append(abs(read[H][f]['wl'] - w / length))
        P('| %s | 红点中心的偏差（像素） | %s |' % (H, stat(err))); P('| %s | W/L 的偏差 | %s |' % (H, stat(wl_err, '%.4f')))
    P('\n## 二、两人之间差多少\n\n20 张设计通路图，两人量的是同样的图。\n\n| 项目 | 个数 | 中位数 | 平均 | 最大 |\n| --- | ---: | ---: | ---: | ---: |')
    a, b = read['H1'], read['H2']
    P('| 电机中心相距（像素） | %s |' % stat([math.dist(p, q) for f in designs for p, q in zip(a[f]['hubs'], b[f]['hubs'])]))
    for k, name in (('wl', 'W/L'), ('pv1', '机壳长／截面宽'), ('pv2', '截面宽／对角电机距')):
        P('| %s 之差 | %s |' % (name, stat([abs(a[f][k] - b[f][k]) for f in designs], '%.3f')))
    far = sorted(((max(math.dist(p, q) for p, q in zip(a[f]['hubs'], b[f]['hubs'])), f) for f in designs), reverse=True)[:3]
    P('\n电机中心差得最多的三张：' + '；'.join('%s（%.0f 像素）' % (f[:-4], d) for d, f in far) + '。')
    P('\n## 三、与已有读数差多少（只作描述）\n\n已有读数是 `a3/points.csv` 里的，取点的人知道生成条件。\n\n| 判读者 | 项目 | 个数 | 中位数 | 平均 | 最大 |\n| --- | --- | ---: | ---: | ---: | ---: |')
    old = {f: measures(known[f]) for f in designs}
    for H in ('H1', 'H2'):
        P('| %s | 电机中心相距（像素） | %s |' % (H, stat([math.dist(p, q) for f in designs for p, q in zip(read[H][f]['hubs'], old[f]['hubs']) if q])))
        for k, name in (('wl', 'W/L'), ('pv1', '机壳长／截面宽'), ('pv2', '截面宽／对角电机距')):
            P('| %s | %s 之差 | %s |' % (H, name, stat([abs(read[H][f][k] - old[f][k]) if old[f][k] is not None else None for f in designs], '%.3f')))
    P('\n## 四、按目标档位看 W/L\n\n把对应键揭开以后，按每张图生成时的 W/L 目标分组。括号里是这一组的图数。命中指读数落在目标 ±0.10 以内。\n\n| 批次与目标 | 已有读数 | H1 | H2 | 命中（已有 / H1 / H2） |\n| --- | ---: | ---: | ---: | --- |')
    groups = {}
    for f in designs: groups.setdefault((known[f]['cohort'], known[f]['target']), []).append(f)
    hit = lambda v, t: abs(v - float(t)) <= 0.10
    for (cohort, target), fs in sorted(groups.items()):
        med = lambda d: statistics.median(d[f]['wl'] for f in fs)
        P('| %s，目标 %s（%d） | %.3f | %.3f | %.3f | %d / %d / %d |' % (cohort, target, len(fs), med(old), med(a), med(b),
          sum(hit(old[f]['wl'], target) for f in fs), sum(hit(a[f]['wl'], target) for f in fs), sum(hit(b[f]['wl'], target) for f in fs)))
    P('\n逐图的 W/L：\n\n| 图 | 目标 | 已有读数 | H1 | H2 |\n| --- | ---: | ---: | ---: | ---: |')
    for f in sorted(designs, key=lambda f: (known[f]['cohort'], known[f]['target'], f)):
        P('| %s | %s | %.3f | %.3f | %.3f |' % (f[:-4], known[f]['target'], old[f]['wl'], a[f]['wl'], b[f]['wl']))


if __name__ == '__main__':
    main(sys.argv[1])
