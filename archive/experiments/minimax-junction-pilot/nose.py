"""One-factor follow-up against the corresponding ray cell: nose/pod description only."""
import json
import sys
from pathlib import Path
import run as pilot

pilot.HERE = Path(__file__).resolve().parent / "nose-language"
pilot.OUT = pilot.OUT / "nose-language"
SWAP = {
    "A": ("At the rounded nose, two shell cheeks wrap a recessed forward-camera pod; only a narrow crescent of its dark crown peeks between the cheeks.",
          "At twelve o'clock the pale nose forms a shallow scalloped visor over a recessed charcoal optical housing. Its small smoked crown and two side reveals are visible from above; the glass aperture is concealed on the vertical forward face."),
    "B": ("Twin longitudinal ridges cradle a slim flush camera hood at the nose; its tapered U-shaped rim is visible from above.",
          "Two long dorsal rails converge at twelve o'clock to flank a slim graphite optical carriage. A shallow scoop exposes its rear crown and side clearances; the glass looks over the front edge, out of view."),
    "C": ("A narrower transverse camera cartridge nests between short nose lugs; a fine parting seam and its satin metal end caps remain visible from above.",
          "At twelve o'clock a compact graphite camera with a flat smoked crown sits in a close-fitting three-sided nose recess. Two small side pivots attach it to the shell; the lens looks ahead through the vertical front face, hidden from this overhead view.")
}
if sys.argv[1] == "prepare":
    pilot.HERE.mkdir(exist_ok=False)
    rows = json.loads((pilot.HERE.parent / "manifest.json").read_text(encoding="utf-8"))
    selected = []
    for row in rows:
        if row["id"].endswith("-ray"):
            old, new = SWAP[row["id"][0]]
            assert row["prompt"].count(old) == 1
            selected.append(dict(row, prompt=row["prompt"].replace(old,new)))
    pilot.save(pilot.HERE / "manifest.json", selected)
elif sys.argv[1] == "run":
    pilot.run()
else:
    raise SystemExit("prepare or run")
