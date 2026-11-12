"""D2 addendum: 18 development requests added after the L1 D-G results and the D2 prompt arm.

  python -B experiments/d2-tuning/addendum.py                      # compile
  python -B experiments/d2-tuning/addendum.py sheet <results> <out>  # contact sheet with target hubs

Arms
  KD  blurred relief guide (the L1 D/E guide) with the v2 brief
  G2  two-stage edit of the E1 controlled output with a v2 redraw instruction
  G3  the same edit with the E1 blade guide applied through ControlNet in the early steps
  P   two stronger form-language briefs, text only
Prompts, seeds and CFG are imported from compile.py. Templates are requests that ran in L1.
The original manifest.json, requests/ and their digest are not touched.
"""
import copy
import importlib.util
import json
import sys
from hashlib import sha256
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REQ = HERE / "requests-addendum"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


d2 = load("d2_compile", HERE / "compile.py")
L1_REQ = ROOT / "experiments/l1-layout/requests"
RELIEF_T = json.loads((L1_REQ / "L1-D-wl0.70-r1.json").read_bytes())["prompt"]
EDIT_T = json.loads((L1_REQ / "L1-G-wl0.70-r1.json").read_bytes())["prompt"]

KD_CELLS = [(0.7, 0.5), (1.0, 0.5), (0.7, 0.3)]          # (strength, end_percent)
G3_ENDS = (0.3, 0.5)                                      # blade guide, strength 0.8
REDRAW_V2 = (
    "Redraw this flat drawing as a studio product photograph of a real compact camera drone, seen "
    "from directly above in a strict orthographic top view on a seamless white background with a soft "
    "contact shadow. Keep the four motor hubs and the propellers exactly where they are. Replace the "
    "flat body with a sculpted three-dimensional shell and join each arm to it with a smooth arm root. "
    "Remove the camera window from the top surface: the camera is a small forward-facing gimbal under "
    "the nose at the top edge of the picture, only the top of its housing is visible and the lens "
    "faces forward, not upward. Materials: fine-textured matte polycarbonate body shell in light warm "
    "gray, darker graphite-gray arms and motor mounts, satin anodized aluminium motor bells, semi-gloss "
    "black propellers, glossy black camera glass, thin precise panel seams. Soft overhead softbox "
    "lighting with gentle highlights on edges and chamfers."
)
FORM2 = {
    "P6": "Form language: the body is one smooth seamless pebble, widest behind the middle and tapering "
          "to a rounded nose; the four arms are thick, flow out of the shell like branches without any "
          "visible joint, and swell into round motor pods. No panel lines, no hinges, no fasteners.",
    "P7": "Form language: the body is a low flat slab with a sharply faceted, chamfered outline and "
          "visible panel breaks; the four arms are straight rectangular beams fixed on top of the body "
          "with visible brackets and fasteners; the motors sit on square mounts.",
}


def relief_request(strength, end, wl, name):
    g = copy.deepcopy(RELIEF_T)
    g["4"]["inputs"].update(prompt=d2.K_PROMPT + d2.LEVEL.format(wl=wl), negative_prompt=d2.V2_NEG)
    g["5"]["inputs"]["image"] = f"depth-wl{wl:.2f}.png"
    g["9"]["inputs"].update(strength=strength, start_percent=0, end_percent=end)
    g["10"]["inputs"].update(seed=d2.SEEDS[1], cfg=d2.CFG)
    g["12"]["inputs"]["filename_prefix"] = name
    return g


def edit_request(parent, seed, name):
    g = copy.deepcopy(EDIT_T)
    g["15"]["inputs"]["image"] = parent
    g["4"]["inputs"].update(prompt=REDRAW_V2, negative_prompt=d2.V2_NEG)
    g["10"]["inputs"].update(seed=seed, cfg=d2.CFG)
    g["12"]["inputs"]["filename_prefix"] = name
    return g


def edit_control_request(parent, guide, end, name):
    g = edit_request(parent, d2.SEEDS[1], name)
    for key in ("5", "6", "7", "8", "9"):                 # LoadImage, ImageScale, Canny, patch loader, ControlNet
        g[key] = copy.deepcopy(d2.CONTROL_T[key])
    g["5"]["inputs"]["image"] = guide
    g["9"]["inputs"].update(strength=0.8, start_percent=0, end_percent=end)
    g["10"]["inputs"]["model"] = ["9", 0]
    return g


def compile_all():
    REQ.mkdir(exist_ok=True)
    rows = []

    def emit(name, graph, **meta):
        data = (json.dumps({"prompt": graph}, indent=2, ensure_ascii=False) + "\n").encode()
        (REQ / f"{name}.json").write_bytes(data)
        rows.append(dict(position=name, request_sha256=sha256(data).hexdigest(), cfg=d2.CFG, **meta))

    for strength, end in KD_CELLS:
        for wl in d2.LEVELS:
            name = f"D2-KD-s{strength:.1f}-e{end:.1f}-wl{wl:.2f}"
            emit(name, relief_request(strength, end, wl, name), arm="KD", input_image=f"depth-wl{wl:.2f}.png",
                 strength=strength, end_percent=end, wl=wl, seed=d2.SEEDS[1])
    for wl in d2.LEVELS:
        for rep in (1, 2):
            name = f"D2-G2-wl{wl:.2f}-r{rep}"
            parent = f"E1-control-wl{wl:.2f}-r{rep}.png"
            emit(name, edit_request(parent, d2.SEEDS[rep], name), arm="G2", input_image=parent, wl=wl,
                 seed=d2.SEEDS[rep])
    for end in G3_ENDS:
        for wl in d2.LEVELS:
            name = f"D2-G3-e{end:.1f}-wl{wl:.2f}"
            parent, guide = f"E1-control-wl{wl:.2f}-r1.png", f"wl-{wl:.2f}-dd-0.50.png"
            emit(name, edit_control_request(parent, guide, end, name), arm="G3", input_image=parent,
                 control_image=guide, strength=0.8, end_percent=end, wl=wl, seed=d2.SEEDS[1])
    for cid, form in FORM2.items():
        prompt = d2.V2.format(nose=d2.NOSE["up"], form=form)
        for rep, seed in d2.SEEDS.items():
            name = f"D2-{cid}-s{rep}"
            emit(name, d2.text_request(prompt, d2.V2_NEG, seed, name), arm="P", cell=cid, seed=seed)
    (HERE / "manifest-addendum.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n",
                                                 encoding="utf-8")
    digest = sha256("".join(r["request_sha256"] for r in rows).encode()).hexdigest()
    print(len(rows), "requests; addendum digest", digest)


def contact_sheet(results, out):
    sheets = load("d2_sheet", HERE / "contact_sheet.py")
    rows = json.loads((HERE / "manifest-addendum.json").read_text(encoding="utf-8"))
    out.mkdir(parents=True, exist_ok=True)
    sheets.sheet(results, rows, 6, out / "D2-addendum.jpg")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "sheet":
        contact_sheet(Path(sys.argv[2]), Path(sys.argv[3]))
    else:
        compile_all()
