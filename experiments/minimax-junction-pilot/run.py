"""Prepare or submit the registered MiniMax development cells; never resubmit an attempted cell."""
import argparse
import base64
import getpass
import hashlib
import io
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / "evidence" / "minimax-junction-pilot"
OLD = ROOT / "experiments/p2-spec-cards/skeleton-light-wl1.0.png"
URL = "https://api.minimax.io/v1/images/edits"
BASE = "Photorealistic industrial design photograph of a daily-carry aerial camera quadcopter. Orthographic 90-degree overhead, nose at twelve o'clock. True X, four motors, arms at 45 degrees to the nose axis, square hub layout, opposite hubs 250 mm apart. Four stationary propellers, each a single balanced pair of opposite equal blades, 125 mm tip to tip."
STYLE = "Satin warm-grey molded shell, graphite composite arms, charcoal blades. Soft 5500 K sidelight, defined contact shadows, pale seamless background. Use the four reference endpoints for motor locations. Unlettered product, full aircraft in frame."
PART = {
    "A": "Pebble body, 1.6:1. At the rounded nose, two shell cheeks wrap a recessed forward-camera pod; only a narrow crescent of its dark crown peeks between the cheeks. Each arm grows from a broad radiused shoulder, the upper skin sweeping into the first third of the arm.",
    "B": "Slender spindle body, 2.6:1. Twin longitudinal ridges cradle a slim flush camera hood at the nose; its tapered U-shaped rim is visible from above. Long blade-like arm roots run alongside the body then sweep diagonally outward in one uninterrupted taper.",
    "C": "Compact bevelled body, 1.6:1. A narrower transverse camera cartridge nests between short nose lugs; a fine parting seam and its satin metal end caps remain visible from above. Four separate arms seat flush in recessed shoulder sockets, each with one fitted collar. Tight joints and two banks of inset cooling slots."
}


def digest(content):
    return hashlib.sha256(content).hexdigest()


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def make_guide():
    from PIL import ImageDraw
    scale = 3
    im = Image.new("RGB", (1024 * scale, 1024 * scale), (238,) * 3)
    pen = ImageDraw.Draw(im)
    for x, y in [(300, 300), (724, 300), (300, 724), (724, 724)]:
        pen.line((512*scale, 512*scale, x*scale, y*scale), fill=(150,)*3, width=2*scale)
        pen.ellipse(((x-6)*scale, (y-6)*scale, (x+6)*scale, (y+6)*scale), fill=(90,)*3)
    im.resize((1024, 1024), Image.Resampling.LANCZOS).save(HERE / "points-rays.png")


def prepare():
    if (HERE / "manifest.json").exists():
        raise SystemExit("Manifest exists")
    make_guide()
    guides = {"bar": OLD, "ray": HERE / "points-rays.png"}
    rows = []
    for guide, card in [("bar","A"), ("ray","B"), ("bar","C"), ("ray","A"), ("bar","B"), ("ray","C")]:
        ref = guides[guide]
        rows.append(dict(id=f"{card}-{guide}", guide=str(ref.relative_to(ROOT).as_posix()),
                         sha256=digest(ref.read_bytes()), prompt=" ".join([BASE, PART[card], STYLE])))
    save(HERE / "manifest.json", rows)


def run():
    rows = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))
    key = os.environ.get("MINIMAX_API_KEY") or getpass.getpass("MiniMax credential: ")
    if not key.strip():
        raise SystemExit("No credential")
    session = requests.Session()
    session.trust_env = False
    OUT.mkdir(exist_ok=True, parents=True)
    for row in rows:
        cell = OUT / row["id"]
        raw = (ROOT / row["guide"]).read_bytes()
        if digest(raw) != row["sha256"]:
            raise SystemExit("Guide mismatch")
        cell.mkdir(exist_ok=False)
        body = dict(model="MiniMax-H3-Image", size="1024x1024", n=1, output_format="png",
                    response_format="b64_json", prompt=row["prompt"])
        save(cell / "request.json", dict(endpoint=URL, body=dict(body, images=[dict(file=row["guide"], sha256=row["sha256"])]),
                                         submitted_utc=datetime.now(timezone.utc).isoformat()))
        body["images"] = [dict(image_url="data:image/png;base64," + base64.b64encode(raw).decode())]
        started = time.monotonic()
        try:
            response = session.post(URL, headers={"Authorization":"Bearer " + key.strip()}, json=body, timeout=(15,240), allow_redirects=False)
        except requests.RequestException as exc:
            save(cell / "failure.json", dict(kind=type(exc).__name__, state="delivery_unknown"))
            raise SystemExit("Transport failure; stopped")
        try:
            answer = response.json()
        except ValueError:
            save(cell / "failure.json", dict(http_status=response.status_code, state="non_json"))
            raise SystemExit("Non-JSON reply; stopped")
        items = answer.get("data") or []
        item = items[0] if isinstance(items,list) and items else {}
        encoded = item.pop("b64_json", None)
        save(cell / "response.json", dict(http_status=response.status_code, elapsed_s=round(time.monotonic()-started,2),
             model=answer.get("model"), request_id=response.headers.get("x-request-id"), created=answer.get("created"),
             usage=answer.get("usage"), size=item.get("size"), revised_prompt=item.get("revised_prompt"),
             error=item.get("error") or answer.get("error") or answer.get("base_resp")))
        if response.status_code != 200 or not encoded:
            raise SystemExit(f"{row['id']}: HTTP {response.status_code}, no output; stopped")
        data = base64.b64decode(encoded, validate=True)
        (cell / "original.png").write_bytes(data)
        with Image.open(io.BytesIO(data)) as im:
            im.load()
            if im.size != (1024,1024) or im.format != "PNG":
                raise SystemExit("Unexpected image format; stopped")
            rgb = digest(im.convert("RGB").tobytes())
        save(cell / "verified.json", dict(file_sha256=digest(data), rgb_sha256=rgb, bytes=len(data)))
        print(row["id"], "saved", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["prepare","run"])
    args = parser.parse_args()
    prepare() if args.action == "prepare" else run()
