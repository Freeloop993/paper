"""P2: run the three E3 spec cards (draft) on MiniMax H3-Image with a skeleton reference.

  export MINIMAX_API_KEY=...                      # environment only, never in a file of this repository
  python -B experiments/p2-spec-cards/run_p2.py --round R1 --dry-run
  python -B experiments/p2-spec-cards/run_p2.py --round R1                 # 9 calls, billed, not idempotent
  python -B experiments/p2-spec-cards/run_p2.py --round R1 --sheet
  python -B experiments/p2-spec-cards/run_p2.py --round R1 --blind DIR     # shuffled, renamed copies for a blind reader

Each cell keeps the picture, the request (reference recorded by name and digest) and the response
with the prompt the service actually used. A cell that already has a picture is skipped.
"""
import argparse
import base64
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
from hashlib import sha256
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "evidence" / "p2-spec-cards"
SPEC = ROOT / "docs" / "protocols" / "e3-spec-cards-draft.md"
BASE, MODEL = "https://api.minimax.io", "MiniMax-H3-Image"
COMMON = dict(model=MODEL, n=1, aspect_ratio="1:1", area="1K", output_format="png", response_format="b64_json")
SIZE, CENTRE, D_PX = 1024, 512, 600          # opposite-motor distance 600 px, as in E1 and L1

HEAD = ("Industrial design rendering of a compact quadcopter for everyday carry-along aerial photography. "
        "Strict orthographic top view, looking straight down, nose toward the top edge, light neutral "
        "background. X layout, four motors, one fully unfolded two-blade propeller on each motor, both "
        "blades the same length.")
PARTS = {
    "A": ("Fuselage: rounded pebble outline, about 1.6 times as long as wide, widest at mid-body, one "
          "unbroken curve. Arm roots: each arm grows out of the shell through a continuous fillet, no joint "
          "line. Nose: the camera pod stays inside the nose outline under one continuous rounded leading "
          "edge. Top shell: a single cover seam, no vents."),
    "B": ("Fuselage: slender spindle outline, about 2.6 times as long as wide, narrower than a quarter of the "
          "motor spacing. Arm roots: long slender arms merge into the sides of the body through long tapered "
          "blends, no joint line. Nose: narrows to a small rounded tip with the camera pod inside the "
          "outline. Top shell: one lengthwise seam, no vents."),
    "C": ("Fuselage: chamfered rectangular outline, about 1.6 times as long as wide. Arm roots: each arm is a "
          "separate member held by a visible clamp block at a corner of the body, with a clear step and "
          "joint line. Nose: the camera pod is a separate front module narrower than the body, with a "
          "visible gap line between pod and body. Top shell: at least four panel lines and two groups of "
          "cooling slots."),
}
TAIL = ("A forward-facing camera sits under the nose with its lens pointing forward, so from above only the "
        "top of the camera pod shows. Matte light grey shell, dark graphite arms and propellers, no accent "
        "colour. Soft even studio light; shading shows the volume. No text, lines or markings.")
NOTE = (" Picture 1 is a top-view plan of the airframe skeleton at the same scale and framing as the output "
        "image: four arms and four motor mounts. Keep every motor mount where it is in Picture 1 and run "
        "each arm along its bar; arm width and shape are free. The fuselage, the propellers and all other "
        "parts are not in the plan; design them from the description. Do not keep the flat grey shapes.")

# round -> what is sent. A later round changes exactly one thing and says which in "change".
ROUNDS = {
    "R1": dict(head=HEAD, parts=PARTS, tail=TAIL, note=NOTE, reference="skeleton-light-wl1.0.png", repeats=3,
               matches_spec=True, change="first run of the draft cards"),
}


def hubs(wl=1.0):
    length = D_PX / (wl * wl + 1) ** 0.5
    width = wl * length
    return [(round(CENTRE + sx * width / 2), round(CENTRE + sy * length / 2))
            for sx, sy in [(1, 1), (-1, 1), (-1, -1), (1, -1)]]


def build_reference(name):
    """Arms and motor mounts only. 'light': near-white ground; 'dark': dark ground (the P1 G4 drawing)."""
    from PIL import Image, ImageDraw
    ground, arm, hub = ((238, 238, 238), (150, 150, 150), (90, 90, 90)) if "light" in name else \
                       ((28, 28, 28), (120, 120, 120), (200, 200, 200))
    scale = 3
    canvas = Image.new("RGB", (SIZE * scale,) * 2, ground)
    pen = ImageDraw.Draw(canvas)
    for x, y in hubs():
        pen.line([(CENTRE * scale, CENTRE * scale), (x * scale, y * scale)], fill=arm, width=24 * scale)
    for x, y in hubs():
        r = 24
        pen.ellipse([(x - r) * scale, (y - r) * scale, (x + r) * scale, (y + r) * scale], fill=hub)
    path = HERE / name
    canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(path)
    return path


