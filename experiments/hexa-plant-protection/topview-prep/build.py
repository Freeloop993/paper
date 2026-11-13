"""Offline E6 input figures. Run here, or pass --check for a read-only audit."""
import argparse
import hashlib
import json
import math
import runpy
import tempfile
from itertools import combinations
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
EXPERIMENTS = HERE.parents[1]
L1 = runpy.run_path(str(EXPERIMENTS / "l1-layout" / "build_guides.py"))
SIZE, SCALE, CENTER = L1["SIZE"], L1["SCALE"], L1["CENTRE"]
LEVELS = (0.70, 1.00, 1.30)
BEARINGS = (-30, 30, 90, 150, 210, 270)
BASE_WL = 2 / math.sqrt(3)
SPAN, RADIUS = 600, 90
ARM_LENGTH, ARM_WIDTH, RING, STROKE = 169, 12, 10, 3
INK = L1["INK"]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def layout(level):
    angle = np.radians(BEARINGS)
    offsets = np.column_stack((level * np.sin(angle), -np.cos(angle)))
    diameter = max(math.dist(a, b) for a, b in combinations(offsets, 2))
    hubs = CENTER + offsets * (SPAN / diameter)
    radial = hubs - CENTER
    radial /= np.linalg.norm(radial, axis=1)[:, None]
    tangent = np.column_stack((-radial[:, 1], radial[:, 0]))
    return hubs, radial, tangent


def ellipse(draw, hub, radius, **style):
    draw.ellipse(L1["s"]([hub - radius, hub + radius]), **style)


def render(folder, level):
    hubs, radial, tangent = layout(level)
    # C1 polygon in a local (along blade, across blade) coordinate frame.
    profile = np.array([(u if u > 1 else u * 69, v) for u, v in L1["BLADE"]]) * (RADIUS / 69)
    for kind in ("points", "parts"):
        symbolic = kind == "points"
        canvas = Image.new("RGB", (SIZE * SCALE,) * 2, "black" if symbolic else "white")
        draw = ImageDraw.Draw(canvas)
        for hub, axis, cross in zip(hubs, radial, tangent):
            start = (CENTER, CENTER) if symbolic else hub - ARM_LENGTH * axis
            draw.line(L1["s"]([start, hub]), fill="#205cff" if symbolic else INK,
                      width=SCALE * (3 if symbolic else ARM_WIDTH))
            if symbolic:
                ellipse(draw, hub, 10, fill="#ff0000")
            else:
                for sign in (-1, 1):
                    polygon = hub + sign * profile[:, :1] * cross + profile[:, 1:] * axis
                    draw.polygon(L1["s"](polygon), fill=INK)
                ellipse(draw, hub, RING, fill="white", outline=INK, width=STROKE * SCALE)
        name = f"{kind}-{level:.2f}.png"
        L1["finish"](canvas, folder / name)
    # Use the L1 OpenCV Canny thresholds. Decode via Pillow for Unicode Windows paths.
    parts = read_rgb(folder / f"parts-{level:.2f}.png")
    edges = cv2.Canny(cv2.cvtColor(parts, cv2.COLOR_RGB2GRAY), 102, 204)
    Image.fromarray(edges).save(folder / f"edges-{level:.2f}.png")


def read_rgb(path):
    with Image.open(path) as im:
        require(im.format == "PNG" and im.mode == "RGB" and im.size == (SIZE, SIZE),
                f"Invalid guide format: {path.name}")
        return np.array(im)


def centroids(mask, min_area, max_area):
    _, _, stats, centers = cv2.connectedComponentsWithStats(mask.astype("uint8"))
    areas = stats[1:, cv2.CC_STAT_AREA]
    return centers[1:][(min_area <= areas) & (areas <= max_area)]


