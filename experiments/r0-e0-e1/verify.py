"""Independent offline verification of the registered study design and archived inputs."""
from collections import Counter, defaultdict
from hashlib import sha256
from pathlib import Path
import json

here = Path(__file__).resolve().parent
root = here.parents[1]
data = json.loads((here/"manifest.json").read_bytes())
rows = data["cases"]
get = lambda path: json.loads(path.read_bytes())
hashed = lambda path: sha256(path.read_bytes()).hexdigest()
base = get(root/"experiments/g2d/requests/G2d-r100-s2026111105.json")["prompt"]
assert Counter((c["stage"],c["arm"]) for c in rows) == {
    ("R0","control"):2, ("E0","control"):6, ("E0","closed"):6, ("E1","control"):24, ("E1","text"):12}
assert len({c["case"] for c in rows}) == len(rows) == len(list((here/"requests").glob("*.json")))
cells = defaultdict(list)
for c in rows:
    p = here/c["request"]
    assert hashed(p) == c["sha256"]
    body = get(p)
    if c["guide"]:
        assert hashed(root/c["guide"]) == c["guide_sha256"]
    if c["stage"] == "R0":
        original = (here/"L2S1C1-request.original.json").read_bytes()
        assert p.read_bytes() == original.replace(b"2026110201", str(c["seed"]).encode())
        assert get(p)["prompt"]["10"]["inputs"]["seed"] == c["seed"]
        continue
    factor, level = c["factor"],c["level"]
    cells[c["stage"], c["arm"], factor, level].append(c["seed"])
    sentence = (f"The left-right motor spacing is {level:.2f} times the front-back motor spacing."
                if factor=="wl" else f"Each rotor diameter is {level:.2f} of the diagonal motor distance.")
    text = base["4"]["inputs"]["prompt"]+" "+sentence
    if c["arm"]=="closed":
        assert c["seed"] is None and body["prompt"] == text+" Use the attached layout only for rotor positions and blade size; do not reproduce its black marks."
        assert body["images"][0]["image_url"].endswith("/"+data["guide_commit"]+"/"+c["guide"])
        assert body["n"] == 1 and body["size"] == "1024x1024" and body["output_format"] == "png"
        assert body["model"] == "gpt-image-2.6-flare" and len(body["images"]) == 1
        continue
    g=body["prompt"]
    assert g["4"]["inputs"]["prompt"] == text
    assert g["4"]["inputs"]["negative_prompt"] == base["4"]["inputs"]["negative_prompt"]
    assert g["10"]["inputs"]["seed"] == c["seed"]
    assert g["12"]["inputs"]["filename_prefix"] == c["case"]
    # Undo only registered differences and require identity with the archived template.
    g["4"]["inputs"]["prompt"] = base["4"]["inputs"]["prompt"]
    g["10"]["inputs"]["seed"] = base["10"]["inputs"]["seed"]
    g["12"]["inputs"]["filename_prefix"] = base["12"]["inputs"]["filename_prefix"]
    if c["arm"]=="text":
        assert c["guide"] is None and g["10"]["inputs"]["model"]==["1",0]
        for i in "56789":
            assert i not in g
            g[i]=base[i]
        g["10"]["inputs"]["model"]=base["10"]["inputs"]["model"]
    else:
        assert g["5"]["inputs"]["image"]==Path(c["guide"]).name
        g["5"]["inputs"]["image"]=base["5"]["inputs"]["image"]
    assert g == base
for factor, levels in (("wl",(.7,1.,1.3)),("dd",(.4,.5,.6))):
    for level in levels:
        assert cells["E1","control",factor,level]==[2026111211,2026111212,2026111213,2026111214]
        assert cells["E1","text",factor,level]==cells["E1","control",factor,level][:2]
        if factor=="wl":
            assert cells["E0","control",factor,level]==[2026111201,2026111202]
            assert cells["E0","closed",factor,level]==[None,None]
print("50 request hashes; 2 R0, 12 E0, 36 E1; per-cell factors, prompts, seeds, graph parity and reference bytes verified.")
