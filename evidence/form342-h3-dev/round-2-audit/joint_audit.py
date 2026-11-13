"""Secondary audit of the regular S arm. Use frozen observations; never rescore images."""
import csv
import json
from collections import Counter
from pathlib import Path

here = Path(__file__).resolve().parent
batch = here.parent / "round-2"
rules = {
    "body_plan": ("body", {"pod": "pod", "box": "box"}),
    "arm_root": ("root", {"seamless": "B", "socket": "S", "hinge": "H"}),
    "camera": ("nose", {"inside": "N", "projecting": "P"}),
    "cover": ("cover", {"single": "C", "multi": "M"}),
}
with (batch / "by-image.csv").open(encoding="utf-8-sig") as source:
    observed = {row["slot"]: row for row in csv.DictReader(source)}
planned = json.loads((batch / "manifest.json").read_bytes())["rows"]
records = []
for item in sorted(planned, key=lambda row: row["id"]):
    if item["condition"] not in {f"S{i}" for i in range(6)}:
        continue
    image = observed[item["id"]]
    record = {"slot": item["id"]}
    for parameter, (field, codes) in rules.items():
        target = codes[item["target"][parameter]]
        code = image[field]
        record[field] = "U" if code == "U" else "match" if code == target else "other"
    record["four_observable_targets"] = all(record[key] == "match" for key, _ in rules.values())
    record["four_two_blade_rotors"] = image["double"]
    record["camera_orientation"] = image["camera"]
    records.append(record)
assert len(records) == 18 and len({r["slot"] for r in records}) == 18
with (here / "regular-18.csv").open("w", encoding="utf-8-sig", newline="") as stream:
    out = csv.DictWriter(stream, fieldnames=records[0].keys())
    out.writeheader()
    out.writerows(records)
for field, _ in rules.values():
    print(field, Counter(row[field] for row in records))
for condition in sorted({r["slot"].split("-")[0] for r in records}):
    rows = [r for r in records if r["slot"].startswith(condition + "-")]
    print(condition, sum(r["four_observable_targets"] for r in rows), len(rows))
