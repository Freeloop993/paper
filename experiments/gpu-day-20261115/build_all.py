"""2026-11-15 GPU 日程：编译全部批次的请求到 queue/，并把需要上传的输入图收进 inputs/。

用法（仓库根目录）：python3 -B experiments/gpu-day-20261115/build_all.py
队列文件名 = <两位顺序号>-<请求号>.json；服务器上的队列按文件名顺序逐份执行。
"""
import copy, hashlib, json, shutil, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/e3-quad-qwen"))
from build_generic import compile_text  # noqa: E402

Q = HERE / "queue"; INP = HERE / "inputs"; Q.mkdir(exist_ok=True); INP.mkdir(exist_ok=True)
TPL = json.loads((ROOT / "experiments/e3-quad-qwen/template.request.json").read_text(encoding="utf-8"))
D16 = json.loads((ROOT / "experiments/e3-quad-qwen/round-3/dictionary-v16.json").read_text(encoding="utf-8"))
NEG16 = TPL["prompt"]["4"]["inputs"]["negative_prompt"] + ", " + D16["negative_extra"]
LAYOUT = "qwen-shape-dots-250-15c5ad1c924b.png"
rows = []


def sha(b):
    return hashlib.sha256(b).hexdigest()


def put(order, rid, req, batch, note):
    req = copy.deepcopy(req); req["prompt"]["12"]["inputs"]["filename_prefix"] = rid
    raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
    (Q / f"{order:02d}-{rid}.json").write_bytes(raw)
    g = req["prompt"]; img = [v["inputs"]["image"] for v in g.values() if v["class_type"] == "LoadImage"]
    rows.append({"order": order, "id": rid, "batch": batch, "seed": g["10"]["inputs"]["seed"], "input_images": img,
                 "prompt_sha256": sha(g["4"]["inputs"]["prompt"].encode()), "request_sha256": sha(raw), "note": note})


def edit_req(text, neg, seed, image):
    r = copy.deepcopy(TPL); g = r["prompt"]
    g["4"]["inputs"]["prompt"] = text; g["4"]["inputs"]["negative_prompt"] = neg
    g["10"]["inputs"]["seed"] = seed; g["15"]["inputs"]["image"] = image
    return r


BASE16 = {"body_plan": "pod", "arm_root": "seamless", "camera": "inside", "cover": "single", "surface": "plain",
          "span": "250", "arm_finish": "matte_same", "accent": "none"}
S_LEVELS = [("S0", {}), ("S1", {"body_plan": "box"}), ("S2", {"arm_root": "socket"}), ("S3", {"arm_root": "hinge"}),
            ("S4", {"camera": "projecting"}), ("S5", {"cover": "multi"})]

# 01 E3 修订一：父图 B2，只改相机（内嵌→机头下挂云台）
B2 = "E3R3-B2.png"
shutil.copy(ROOT / "evidence/e3-quad-qwen-20261115/round-3/originals/E3R3-B2.png", INP / B2)
REV_TEXT = ("Edit this drone image. Change only the camera at the nose: remove the dark window strip embedded in the nose and "
            "add a small gimbal camera that hangs underneath the front of the fuselage, as on modern foldable camera drones. "
            "Seen from directly above, only the top edge of the small dark grey camera housing peeks out just ahead of the nose; "
            "the lens faces straight forward toward the top edge of the image, so no lens glass is visible from above. "
            "Keep everything else exactly the same: the strict orthographic top view, the body outline, the top cover panels and "
            "parting lines, the seamless arms, the motors with their orange rings, the two-blade propellers and their angles, "
            "the colours and the plain light background.")
for i, seed in enumerate([2026112131, 2026112132, 2026112133], 1):
    put(1, f"REV1-edit-B2-r{i}", edit_req(REV_TEXT, NEG16, seed, B2), "E3 修订一（父图编辑）", "父图 B2，改相机档")
b_rev = dict(BASE16, cover="multi", surface="sculpted", accent="motor_ring", camera="projecting")
for i, seed in enumerate([2026112131, 2026112132, 2026112133], 1):
    put(2, f"REV1-regen-B-r{i}", edit_req(compile_text(D16, b_rev), NEG16, seed, LAYOUT), "E3 修订一对照（按新档位重出）", "B 规格、相机改下挂，同种子")

# 03 E2：Codex 登记的 6 份请求原样入队
for f in sorted((ROOT / "experiments/e2-registered/requests").glob("*.json")):
    req = json.loads(f.read_bytes()); put(3, f.stem, req, "E2", "原样取自 experiments/e2-registered")
for src, name in [("evidence/e1-open-20261112/E1-actual/E1-control-wl1.00-r1/original.png", "E1-control-wl1.00-r1.png"),
                  ("evidence/e1-open-20261112/E1-actual/E1-control-dd0.50-r1/original.png", "E1-control-dd0.50-r1.png"),
                  ("prototypes/drone-configurator/public/research-guides/wl-1.00-dd-0.50.png", "wl-1.00-dd-0.50.png")]:
    shutil.copy(ROOT / src, INP / name)
shutil.copy(ROOT / "evidence/qwen-shape-s4-20261114/layout.png", INP / LAYOUT)


def s12(order, reps):
    for li, (lvl, _) in enumerate(S_LEVELS):
        pilot = json.loads((ROOT / f"experiments/qwen-shape-pilot/requests/QSP-{lvl}-r1.json").read_bytes())
        for r in reps:
            req = copy.deepcopy(pilot); req["prompt"]["10"]["inputs"]["seed"] = 2026112001 + li * 12 + (r - 1)
            put(order, f"S12-{lvl}-r{r:02d}", req, "5.2.1 造型响应（字典 v1.2）", "正式 r1–r4，其余为扩展")


