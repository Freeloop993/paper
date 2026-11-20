"""2026-11-17 GPU 任务：局部编辑第二版（潜空间遮罩）与 E2 第二版。出图前登记，详见同目录 README.md。

用法（仓库根目录）：python3 -B experiments/20261117-local-edit-v2/build.py   （需要 Pillow）
输出：requests/（全部请求）、masks/（软遮罩 PNG）、manifest.json（请求、种子、输入与遮罩摘要）。

与第一版（experiments/20261115-local-edit）的区别：第一版整图生成后再按紧遮罩合成，开发图多因遮罩裁断舱体、
接缝发白而未过。第二版把父图经 VAE 编码为初始潜空间，用 SetLatentNoiseMask 只让遮罩内重新采样，遮罩外随采样保持父图，
遮罩更宽并羽化；解码后再按同一遮罩合回父图，保证遮罩外逐像素不变。
"""
import copy, hashlib, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
INP, REQ, MSK = HERE / "inputs", HERE / "requests", HERE / "masks"
REQ.mkdir(exist_ok=True); MSK.mkdir(exist_ok=True)
BASE_REQ = json.loads((HERE.parent / "20261115-local-edit/requests/LE-camera-dev-01.json").read_bytes())
BASE_REQ = BASE_REQ.get("prompt", BASE_REQ) if "prompt" in BASE_REQ and isinstance(BASE_REQ["prompt"], dict) and "1" in BASE_REQ["prompt"] else BASE_REQ
NEG = ("flat schematic, line drawing, collage, text, labels, logo, cropped rotor, disconnected arm, extra rotor, perspective camera, "
       "V-shaped propeller, blades at an acute angle, single-blade propeller, missing blade, unequal blades, extra components, new modules")
KEEP = ("Keep everything else exactly the same: the strict orthographic top view, the arms beyond their roots, the motors, the two-blade "
        "propellers and their angles, the colours and the plain light background.")


# ---------- 底图几何：逐行量机身宽度，找两端与臂根接入带 ----------
def geometry(path):
    im = Image.open(path).convert("RGB"); px = im.load(); rows = {}
    for y in range(1024):
        if sum(px[512, y]) / 3 >= 238: continue
        l = r = 512
        while l > 0 and sum(px[l - 1, y]) / 3 < 238: l -= 1
        while r < 1023 and sum(px[r + 1, y]) / 3 < 238: r += 1
        rows[y] = r - l
    ys = sorted(rows); top, bottom = ys[0], ys[-1]
    med = sorted(rows.values())[len(rows) // 2]
    wide = [y for y in ys if rows[y] > med * 1.35]
    mid = (top + bottom) // 2
    upper = [y for y in wide if y < mid]; lower = [y for y in wide if y > mid]
    return dict(top=top, bottom=bottom, hw=med / 2, upper=(min(upper), max(upper)), lower=(min(lower), max(lower)), rows=rows)


def soft(mask, r):
    return mask.filter(ImageFilter.GaussianBlur(r))


def end_mask(g, end, name, margin=45, reach=120):
    m = Image.new("L", (1024, 1024), 0); d = ImageDraw.Draw(m); x0, x1 = 512 - g["hw"] - margin, 512 + g["hw"] + margin
    if end == "bottom": d.rounded_rectangle((x0, g["lower"][1] + 8, x1, min(1023, g["bottom"] + reach)), 24, fill=255)
    else: d.rounded_rectangle((x0, max(0, g["top"] - 40), x1, min(g["upper"][0] - 8, g["top"] + 85)), 24, fill=255)
    soft(m, 10).save(MSK / name)


def cover_mask(g, name, inset=10):
    m = Image.new("L", (1024, 1024), 0); d = ImageDraw.Draw(m)
    for y, w in g["rows"].items():
        if g["top"] + 12 <= y <= g["lower"][1] + 30:
            h = min(w / 2, g["hw"]) - inset
            if h > 0: d.line((512 - h, y, 512 + h, y), fill=255)
    soft(m, 6).save(MSK / name)


def roots_mask(g, name, radius=62):
    m = Image.new("L", (1024, 1024), 0); d = ImageDraw.Draw(m)
    for band in (g["upper"], g["lower"]):
        cy = sum(band) // 2
        for cx in (512 - g["hw"] - 18, 512 + g["hw"] + 18): d.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)
    soft(m, 10).save(MSK / name)


