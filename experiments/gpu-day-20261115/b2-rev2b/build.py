"""B2 修订二·双参考图版：图 1 为父图 B2，图 2 为第三轮 C1（相机舱贴机头下方、俯视只见灰色顶面）。只改相机。

修订二文字版的开发图 0/3 通过（三张镜头都正对观察者），按判据未跑正式批。本版先跑 3 张开发验证。
用法（仓库根目录）：python3 -B experiments/gpu-day-20261115/b2-rev2b/build.py
"""
import copy, hashlib, json
from pathlib import Path

HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[2]
TPL = json.loads((ROOT / "experiments/e3-quad-qwen/template.request.json").read_text(encoding="utf-8"))
D16 = json.loads((ROOT / "experiments/e3-quad-qwen/round-3/dictionary-v16.json").read_text(encoding="utf-8"))
NEG = TPL["prompt"]["4"]["inputs"]["negative_prompt"] + ", " + D16["negative_extra"] + \
      ", lens glass on the top of the camera, camera window on top, camera lens facing the viewer"
TEXT = ("Image 1 is the drone to edit; image 2 is a reference for the camera only. Change only the nose of the drone in image 1: "
        "give it the same camera arrangement as the nose of the drone in image 2, a small grey camera housing tucked underneath "
        "the front of the fuselage that peeks out just ahead of the nose, seen from directly above with only its plain grey top "
        "visible and the lens pointing straight forward, hidden from this overhead view. Do not copy anything else from image 2. "
        "Keep everything else of image 1 exactly the same: the strict orthographic top view, the body outline, the top cover panels "
        "and parting lines, the seamless light grey arms, the motors with their orange rings, the two-blade propellers and their "
        "angles, the colours and the plain light background.")
rows = []
out = HERE / "dev"; out.mkdir(exist_ok=True)
for i, seed in enumerate([2026112151, 2026112152, 2026112153], 1):
    r = copy.deepcopy(TPL); g = r["prompt"]
    g["4"]["inputs"]["prompt"] = TEXT; g["4"]["inputs"]["negative_prompt"] = NEG
    g["15"]["inputs"]["image"] = "E3R3-B2.png"
    g["16"] = {"class_type": "LoadImage", "inputs": {"image": "E3R3-C1.png"}}
    g["4"]["inputs"]["images.image_2"] = ["16", 0]
    g["10"]["inputs"]["seed"] = seed
    rid = f"REV2B-dev-B2-r{i}"; g["12"]["inputs"]["filename_prefix"] = rid
    raw = json.dumps(r, ensure_ascii=False, indent=2).encode("utf-8"); (out / f"{rid}.json").write_bytes(raw)
    rows.append({"id": rid, "seed": seed, "images": ["E3R3-B2.png", "E3R3-C1.png"], "request_sha256": hashlib.sha256(raw).hexdigest()})
(HERE / "manifest.json").write_text(json.dumps({"text": TEXT, "negative": NEG, "requests": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("\n".join(f"{r['id']} {r['seed']}" for r in rows))
