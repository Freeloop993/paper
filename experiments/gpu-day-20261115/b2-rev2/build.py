"""B2 修订二：回退到父图 B2，只改相机，写明俯视看不到镜头。先 3 张开发验证，再 3 张正式。

用法（仓库根目录）：python3 -B experiments/gpu-day-20261115/b2-rev2/build.py
"""
import copy, hashlib, json
from pathlib import Path

HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[2]
TPL = json.loads((ROOT / "experiments/e3-quad-qwen/template.request.json").read_text(encoding="utf-8"))
D16 = json.loads((ROOT / "experiments/e3-quad-qwen/round-3/dictionary-v16.json").read_text(encoding="utf-8"))
NEG = TPL["prompt"]["4"]["inputs"]["negative_prompt"] + ", " + D16["negative_extra"] + \
      ", lens glass on the top of the camera, camera window on top, dark circle on the camera top"
TEXT = ("Edit this drone image. Change only the nose: add a compact gimbal camera tucked underneath the front of the fuselage, "
        "as on modern foldable camera drones. Seen from directly above, only the smooth matte grey top cover of the camera housing "
        "and its two short side arms show just ahead of the nose. The lens points straight forward toward the top edge of the image "
        "and is completely hidden in this overhead view: no lens, glass, window or dark circle is visible on the top of the camera. "
        "Keep everything else exactly the same: the strict orthographic top view, the body outline, the top cover panels and parting "
        "lines, the seamless arms, the motors with their orange rings, the two-blade propellers and their angles, the colours and the "
        "plain light background.")
PARENT = "E3R3-B2.png"  # SHA-256 be76d340065555747bff51ba2458449b12eda74f81f629c32847cc34ab1a7621
rows = []
for stage, seeds in (("dev", [2026112141, 2026112142, 2026112143]), ("formal", [2026112144, 2026112145, 2026112146])):
    out = HERE / stage; out.mkdir(exist_ok=True)
    for i, seed in enumerate(seeds, 1):
        r = copy.deepcopy(TPL); g = r["prompt"]
        g["4"]["inputs"]["prompt"] = TEXT; g["4"]["inputs"]["negative_prompt"] = NEG
        g["10"]["inputs"]["seed"] = seed; g["15"]["inputs"]["image"] = PARENT
        rid = f"REV2-{stage}-B2-r{i}"; g["12"]["inputs"]["filename_prefix"] = rid
        raw = json.dumps(r, ensure_ascii=False, indent=2).encode("utf-8"); (out / f"{rid}.json").write_bytes(raw)
        rows.append({"id": rid, "stage": stage, "seed": seed, "parent": PARENT, "request_sha256": hashlib.sha256(raw).hexdigest()})
(HERE / "manifest.json").write_text(json.dumps({"text": TEXT, "negative": NEG, "requests": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("\n".join(f"{r['id']} {r['seed']}" for r in rows))
