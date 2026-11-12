"""Freeze stratified sampling; export only metadata-free, randomly labelled RGB images."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SEED = "2026111219"
STRATA = [("E0", "control", 4), ("E1", "control", 6), ("E1", "text", 2)]


def rank(domain, case):
    return sha256(f"{SEED}/{domain}/{case}".encode()).hexdigest()


def selection(rows):
    selected = []
    for stage, arm, size in STRATA:
        candidates = [r["case"] for r in rows if (r["stage"], r["arm"]) == (stage, arm)]
        selected.extend(sorted(candidates, key=lambda c: rank("human", c))[:size])
    return selected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", type=Path, help="Verified receipt index: case -> {path, sha256}. Paths relative to index.")
    parser.add_argument("--out", type=Path, help="New reader delivery folder, outside repository")
    parser.add_argument("--reader", choices=["AI-A", "AI-B", "human"])
    args = parser.parse_args()
    rows = json.loads((HERE / "manifest.json").read_bytes())["cases"]
    sample = selection(rows)
    if args.index is None and args.out is None and args.reader is None:
        print(json.dumps({"seed": SEED, "planned_human_sample": sample}, indent=2))
        return
    if not all([args.index, args.out, args.reader]):
        parser.error("Provide --index, --out and --reader together")
    receipts = json.loads(args.index.read_bytes())
    known = {r["case"] for r in rows}
    if receipts.keys() - known:
        raise ValueError("Unknown case in verified receipt index")
    if args.out.resolve().is_relative_to(HERE.parents[1]):
        raise ValueError("Choose a separate private delivery directory")
    cases = sample if args.reader == "human" else known
    args.out.mkdir(parents=True, exist_ok=False)
    for case in sorted(set(cases) & receipts.keys(), key=lambda c: rank(args.reader, c)):
        row = receipts[case]
        path = args.index.parent / row["path"]
        if sha256(path.read_bytes()).hexdigest() != row["sha256"]:
            raise ValueError(f"Original digest mismatch for {case}")
        with Image.open(path) as original:
            if original.size != (1024, 1024):
                raise ValueError(f"Native dimensions mismatch for {case}")
            rgb = original.convert("RGB")
            clean = Image.frombytes("RGB", rgb.size, rgb.tobytes())
            target = args.out / (rank(args.reader, case)[:16] + ".png")
            clean.save(target)
            with Image.open(target) as saved:
                assert saved.tobytes() == clean.tobytes() and not saved.info
    (args.out / "instructions.txt").write_bytes((HERE / "reader-instructions.txt").read_bytes())
    if args.reader == "human" and set(sample) <= receipts.keys():
        codes = sorted(rank("human", c)[:16] for c in sample)
        ids = [(rank("human", c)[:16], receipts[c]["sha256"]) for c in sample]
        pack_id = sha256(json.dumps(sorted(ids)).encode()).hexdigest()
        plan = {"id":pack_id,"images":codes}
        (args.out / "point-order.js").write_text("const POINT_PACK = "+json.dumps(plan)+";\n", encoding="utf-8")
        for source, dest in (("point-reader.html","index.html"),("point-reader.js","point-reader.js")):
            (args.out / dest).write_bytes((HERE / source).read_bytes())


if __name__ == "__main__":
    main()
