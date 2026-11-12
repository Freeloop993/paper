"""Compile the 28 frozen L1 requests from graphs that have already run on the server.

Templates (read, never rewritten):
  control path  experiments/r0-e0-e1/requests/E1-control-wl1.00-r1.json
  edit path     experiments/g3-reference/with-reference.json
Run from the repository root after build_guides.py:
  python -B experiments/l1-layout/compile.py
"""
import copy
import json
from hashlib import sha256
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REQ = HERE / "requests"
CONTROL_T = json.loads((ROOT / "experiments/r0-e0-e1/requests/E1-control-wl1.00-r1.json").read_bytes())["prompt"]
EDIT_T = json.loads((ROOT / "experiments/g3-reference/with-reference.json").read_bytes())
EDIT_T = EDIT_T.get("prompt", EDIT_T)

LEVELS = (0.70, 1.30)
SEEDS = {1: 2026111301, 2: 2026111302}          # r1, r2; paired across every condition
NEGATIVE = CONTROL_T["4"]["inputs"]["negative_prompt"]

P_GENERATE = (
    "Develop one compact drone for everyday personal aerial photography. Integrate the camera into "
    "the body and resolve the arm roots. Show a complete quadrotor in strict orthographic top view, "
    "front up, on white, with one two-blade propeller on each of the four motors. Choose the fuselage "
    "silhouette, arm sections, propeller shape and material transitions freely. Soft lighting, matte "
    "neutral gray shell, distinct dark camera window. Show volume with shading. No guide markings. "
    "The left-right motor spacing is {wl:.2f} times the front-back motor spacing."
)
P_DIAGRAM = (
    "The reference picture is a top-view layout diagram, not a drawing of the product: the four small "
    "circles mark the motor positions and the lines show the arm directions from the body centre. "
    "Design one compact camera drone for everyday personal aerial photography that fits this layout "
    "exactly, and render it as a realistic studio product image in strict orthographic top view, front "
    "up, on white. Put one two-blade propeller on each motor. Shape the body, the camera at the front "
    "and the arm roots freely. Matte neutral gray shell, soft lighting. Do not reproduce the circles "
    "or lines of the diagram."
)
P_REDRAW = (
    "Redraw this drone as a realistic studio product render seen from directly above. Keep the four "
    "motor hubs exactly where they are. Give the body volume and surface transitions, join each arm "
    "to the body with a sculpted arm root, keep one two-blade propeller on each motor and one camera "
    "at the front, which is the top of the picture. Matte neutral gray shell, soft lighting, white "
    "background."
)

# id: (path, guide kind, canny, strength, end_percent, cfg, role)
CONDITIONS = {
    "A": ("control", "line",   True,  0.7, 1.0,  1, "author layout guide at the E1 settings"),
    "B": ("control", "blades", True,  0.7, 1.0,  1, "diagnostic pair of A: only the blade silhouettes are added"),
    "C": ("control", "line",   True,  0.7, 0.35, 3, "layout guide acting on the first 35% of the steps"),
    "D": ("control", "depth",  False, 0.7, 1.0,  3, "blurred relief guide, whole run"),
    "E": ("control", "depth",  False, 0.7, 0.5,  3, "blurred relief guide, first half"),
    "F": ("edit",    "line",   None,  None, None, 3, "layout diagram as reference image, no ControlNet"),
    "G": ("edit",    "e1",     None,  None, None, 3, "two-stage: redraw the E1 controlled output"),
}


def control_request(kind, canny, strength, end, cfg, wl, seed, name):
    g = copy.deepcopy(CONTROL_T)
    g["4"]["inputs"]["prompt"] = P_GENERATE.format(wl=wl)
    g["5"]["inputs"]["image"] = f"{kind}-wl{wl:.2f}.png"
    if not canny:                      # the relief is already a control image: skip the Canny node
        del g["7"]
        g["9"]["inputs"]["image"] = ["6", 0]
    g["9"]["inputs"].update(strength=strength, start_percent=0, end_percent=end)
    g["10"]["inputs"].update(seed=seed, cfg=cfg)
    g["12"]["inputs"]["filename_prefix"] = name
    return g


def edit_request(kind, cfg, wl, rep, seed, name):
    g = copy.deepcopy(EDIT_T)
    loader = next(k for k, v in g.items() if v["class_type"] == "LoadImage")
    if kind == "line":
        g[loader]["inputs"]["image"] = f"line-wl{wl:.2f}.png"
        text = P_DIAGRAM
    else:                              # parent = archived E1 output of the same level and repeat
        g[loader]["inputs"]["image"] = f"E1-control-wl{wl:.2f}-r{rep}.png"
        text = P_REDRAW
    g["4"]["inputs"].update(prompt=text, negative_prompt=NEGATIVE)
    g["10"]["inputs"].update(seed=seed, cfg=cfg)
    g["12"]["inputs"]["filename_prefix"] = name
    return g


def main():
    REQ.mkdir(exist_ok=True)
    guides = {r["file"]: r for r in json.loads((HERE / "guides.json").read_text(encoding="utf-8"))}
    rows = []
    for cid, (path, kind, canny, strength, end, cfg, role) in CONDITIONS.items():
        for wl in LEVELS:
            for rep, seed in SEEDS.items():
                name = f"L1-{cid}-wl{wl:.2f}-r{rep}"
                if path == "control":
                    graph = control_request(kind, canny, strength, end, cfg, wl, seed, name)
                else:
                    graph = edit_request(kind, cfg, wl, rep, seed, name)
                image = next(v["inputs"]["image"] for v in graph.values() if v["class_type"] == "LoadImage")
                data = (json.dumps({"prompt": graph}, indent=2, ensure_ascii=False) + "\n").encode()
                (REQ / f"{name}.json").write_bytes(data)
                rows.append(dict(position=name, condition=cid, role=role, path=path, wl=wl, repeat=rep,
                                 seed=seed, input_image=image,
                                 input_sha256=bound_input_sha(image, guides),
                                 canny=canny, strength=strength, end_percent=end, cfg=cfg,
                                 steps=graph["10"]["inputs"]["steps"], sampler=graph["10"]["inputs"]["sampler_name"],
                                 scheduler=graph["10"]["inputs"]["scheduler"],
                                 request_sha256=sha256(data).hexdigest()))
    (HERE / "manifest.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    digest = sha256("".join(r["request_sha256"] for r in rows).encode()).hexdigest()
    print(len(rows), "requests; manifest digest", digest)


def bound_input_sha(image, guides):
    if image in guides:
        return guides[image]["sha256"]
    case = Path(image).stem
    original = ROOT / "evidence/e1-open-20261112/E1-actual" / case / "original.png"
    return sha256(original.read_bytes()).hexdigest()


if __name__ == "__main__":
    main()
