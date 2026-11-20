"""4.4 细节一：相机舱接触阴影（确定方法，不调用生成）。
相机舱像素 = B2-lower 与 B2-no-window 的差异像素。对每一列，找到去窗底图里机身壳缘在端部的最外一行；
相机舱上离壳缘 d 像素处按 1 - A·exp(-d/R) 压暗，模拟壳缘对云台上部的遮挡阴影。
用法：python shadow.py <B2-no-window.png> <B2-lower.png> <输出.png> [A] [R]
"""
import math, sys
from PIL import Image, ImageChops
BG = 238
def lum(p): return (p[0] * 299 + p[1] * 587 + p[2] * 114) / 1000
base = Image.open(sys.argv[1]).convert("RGB"); low = Image.open(sys.argv[2]).convert("RGB")
A = float(sys.argv[4]) if len(sys.argv) > 4 else 0.35; R = float(sys.argv[5]) if len(sys.argv) > 5 else 5.0
diff = ImageChops.difference(base, low).convert("L"); dp = diff.load(); bp = base.load(); out = low.copy(); op = out.load()
w, h = low.size
cam = [(x, y) for y in range(h // 2, h) for x in range(w) if dp[x, y] > 8]
xs = sorted(set(x for x, _ in cam)); changed = 0
for x in xs:
    ys = [y for (cx, y) in cam if cx == x]
    # 该列机身壳缘：从相机舱最上一个像素往上，第一个属于底图机身（非背景）的像素
    y0 = min(ys); edge = None
    for y in range(y0, y0 - 80, -1):
        if lum(bp[x, y]) < BG - 4: edge = y; break
    if edge is None: continue
    for y in ys:
        d = y - edge
        if d <= 0: continue
        k = 1 - A * math.exp(-d / R)
        r, g, b = op[x, y]; op[x, y] = (int(r * k), int(g * k), int(b * k)); changed += 1
out.save(sys.argv[3]); print("camera px", len(cam), "shaded px", changed, "A", A, "R", R)
