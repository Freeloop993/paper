"""4.4 色材两档（“低调—醒目”）：按区域换色，形状像素不变，不调用生成。
输入：B2-lower-shadow.png（机头在画面下端）。
- 低调 L：四副电机的橙环改为中性深灰（去饱和、按原亮度保留明暗）。
- 醒目 H：前两副（画面下方）电机橙环保留；后两副改中性深灰；前两臂靠电机的外侧一段改信号橙（按原亮度保留明暗）。
用法：python recolour.py <输入> <输出目录>
"""
import colorsys, math, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
SIGNAL = (236, 108, 28)
def is_orange(p):
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in p)); return 0.02 < h < 0.12 and s > 0.35 and v > 0.35
def to_grey(p):
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in p)); g = int(v * 255 * 0.42); return (g, g, g)
def lum(p): return (p[0] * 299 + p[1] * 587 + p[2] * 114) / 1000
def motors(im):
    px = im.load(); w, h = im.size; q = {}
    for y in range(h):
        for x in range(w):
            if is_orange(px[x, y]): q.setdefault((x >= w // 2, y >= h // 2), []).append((x, y))
    c = {}
    for k, pts in q.items():
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; c[k] = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    return c
def ring_to_grey(im, keep_front):
    px = im.load(); w, h = im.size; n = 0
    for y in range(h):
        for x in range(w):
            if is_orange(px[x, y]) and not (keep_front and y >= h // 2):
                px[x, y] = to_grey(px[x, y]); n += 1
    return n
def arm_dir(px, w, h, mx, my, body=(512, 512)):
    """机臂走向：电机周围 45—130 像素、朝机身一侧的浅灰低饱和像素的平均位置。"""
    sx = sy = n = 0
    for y in range(int(my - 130), int(my + 131)):
        for x in range(int(mx - 130), int(mx + 131)):
            if not (0 <= x < w and 0 <= y < h): continue
            vx, vy = x - mx, y - my; r = math.hypot(vx, vy)
            if not (45 <= r <= 130) or vx * (body[0] - mx) + vy * (body[1] - my) <= 0: continue
            p = px[x, y]; s = colorsys.rgb_to_hsv(*(c / 255 for c in p))[1]
            if 165 < lum(p) < 236 and s < 0.12: sx += vx; sy += vy; n += 1
    L = math.hypot(sx, sy); return sx / L, sy / L
def arm_band(im, centres, r0=36, r1=105, half=22):
    """前两臂（画面下方）从电机外缘起 r0—r1 像素一段改信号橙，两端垂直于机臂走向。"""
    px = im.load(); w, h = im.size; n = 0; dirs = {}
    for (right, lower), (mx, my) in centres.items():
        if not lower: continue
        ux, uy = arm_dir(px, w, h, mx, my); dirs[(right, lower)] = (round(ux, 3), round(uy, 3))
        for y in range(int(my - r1 - half), int(my + r1 + half)):
            for x in range(int(mx - r1 - half), int(mx + r1 + half)):
                if not (0 <= x < w and 0 <= y < h): continue
                vx, vy = x - mx, y - my; t = vx * ux + vy * uy; d = abs(vx * uy - vy * ux)
                if r0 <= t <= r1 and d <= half:
                    p = px[x, y]; v = lum(p); s = colorsys.rgb_to_hsv(*(c / 255 for c in p))[1]
                    if 165 < v < 236 and s < 0.12:
                        k = v / 214; px[x, y] = tuple(min(255, int(c * k)) for c in SIGNAL); n += 1
    print("arm directions", dirs)
    return n
base = Image.open(src).convert("RGB"); centres = motors(base)
L = base.copy(); nL = ring_to_grey(L, keep_front=False); L.save(f"{out}/B2-L-lowkey.png")
H = base.copy(); nH = ring_to_grey(H, keep_front=True); nA = arm_band(H, centres); H.save(f"{out}/B2-H-signal.png")
print("motor centres", {("R" if k[0] else "L") + ("lower" if k[1] else "upper"): tuple(round(v) for v in c) for k, c in centres.items()})
print("L: ring px greyed", nL, "| H: rear ring px greyed", nH, "front arm px painted", nA)
