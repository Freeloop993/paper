"""Summarize one pack's returned image ratings, without changing raw responses."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from statistics import median


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def summarize(key, files, rule=None):
    items = {row["id"]: row for row in key["images"]}
    grouped = {code: [] for code in items}
    seen = set()
    if rule is not None:
        if (not rule.get("freeze_reference") or rule["pack"] != key["pack"]
                or rule["mode"] != key["mode"] or rule["construction"] != "all_readers_yes"
                or rule["missing"] != "undetermined" or type(rule["expected_readers"]) is not int
                or rule["expected_readers"] < 1):
            raise ValueError("Invalid rule, denominator or pack")
        for k in ("taskFit", "coherence"):
            if type(rule[k]) not in (int, float) or not 1 <= rule[k] <= 7:
                raise ValueError("Invalid rating threshold")
    for f in files:
        v = read(f)
        if (v["pack"] != key["pack"] or v["mode"] != key["mode"] or v["schema"] != "rating-kit-v1"
                or v["responseId"] in seen or not v.get("ended")):
            raise ValueError("Mismatched, duplicate or unfinished response: " + f.name)
        seen.add(v["responseId"])
        if sorted(r["id"] for r in v["images"]) != sorted(items):
            raise ValueError("Image set differs: " + f.name)
        for r in v["images"]:
            if r["card"] != items[r["id"]]["task"]:
                raise ValueError("Card mismatch")
            grouped[r["id"]].append(r["evaluation"])
    if rule and len(seen) > rule["expected_readers"]:
        raise ValueError("More responses than the frozen denominator")
    rows = {}
    for code, ratings in grouped.items():
        row = {"readers": len(ratings), "construction": {}, "scores": {}}
        for k in ("rotors", "body", "arms", "camera"):
            counts = Counter(r[k] for r in ratings)
            if set(counts) - {"是", "否", "不可判"}:
                raise ValueError("Unknown construction option")
            row["construction"][k] = dict(counts)
        for k in ("taskFit", "coherence", "appeal", "novelty"):
            values = [r[k] for r in ratings if r[k] != "不可判"]
            if any(v not in list("1234567") for v in values):
                raise ValueError("Unknown score")
            row["scores"][k] = {"median": median(map(int, values)) if values else None,
                                "rated": len(values), "uncertain": len(ratings)-len(values)}
        row["joint"] = None
        if rule:
            core = [row["scores"][k] for k in ("taskFit", "coherence")]
            if (len(seen) == rule["expected_readers"] and all(x["uncertain"] == 0 for x in core)
                    and not any(c.get("不可判") for c in row["construction"].values())):
                row["joint"] = (all(c.get("是", 0) == len(seen) for c in row["construction"].values())
                                and all(row["scores"][k]["median"] >= rule[k] for k in ("taskFit","coherence")))
        rows[code] = row
    return {"mode": key["mode"], "pack": key["pack"], "responses":len(seen), "rule":rule, "images":rows}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("key", type=Path)
    parser.add_argument("returns", nargs="+", type=Path)
    parser.add_argument("--registered-rule", type=Path)
    parser.add_argument("--registered-sha256")
    a = parser.parse_args()
    if bool(a.registered_rule) != bool(a.registered_sha256):
        parser.error("Provide both the frozen rule and its registered SHA-256")
    if a.registered_rule and hashlib.sha256(a.registered_rule.read_bytes()).hexdigest() != a.registered_sha256:
        parser.error("Rule differs from registration")
    print(json.dumps(summarize(read(a.key), a.returns, read(a.registered_rule) if a.registered_rule else None),
                     ensure_ascii=False, indent=2))

