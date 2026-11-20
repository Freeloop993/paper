"""Keep the same pod module and refs; vary the housing that connects it to each nose."""
from pathlib import Path
import json
import sys
import run as pilot
pilot.HERE = Path(__file__).resolve().parent / "mount"
pilot.OUT = pilot.OUT / "mount"
interfaces = {
    "A": "The body itself cups the dark module inside a shallow crescent notch; its broad continuous lip is almost flush with the crown.",
    "B": "The module sits at the tip of a narrow projecting spine. A long teardrop fairing runs aft from its crown, separated from two parallel body shoulders by twin fine channels.",
    "C": "A separate U-shaped metal carrier bridges the nose cheeks around the module; leave two visible lateral pivot discs and a fitted transverse parting seam behind the carrier."
}
if sys.argv[1] == "prepare":
    pilot.HERE.mkdir(exist_ok=False)
    rows = json.loads((pilot.HERE.parent / "pod-reference/manifest.json").read_text(encoding="utf-8"))
    for row in rows:
        prefix, marker, suffix = row["prompt"].partition(" Picture 2 is only")
        assert marker
        row["prompt"] = prefix + " " + interfaces[row["id"][0]] + marker + suffix
    pilot.save(pilot.HERE / "manifest.json", rows)
elif sys.argv[1] == "run":
    pilot.run()
else:
    raise SystemExit("prepare or run")
