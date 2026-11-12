"""Run the P1 test matrix on MiniMax H3-Image and keep every request, response and picture.

  export MINIMAX_API_KEY=...            # never write the key into a file in this repository
  python -B experiments/p1-param-prompt/run_minimax.py --dry-run
  python -B experiments/p1-param-prompt/run_minimax.py [--only T1 T4-diagram-1.0] [--out DIR]
  python -B experiments/p1-param-prompt/run_minimax.py --sheet [--out DIR]

Endpoints and fields follow https://platform.minimax.io/docs/guides/image-generation :
text cells POST /v1/images/generations, diagram cells POST /v1/images/edits with the layout
diagram as a base64 data URL. The service exposes no seed. Calls are billed and not
idempotent, so a cell that already has a picture is skipped and nothing is retried.
"""
import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from hashlib import sha256
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import param_prompt as pp  # noqa: E402

BASE = "https://api.minimax.io"
MODEL = "MiniMax-H3-Image"
COMMON = dict(model=MODEL, n=1, aspect_ratio="1:1", area="1K", output_format="png", response_format="b64_json")


def build(cell):
    params, mode, wl, enhanced = pp.MATRIX[cell]
    payload = dict(COMMON, prompt=pp.prompt_for(cell))
    if mode == "diagram":
        diagram = HERE / "diagrams" / f"layout-wl{wl:.1f}.png"
        raw = diagram.read_bytes()
        payload["images"] = [{"image_url": "data:image/png;base64," + base64.b64encode(raw).decode()}]
        record = dict(payload, images=[{"file": diagram.name, "sha256": sha256(raw).hexdigest()}])
        return "/v1/images/edits", payload, record
    payload["disable_prompt_enhanced"] = not enhanced
    return "/v1/images/generations", payload, dict(payload)


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


def run(cells, out, dry):
    key = os.environ.get("MINIMAX_API_KEY", "")
    if not dry and not key:
        sys.exit("MINIMAX_API_KEY is not set")
    out.mkdir(parents=True, exist_ok=True)
    for cell in cells:
        path, payload, record = build(cell)
        if dry:
            print(f"[{cell}] {path}\n{json.dumps(record, ensure_ascii=False)[:600]}\n")
            continue
        picture = out / f"{cell}.png"
        if picture.exists():
            print(cell, "already done, skipped")
            continue
        (out / f"{cell}.request.json").write_text(json.dumps(dict(endpoint=path, body=record), indent=2,
                                                             ensure_ascii=False) + "\n", encoding="utf-8")
        started = time.time()
        status, answer = call(path, payload, key)
        item = (answer.get("data") or [{}])[0] if isinstance(answer, dict) else {}
        encoded = item.pop("b64_json", None) if isinstance(item, dict) else None
        if encoded:
            picture.write_bytes(base64.b64decode(encoded))
            item["sha256"] = sha256(picture.read_bytes()).hexdigest()
        (out / f"{cell}.response.json").write_text(json.dumps(dict(http_status=status, seconds=round(time.time() - started, 1),
                                                                   answer=answer), indent=2, ensure_ascii=False) + "\n",
                                                   encoding="utf-8")
        print(cell, status, "saved" if encoded else "NO IMAGE", f"{time.time() - started:.0f}s")


def sheet(cells, out):
    from PIL import Image, ImageDraw
    tile, label, columns = 512, 36, 4
    out.mkdir(parents=True, exist_ok=True)
    lines = (len(cells) + columns - 1) // columns
    page = Image.new("RGB", (columns * tile, lines * (tile + label)), "white")
    pen = ImageDraw.Draw(page)
    for index, cell in enumerate(cells):
        x, y = (index % columns) * tile, (index // columns) * (tile + label)
        picture = out / f"{cell}.png"
        if picture.exists():
            with Image.open(picture) as source:
                page.paste(source.convert("RGB").resize((tile, tile), Image.Resampling.LANCZOS), (x, y))
        pen.text((x + 8, y + tile + 10), cell + ("" if picture.exists() else "  (missing)"), fill=(0, 0, 0))
    page.save(out / "P1-contact-sheet.jpg", quality=88)
    print("P1-contact-sheet.jpg", len(cells), "cells")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", help="cell ids or prefixes")
    parser.add_argument("--out", default=str(HERE / "results"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sheet", action="store_true")
    args = parser.parse_args()
    cells = [c for c in pp.MATRIX if not args.only or any(c.startswith(p) for p in args.only)]
    if args.sheet:
        sheet(cells, Path(args.out))
    else:
        run(cells, Path(args.out), args.dry_run)


if __name__ == "__main__":
    main()
