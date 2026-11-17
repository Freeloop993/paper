"""Build private blind packets or score locked responses. Never place packets in the publication directory."""
import argparse
import csv
import hashlib
import math
import random
import secrets
import statistics
from itertools import combinations
from pathlib import Path

from recompute import HERE, ORDER, geometry, point, read_rows

LANDMARKS = (*ORDER, "upper", "lower", "left", "right")
READERS = ("AI", "H1", "H2")


def write(path, rows):
    with path.open("x", encoding="utf-8-sig", newline="") as stream:
        w = csv.DictWriter(stream, fieldnames=rows[0])
        w.writeheader()
        w.writerows(rows)


def private(path):
    path = path.resolve()
    if path == HERE or HERE in path.parents:
        raise ValueError("Choose a private directory outside the publication directory")
    return path


def human_sample(rows):
    counts = [("WLQ12", "0.70", 2), ("WLQ12", "1.00", 1), ("WLQ12", "1.30", 1),
              ("WLQ24", "0.70", 2), ("WLQ24", "1.00", 3), ("WLQ24", "1.30", 2),
              ("E3", "1.00", 3), ("E3R2", "1.00", 3), ("E3R3", "1.00", 2), ("B2-L", "1.00", 1)]
    selected = set()
    for cohort, target, count in counts:
        pool = [r for r in rows if r["cohort"] == cohort and r["target"] == target]
        ranked = sorted(pool, key=lambda r: hashlib.sha256(("A3-A8-v1/" + r["sha256"]).encode()).digest())
        selected.update(r["image_id"] for r in ranked[:count])
    if len(selected) != 20:
        raise ValueError("Expected 20 common cases for both humans")
    return selected


INSTRUCTIONS = """独立逐图记录，可放大原图。坐标为原图整数像素，左上角 (0,0)，向右、向下为正。
按 response.csv 的编号顺序打开 PNG。tl、tr、br、bl 依次是画面左上、右上、右下、左下。
各填可见桨毂中心帽或中心螺钉的中心。偏心、电机顶和桨毂给出多个合理转轴时，留空相应点，在 reason 写明位置与原因。
点线示意图取四个轴标记的中心，只填四轴。其余图的 upper、lower 是固定中央机壳的图上端、下端，排除外置相机、机臂与阴影。
left、right 取四轴 y 均值四舍至最近整数所在水平线与中央壳体两侧的交点。轴心不全、无法定截面时留空两侧。
缺点时保留图号，两坐标一起留空并说明原因。允许单项缺失。全图四轴坐标以原尺寸报告。
请在获知条件或其他读数前完成并交回表格。另报读图日期、使用软件及版本、是否见过材料、点位规则偏离和难判情形。
"""


def prepare(root, destination):
    from PIL import Image
    rows = [r for r in read_rows("points.csv") if r["cohort"] != "B2-H"]
    ids = {r["image_id"] + ".png": r["sha256"] for r in rows}
    guides = {r["file"]: r["sha256"] for r in read_rows("guide-pixels.csv")}
    ids.update(guides)
    located = {}
    for path in root.rglob("*.png"):
        if path.name in ids and path.name not in located:
            if hashlib.sha256(path.read_bytes()).hexdigest() == ids[path.name]:
                located[path.name] = path
    if len(located) != len(ids):
        raise ValueError("Missing hash-matched PNGs: " + str(sorted(ids.keys() - located.keys())))
    dest = private(destination)
    dest.mkdir(parents=True, exist_ok=False)
    sample = {s + ".png" for s in human_sample(rows)}
    key = []
    for reader in READERS:
        packet = dest / reader
        packet.mkdir()
        names = list(ids if reader == "AI" else sorted(sample | guides.keys()))
        random.SystemRandom().shuffle(names)
        blank = []
        for name in names:
            token = secrets.token_hex(8)
            with Image.open(located[name]) as original:
                im = original.convert("RGB")
                im.info.clear()
                im.save(packet / (token + ".png"))
            with Image.open(packet / (token + ".png")) as clean:
                if clean.size != (1024, 1024) or clean.info or clean.tobytes() != im.tobytes():
                    raise ValueError("De-identification changed image or left metadata")
            key.append(dict(reader=reader, token=token, file=name, sha256=ids[name]))
            blank.append(dict(token=token, **{f"{p}_{a}": "" for p in LANDMARKS for a in "xy"}, reason=""))
        write(packet / "response.csv", blank)
        (packet / "instructions.txt").write_text(INSTRUCTIONS, encoding="utf-8")
    write(dest / "PRIVATE-key.csv", key)
    print("Prepared private packets. AI 64 + 4 guides, H1/H2 each 20 + 4 guides.")


