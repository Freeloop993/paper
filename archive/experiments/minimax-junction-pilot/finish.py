"""Compare a second reference for the same three ray cells, retaining the first-run evidence."""
import base64
import hashlib
import io
import json
import sys
from pathlib import Path
from PIL import Image
import run as pilot

pilot.HERE = Path(__file__).resolve().parent / "finish-reference"
pilot.OUT = pilot.OUT / "finish-reference"
source_digest = "be18a284d071da1ebeddf0f71d127ffa56ea329e1e20e5f5aedc4817d9e7cdb0"
if sys.argv[1] == "prepare":
    pilot.HERE.mkdir(exist_ok=False)
    raw = Path(sys.argv[2]).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == source_digest
    patch = pilot.HERE / "author-shoulder.png"
    with Image.open(io.BytesIO(raw)) as original:
        original.crop((802, 159, 1078, 311)).convert("RGB").save(patch)
    rows = json.loads((pilot.HERE.parent / "manifest.json").read_text(encoding="utf-8"))
    out = []
    for row in rows:
        if row["id"].endswith("-ray"):
            out.append(dict(row, second_guide=str(patch.relative_to(pilot.ROOT).as_posix()),
                            second_sha256=pilot.digest(patch.read_bytes()),
                            prompt=row["prompt"]+" Picture 2 shows finish and shoulder highlights only; apply the surface treatment to this design."))
    pilot.save(pilot.HERE / "manifest.json", out)
elif sys.argv[1] == "run":
    pilot.run()
else:
    raise SystemExit("prepare <original screenshot> or run")
