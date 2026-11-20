"""Two independent local B-hood edit requests from the same verified development parent."""
import json
import sys
from pathlib import Path
import run as pilot
parent = pilot.OUT / "pod-reference/B-ray/original.png"
pilot.HERE = Path(__file__).resolve().parent / "B-local"
pilot.OUT = pilot.OUT / "B-local"
if sys.argv[1] == "prepare":
    pilot.HERE.mkdir(exist_ok=False)
    sha = json.loads((parent.parent / "verified.json").read_text(encoding="utf-8"))["file_sha256"]
    assert pilot.digest(parent.read_bytes()) == sha
    text = ("Edit only the upper nose of this everyday aerial-camera quadcopter. "
            "Fit one shallow, elongated teardrop camera fairing along the dorsal centerline, one third of body length. "
            "The front is an open-forward hood over the existing charcoal camera crown; two low silver cheeks taper rearward into a single narrow tail on the upper shell. "
            "Show the fairing by paired fine side reveals and a soft rim highlight; the forward optical face stays occluded from overhead. "
            "Preserve the supplied slender body, long swept arm roots, motor locations, four balanced two-blade propellers, scale, grey materials, lighting and orthographic top view.")
    records=[dict(id="B-edit-"+str(i),guide=parent.relative_to(pilot.ROOT).as_posix(),sha256=sha,prompt=text) for i in (1,2)]
    pilot.save(pilot.HERE / "manifest.json",records)
elif sys.argv[1] == "run":
    pilot.run()
else:
    raise SystemExit("prepare or run")
