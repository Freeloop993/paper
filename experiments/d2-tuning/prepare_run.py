"""Package the D2 frozen graphs and the exact original inputs for the existing server."""
from hashlib import sha256
import json
from pathlib import Path
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
L1 = ROOT / "experiments/l1-layout"
EXPECTED = "714dd8fde416c0602581fbd7ac3f020178bfd2c41d9e58a4c9a15f00b0635ac8"


def build(destination):
    rows = json.loads((HERE / "manifest.json").read_bytes())
    positions = [r["position"] for r in rows]
    assert len(set(positions)) == len(positions) == 42
    assert [r["arm"] for r in rows] == list("P"*10 + "K"*28 + "I"*4)
    assert sha256("".join(r["request_sha256"] for r in rows).encode()).hexdigest() == EXPECTED
    files = {n:(HERE / n).read_bytes() for n in ("manifest.json","run_d2.py","switch_cache.py","l1_timing.py")}
    files["l1_core.py"] = (L1/"run_manifest.py").read_bytes()
    bindings = {}
    sources = {"BO": HERE/"guides", "BS": ROOT/"prototypes/drone-configurator/public/research-guides",
               "LN": L1/"guides"}
    for r in rows:
        req = "requests/" + r["position"] + ".json"
        files[req] = (HERE / req).read_bytes()
        assert sha256(files[req]).hexdigest() == r["request_sha256"]
        graph = json.loads(files[req])["prompt"]
        image_nodes = [n["inputs"]["image"] for n in graph.values() if n["class_type"] == "LoadImage"]
        name = r.get("input_image")
        assert image_nodes == ([name] if name else [])
        if name and name not in bindings:
            src = (sources[r["guide"]]/name if r["arm"] == "K" else
                   ROOT/"evidence/e1-open-20261112/E1-actual"/Path(name).stem/"original.png")
            raw = src.read_bytes()
            bindings[name] = {"sha256":sha256(raw).hexdigest(),"source":src.relative_to(ROOT).as_posix()}
            files["inputs/"+name] = raw
    assert len(bindings) == 8
    files["input-bindings.json"] = (json.dumps(bindings,indent=2)+"\n").encode()
    (HERE/"input-bindings.json").write_bytes(files["input-bindings.json"])
    with zipfile.ZipFile(destination,"w",zipfile.ZIP_DEFLATED) as archive:
        for name, raw in sorted(files.items()):
            archive.writestr("D2-run-kit-v1/"+name,raw)
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None
        for name,raw in files.items():
            assert archive.read("D2-run-kit-v1/"+name) == raw
    print(len(files), "files", sha256(destination.read_bytes()).hexdigest())


if __name__ == "__main__":
    import sys
    build(Path(sys.argv[1]))
