"""Generate the sealed table from the unchanged, pre-registered block plan."""
import argparse
import csv
import hashlib
import json
from pathlib import Path

ORDERS = ("A-D/B-S", "B-D/A-S", "A-S/B-D", "B-S/A-D")


def draw(raw):
    plan = json.loads(raw)
    if not isinstance(plan["seed"], str) or not plan["seed"].strip():
        raise ValueError("Provide the pre-registered seed as a non-empty string.")
    blocks = plan["blocks"]
    if type(blocks) is not int or blocks <= 0:
        raise ValueError("blocks must be a positive integer.")
    rows = []
    for block in range(1, blocks + 1):
        def rank(order):
            key = json.dumps(["X12-v1", plan["seed"], block, order], ensure_ascii=False)
            return hashlib.sha256(key.encode("utf-8")).digest()
        for order in sorted(ORDERS, key=rank):
            rows.append([f"P{len(rows)+1:03d}", block, *order.split("/")])
    return rows


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("plan", type=Path)
    p.add_argument("registered_sha256")
    p.add_argument("output", type=Path)
    args = p.parse_args()
    raw = args.plan.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != args.registered_sha256:
        p.error("Plan differs from the registered SHA-256.")
    rows = draw(raw)
    args.output.mkdir(parents=True, exist_ok=False)
    table = args.output / "allocation.csv"
    with table.open("x", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["slot", "block", "session_1", "session_2"])
        w.writerows(rows)
    summary = {"algorithm": "X12-v1 SHA256 block order", "plan_sha256": digest,
               "slots": len(rows), "blocks": len(rows)//4,
               "table_sha256": hashlib.sha256(table.read_bytes()).hexdigest()}
    (args.output / "seal.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

