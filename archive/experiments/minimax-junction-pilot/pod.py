"""Lock the three nose briefs, add the author's accepted parent nose as a local reference."""
import io
import json
import sys
from pathlib import Path
from PIL import Image
import run as pilot

pilot.HERE = Path(__file__).resolve().parent / "pod-reference"
pilot.OUT = pilot.OUT / "pod-reference"
if sys.argv[1] == "prepare":
    pilot.HERE.mkdir(exist_ok=False)
    data = Path(sys.argv[2]).read_bytes()
    assert pilot.digest(data) == "3a5d93a9037bf9ebf2e2fd804d61554924f3db42300b9ad4d89ecba028f2a1a3"
    patch = pilot.HERE / "parent-pod.png"
    with Image.open(io.BytesIO(data)) as im:
        im.crop((499,211,756,290)).resize((514,158),Image.Resampling.LANCZOS).convert("RGB").save(patch)
    rows = json.loads((pilot.HERE.parent / "nose-language/manifest.json").read_text(encoding="utf-8"))
    for row in rows:
        row.update(second_guide=patch.relative_to(pilot.ROOT).as_posix(), second_sha256=pilot.digest(patch.read_bytes()),
                   prompt=row["prompt"]+" Picture 2 is only the appearance of the opaque crown of a forward optical pod seen from above. Suit its housing and side supports to this brief.")
    pilot.save(pilot.HERE / "manifest.json",rows)
elif sys.argv[1] == "run":
    pilot.run()
else:
    raise SystemExit("prepare <approved top-view parent> or run")
