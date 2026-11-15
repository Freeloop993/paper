"""2026-11-15 下午开发批（作者 #3 授权“可以，登记后跑”）：E6 喷杆两种改法各 3 张 + 4.4 碳纤维臂 3 张。

用法（仓库根目录）：python3 -B experiments/gpu-day-20261115/afternoon-dev/build.py
- E6B-R / E6B-N：取 HEXA3 首案的实际请求（hexa-fix/requests/06-HEXA3-draft-r*.json），只替换喷杆一句；
  点线图、种子（2026112301—03）、负向词、采样设置全部不变，与 HEXA3 首案同种子配对。
- M-L：以低调配色稿 B2-L-lowkey.png 为底图做编辑，只改机臂材质；种子 2026112401—03（未用过）。
  该图的相机在画面下端，因此负向词不带任何“tail”类词。
"""
import copy, hashlib, json, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[2]
REQ = HERE / "requests"; INP = HERE / "inputs"; REQ.mkdir(exist_ok=True); INP.mkdir(exist_ok=True)
HEXA = HERE.parent / "hexa-fix/requests"
OLD_BOOM = "A transverse spray boom runs across under the body and extends beyond both sides of the frame."
BOOM = {
    "R": ("A straight transverse spray boom with four small nozzles is mounted at the rear of the frame, behind the tank and "
          "between the two rear arms; it is clearly offset toward the tail from the two lateral arms, never overlapping them, "
          "and its ends stop short of the rear propellers."),
    "N": ("There is no spray boom. Instead, one small round spray nozzle is mounted directly below each of the six motors, "
          "its dark nozzle tip just visible beside the motor from above."),
}
M_TEXT = ("Edit this drone image. Change only the material of the four arms: make every arm, from where it joins the body to "
          "the motor, visible carbon fibre with a fine woven twill pattern in dark charcoal, matte finish. Keep everything else "
          "exactly the same: the strict orthographic top view, the light grey body shell with its outline and parting lines, "
          "the camera housing at the lower end of the image, the shape and width of the arms and their joints with the body, "
          "the motors, the two-blade propellers and their angles, and the plain light background.")
M_BASE = "B2-L-lowkey.png"
rows = []


def sha(b):
    return hashlib.sha256(b).hexdigest()


def put(order, rid, req, note):
    req = copy.deepcopy(req); g = req["prompt"]; g["12"]["inputs"]["filename_prefix"] = rid
    raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
    (REQ / f"{order:02d}-{rid}.json").write_bytes(raw)
    rows.append({"order": order, "id": rid, "seed": g["10"]["inputs"]["seed"],
                 "input_images": [v["inputs"]["image"] for v in g.values() if v["class_type"] == "LoadImage"],
                 "prompt_sha256": sha(g["4"]["inputs"]["prompt"].encode()), "request_sha256": sha(raw), "note": note})


hexa_neg = None
for opt, order in (("R", 1), ("N", 2)):
    for i in (1, 2, 3):
        src = json.loads((HEXA / f"06-HEXA3-draft-r{i}.json").read_bytes())
        g = src["prompt"]; text = g["4"]["inputs"]["prompt"]
        assert text.count(OLD_BOOM) == 1, "HEXA3 首案正向词与预期不符"
        g["4"]["inputs"]["prompt"] = text.replace(OLD_BOOM, BOOM[opt])
        hexa_neg = g["4"]["inputs"]["negative_prompt"]
        put(order, f"E6B-{opt}-dev-r{i}", src, f"喷杆改法 {opt}；与 HEXA3-draft-r{i} 同种子配对")
        shutil.copy(ROOT / "experiments/gpu-day-20261115/inputs/hexa-points-1.00.png", INP / "hexa-points-1.00.png")

# 碳纤维臂：模板取 HEXA3 首案的图结构（同一编辑工作流），换底图、文字、种子
m_neg = hexa_neg + ", changed body outline, moved camera, extra components, glossy plastic arms"
base = json.loads((HEXA / "06-HEXA3-draft-r1.json").read_bytes())
shutil.copy(ROOT / "experiments/e3-deepening/cmf-recolour/B2-L-lowkey.png", INP / M_BASE)
for i, seed in enumerate((2026112401, 2026112402, 2026112403), 1):
    req = copy.deepcopy(base); g = req["prompt"]
    g["4"]["inputs"]["prompt"] = M_TEXT; g["4"]["inputs"]["negative_prompt"] = m_neg
    g["10"]["inputs"]["seed"] = seed; g["15"]["inputs"]["image"] = M_BASE
    put(3, f"M-L-dev-r{i}", req, "碳纤维臂；底图为低调配色稿（相机在画面下端）")

inputs = [{"input": f.name, "sha256": sha(f.read_bytes())} for f in sorted(INP.glob("*.png"))]
(HERE / "manifest.json").write_text(json.dumps({"requests": rows, "inputs": inputs, "boom_old": OLD_BOOM, "boom": BOOM,
                                                "m_text": M_TEXT, "m_negative": m_neg}, ensure_ascii=False, indent=2) + "\n",
                                    encoding="utf-8")
print(len(rows), "requests;", [r["id"] for r in rows]); print(inputs)
