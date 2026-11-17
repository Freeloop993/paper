"""E6 植保批更正：换成植保专用负向词，编号另起，种子沿用 manifest-v2 的同号配对方案。

原 06/07/14 的 39 份（HEXA-draft-*、P2-HEXA-wl*）沿用了四旋负向词（机尾相机、机尾深色模组、朝上镜头、相机颈杆），
会压制植保机机尾 FPV 相机或雷达等合理部件。请在提交前撤下，以本目录的 HEXA3-* 替代。
用法（仓库根目录）：python3 -B experiments/gpu-day-20261115/hexa-fix/build.py
"""
import copy, hashlib, json
from pathlib import Path

HERE = Path(__file__).resolve().parent; G = HERE.parent
BASE_NEG = "flat schematic, line drawing, collage, text, labels, logo, cropped rotor, disconnected arm, extra rotor, perspective camera"
HEXA_NEG = BASE_NEG + ", V-shaped propeller, blades at an acute angle, single-blade propeller, missing blade, unequal blades"
v2 = json.loads((G / "manifest-v2.json").read_text(encoding="utf-8"))
out = HERE / "requests"; out.mkdir(exist_ok=True); rows = []
for r in v2["requests"]:
    if "HEXA" not in r["old"]:
        continue
    req = json.loads((G / "queue" / r["source"]).read_bytes()); g = req["prompt"]
    assert "six-rotor" in g["4"]["inputs"]["prompt"]
    new_id = "HEXA3-" + r["id"].replace("P2-HEXA-", "").replace("HEXA-", "")
    g = copy.deepcopy(g); g["4"]["inputs"]["negative_prompt"] = HEXA_NEG
    g["10"]["inputs"]["seed"] = r["seed"]; g["12"]["inputs"]["filename_prefix"] = new_id
    raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
    (out / f"{r['order']:02d}-{new_id}.json").write_bytes(raw)
    rows.append({"order": r["order"], "replaces": r["id"], "id": new_id, "seed": r["seed"], "inputs": r["inputs"],
                 "request_sha256": hashlib.sha256(raw).hexdigest()})
(HERE / "manifest.json").write_text(json.dumps({"negative": HEXA_NEG, "requests": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(len(rows), "rows;", rows[0]["replaces"], "->", rows[0]["id"], rows[0]["seed"])
