"""Configurator-style layout diagrams without text, axes or scale bar.

Black ground, blue lines from the centre to the four motor positions, red dots on the
motors: the reference image the author used in the early runs, minus the labels that
were copied into the picture. Hub coordinates come from experiments/l1-layout/build_guides.py.

  python -B experiments/p1-param-prompt/build_diagrams.py
"""
import importlib.util
import json
from hashlib import sha256
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / "diagrams"
spec = importlib.util.spec_from_file_location("l1_guides", ROOT / "experiments/l1-layout/build_guides.py")
l1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(l1)
LEVELS = (0.7, 1.0, 1.3)
BLUE, RED = (0, 0, 255), (255, 0, 0)


def draw(centres, path):
    scale = l1.SCALE
    canvas = Image.new("RGB", (l1.SIZE * scale,) * 2, "black")
    pen = ImageDraw.Draw(canvas)
    for x, y in centres:
        pen.line([(l1.CENTRE * scale, l1.CENTRE * scale), (x * scale, y * scale)], fill=BLUE, width=6 * scale)
    for x, y in centres:
        r = 12
        pen.ellipse([(x - r) * scale, (y - r) * scale, (x + r) * scale, (y + r) * scale], fill=RED)
    canvas.resize((l1.SIZE, l1.SIZE), Image.Resampling.LANCZOS).save(path)


def main():
    OUT.mkdir(exist_ok=True)
    rows = []
    for wl in LEVELS:
        _, _, centres = l1.hubs(wl)
        path = OUT / f"layout-wl{wl:.1f}.png"
        draw(centres, path)
        rows.append(dict(file=path.name, wl=wl, hubs_px=centres, sha256=sha256(path.read_bytes()).hexdigest()))
        print(path.name, centres)
    (HERE / "diagrams.json").write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
