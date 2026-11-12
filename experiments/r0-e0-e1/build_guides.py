"""Rebuild the five unique E0/E1 condition PNGs and check the legacy reference pixels."""
import json
import math
import runpy
from pathlib import Path
from hashlib import sha256

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "prototypes/drone-configurator/public/research-guides"
G2D = ROOT / "experiments/g2d"
legacy = runpy.run_path(str(G2D / "build.py"))


def targets(wl):
    length = 600 / math.hypot(wl, 1)
    width = wl * length
    centers = [[round(512 + sx * width / 2), round(512 + sy * length / 2)]
               for sx, sy in [(1, 1), (-1, 1), (-1, -1), (1, -1)]]
    return width, length, centers


def main():
    OUT.mkdir(exist_ok=True, parents=True)
    shape = legacy["measure_middle"]()
    _, _, square = targets(1)
    buffer_png = OUT / "legacy-regression.tmp.png"
    legacy["render"](square, shape, buffer_png, blade_scale=1.0)
    try:
        with Image.open(buffer_png) as observed, Image.open(G2D / "guides/parts-r100.png") as expected:
            assert observed.size == expected.size == (1024, 1024)
            assert ImageChops.difference(observed.convert("RGB"), expected.convert("RGB")).getbbox() is None
    finally:
        buffer_png.unlink(missing_ok=True)
    rows = []
    for wl, dd in [(0.70, .50), (1.00, .50), (1.30, .50), (1.00, .40), (1.00, .60)]:
        width, length, centers = targets(wl)
        radius = 600 * dd / 2
        name = f"wl-{wl:.2f}-dd-{dd:.2f}.png"
        guide = OUT / name
        legacy["render"](centers, {**shape, "blade_radius_px": radius}, guide,
                         blade_scale=radius / shape["blade_radius_px"])
        clearance = min(math.dist(a, b) for i, a in enumerate(centers) for b in centers[i+1:]) - 2*radius
        assert clearance > 0
        with Image.open(guide) as img:
            bounds = img.convert("L").point(lambda value: 255 if value < 128 else 0).getbbox()
        rows.append(dict(wl=wl, dd=dd, file=name, sha256=sha256(guide.read_bytes()).hexdigest(),
                         nominal_D_px=600, nominal_W_px=width, nominal_L_px=length,
                         centers_px=centers, radius_px=radius, nearest_disk_gap_px=clearance,
                         hub_span_fraction=(max(p[0] for p in centers)-min(p[0] for p in centers))/1024,
                         ink_width_fraction=(bounds[2]-bounds[0])/1024))
    (OUT / "guides.json").write_bytes((json.dumps(rows, indent=2)+"\n").encode())
    print("5 guides; G2d middle RGB pixel differences = 0")
    for row in rows:
        print(row["file"], round(row["nearest_disk_gap_px"],3), round(row["ink_width_fraction"],3))


if __name__ == "__main__":
    main()

