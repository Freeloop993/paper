"""L1 layout-condition guides: hub rings + centre-to-hub direction lines, no blades.

Three renderings of the same hub coordinates per W/L level:
  line    white ground, direction lines and hub rings only (goes through Canny)
  blades  the same plus solid two-blade silhouettes (diagnostic pair, Canny)
  depth   black ground, blurred grey relief of arms, hubs and a centre mound (no Canny)
Also writes an OpenCV Canny preview of each Canny guide. The preview only approximates
the ComfyUI Canny node; the executed edge image must be saved from the server.
Run from the repository root:  python -B experiments/l1-layout/build_guides.py
"""
import json
import math
from hashlib import sha256
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
OUT = HERE / "guides"
SIZE, SCALE, CENTRE = 1024, 3, 512
D_PX = 600                      # opposite-motor distance, fixed
LEVELS = (0.70, 1.00, 1.30)     # W/L; 1.00 is built for inspection, not run in L1
DD = 0.50                       # rotor diameter / D, used only by the blades guide
INK = "#222222"
LINE_W, RING_R, RING_STROKE = 6, 12, 4
BLADE = [(9, -4), (.4, -9), (.8, -7), (1, 0), (.8, 7), (.4, 9), (9, 4)]  # legacy C1 blade, R = 69 px


def hubs(wl):
    """Hub centres in the order right-bottom, left-bottom, left-top, right-top (image coordinates)."""
    length = D_PX / math.hypot(wl, 1)
    width = wl * length
    return width, length, [(round(CENTRE + sx * width / 2), round(CENTRE + sy * length / 2))
                           for sx, sy in [(1, 1), (-1, 1), (-1, -1), (1, -1)]]


def s(points):
    return [(x * SCALE, y * SCALE) for x, y in points]


def finish(canvas, path):
    canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(path)


def draw_line_guide(centres, path, blades=False):
    canvas = Image.new("RGB", (SIZE * SCALE,) * 2, "white")
    draw = ImageDraw.Draw(canvas)
    for x, y in centres:
        draw.line(s([(CENTRE, CENTRE), (x, y)]), fill=INK, width=LINE_W * SCALE)
    if blades:
        radius = D_PX * DD / 2
        k = radius / 69
        poly = [((u if u > 1 else u * 69) * k, v * k) for u, v in BLADE]
        for x, y in centres:
            ax = -math.copysign(math.sqrt(.5), y - CENTRE)   # tangential direction of the square layout
            ay = math.copysign(math.sqrt(.5), x - CENTRE)
            for sign in (-1, 1):
                draw.polygon(s([(x + sign * u * ax - v * ay, y + sign * u * ay + v * ax) for u, v in poly]), fill=INK)
    for x, y in centres:
        draw.ellipse([(x - RING_R) * SCALE, (y - RING_R) * SCALE, (x + RING_R) * SCALE, (y + RING_R) * SCALE],
                     fill="white", outline=INK, width=RING_STROKE * SCALE)
    finish(canvas, path)


def draw_depth_guide(centres, path):
    """Brighter = nearer. Arms 120, centre mound 175, hubs 215, then Gaussian blur 10 px."""
    canvas = Image.new("L", (SIZE * SCALE,) * 2, 0)
    draw = ImageDraw.Draw(canvas)
    for x, y in centres:
        draw.line(s([(CENTRE, CENTRE), (x, y)]), fill=120, width=40 * SCALE)
    r = 85
    draw.ellipse([(CENTRE - r) * SCALE, (CENTRE - r) * SCALE, (CENTRE + r) * SCALE, (CENTRE + r) * SCALE], fill=175)
    for x, y in centres:
        r = 24
        draw.ellipse([(x - r) * SCALE, (y - r) * SCALE, (x + r) * SCALE, (y + r) * SCALE], fill=215)
    canvas = canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(10))
    canvas.convert("RGB").save(path)


def canny_preview(src, dst):
    try:
        import cv2
    except ImportError:
        return False
    grey = cv2.imread(str(src), cv2.IMREAD_GRAYSCALE)
    cv2.imwrite(str(dst), cv2.Canny(grey, int(.4 * 255), int(.8 * 255)))
    return True


def main():
    OUT.mkdir(exist_ok=True)
    rows = []
    for wl in LEVELS:
        width, length, centres = hubs(wl)
        angle = 2 * math.degrees(math.atan(wl))          # angle between the two front arms
        for kind in ("line", "blades", "depth"):
            path = OUT / f"{kind}-wl{wl:.2f}.png"
            if kind == "depth":
                draw_depth_guide(centres, path)
            else:
                draw_line_guide(centres, path, blades=kind == "blades")
                canny_preview(path, OUT / f"preview-canny-{kind}-wl{wl:.2f}.png")
            rows.append(dict(file=path.name, kind=kind, wl=wl, front_arm_angle_deg=round(angle, 3),
                             D_px=D_PX, W_px=round(width, 3), L_px=round(length, 3), hubs_px=centres,
                             sha256=sha256(path.read_bytes()).hexdigest()))
    (HERE / "guides.json").write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    for row in rows:
        print(row["file"], row["front_arm_angle_deg"], row["sha256"][:12])


if __name__ == "__main__":
    main()
