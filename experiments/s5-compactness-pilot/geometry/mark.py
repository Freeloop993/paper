"""在粗点附近找近似圆对称的中心，量桨叶伸出多远，出放大叠点图供逐点复看。
用法：python mark.py <输出目录>。结果写到 <输出目录>/auto.json，人工修正写在 fixes.py。"""
import json, math, pathlib, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import tools, rough

ANG = np.deg2rad(np.arange(0, 360, 15))

def symmetry_centre(g, x0, y0, win=20, radii=range(3, 13)):
    """窗口内逐点打分：各半径圆环的平均灰度随半径变化大（有同心结构）、同一圆环上灰度起伏小（圆对称）的得分高。"""
    best, bx, by = -1, x0, y0
    for y in range(y0 - win, y0 + win + 1):
        for x in range(x0 - win, x0 + win + 1):
            means, var = [], 0.0
            for r in radii:
                xs = np.clip(np.rint(x + r * np.cos(ANG)).astype(int), 0, 1023); ys = np.clip(np.rint(y + r * np.sin(ANG)).astype(int), 0, 1023)
                v = g[ys, xs]; means.append(v.mean()); var += v.var()
            s = np.var(means + [g[y, x]]) / (var / len(radii) + 25.0)
            if s > best: best, bx, by = s, x, y
    return bx, by, round(float(best), 2)

def blade_reach(m, hx, hy, cx, cy, exclude=40):
    """从电机中心沿各方向走到离开机体为止，取最远的一条（朝机体中心 ±exclude 度的方向不算，那是机臂）。"""
    arm = math.degrees(math.atan2(cy - hy, cx - hx)); best = (0, 0)
    for a in range(0, 360, 2):
        if abs((a - arm + 180) % 360 - 180) < exclude: continue
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a)); r = 0
        while True:
            x, y = int(round(hx + (r + 1) * ca)), int(round(hy + (r + 1) * sa))
            if not (0 <= x < 1024 and 0 <= y < 1024) or not m[y, x]: break
            r += 1
        if r > best[0]: best = (r, a)
    r, a = best
    return r, (round(hx + r * math.cos(math.radians(a))), round(hy + r * math.sin(math.radians(a))))

def run(m, fixed, start, axis):
    """过 start 的一行或一列上，包含 start 的连续机体区间。"""
    line = m[fixed, :] if axis == 'x' else m[:, fixed]
    if not line[start]: return None
    a = b = start
    while a > 0 and line[a - 1]: a -= 1
    while b < 1023 and line[b + 1]: b += 1
    return a, b

def auto(pid):
    g = ndimage.gaussian_filter(tools.gray(pid), 1.0); m = tools.mask(pid); r = rough.to_image(pid)
    cx, cy = np.mean([p[0] for p in r['hubs']]), np.mean([p[1] for p in r['hubs']])
    hubs = []
    for x, y in r['hubs']:
        rx, ry, s = symmetry_centre(g, x, y); reach, tip = blade_reach(m, rx, ry, cx, cy)
        hubs.append({'rough': [x, y], 'auto': [rx, ry], 'score': s, 'reach': reach, 'tip': list(tip)})
    mx, my = int(round(cx)), int(round(cy))
    out = {'hubs': hubs, 'midline_x': mx, 'row_y': my, 'top': r['top'], 'bottom': r['bottom']}
    col = run(m, mx, my, 'y')
    if col: out['column_run'] = list(col)
    row = run(m, my, mx, 'x')
    if row: out['row_run'] = list(row)
    out['left'], out['right'] = (r['left'], r['right']) if 'left' in r else (row if row else (None, None))
    out['side_source'] = 'rough' if 'left' in r else 'row_run'
    return out

def crop_sheet(items, path, half=40, zoom=4, cols=7):
    """items: (pid, 序号, (x, y) 自动点, (x, y) 粗点)。每格是原图 80×80 像素放大 4 倍，绿十字是自动点，蓝点是粗点。"""
    cell = half * 2 * zoom; rows = -(-len(items) // cols); out = Image.new('RGB', (cols * cell, rows * (cell + 18)), 'white'); f = tools.font(14)
    for i, (pid, n, (x, y), (qx, qy)) in enumerate(items):
        im = Image.open(tools.ROOT / 'real' / 'stimuli' / (pid + '.png')).convert('RGB')
        c = im.crop((x - half, y - half, x + half, y + half)).resize((cell, cell), Image.LANCZOS); d = ImageDraw.Draw(c); k = half * zoom
        for a, b in [((k - 60, k), (k - 10, k)), ((k + 10, k), (k + 60, k)), ((k, k - 60), (k, k - 10)), ((k, k + 10), (k, k + 60))]: d.line([a, b], fill=(0, 220, 0), width=2)
        for t in range(-half, half + 1, 10):
            d.line([(k + t * zoom, 0), (k + t * zoom, 6)], fill=(255, 0, 0), width=1); d.line([(0, k + t * zoom), (6, k + t * zoom)], fill=(255, 0, 0), width=1)
        px, py = k + (qx - x) * zoom, k + (qy - y) * zoom; d.ellipse([px - 4, py - 4, px + 4, py + 4], outline=(0, 90, 255), width=2)
        ox, oy = (i % cols) * cell, (i // cols) * (cell + 18)
        out.paste(c, (ox, oy + 18)); ImageDraw.Draw(out).text((ox + 4, oy + 1), '%s-%d (%d,%d)' % (pid, n, x, y), fill=(0, 0, 0), font=f)
        ImageDraw.Draw(out).rectangle([ox, oy + 18, ox + cell - 1, oy + 18 + cell - 1], outline=(150, 150, 150))
    out.save(path, quality=90)

if __name__ == '__main__':
    out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    res = {p: auto(p) for p in tools.IDS}
    (out / 'auto.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
    items = [(p, i + 1, tuple(h['auto']), tuple(h['rough'])) for p in tools.IDS for i, h in enumerate(res[p]['hubs'])]
    per = 28
    for s in range(0, len(items), per): crop_sheet(items[s:s + per], out / ('hubs-%02d.jpg' % (s // per + 1)))
    moved = [math.dist(h['auto'], h['rough']) for p in res for h in res[p]['hubs']]
    print('hubs', len(items), 'sheets', -(-len(items) // per), '| auto moved from rough: median %.1f px, max %.1f px' % (np.median(moved), max(moved)))
