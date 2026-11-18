"""Verify paper-figure coordinates and the two repository displays; standard library only."""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path

BASE = Path(__file__).resolve().parent


def rows(name):
    with (BASE / name).open(encoding="utf-8", newline="") as table:
        return list(csv.DictReader(table))


def span(points, axis):
    nx, ny = axis
    if not math.isclose(math.hypot(nx, ny), 1):
        raise ValueError("Reference axis must be a unit vector")
    across = [x * -ny + y * nx for x, y in points]
    along = [x * nx + y * ny for x, y in points]
    return (max(across) - min(across), max(along) - min(along))


def verify(repo):
    cards = rows("design_cards.csv")
    by_id = {c["id"]: c for c in cards}
    if len(by_id) != len(cards):
        raise ValueError("Duplicate evidence card ID")
    for c in cards:
        if not all(c[k].strip() for k in ("id", "title", "claim", "source", "locator", "limitation", "kind", "layout")):
            raise ValueError("Incomplete evidence card: " + c["id"])
    card_counts = {}
    for c in cards:
        card_counts[c["kind"]] = card_counts.get(c["kind"], 0) + 1
    points = rows("measurement_points.csv")
    if len({m["id"] for m in points}) != len(points):
        raise ValueError("Duplicate measurement ID")
    checked_displays = set()
    for m in points:
        ident = m["id"]
        card = by_id[ident]
        xy = list(json.loads(m["points"]).values())
        expected = {"quad": 4, "flat_hex": 6}[card["layout"]]
        if len(xy) != expected or len(set(map(tuple, xy))) != expected:
            raise ValueError("Axis count mismatch: " + ident)
        w, h = span(xy, json.loads(m["axis"]))
        if h <= 0 or any(not math.isclose(a, float(m[k]), abs_tol=1e-6)
                         for a, k in ((w, "width_px"), (h, "height_px"), (w / h, "ratio"))):
            raise ValueError("Coordinate calculation disagrees with archived measure: " + ident)
        if m["basis"] == "image_xy":
            path = (repo / m["asset"]).resolve()
            if not path.is_relative_to(repo) or hashlib.sha256(path.read_bytes()).hexdigest() != m["asset_sha256"]:
                raise ValueError("Display file differs: " + m["asset"])
            if any(not (0 <= x < 576 and 0 <= y < 576) for x, y in xy):
                raise ValueError("Point outside display: " + ident)
            checked_displays.add(ident)
        elif m["basis"] != "nose_aligned":
            raise ValueError("Unknown measurement basis: " + ident)
    calibration = rows("calibration_examples.csv")
    if {c["measurement_id"] for c in calibration} != checked_displays:
        raise ValueError("Example/measurement IDs disagree")
    return {"cards": card_counts, "paper_coordinate_sets": len(points) - len(checked_displays),
            "repository_displays_verified": len(checked_displays), "new_human_sessions": 0}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=BASE.parents[2],
                        help="Repository root containing prototypes/drone-configurator")
    args = parser.parse_args()
    print(json.dumps(verify(args.repo.resolve()), ensure_ascii=False))
