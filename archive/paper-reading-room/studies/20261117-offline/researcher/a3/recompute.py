"""Recalculate archived and reviewed image-plane measurements. Python 3.9+."""
import argparse
import csv
import math
import statistics
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORDER = ("tl", "tr", "br", "bl")
COHORTS = {"WLQ12": 12, "WLQ24": 24, "E3": 9, "E3R2": 9, "E3R3": 9, "B2-L": 1, "B2-H": 1}


def read_rows(name):
    with (HERE / name).open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def point(row, name):
    x, y = (row[name + "_" + axis] for axis in "xy")
    if x == y == "":
        return None
    p = int(x), int(y)
    if not all(0 <= value < 1024 for value in p):
        raise ValueError(f"Point outside 1024 frame: {p}")
    return p


def geometry(hubs):
    tl, tr, br, bl = hubs
    x, y = zip(*hubs)
    w, length = max(x) - min(x), max(y) - min(y)
    side_w = (tr[0] - tl[0] + br[0] - bl[0]) / 2
    side_l = (bl[1] - tl[1] + br[1] - tr[1]) / 2
    diagonal = (math.dist(tl, br) + math.dist(tr, bl)) / 2
    return w, length, side_w, side_l, diagonal


def hit(width, length, target):
    return int(abs(Fraction(width) / Fraction(length) - Fraction(target)) <= Fraction(1, 10))


def display(value):
    return "" if value is None else f"{value:.6f}"


def rows_for_images():
    rows = read_rows("points.csv")
    if len({r["sha256"] for r in rows}) != 65 or len({r["image_id"] for r in rows}) != 65:
        raise ValueError("Unexpected duplicated or missing files")
    metrics, groups = [], defaultdict(list)
    for r in rows:
        hubs = [point(r, h) for h in ORDER]
        w, length, sw, sl, d = geometry(hubs)
        target = r["target"]
        wl, side = w / length, sw / sl
        if r["archive_side_ratio"] and not math.isclose(side, float(r["archive_side_ratio"]), abs_tol=1e-12):
            raise ValueError("Archived side-average discrepancy: " + r["image_id"])
        top, bottom, left, right = [point(r, k) for k in ("upper", "lower", "left", "right")]
        bw = right[0] - left[0]
        body_length = bottom[1] - top[1] if top and bottom else None
        pv1, pv2 = body_length / bw if body_length else None, bw / d
        scores = (wl, side, hit(w, length, target), hit(sw, sl, target), pv1, pv2)
        groups[r["cohort"], target].append((r["seed"], scores))
        metrics.append(dict(image_id=r["image_id"], W=w, L=length, side_W=sw, side_L=sl,
                            wl=display(wl), side_wl=display(side), hit=scores[2], side_hit=scores[3],
                            mean_diagonal=display(d), shell_length=body_length or "", shell_section_width=bw,
                            pv01_section=display(pv1), pv02_section=display(pv2)))
    stats = []
    for cohort, expected in COHORTS.items():
        levels = sorted(target for batch, target in groups if batch == cohort)
        if sum(len(groups[cohort, t]) for t in levels) != expected:
            raise ValueError("Unexpected cohort count: " + cohort)
        trends = ["", "", ""]
        if cohort.startswith("WLQ"):
            by_seed = [{s: v for s, v in groups[cohort, t]} for t in levels]
            seeds = set(by_seed[0])
            if len(seeds) != expected // 3 or not all(set(run) == seeds for run in by_seed):
                raise ValueError("Incomplete or duplicate seed triplet")
            trends = [len(seeds)] + [sum(by_seed[0][s][i] < by_seed[1][s][i] < by_seed[2][s][i]
                                          for s in seeds) for i in (0, 1)]
        for target in levels:
            v = [values for _, values in groups[cohort, target]]
            def median(column):
                known = [r[column] for r in v if r[column] is not None]
                return display(statistics.median(known)) if known else ""
            stats.append(dict(cohort=cohort, target=target, n_images=len(v), n_axes_complete=len(v),
                              wl_median=median(0), hits=sum(x[2] for x in v),
                              side_wl_median=median(1), side_hits=sum(x[3] for x in v),
                              n_pv01=sum(x[4] is not None for x in v), pv01_section_median=median(4),
                              n_pv02=len(v), pv02_section_median=median(5),
                              seed_triplets=trends[0], increasing_range=trends[1], increasing_side=trends[2]))
    return metrics, stats


