"""Compile the 42 D2 development requests (prompt arm P, control arm K, img2img arm I).

Templates are requests that already ran on the server:
  text only   experiments/r0-e0-e1/requests/E1-text-wl1.00-r1.json
  ControlNet  experiments/r0-e0-e1/requests/E1-control-wl1.00-r1.json
Run from the repository root after build_guides.py:
  python -B experiments/d2-tuning/compile.py
"""
import copy
import json
from hashlib import sha256
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REQ = HERE / "requests"
E1 = ROOT / "experiments/r0-e0-e1/requests"
TEXT_T = json.loads((E1 / "E1-text-wl1.00-r1.json").read_bytes())["prompt"]
CONTROL_T = json.loads((E1 / "E1-control-wl1.00-r1.json").read_bytes())["prompt"]

SEEDS = {1: 2026111401, 2: 2026111402}
LEVELS = (0.70, 1.30)
CFG = 3

V1 = CONTROL_T["4"]["inputs"]["prompt"]            # the E1 / L1 prompt at W/L 1.00, unchanged
V1_NEG = CONTROL_T["4"]["inputs"]["negative_prompt"]

V2 = (
    "Studio product photograph of one compact camera drone for everyday personal aerial photography, "
    "seen from directly above in a strict orthographic top view, centered on a seamless white "
    "background with a soft contact shadow. A quadcopter with four arms, one motor at the end of each "
    "arm and one two-blade propeller on each motor. {nose} A small forward-facing gimbal camera sits "
    "under the nose; from above only the top of its housing shows at the front edge, and the lens "
    "faces forward, not upward. {form} Materials: fine-textured matte polycarbonate body shell in "
    "light warm gray, darker graphite-gray arms and motor mounts, satin anodized aluminium motor "
    "bells, semi-gloss black propellers, glossy black camera glass, thin precise panel seams. Soft "
    "overhead softbox lighting with gentle highlights on edges and chamfers."
)
V2_NEG = (
    "flat shading, vector illustration, schematic, line drawing, clay render, blurry, text, labels, "
    "logo, cropped propeller, disconnected arm, extra rotor, propeller guard, perspective view, "
    "lens facing the viewer"
)
NOSE = {"up": "The nose points toward the top edge of the picture.",
        "down": "The nose points toward the bottom edge of the picture."}
FORM = {
    "open": "Design the body silhouette, the arm sections and the way the arm roots blend into the body freely.",
    "X": "Form language: one continuous pebble-like body whose arms grow out of the shell in smooth "
         "unbroken curves, with very few seams.",
    "Y": "Form language: a faceted wedge-shaped body with crisp chamfered edges and flat planes, with "
         "clearly separate arm modules attached to the body.",
}
LEVEL = " The left-right motor spacing is {wl:.2f} times the front-back motor spacing."

# Prompt arm: text only, no ControlNet. id: (prompt, negative, note)
P_CELLS = {
    "P1": (V1, V1_NEG, "E1/L1 prompt, baseline at CFG 3"),
    "P2": (V2.format(nose=NOSE["up"], form=FORM["open"]), V2_NEG, "v2 brief, nose up"),
    "P3": (V2.format(nose=NOSE["down"], form=FORM["open"]), V2_NEG, "v2 brief, nose down"),
    "P4": (V2.format(nose=NOSE["up"], form=FORM["X"]), V2_NEG, "v2 + form direction X (continuous, few seams)"),
    "P5": (V2.format(nose=NOSE["up"], form=FORM["Y"]), V2_NEG, "v2 + form direction Y (faceted, separate modules)"),
}
# Control arm: guide key -> file pattern; cells are (strength, end_percent)
GUIDES = {
    "BO": "bladesonly-wl{wl:.2f}.png",          # blades and hub rings only (new, this folder)
    "BS": "wl-{wl:.2f}-dd-0.50.png",            # the E1 guide: blades, rings and short arm stubs
    "LN": "line-wl{wl:.2f}.png",                # the L1 line guide
}
GRID = [(0.5, 0.3), (0.5, 0.5), (0.5, 0.8), (0.8, 0.3), (0.8, 0.5), (0.8, 0.8)]
K_CELLS = {"BO": GRID, "BS": GRID, "LN": [(0.8, 0.5), (0.5, 0.8)]}
I_DENOISE = (0.70, 0.85)                         # img2img from the E1 controlled output
K_PROMPT = V2.format(nose=NOSE["up"], form=FORM["open"])


def text_request(prompt, negative, seed, name):
    g = copy.deepcopy(TEXT_T)
    g["4"]["inputs"].update(prompt=prompt, negative_prompt=negative)
    g["10"]["inputs"].update(seed=seed, cfg=CFG)
    g["12"]["inputs"]["filename_prefix"] = name
    return g


def control_request(image, strength, end, wl, seed, name):
    g = copy.deepcopy(CONTROL_T)
    g["4"]["inputs"].update(prompt=K_PROMPT + LEVEL.format(wl=wl), negative_prompt=V2_NEG)
    g["5"]["inputs"]["image"] = image
    g["9"]["inputs"].update(strength=strength, start_percent=0, end_percent=end)
    g["10"]["inputs"].update(seed=seed, cfg=CFG)
    g["12"]["inputs"]["filename_prefix"] = name
    return g


def img2img_request(parent, denoise, wl, seed, name):
    g = text_request(K_PROMPT + LEVEL.format(wl=wl), V2_NEG, seed, name)
    g["20"] = {"class_type": "LoadImage", "inputs": {"image": parent}}
    g["21"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["20", 0], "vae": ["3", 0]}}
    g["10"]["inputs"].update(latent_image=["21", 0], denoise=denoise)
    return g


def main():
    REQ.mkdir(exist_ok=True)
    rows = []

    def emit(name, graph, **meta):
        data = (json.dumps({"prompt": graph}, indent=2, ensure_ascii=False) + "\n").encode()
        (REQ / f"{name}.json").write_bytes(data)
        rows.append(dict(position=name, request_sha256=sha256(data).hexdigest(), cfg=CFG, **meta))

    for cid, (prompt, negative, note) in P_CELLS.items():
        for rep, seed in SEEDS.items():
            name = f"D2-{cid}-s{rep}"
            emit(name, text_request(prompt, negative, seed, name), arm="P", cell=cid, note=note, seed=seed)
    for key, cells in K_CELLS.items():
        for strength, end in cells:
            for wl in LEVELS:
                name = f"D2-K-{key}-s{strength:.1f}-e{end:.1f}-wl{wl:.2f}"
                image = GUIDES[key].format(wl=wl)
                emit(name, control_request(image, strength, end, wl, SEEDS[1], name), arm="K", guide=key,
                     input_image=image, strength=strength, end_percent=end, wl=wl, seed=SEEDS[1])
    for denoise in I_DENOISE:
        for wl in LEVELS:
            name = f"D2-I-d{denoise:.2f}-wl{wl:.2f}"
            parent = f"E1-control-wl{wl:.2f}-r1.png"
            emit(name, img2img_request(parent, denoise, wl, SEEDS[1], name), arm="I", input_image=parent,
                 denoise=denoise, wl=wl, seed=SEEDS[1])
    (HERE / "manifest.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    digest = sha256("".join(r["request_sha256"] for r in rows).encode()).hexdigest()
    print(len(rows), "requests; manifest digest", digest)


if __name__ == "__main__":
    main()