def load(path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def report(work):
    work = private(work)
    key = load(work / "PRIVATE-key.csv")
    guide_true = {}
    for r in read_rows("guide-pixels.csv"):
        guide_true.setdefault(r["file"], {})[r["hub"]] = tuple(int(r["sum_" + a])/int(r["red_pixels"]) for a in "xy")
    reads, keyed = {}, {}
    per_image = []
    for reader in READERS:
        mapping = {r["token"]: r["file"] for r in key if r["reader"] == reader}
        form = load(work / reader / "response.csv")
        if set(mapping) != {r["token"] for r in form} or len(form) != len(mapping):
            raise ValueError("Changed sample or duplicated response: " + reader)
        for r in form:
            name = mapping[r["token"]]
            hubs = [point(r, p) for p in ORDER]
            upper, lower, left, right = [point(r, p) for p in LANDMARKS[4:]]
            needed = hubs if name in guide_true else hubs + [upper, lower, left, right]
            if None in needed and not r["reason"].strip():
                raise ValueError("Record missing-point reason: " + reader + "/" + r["token"])
            if left and right and right[0] <= left[0] or upper and lower and lower[1] <= upper[1]:
                raise ValueError("Reversed shell supports")
            wl = pv1 = pv2 = None
            if None not in hubs:
                w, length, _, _, d = geometry(hubs)
                wl = w / length
                if left and right:
                    pv2 = (right[0] - left[0]) / d
            if left and right and upper and lower:
                pv1 = (lower[1] - upper[1]) / (right[0] - left[0])
            reads[reader, name] = (hubs, wl, pv1, pv2)
            per_image.append(dict(reader=reader, file=name, n_hubs=sum(p is not None for p in hubs),
                                  wl=wl, pv01_section=pv1, pv02_section=pv2, reason=r["reason"]))
        keyed[reader] = set(mapping.values())

    def line(pair, kind, measure, values):
        valid = [v for v in values if v is not None]
        return dict(comparison=pair, sample=kind, metric=measure, n_expected=len(values), n_valid=len(valid),
                    n_missing=len(values)-len(valid), median=statistics.median(valid) if valid else "",
                    mean=statistics.mean(valid) if valid else "", maximum=max(valid) if valid else "")
    result = []
    for reader in READERS:
        xy, ratios, biases = [], [], []
        for name, truth in guide_true.items():
            ordered = [truth[h] for h in ORDER]
            w, length, *_ = geometry(ordered)
            hubs, wl, *_ = reads[reader, name]
            xy.extend(math.dist(p, g) if p else None for p, g in zip(hubs, ordered))
            ratios.append(abs(wl - w/length) if wl is not None else None)
            biases.append(wl - w/length if wl is not None else None)
        for metric, vals in [("hub_error_px", xy), ("wl_abs_error", ratios), ("wl_signed_error", biases)]:
            result.append(line(reader + "-guide", "guides", metric, vals))
    for first, second in combinations(READERS, 2):
        shared = sorted((keyed[first] & keyed[second]) - guide_true.keys())
        if len(shared) != 20:
            raise ValueError("Human overlap differs from planned 20 designs")
        pair = first + "-" + second
        errors = [math.dist(a,b) if a and b else None for n in shared
                  for a,b in zip(reads[first,n][0], reads[second,n][0])]
        result.append(line(pair, "generated_or_final", "hub_difference_px", errors))
        for i,label in enumerate(("wl", "pv01_section", "pv02_section"), 1):
            diffs = []
            for n in shared:
                a,b = reads[first,n][i], reads[second,n][i]
                diffs.append(abs(a-b) if a is not None and b is not None else None)
            result.append(line(pair, "generated_or_final", "abs_" + label + "_difference", diffs))
    image_path = work / "private-per-image.csv"
    score_path = work / "private-calibration-results.csv"
    if image_path.exists() or score_path.exists():
        raise ValueError("Results already exist. Use a separate scoring copy for a new revision.")
    write(image_path, per_image)
    write(score_path, result)
    print("Scored locked forms. Inspect per-comparison valid and missing counts.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    build = sub.add_parser("prepare")
    build.add_argument("images", type=Path)
    build.add_argument("new_private_directory", type=Path)
    score = sub.add_parser("score")
    score.add_argument("private_directory", type=Path)
    args = parser.parse_args()
    if args.action == "prepare":
        prepare(args.images, args.new_private_directory)
    else:
        report(args.private_directory)