def parent_comparison():
    current = {r["image_id"]: r for r in read_rows("points.csv")}
    groups = defaultdict(dict)
    for r in read_rows("archived-parent-points.csv"):
        if current[r["image_id"]]["sha256"] != r["sha256"]:
            raise ValueError("Different parent image")
        groups[r["image_id"]][r["hub"]] = int(r["x"]), int(r["y"])
    results = []
    for name, pts in groups.items():
        old = [pts[k] for k in ORDER]
        new = [point(current[name], k) for k in ORDER]
        ow, ol, *_ = geometry(old)
        nw, nl, *_ = geometry(new)
        results.append(dict(image_id=name, archive_wl=display(ow/ol), review_wl=display(nw/nl),
                            abs_difference=display(abs(ow/ol-nw/nl)),
                            max_hub_difference_px=display(max(map(math.dist, old, new)))))
    return results


def calibration_rows():
    groups = defaultdict(dict)
    for r in read_rows("prior-calibration.csv"):
        groups[r["case"], r["reader"]][r["hub"]] = r
    if len(groups) != 12:
        raise ValueError("Expected two archived readers on six common cases")
    results = []
    for (case, reader), g in groups.items():
        def coords(prefix):
            return [tuple(float(g[h][prefix + "_" + axis]) for axis in "xy") for h in ORDER]
        truth, observed = coords("gold"), coords("read")
        w, length, _, _, d = geometry(truth)
        ow, ol, *_ = geometry(observed)
        errors = list(map(math.dist, truth, observed))
        kpe = statistics.mean(errors) / d
        if abs(kpe - float(g["tl"]["archive_kpe"])) > 1e-12:
            raise ValueError("Archived KPE discrepancy")
        results.append(dict(case=case, reader=reader, n_hubs=len(errors), mean_error_px=display(statistics.mean(errors)),
                            max_error_px=display(max(errors)), normalized_kpe=display(kpe), gold_page_wl=display(w/length),
                            read_page_wl=display(ow/ol), abs_page_wl_error=display(abs(w/length-ow/ol))))
    return results


def guide_rows():
    guides = defaultdict(dict)
    for r in read_rows("guide-pixels.csv"):
        n = int(r["red_pixels"])
        guides[r["file"]][r["hub"]] = tuple(int(r["sum_" + ax]) / n for ax in "xy")
    results = []
    for name, pts in guides.items():
        w, length, *_ = geometry([pts[h] for h in ORDER])
        results.append(dict(file=name, visible_hubs=len(pts), W=display(w), L=display(length), wl=display(w/length)))
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Regenerate derived CSVs beside this file")
    args = parser.parse_args()
    images, summary = rows_for_images()
    for filename, rows in [("image-metrics.csv", images), ("summary.csv", summary),
                           ("prior-calibration-scores.csv", calibration_rows()), ("guide-check.csv", guide_rows()), ("parent-check.csv", parent_comparison())]:
        if args.write:
            with (HERE / filename).open("w", encoding="utf-8-sig", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=rows[0])
                writer.writeheader()
                writer.writerows(rows)
        expected = [{k: str(v) for k, v in row.items()} for row in rows]
        if read_rows(filename) != expected:
            raise SystemExit("Mismatch: " + filename)
        print(filename, len(rows), "rows verified")


if __name__ == "__main__":
    main()