def match_hubs(centers, expected):
    require(len(centers) == 6, f"Detected {len(centers)} hubs")
    distances = np.linalg.norm(expected[:, None] - centers, axis=2)
    indices = distances.argmin(axis=1)
    require(len(set(indices)) == 6 and distances.min(axis=1).max() < 1, "Misplaced hubs")
    return centers[indices]


def probe_blades(ink, hub, axis, cross):
    # At mid-radius the two leaves and the inward arm give three separate arcs.
    x, y = np.rint(hub).astype(int)
    radius = RADIUS + 3
    tile = ink[y-radius:y+radius+1, x-radius:x+radius+1]
    yy, xx = np.indices(tile.shape)
    distance = np.hypot(xx + x-radius-hub[0], yy + y-radius-hub[1])
    arcs = centroids(tile & (distance >= .57*RADIUS) & (distance <= .65*RADIUS), 3, tile.size)
    require(len(arcs) == 3, "Expected two leaves and an inward arm")
    vectors = arcs + [x-radius, y-radius] - hub
    vectors /= np.linalg.norm(vectors, axis=1)[:, None]
    directions = vectors @ np.stack((-axis, cross, -cross)).T
    require(np.all(directions.max(axis=0) > .99), "Wrong blade or arm direction")
    for tip in (hub + RADIUS * cross, hub - RADIUS * cross):
        tx, ty = np.rint(tip).astype(int)
        require(ink[ty-2:ty+3, tx-2:tx+3].any(), "Missing tip ink")
    return len(arcs) - 1


def gaps(points):
    angles = np.degrees(np.arctan2(points[:, 0] - CENTER, CENTER - points[:, 1]))
    return (np.roll(angles, -1) - angles) % 360


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit(folder, level):
    hubs, radial, tangent = layout(level)
    distances = [math.dist(a, b) for a, b in combinations(hubs, 2)]
    tips = np.stack((hubs + RADIUS*tangent, hubs - RADIUS*tangent), axis=1)
    margin = float(np.minimum(tips, SIZE - 1 - tips).min())
    clearance = min(distances) - 2*RADIUS
    width, length = np.ptp(hubs, axis=0)
    adj = gaps(hubs)
    require(len(distances) == 15 and clearance > 0 and margin > 0, "Invalid disk or canvas clearance")
    require(abs(max(distances) - SPAN) < 1e-7 and abs(width/length/BASE_WL-level) < 1e-7,
            "Span/ratio mismatch")
    require(abs(sum(adj)-360) < 1e-7 and np.all(adj > 0), "Invalid angular order")
    require(bool(np.allclose(adj, 60)) == (level == 1), "Incorrect baseline or angular response")

    paths = [folder / f"{kind}-{level:.2f}.png" for kind in ("points", "parts", "edges")]
    points, parts = map(read_rgb, paths[:2])
    red = (points[:, :, 0] > 190) & (points[:, :, 1] < 60) & (points[:, :, 2] < 60)
    p = match_hubs(centroids(red, 100, 550), hubs)
    blue = points[:, :, 2] > 140
    for h in hubs:
        for f in (.20, .50, .80):
            x, y = np.rint(CENTER + f*(h-CENTER)).astype(int)
            require(blue[y, x], "Missing direction line")
    gray = cv2.cvtColor(parts, cv2.COLOR_RGB2GRAY)
    ink = gray < 128
    # White ring interiors, independently located in the exported parts PNG.
    measured = match_hubs(centroids(~ink, 80, 250), hubs)
    require(not (ink[0].any() or ink[-1].any() or ink[:, 0].any() or ink[:, -1].any()), "Clipped ink")
    require(not ink[CENTER-12:CENTER+13, CENTER-12:CENTER+13].any(), "Center should be blank")
    nblades = [probe_blades(ink, h, a, c) for h, a, c in zip(hubs, radial, tangent)]
    raster_w, raster_l = np.ptp(measured, axis=0)
    raster_ratio = raster_w/raster_l/BASE_WL
    raster_gap = min(math.dist(a,b) for a,b in combinations(measured,2)) - 2*RADIUS
    require(abs(raster_ratio-level) < .005 and raster_gap > 0, "Raster geometry mismatch")
    with Image.open(paths[2]) as im:
        require(im.format == "PNG" and im.mode == "L", "Invalid edge file")
        actual_edges = np.array(im)
    require(np.array_equal(actual_edges, cv2.Canny(gray, 102, 204)) and actual_edges.any(), "Edge mismatch")

    return dict(normalized_target=level, W_px=float(width), L_px=float(length), raw_WL=width/length,
                normalized_raster_WL=raster_ratio, max_hub_distance_px=max(distances),
                adjacent_deg_R1_clockwise=adj.tolist(), compared_disk_pairs=len(distances),
                min_disk_gap_px=clearance, min_disk_gap_from_raster_hubs_px=raster_gap,
                min_tip_margin_px=margin, raster_blades_by_hub=nblades,
                point_map_hubs_px=p.tolist(), parts_map_hubs_px=measured.tolist(),
                parts_raster_gaps_deg=gaps(measured).tolist(),
                geometry=[dict(id=f"R{i}", center_px=h.tolist(), tips_px=t.tolist())
                          for i,(h,t) in enumerate(zip(hubs,tips),1)],
                sha256={path.name:digest(path) for path in paths})


