"""从 points.csv 算出各款的比例，写 metrics.csv。只用标准库：python3 metrics.py
定义沿用 A3（evidence/20261117-research-update/a3/README.md）并推广到六、八旋翼：
W、L：全部电机中心在左右、前后方向上的极差；W/L 即电机布局的宽长比。
D：对角电机距。四旋翼取两条对角线的均值；N 旋翼按绕中心的角度排序，取相对的两个电机（第 i 个与第 i+N/2 个）之距的均值。
机壳长：中线上机壳前后缘之距（不含机头外挂的云台相机、尾部天线）。机壳宽：电机中心平均高度那一行上机壳的宽。
PV01 = 机壳长 / 机壳宽；PV02 = 机壳宽 / D；PV03 = d / D，d 为桨径，取各桨“电机中心到桨尖”读数的中位数乘 2。"""
import csv, math, pathlib, statistics

HERE = pathlib.Path(__file__).resolve().parent

def compute(r):
    n = int(r['rotors']); hubs = [(float(r['hub%d_x' % i]), float(r['hub%d_y' % i])) for i in range(1, n + 1)]
    xs, ys = [h[0] for h in hubs], [h[1] for h in hubs]; ex, ey = max(xs) - min(xs), max(ys) - min(ys)
    cx, cy = sum(xs) / n, sum(ys) / n; order = sorted(hubs, key=lambda h: math.atan2(h[1] - cy, h[0] - cx))
    D = statistics.mean(math.dist(order[i], order[i + n // 2]) for i in range(n // 2))
    along_y = r['nose_axis'] == 'y'; W, L = (ex, ey) if along_y else (ey, ex)
    out = {'image_id': r['image_id'], 'name': r['name'], 'config': r['config'], 'rotors': n, 'W_px': round(W, 1), 'L_px': round(L, 1), 'W_over_L': round(W / L, 4), 'D_px': round(D, 1)}
    v = {k: float(r[k]) if r[k] != '' else None for k in ('body_top_y', 'body_bottom_y', 'body_left_x', 'body_right_x')}
    length = width = None
    if None not in v.values():
        dy, dx = v['body_bottom_y'] - v['body_top_y'], v['body_right_x'] - v['body_left_x']; length, width = (dy, dx) if along_y else (dx, dy)
    reach = [math.dist(hubs[i - 1], (float(r['tip%d_x' % i]), float(r['tip%d_y' % i]))) for i in range(1, n + 1) if r['tip%d_x' % i] != '']
    d = 2 * statistics.median(reach) if reach else None
    f = lambda x, k=4: '' if x is None else round(x, k)
    out.update({'body_length_px': f(length, 1), 'body_width_px': f(width, 1), 'PV01_body_length_over_width': f(length / width if length and width else None),
                'PV02_body_width_over_D': f(width / D if width else None), 'prop_d_px': f(d, 1), 'props_measured': len(reach), 'PV03_d_over_D': f(d / D if d else None)})
    return out

def main():
    rows = [compute(r) for r in csv.DictReader(open(HERE / 'points.csv', encoding='utf-8-sig'))]
    with open(HERE / 'metrics.csv', 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    return rows

if __name__ == '__main__':
    rows = main()
    for key in ('W_over_L', 'PV01_body_length_over_width', 'PV02_body_width_over_D', 'PV03_d_over_D'):
        for cfg in ('四旋翼', '其他'):
            v = [r[key] for r in rows if r[key] != '' and (r['config'] == '四旋翼') == (cfg == '四旋翼')]
            print('%-28s %s n=%d  min %.3f  median %.3f  max %.3f' % (key, cfg, len(v), min(v), statistics.median(v), max(v)))