gB2 = geometry(INP / "B2-no-window.png"); gC1 = geometry(INP / "E3R3-C1.png")
end_mask(gB2, "bottom", "M-CAM-B2low.png"); cover_mask(gB2, "M-COVER-B2.png"); roots_mask(gB2, "M-ROOT-B2.png")
end_mask(gB2, "top", "M-NOSE-B2top.png"); end_mask(gC1, "top", "M-NOSE-C1top.png"); roots_mask(gC1, "M-ROOT-C1.png")

# ---------- 文字 ----------
T = {
 "CAM": ("Edit this drone image. The front of the drone is at the bottom edge of the image. Add a compact gimbal camera that hangs "
         "underneath the front end of the fuselage, as on modern foldable camera drones. Seen from directly above, only the grey top of the "
         "small camera housing and its two short side gimbal arms peek out just below the bottom end of the body, tucked under the shell "
         "edge; the lens faces straight toward the bottom edge of the image, so no lens glass faces the viewer. Do not change the top cover "
         "panels or the body outline. " + KEEP, ", camera at the upper end, camera on a neck or stalk, lens glass facing the viewer"),
 "COVER": ("Edit this drone image. Change only the top cover of the fuselage: remove every parting line and panel seam on the top so the "
           "whole top is one continuous, plain light grey surface with the same outline. Keep the camera at the bottom end and the body "
           "outline. " + KEEP, ", panel seams, parting lines on the top cover"),
 "ROOT": ("Edit this drone image. Change only the four places where the arms join the fuselage: each arm now enters a distinct socket on "
          "the side of the shell, with a visible transverse joint seam where the arm meets the socket, instead of growing out seamlessly. "
          "Keep the camera at the bottom end, the top cover panels and the body outline. " + KEEP, ", seamless arm roots"),
 "NOSE": ("Edit this drone image. The nose is at the top of the image. Change only the front end of the fuselage at the top: make its "
          "leading edge narrower and more rounded, a slimmer and softer nose. Keep the rest of the body outline, the top cover panels and "
          "parting lines, the arm roots and the existing camera installation unchanged. " + KEEP, ", camera at the tail, dark module at the tail"),
 "BROAD": ("Edit this drone image. Change only the four places where the arms join the fuselage: make each transition from the body into "
           "the arm root broader and more smoothly curved, with a larger fillet. Keep the nose, the top cover panels and parting lines, the "
           "camera installation and the rest of the body outline unchanged. " + KEEP, ", camera at the tail, dark module at the tail"),
}
# E2 按点线图重新生成的对照：沿用 E2R 已登记请求的整机描述，只换修改句
REGEN = {
 "B2": "A light-grey streamlined quadcopter with smooth arm shoulders, top-cover panel lines and orange motor rings.",
 "C1": "A light-grey faceted quadcopter with visible arm sockets, carbon-pattern arms, top-cover panels and orange motor rings.",
}
REGEN_TAIL = (" Use the reference for the four motor positions and arm directions. Orthographic top view, the nose at the top. Each of the four "
              "rotors has two equal opposite blades. Show the whole aircraft. The flight camera faces horizontally forward. From overhead its "
              "lens can be occluded; the lens glass must not face the viewer. ")
REGEN_CHANGE = {"NOSE": "Narrow and round only the leading edge of the fuselage nose.",
                "BROAD": "Broaden and smooth only the four transitions from the fuselage into the arm roots."}

rows = []


def sha(b): return hashlib.sha256(b).hexdigest()