def cells(name):
    spec = ROUNDS[name]
    return [(f"{name}-{card}-{i}", card) for card in spec["parts"] for i in range(1, spec["repeats"] + 1)]


def prompt(name, card):
    spec = ROUNDS[name]
    return f"{spec['head']} {spec['parts'][card]} {spec['tail']}{spec['note']}"


def check_against_spec(name):
    spec = ROUNDS[name]
    if spec.get("matches_spec"):
        text = SPEC.read_text(encoding="utf-8")
        for piece in [spec["head"], spec["tail"], *spec["parts"].values()]:
            assert piece in text, "prompt text differs from the spec card draft: " + piece[:60]


def build(name, card):
    spec = ROUNDS[name]
    reference = HERE / spec["reference"]
    if not reference.exists():
        build_reference(spec["reference"])
    raw = reference.read_bytes()
    payload = dict(COMMON, prompt=prompt(name, card),
                   images=[{"image_url": "data:image/png;base64," + base64.b64encode(raw).decode()}])
    record = dict(payload, images=[{"file": reference.name, "sha256": sha256(raw).hexdigest()}])
    return "/v1/images/edits", payload, record


def call(path, payload, key):
    request = urllib.request.Request(BASE + path, data=json.dumps(payload).encode(), method="POST",
                                     headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=600) as reply:
            return reply.status, json.loads(reply.read())
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")
        try:
            return error.code, json.loads(body)
        except ValueError:
            return error.code, {"raw": body[:2000]}


def run(name, dry):
    check_against_spec(name)
    key = os.environ.get("MINIMAX_API_KEY", "")
    if not dry and not key:
        sys.exit("MINIMAX_API_KEY is not set")
    OUT.mkdir(parents=True, exist_ok=True)
    for cell, card in cells(name):
        path, payload, record = build(name, card)
        if dry:
            print(f"[{cell}] {path} reference={record['images'][0]['file']}\n{record['prompt']}\n")
            continue
        picture = OUT / f"{cell}.png"
        if picture.exists():
            print(cell, "already done, skipped")
            continue
        (OUT / f"{cell}.request.json").write_text(
            json.dumps(dict(endpoint=path, round=name, card=card, change=ROUNDS[name]["change"], body=record),
                       indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        started = time.time()
        status, answer = call(path, payload, key)
        item = (answer.get("data") or [{}])[0] if isinstance(answer, dict) else {}
        encoded = item.pop("b64_json", None) if isinstance(item, dict) else None
        if encoded:
            picture.write_bytes(base64.b64decode(encoded))
            item["sha256"] = sha256(picture.read_bytes()).hexdigest()
        (OUT / f"{cell}.response.json").write_text(
            json.dumps(dict(http_status=status, seconds=round(time.time() - started, 1), answer=answer),
                       indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(cell, status, "saved" if encoded else "NO IMAGE", f"{time.time() - started:.0f}s")


def sheet(name):
    from PIL import Image, ImageDraw
    tile, label = 512, 34
    rows = list(ROUNDS[name]["parts"])
    columns = ROUNDS[name]["repeats"]
    page = Image.new("RGB", (columns * tile, len(rows) * (tile + label)), "white")
    pen = ImageDraw.Draw(page)
    for cell, card in cells(name):
        index = int(cell.rsplit("-", 1)[1]) - 1
        x, y = index * tile, rows.index(card) * (tile + label)
        picture = OUT / f"{cell}.png"
        if picture.exists():
            with Image.open(picture) as source:
                page.paste(source.convert("RGB").resize((tile, tile), Image.Resampling.LANCZOS), (x, y))
        pen.text((x + 8, y + tile + 10), cell + ("" if picture.exists() else "  (missing)"), fill=(0, 0, 0))
    page.save(OUT / f"{name}-sheet.jpg", quality=88)
    print(f"{name}-sheet.jpg")


def blind(name, target):
    """Shuffled, renamed, re-encoded copies; the key stays in the evidence folder, not with the copies."""
    from PIL import Image
    target = Path(target)
    target.mkdir(parents=True, exist_ok=True)
    names = [cell for cell, _ in cells(name) if (OUT / f"{cell}.png").exists()]
    random.Random(int(sha256(name.encode()).hexdigest(), 16)).shuffle(names)
    key = {}
    for index, cell in enumerate(names, 1):
        alias = f"img-{index:02d}.png"
        with Image.open(OUT / f"{cell}.png") as source:
            source.convert("RGB").save(target / alias)
        key[alias] = cell
    (OUT / f"{name}-blind-key.json").write_text(json.dumps(key, indent=2) + "\n", encoding="utf-8")
    print(len(key), "copies in", target)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--round", required=True, choices=list(ROUNDS))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sheet", action="store_true")
    parser.add_argument("--blind", metavar="DIR")
    args = parser.parse_args()
    if args.sheet:
        sheet(args.round)
    elif args.blind:
        blind(args.round, args.blind)
    else:
        run(args.round, args.dry_run)


if __name__ == "__main__":
    main()
