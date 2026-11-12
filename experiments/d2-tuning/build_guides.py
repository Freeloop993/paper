"""D2 guide: two-blade silhouettes and hub rings only, no arm lines, no body.

Same hub coordinates, blade polygon and ring as experiments/l1-layout/build_guides.py
(imported, not copied). Run from the repository root:
  python -B experiments/d2-tuning/build_guides.py
"""
import importlib.util
import json
import math
from hashlib import sha256
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / "guides"
spec = importlib.util.spec_from_file_location("l1_guides", ROOT / "experiments/l1-layout/build_guides.py")
l1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(l1)
LEVELS = (0.70, 1.30)


def draw_blades_only(centres, path):
    canvas = Image.new("RGB", (l1.SIZE * l1.SCALE,) * 2, "white")
    draw = ImageDraw.Draw(canvas)
    radius = l1.D_PX * l1.DD / 2
    k = radius / 69
    poly = [((u if u > 1 else u * 69) * k, v * k) for u, v in l1.BLADE]
    for x, y in centres:
        ax = -math.copysign(math.sqrt(.5), y - l1.CENTRE)
        ay = math.copysign(math.sqrt(.5), x - l1.CENTRE)
        for sign in (-1, 1):
            draw.polygon(l1.s([(x + sign * u * ax - v * ay, y + sign * u * ay + v * ax) for u, v in poly]), fill=l1.INK)
    for x, y in centres:
        r, sc = l1.RING_R, l1.SCALE
        draw.ellipse([(x - r) * sc, (y - r) * sc, (x + r) * sc, (y + r) * sc],
                     fill="white", outline=l1.INK, width=l1.RING_STROKE * sc)
    l1.finish(canvas, path)


def main():
    OUT.mkdir(exist_ok=True)
    rows = []
    for wl in LEVELS:
        _, _, centres = l1.hubs(wl)
        path = OUT / f"bladesonly-wl{wl:.2f}.png"
        draw_blades_only(centres, path)
        rows.append(dict(file=path.name, wl=wl, hubs_px=centres, sha256=sha256(path.read_bytes()).hexdigest()))
        print(path.name, rows[-1]["sha256"][:12])
    (HERE / "guides.json").write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
