"""程序读数：在成图上找四个桨盘，量布局比例。知条件、自动读数，不是独立判读。
做法：亮度低于 70 的像素是桨和电机；取面积最大的四块，质心当作电机中心（双叶桨对电机中心对称），
沿主轴的最大跨度当作可见桨径；机身腰宽取过四个中心的中点那一行上非背景像素的连续宽度。
用法：python3 measure.py（读 actual/*/original.png，写 readings.json）"""
import json, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).resolve().parent
def read(path):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(float)
    lum = rgb @ [0.299, 0.587, 0.114]
    lab, n = ndimage.label(lum < 70)
    if n < 4: return {'ok': False, 'why': '深色块少于四个'}
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    top = np.argsort(sizes)[::-1][:4] + 1
    hubs, diam = [], []
    for k in top:
        ys, xs = np.nonzero(lab == k); pts = np.stack([xs, ys], 1).astype(float); c = pts.mean(0)
        w, v = np.linalg.eigh(np.cov((pts - c).T)); proj = (pts - c) @ v[:, -1]
        hubs.append(c); diam.append(proj.max() - proj.min())
    hubs = np.array(hubs); centre = hubs.mean(0)
    order = np.argsort(np.arctan2(hubs[:, 1] - centre[1], hubs[:, 0] - centre[0]))   # 右下起逆时针不重要，只要成环
    h = hubs[order]; ring = [np.linalg.norm(h[i] - h[(i + 1) % 4]) for i in range(4)]
    D = (np.linalg.norm(h[0] - h[2]) + np.linalg.norm(h[1] - h[3])) / 2
    xs, ys = np.sort(hubs[:, 0]), np.sort(hubs[:, 1])
    W, L = xs[2:].mean() - xs[:2].mean(), ys[2:].mean() - ys[:2].mean()
    row = lum[int(round(centre[1]))] < 232; x = int(round(centre[0])); a = b = x
    while a > 0 and row[a - 1]: a -= 1
    while b < len(row) - 1 and row[b + 1]: b += 1
    small = sorted(sizes)[::-1][3] / sorted(sizes)[::-1][0]
    return {'ok': bool(small > 0.6), 'hubs_px': [[round(float(x), 1), round(float(y), 1)] for x, y in h], 'diagonal_px': round(float(D), 1),
            'w_over_l': round(float(W / L), 3), 'prop_px': round(float(np.mean(diam)), 1), 'd_over_D': round(float(np.mean(diam) / D), 3),
            'waist_px': int(b - a + 1), 'waist_over_D': round(float((b - a + 1) / D), 3), 'centre_px': [round(float(centre[0]), 1), round(float(centre[1]), 1)],
            'smallest_to_largest_blob': round(float(small), 2)}
if __name__ == '__main__':
    out = {}
    for d in sorted((HERE / 'actual').iterdir()):
        if (d / 'original.png').exists():
            sub = json.loads((d / 'submission.json').read_text()); r = read(d / 'original.png')
            out[d.name] = {'layout': sub['layout'], 'target': {k: sub['target'][k] for k in ('diagonal_mm', 'w_over_l', 'd_over_D', 'shell_width_over_D')}, 'read': r}
            t = sub['target']; print(d.name, 'target D %.0fpx r %.2f d/D %.3f | read D %s r %s d/D %s waist/D %s ok %s' % (t['diagonal_mm'] * 593.97 / 250, t['w_over_l'], t['d_over_D'], r.get('diagonal_px'), r.get('w_over_l'), r.get('d_over_D'), r.get('waist_over_D'), r.get('ok')))
    (HERE / 'readings.json').write_text(json.dumps({'reader': '程序读数，知条件，非独立判读', 'cases': out}, ensure_ascii=False, indent=1) + '\n')
