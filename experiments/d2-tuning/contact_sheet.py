"""Contact sheets for the D2 development run, with the target hub positions drawn in red.

  python -B experiments/d2-tuning/contact_sheet.py <results_dir> <out_dir>
<results_dir> holds one folder per position with original.png inside (the layout used for E1 and L1).
Writes D2-P.jpg, D2-K.jpg, D2-I.jpg. Missing positions are left as labelled blanks.
"""
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
spec = importlib.util.spec_from_file_location("l1_guides", ROOT / "experiments/l1-layout/build_guides.py")
l1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(l1)
TILE, LABEL = 512, 40


def tile(results, row):
    canvas = Image.new("RGB", (TILE, TILE + LABEL), "white")
    path = results / row["position"] / "original.png"
    draw = ImageDraw.Draw(canvas)
    if path.exists():
        with Image.open(path) as source:
            image = source.convert("RGB")
        if row.get("wl") and image.size == (1024, 1024):
            ring = ImageDraw.Draw(image)
            for x, y in l1.hubs(row["wl"])[2]:
                ring.ellipse([x - 24, y - 24, x + 24, y + 24], outline=(255, 0, 0), width=4)
        canvas.paste(image.resize((TILE, TILE), Image.Resampling.LANCZOS), (0, 0))
    else:
        draw.text((12, TILE // 2), "missing", fill=(160, 0, 0))
    draw.text((8, TILE + 12), row["position"], fill=(0, 0, 0))
    return canvas


def sheet(results, rows, columns, target):
    lines = (len(rows) + columns - 1) // columns
    page = Image.new("RGB", (columns * TILE, lines * (TILE + LABEL)), "white")
    for index, row in enumerate(rows):
        page.paste(tile(results, row), ((index % columns) * TILE, (index // columns) * (TILE + LABEL)))
    page.save(target, quality=88)
    print(target.name, len(rows), "positions")


def main():
    results, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    rows = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))
    sheet(results, [r for r in rows if r["arm"] == "P"], 2, out / "D2-P.jpg")      # one prompt per row
    sheet(results, [r for r in rows if r["arm"] == "K"], 6, out / "D2-K.jpg")      # one strength per row
    sheet(results, [r for r in rows if r["arm"] == "I"], 4, out / "D2-I.jpg")


if __name__ == "__main__":
    main()
