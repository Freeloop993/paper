"""复算 N2 真人观察表。python score_n2.py human-readings.json"""
from collections import Counter
from pathlib import Path
import json
import sys

ROOT_FIELDS = ("tl", "tr", "br", "bl")
ROOTS = {"smooth", "socket", "hinge", "unclear"}
COVERS = {"single", "multi", "unclear"}
RUNS = {f"S12-{group}-r{i:02d}" for group in ("S0", "S2", "S5") for i in range(1, 5)}

def root_class(row):
    counts = Counter(row[field] for field in ROOT_FIELDS)
    return next((name for name in ("smooth", "socket", "hinge") if counts[name] >= 3), "mixed_or_unclear")

def score(packet):
    assert packet["study"] == "structure12-v1"
    results = []
    readers = set()
    for reader in packet["responses"]:
        who = reader["reader"]
        assert who not in readers
        readers.add(who)
        assert reader["exposure"] in ("yes", "no", "unsure") and reader["consented"] is True
        rows = reader["answers"]
        assert len(rows) == 12 and {row["run"] for row in rows} == RUNS
        assert all(row["cover"] in COVERS and all(row[k] in ROOTS for k in ROOT_FIELDS) for row in rows)
        by_group = {group: [r for r in rows if r["run"].split("-")[1] == group] for group in ("S0", "S2", "S5")}
        counts = {group: {"n": len(records), "roots": dict(Counter(root_class(r) for r in records)), "cover": dict(Counter(r["cover"] for r in records))} for group,records in by_group.items()}
        s2 = counts["S2"]["roots"].get("socket", 0)
        f2 = counts["S0"]["roots"].get("socket", 0)
        s5 = counts["S5"]["cover"].get("multi", 0)
        f5 = counts["S0"]["cover"].get("multi", 0)
        def gate(target, baseline):
            return {"target_of_4":target,"baseline_of_4":baseline,"meets_both":target>=3 and baseline<=1}
        results.append({"reader":who,"exposure":reader["exposure"],"stratum":"未接触材料（自报）" if reader["exposure"]=="no" else "单列","S2":gate(s2,f2),"S5":gate(s5,f5),"all_cells":counts})
    return results

if __name__ == "__main__":
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
    print(json.dumps(score(data), ensure_ascii=False, indent=2))
