"""Check published coordinates, distances and model counts. Optional PDF byte/pixel check."""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent

def table(filename):
    with (ROOT / filename).open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def verify_pdf(directory, key, record):
    from PIL import Image
    path = directory / (key + ".pdf")
    assert digest(path) == record["pdf_sha256"], (key, "PDF")
    with tempfile.TemporaryDirectory(dir=directory) as work:
        output = Path(work) / "page"
        page = str(record["pdf_page"])
        subprocess.run(["pdftoppm", "-r", "576", "-f", page, "-l", page,
                        "-singlefile", str(path), str(output)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        with Image.open(output.with_suffix(".ppm")) as full:
            assert list(full.size) == record["page_size_px"], key
            crop = full.crop(record["crop_ltrb_px"]).convert("RGB")
            assert hashlib.sha256(crop.tobytes()).hexdigest() == record["crop_rgb_sha256"], key

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf-dir", type=Path, help="Folder with air.pdf, air2.pdf, m2.pdf, mini.pdf, m3p.pdf, m4p.pdf, nano.pdf")
    args = parser.parse_args()
    combined, additions, cross = (table(f) for f in
                                  ("a1-all-models.csv", "a1-additions.csv", "crosswalk.csv"))
    assert len(combined) == 64 and len(additions) == 14
    assert combined[50:] == additions
    def model(row):
        return (row["厂商"], row["型号"])
    assert len({model(row) for row in cross}) == len(cross) == 30
    assert {model(row) for row in cross} == {model(row) for row in combined}
    assert sum(row["电机轴数"] == "4" for row in cross) == 20
    assert sum(row["电机轴数"] == "6" for row in cross) == 10
    assert sum(row["A1决定"] == "新增" for row in cross) == 6
    for item in cross:
        for rows, label in [(combined[:50], "原合并表行号"), (additions, "本批增量表行号")]:
            actual = [n for n, row in enumerate(rows, 2) if model(row) == model(item)]
            assert actual == list(map(int, item[label].split())), model(item)
    published = {row["id"]: row for row in table("a2-metrics.csv")}
    samples = json.loads((ROOT / "a2-points.json").read_text(encoding="utf-8"))["samples"]
    assert set(samples) == set(published) and len(samples) == 7
    for name, record in samples.items():
        row = published[name]
        assert (record["brand"], record["model"]) == model(row)
        assert len([item for item in cross if item["A2本批id"] == name and model(item) == model(row)]) == 1
        points = record["points_crop_px"]
        left, top, right, bottom = record["crop_ltrb_px"]
        assert all(0 <= x < right-left and 0 <= y < bottom-top for x, y in points.values())
        assert record["nose_unit_xy"] == [0, -1]
        x, y = zip(*points.values())
        width, length = max(x)-min(x), max(y)-min(y)
        def distance(start, end):
            a, b = points[start], points[end]
            return math.hypot(b[0]-a[0], b[1]-a[1])
        diag1, diag2 = distance("FL", "RR"), distance("FR", "RL")
        expected = {"W_px": width, "L_px": length, "W_over_L": width/length,
                    "FL_RR_px": diag1, "FR_RL_px": diag2, "D_mean_px": (diag1+diag2)/2}
        for key, value in expected.items():
            assert abs(float(row[key])-value) <= 0.00000051, (name, key)
        if args.pdf_dir:
            verify_pdf(args.pdf_dir, name, record)
    print("OK: 30 models, 64 state rows, 7 projections, 28 original points.")
    if args.pdf_dir:
        print("OK: all 7 PDF hashes, page dimensions and rendered crop hashes match.")

if __name__ == "__main__":
    main()

