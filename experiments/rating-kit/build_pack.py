"""Create a shareable offline folder beside a researcher-only image key."""
import argparse
import hashlib
import json
import secrets
import shutil
from pathlib import Path
from PIL import Image
from eligibility import read_registry, require_eligible

HERE = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(plan_path, destination):
    plan = json.loads(plan_path.read_text(encoding="utf-8-sig"))
    if plan["mode"] not in ("calibration", "formal"):
        raise ValueError("Unknown mode")
    inputs = plan["images"]
    pairs = plan.get("pairs", [])
    keys = [item["key"] for item in inputs]
    if not inputs or len(set(keys)) != len(keys):
        raise ValueError("Provide uniquely keyed images.")
    if any(len(p) != 2 or p[0] == p[1] or not set(p) <= set(keys) for p in pairs):
        raise ValueError("Invalid pair.")
    ids = {}
    for k in keys:
        ids[k] = secrets.token_hex(5).upper()
    if len(set(ids.values())) != len(keys):
        raise RuntimeError("Image ID collision")
    checked = []
    registry = read_registry()
    for item in inputs:
        source = plan_path.parent / item["path"]
        if item["task"] not in ("A", "B"):
            raise ValueError("Task card must be A or B")
        with Image.open(source) as im:
            if im.size != (1024, 1024):
                raise ValueError(f"Expected a curated 1024-square input: {source.name}")
            rgb = im.convert("RGB")
            clean = Image.frombytes("RGB", rgb.size, rgb.tobytes())
        original_sha = digest(source)
        rgb_sha = hashlib.sha256(clean.tobytes()).hexdigest()
        require_eligible(plan["mode"], original_sha, rgb_sha, registry)
        checked.append((item, source, clean, original_sha, rgb_sha))
    destination.mkdir(parents=True, exist_ok=False)
    share = destination / "participant"
    (share / "images").mkdir(parents=True)
    rows, images = [], []
    for item, source, clean, original_sha, rgb_sha in checked:
        code = ids[item["key"]]
        output = share / "images" / (code + ".png")
        clean.save(output)
        images.append({"id": code, "task": item["task"]})
        rows.append({"id": code, "source": source.name, "key": item["key"],
                     "task": item["task"], "original_sha256": original_sha,
                     "png_sha256": digest(output),
                     "rgb_sha256": rgb_sha})
    secrets.SystemRandom().shuffle(images)
    manifest = {"schema":"rating-kit-v1", "pack":secrets.token_hex(8),
                "mode":plan["mode"], "wording":"X12-r3", "images":images,
                "pairs":[[ids[a],ids[b]] for a,b in pairs]}
    (share / "pack.js").write_text("const PACK = "+json.dumps(manifest)+";\n", encoding="utf-8")
    for name in ("index.html", "review.js"):
        shutil.copyfile(HERE / "template" / name, share / name)
    private = {"registry_revision": registry["revision"], "pack": manifest["pack"], "mode": plan["mode"], "wording":manifest["wording"], "images": rows,
               "pairs":pairs, "plan_sha256":digest(plan_path)}
    (destination / "researcher-key.json").write_text(
        json.dumps(private, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    build(args.plan, args.destination)

