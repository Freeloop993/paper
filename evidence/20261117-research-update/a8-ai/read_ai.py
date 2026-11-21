"""独立 AI 回件评分之后的读数汇总。先在评分目录运行 a3/calibrate.py score，再运行：
python3 read_ai.py <评分目录>          # 输出 Markdown
内容：三位判读者在条件图上的误差；20 张重叠图上的三组差；独立 AI 读出的 W/L 按批次和目标档汇总，并与此前知条件的读数对照。只用标准库。"""
import csv, io, math, pathlib, statistics, sys

HERE = pathlib.Path(__file__).resolve().parent
A3 = HERE.parent / 'a3'
sys.path.insert(0, str(A3))
from recompute import ORDER, geometry, point  # noqa: E402


def rows(path):
    return list(csv.DictReader(io.StringIO(pathlib.Path(path).read_bytes().decode('utf-8-sig'))))


def num(v):
    return None if v in ('', None) else float(v)


def med(values, digits=3):
    values = [v for v in values if v is not None]
    return '—' if not values else ('%.' + str(digits) + 'f') % statistics.median(values)


def main(score):
    score = pathlib.Path(score)
    results = rows(score / 'private-calibration-results.csv')
    per = rows(score / 'private-per-image.csv')
    key = {(r['reader'], r['token']): r['file'] for r in rows(score / 'PRIVATE-key.csv')}
    points = {r['image_id']: r for r in rows(A3 / 'points.csv')}
    prior = {r['image_id']: r for r in rows(A3 / 'image-metrics.csv')}
    out = []
    say = out.append

    say('## 一、条件图上的误差（真值是条件图上红点的像素质心）\n')
    say('| 判读者 | 轴心误差：中位数 / 最大（像素） | W/L 误差：中位数 / 最大 | 点数 |')
    say('| --- | --- | --- | --- |')
    for reader, name in (('AI', '独立 AI'), ('H1', '真人一'), ('H2', '真人二')):
        r = {x['metric']: x for x in results if x['comparison'] == reader + '-guide'}
        hub, wl = r['hub_error_px'], r['wl_abs_error']
        say('| %s | %.1f / %.1f | %.4f / %.4f | %s/%s |' % (name, float(hub['median']), float(hub['maximum']), float(wl['median']), float(wl['maximum']), hub['n_valid'], hub['n_expected']))

    say('\n## 二、20 张重叠图上，两两之差\n')
    say('| 对照 | 轴心相距：中位数 / 最大（像素） | W/L：中位数 / 最大 | 机壳宽 ÷ 对角电机距 | 机壳长 ÷ 宽 |')
    say('| --- | --- | --- | --- | --- |')
    cell = lambda r, d: '—' if not r['n_valid'] or r['n_valid'] == '0' else (('%.' + str(d) + 'f / %.' + str(d) + 'f（%s 张）') % (float(r['median']), float(r['maximum']), r['n_valid']))
    for pair, name in (('AI-H1', '独立 AI 对真人一'), ('AI-H2', '独立 AI 对真人二'), ('H1-H2', '真人一对真人二')):
        r = {x['metric']: x for x in results if x['comparison'] == pair}
        hub = r['hub_difference_px']
        say('| %s | %.1f / %.1f（%s 点） | %s | %s | %s |' % (name, float(hub['median']), float(hub['maximum']), hub['n_valid'],
            cell(r['abs_wl_difference'], 3), cell(r['abs_pv02_section_difference'], 3), cell(r['abs_pv01_section_difference'], 3)))

    ai = {r['file'][:-4]: r for r in per if r['reader'] == 'AI' and r['file'][:-4] in points}
    say('\n## 三、独立 AI 读出的 W/L，按批次和目标档（揭键之后汇总）\n')
    say('命中指读数与目标相差不超过 0.10。右边两栏是此前知条件的读数（`a3/image-metrics.csv`）。\n')
    say('| 批次 | 目标 | 张数 | 独立 AI：中位数 | 独立 AI：命中 | 此前读数：中位数 | 此前读数：命中 |')
    say('| --- | --- | --- | --- | --- | --- | --- |')
    groups = {}
    for image, p in points.items():
        if image in ai:
            groups.setdefault((p['cohort'], p['target']), []).append(image)
    order = ['WLQ12', 'WLQ24', 'E3', 'E3R2', 'E3R3', 'B2-L']
    hits = lambda values, target: sum(v is not None and abs(v - target) <= 0.10 + 1e-12 for v in values)
    for (cohort, target), images in sorted(groups.items(), key=lambda kv: (order.index(kv[0][0]), kv[0][1])):
        mine = [num(ai[i]['wl']) for i in images]
        old = [num(prior[i]['wl']) for i in images]
        t = float(target)
        say('| %s | %s | %d | %s | %d/%d | %s | %d/%d |' % (cohort, target, len(images), med(mine), hits(mine, t), len(images), med(old), hits(old, t), len(images)))

    say('\n## 四、独立 AI 与此前知条件读数，逐张之差（64 张）\n')
    raw = {}
    for (reader, token), file in key.items():
        if reader == 'AI':
            raw[file[:-4]] = token
    response = {r['token']: r for r in rows(score / 'AI' / 'response.csv')}
    hub_d, flips = [], []
    for image, p in points.items():
        if image not in raw:
            continue
        mine = response[raw[image]]
        for name in ORDER:
            a, b = point(mine, name), point(p, name)
            if a and b:
                hub_d.append(math.dist(a, b))
        a, b = num(ai[image]['wl']), num(prior[image]['wl'])
        if a is not None and b is not None:
            t = float(p['target'])
            if (abs(a - t) <= 0.10 + 1e-12) != (abs(b - t) <= 0.10 + 1e-12):
                flips.append('%s（%.3f 对 %.3f）' % (image, a, b))
    diff = lambda k_ai, k_old: [abs(num(ai[i][k_ai]) - num(prior[i][k_old])) for i in ai if num(ai[i][k_ai]) is not None and num(prior[i][k_old]) is not None]
    wl, pv2, pv1 = diff('wl', 'wl'), diff('pv02_section', 'pv02_section'), diff('pv01_section', 'pv01_section')
    say('| 量 | 可比的张数 | 中位数 | 最大 |')
    say('| --- | --- | --- | --- |')
    say('| 轴心相距（像素） | %d 点 | %.1f | %.1f |' % (len(hub_d), statistics.median(hub_d), max(hub_d)))
    for name, values in (('W/L', wl), ('机壳宽 ÷ 对角电机距', pv2), ('机壳长 ÷ 宽', pv1)):
        say('| %s | %d | %.3f | %.3f |' % (name, len(values), statistics.median(values), max(values)))
    say('\n命中与否两种读数不一致的图：%s。' % ('、'.join(flips) if flips else '没有'))

    blanks = [r for r in per if r['reader'] == 'AI' and r['reason'].strip() and r['file'][:-4] in points]
    say('\n## 五、独立 AI 留空的点\n')
    say('64 张设计图里有 %d 张留了空，原因如下。4 张条件图按规则只填四轴，不计在内。\n' % len(blanks))
    for r in blanks:
        say('- %s：%s' % (r['file'][:-4], r['reason']))
    print('\n'.join(out))


if __name__ == '__main__':
    main(sys.argv[1])