def s16(order, reps, levels=S_LEVELS, prefix="S16"):
    for li, (lvl, change) in enumerate(levels):
        text = compile_text(D16, dict(BASE16, **change))
        for r in reps:
            put(order, f"{prefix}-{lvl}-r{r:02d}", edit_req(text, NEG16, 2026112001 + li * 12 + (r - 1), LAYOUT),
                "5.2.1 平行批（字典 v1.6，与 v1.2 同种子配对）", "")


# 05/13 编辑通路的四旋布局响应：同一中性文字，只换点线图
WL_TEXT = compile_text(json.loads((ROOT / "experiments/e3-quad-qwen/round-3/dictionary-v16.json").read_text(encoding="utf-8")), BASE16)
WL_TEXT = WL_TEXT.replace(D16["fixed_lines"]["layout"], "Match the four motor centres and arm directions in the layout exactly. Each motor carries one stationary two-blade, 5-inch propeller. The two blades of each propeller are identical in length and width and point in exactly opposite directions from the hub, never a V shape. No propeller guards.")


def wlq(order, reps):
    for k, wl in enumerate((0.70, 1.00, 1.30)):
        for r in reps:
            put(order, f"WLQ-{wl:.2f}-r{r:02d}", edit_req(WL_TEXT, NEG16, 2026112251 + k * 12 + (r - 1), f"quad-dots-wl{wl:.2f}.png"),
                "编辑通路布局响应（四旋）", "文字三档相同，只换条件图")


# 06/07/14 E6 植保六旋（作者确认首案）
HEXA_TEXT = "\n".join([
    "Design one six-rotor agricultural plant-protection drone for crop spraying. Strict orthographic top view, nose toward the top edge, arms fully unfolded.",
    "Match the six motor centres and arm directions in the layout exactly. Each motor carries one stationary two-blade propeller whose two blades are identical and point in exactly opposite directions from the hub, never a V shape. No propeller guards.",
    "A square spray tank sits half-embedded in the central frame: the frame wraps the lower half of the tank, while the tank top and its round filler cap stay exposed.",
    "A transverse spray boom runs across under the body and extends beyond both sides of the frame.",
    "Each arm is attached to the frame by a visible folding hinge with a pivot pin.",
    "Matte light grey frame and arms, white spray tank, dark grey motors, black propellers.",
    "Show the complete product on a plain light background. Omit guide marks and lettering."])
for wl in ("0.70", "1.00", "1.30"):
    shutil.copy(ROOT / f"experiments/hexa-plant-protection/topview-prep/points-{wl}.png", INP / f"hexa-points-{wl}.png")


def hexa_wl(order, reps):
    for k, wl in enumerate(("0.70", "1.00", "1.30")):
        for r in reps:
            put(order, f"HEXA-wl{wl}-r{r:02d}", edit_req(HEXA_TEXT, NEG16, 2026112311 + k * 12 + (r - 1), f"hexa-points-{wl}.png"),
                "E6 六旋布局响应", "文字三档相同，只换条件图")


# 排程（顺序号即执行顺序）
s12(4, range(1, 5))
wlq(5, range(1, 5))
for i, seed in enumerate([2026112301, 2026112302, 2026112303], 1):
    put(6, f"HEXA-draft-r{i}", edit_req(HEXA_TEXT, NEG16, seed, "hexa-points-1.00.png"), "E6 首案初稿", "作者确认的首案规格")
hexa_wl(7, range(1, 5))
s16(8, range(1, 5))
NEW = [("N1", {"body_plan": "faceted"}), ("N2", {"cover": "split"}), ("N3", {"surface": "sculpted"}), ("N4", {"accent": "motor_ring"})]
for li, (lvl, change) in enumerate(NEW):
    text = compile_text(D16, dict(BASE16, **change))
    for r in range(1, 5):
        put(9, f"NEW-{lvl}-r{r:02d}", edit_req(text, NEG16, 2026112201 + li * 4 + (r - 1), LAYOUT), "v1.6 新增档位单因素响应", str(change))
k = 0
for body in ("pod", "box"):
    for cam in ("inside", "projecting"):
        for cover in ("single", "multi"):
            text = compile_text(D16, dict(BASE16, body_plan=body, camera=cam, cover=cover))
            for r in range(1, 4):
                put(10, f"COMBO-{body}-{cam}-{cover}-r{r}", edit_req(text, NEG16, 2026112221 + k, LAYOUT), "三参数组合（v1.6）", "检验档位叠加是否互相干扰"); k += 1
s12(11, range(5, 13))
s16(12, range(5, 9))
wlq(13, range(5, 13))
hexa_wl(14, range(5, 13))

for f in sorted(INP.glob("*.png")):
    rows.append({"input": f.name, "sha256": sha(f.read_bytes())})
(HERE / "manifest.json").write_text(json.dumps({"requests": [r for r in rows if "id" in r], "inputs": [r for r in rows if "input" in r],
                                                 "negative_v16": NEG16, "wl_text": WL_TEXT, "hexa_text": HEXA_TEXT, "rev1_text": REV_TEXT},
                                                ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
from collections import Counter
print(Counter(r["batch"] for r in rows if "id" in r)); print(len([r for r in rows if "id" in r]), "requests")