def preview(folder):
    sheet = Image.new("RGB", (720, 756), "#dedede")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=17)
    for col, level in enumerate(LEVELS):
        draw.text((col*240+16, 7), f"Normalized W/L  {level:.2f}", font=font, fill="#202020")
        for row, (kind, label) in enumerate((("points","Hub positions"), ("parts","Two-blade parts"),
                                             ("edges","Canny preview"))):
            top = 32 + 240*row
            with Image.open(folder / f"{kind}-{level:.2f}.png") as im:
                if kind == "edges":
                    # Preserve isolated one-pixel edges when reducing the overview.
                    tile = im.resize((216,216), Image.Resampling.BOX).point(lambda v: min(255, 4*v))
                else:
                    tile = im.convert("RGB").resize((216,216), Image.Resampling.LANCZOS)
            sheet.paste(tile,(col*240+12,top+21))
            draw.text((col*240+13,top), label, font=font, fill="#303030")
    sheet.save(folder / "preview.png")


def inspect(folder):
    return dict(scope="offline_condition_inputs", formal_samples_added=0, model_calls=0,
                base_bearings_deg=list(BEARINGS), base_raw_WL=BASE_WL,
                max_hub_distance_px=SPAN, schematic_blade_radius_px=RADIUS,
                levels=[audit(folder, lev) for lev in LEVELS], preview_sha256=digest(folder / "preview.png"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check existing files without regenerating")
    args = parser.parse_args()
    if args.check:
        measured = inspect(HERE)
        saved = json.loads((HERE / "checks.json").read_text(encoding="utf-8"))
        require(measured == saved, "Saved audit differs from current files")
    else:
        with tempfile.TemporaryDirectory(dir=HERE) as temporary:
            stage = Path(temporary)
            for lev in LEVELS:
                render(stage, lev)
            preview(stage)
            measured = inspect(stage)
            (stage / "checks.json").write_text(json.dumps(measured, indent=2) + "\n", encoding="utf-8")
            # Publish the manifest last. --check detects any interrupted or mixed export.
            for path in stage.glob("*.png"):
                path.replace(HERE / path.name)
            (stage / "checks.json").replace(HERE / "checks.json")
    for row in measured["levels"]:
        print(f"{row['normalized_target']:.2f}: {len(row['parts_map_hubs_px'])} hubs, "
              f"{sum(row['raster_blades_by_hub'])} blades, disk gap {row['min_disk_gap_px']:.2f} px, "
              f"tip margin {row['min_tip_margin_px']:.2f} px")


if __name__ == "__main__":
    main()