def make(rid, order, base, text, neg, seed, mask=None):
    g = copy.deepcopy(BASE_REQ)
    g["4"]["inputs"]["prompt"] = text; g["4"]["inputs"]["negative_prompt"] = NEG + neg
    g["10"]["inputs"]["seed"] = seed; g["15"]["inputs"]["image"] = base; g["12"]["inputs"]["filename_prefix"] = rid
    if mask:
        g["16"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["15", 0], "vae": ["3", 0]}}
        g["17"] = {"class_type": "LoadImageMask", "inputs": {"image": mask, "channel": "red"}}
        g["18"] = {"class_type": "SetLatentNoiseMask", "inputs": {"samples": ["16", 0], "mask": ["17", 0]}}
        g["10"]["inputs"]["latent_image"] = ["18", 0]
    raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
    (REQ / f"{order:02d}-{rid}.json").write_bytes(raw)
    rows.append(dict(order=order, id=rid, base=base, mask=mask, seed=seed, request_sha256=sha(raw)))


# 第一轮（开发，17 张）
for i, s in enumerate((2026117001, 2026117002, 2026117003), 1):
    make(f"LE2-CAM-dev-r{i}", 1, "B2-no-window.png", *T["CAM"], s, "M-CAM-B2low.png")
for i, s in enumerate((2026117011, 2026117012, 2026117013), 1):
    make(f"LE2-COVER-dev-r{i}", 1, "B2-L-lowkey.png", *T["COVER"], s, "M-COVER-B2.png")
for i, s in enumerate((2026117021, 2026117022, 2026117023), 1):
    make(f"LE2-ROOT-dev-r{i}", 1, "B2-L-lowkey.png", *T["ROOT"], s, "M-ROOT-B2.png")
CELLS = [("B2", "NOSE", "E3R3-B2.png", "M-NOSE-B2top.png"), ("B2", "BROAD", "E3R3-B2.png", "M-ROOT-B2.png"),
         ("C1", "NOSE", "E3R3-C1.png", "M-NOSE-C1top.png"), ("C1", "BROAD", "E3R3-C1.png", "M-ROOT-C1.png")]
for k, (p, t, base, mask) in enumerate(CELLS):
    s = 2026117201 + k
    make(f"E2V2-{p}-{t}-dev-whole", 2, base, *T[t], s)
    make(f"E2V2-{p}-{t}-dev-mask", 2, base, *T[t], s, mask)
# 第二轮（确认，56 张；只运行开发门通过的项）
for i in range(8): make(f"LE2-CAM-confirm-r{i + 1}", 3, "B2-no-window.png", *T["CAM"], 2026117101 + i, "M-CAM-B2low.png")
for i in range(4): make(f"LE2-COVER-confirm-r{i + 1}", 3, "B2-L-lowkey.png", *T["COVER"], 2026117111 + i, "M-COVER-B2.png")
for i in range(4): make(f"LE2-ROOT-confirm-r{i + 1}", 3, "B2-L-lowkey.png", *T["ROOT"], 2026117121 + i, "M-ROOT-B2.png")
for k, (p, t, base, mask) in enumerate(CELLS):
    for i in range(4):
        s = 2026117301 + k * 10 + i
        make(f"E2V2-{p}-{t}-whole-r{i + 1}", 4, base, *T[t], s)
        make(f"E2V2-{p}-{t}-mask-r{i + 1}", 4, base, *T[t], s, mask)
    for i in range(2):
        make(f"E2V2-{p}-{t}-regen-r{i + 1}", 4, "qwen-shape-dots-250-15c5ad1c924b.png",
             REGEN[p] + REGEN_TAIL + REGEN_CHANGE[t], ", camera at the tail, dark module at the tail", 2026117301 + k * 10 + i)

inputs = [{"input": f.name, "sha256": sha(f.read_bytes())} for f in sorted(INP.glob("*.png"))]
masks = [{"mask": f.name, "sha256": sha(f.read_bytes())} for f in sorted(MSK.glob("*.png"))]
geo = {k: {kk: v for kk, v in g.items() if kk != "rows"} for k, g in (("B2", gB2), ("C1", gC1))}
(HERE / "manifest.json").write_text(json.dumps({"requests": rows, "inputs": inputs, "masks": masks, "geometry": geo},
                                               ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
from collections import Counter
print(Counter(r["order"] for r in rows), len(rows), "requests"); print(geo)
