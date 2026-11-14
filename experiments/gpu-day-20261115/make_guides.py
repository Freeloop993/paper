"""四旋点线条件图 W/L 0.70／1.00／1.30（编辑通路的布局响应批用）。

画法照 evidence/qwen-shape-s4-20261114/layout.png 实测：1024² 黑底，四个轴心为半径 10 px 的红点 (255,0,0)，
画面中心到各轴心为约 3 px 的蓝线 (32,92,255)，对角轴心距 594 px（W/L=1.00 时轴心构成 420 px 方阵）。
三档保持对角距不变，只改横纵比；4 倍超采样后缩小以得到与原图相近的抗锯齿边缘。
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
OUT = HERE / "inputs"; OUT.mkdir(exist_ok=True)
DIAG, S = 594.0, 4


def draw(wl):
    L = DIAG / math.hypot(wl, 1); W = wl * L
    hubs = [(512 + sx * W / 2, 512 + sy * L / 2) for sx, sy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]]
    im = Image.new("RGB", (1024 * S, 1024 * S), (0, 0, 0)); d = ImageDraw.Draw(im)
    for x, y in hubs:
        d.line([(512 * S, 512 * S), (x * S, y * S)], fill=(32, 92, 255), width=3 * S)
    for x, y in hubs:
        d.ellipse([(x - 10) * S, (y - 10) * S, (x + 10) * S, (y + 10) * S], fill=(255, 0, 0))
    im = im.resize((1024, 1024), Image.LANCZOS)
    name = f"quad-dots-wl{wl:.2f}.png"; im.save(OUT / name)
    return name, [(round(x, 1), round(y, 1)) for x, y in hubs], round(W, 1), round(L, 1)


if __name__ == "__main__":
    for wl in (0.70, 1.00, 1.30):
        print(draw(wl))
