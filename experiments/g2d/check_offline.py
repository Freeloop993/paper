"""Validate subject-independent invariants of the two stage-03 packages."""
import copy
import hashlib
import json
from pathlib import Path
from PIL import Image
from score import score

P = Path(__file__).resolve().parent
ROOT = P.parents[1]

def read(p):
    return json.loads(p.read_bytes())

def plain_graph(graph):
    graph = copy.deepcopy(graph)
    graph["5"]["inputs"].pop("image")
    graph["10"]["inputs"].pop("seed")
    graph["12"]["inputs"].pop("filename_prefix")
    return graph

def check():
    plan = read(P/"manifest.json")
    assert len(plan["cases"])==6 and len(plan["files"])==9
    for name, sha in plan["files"].items():
        assert hashlib.sha256((P/name).read_bytes()).hexdigest()==sha
    base = None
    known_points = {}
    for case in plan["cases"]:
        graph = read(P/"requests"/(case["case"]+".json"))["prompt"]
        assert graph["7"]["class_type"]=="Canny" and graph["7"]["inputs"]=={"image":["6",0],"low_threshold":0.4,"high_threshold":0.8}
        assert graph["9"]["inputs"]["image"]==["7",0] and graph["9"]["inputs"]["strength"]==0.7
        assert graph["5"]["inputs"]["image"]==case["guide"] and graph["10"]["inputs"]["seed"]==case["seed"]
        template = plain_graph(graph)
        if base is None:
            base = template
        assert template==base
        low, high = sorted(case["targets"], key=lambda p:p[1])[:2], sorted(case["targets"],key=lambda p:p[1])[2:]
        known_points[case["case"]] = sorted(low)+sorted(high)
    assert {(r["level"],r["seed"]) for r in plan["cases"]} == {(t,s) for t in (.85,1.,1.15) for s in (2026111105,2026111106)}
    historical = Image.open(ROOT/"evidence/historic-guides/control_L2.png").convert("L")
    middle = Image.open(P/"guides/parts-r100.png").convert("L")
    for x,y in [(300,300),(724,300),(300,724),(724,724)]:
        for dx in range(-72,73):
            for dy in range(-72,73):
                if dx*dx+dy*dy<=72**2:
                    assert historical.getpixel((x+dx,y+dy))==middle.getpixel((x+dx,y+dy))
    assert score(known_points)["verdict_for_this_reader"]=="通过"
    assert score(dict.fromkeys(known_points))["verdict_for_this_reader"]=="失败"
    other = P.parent/"g3b"
    revisions = {r["case"].split("-")[-1]:read(other/"requests"/(r["case"]+".json"))["prompt"] for r in read(other/"manifest.json")["cases"]}
    for k, graph in revisions.items():
        assert graph["10"]["inputs"]["seed"]==2026111101
        assert ("images.image_1" in graph["4"]["inputs"]) == (k!="iv")
        assert graph["10"]["inputs"]["latent_image"] == (["4",2] if k=="i" else ["16",0])
        assert graph["10"]["inputs"]["denoise"] == {"i":1.,"ii":.8,"iii":.65,"iv":.8}[k]
        graph["12"]["inputs"]["filename_prefix"]="test"
    ref=copy.deepcopy(revisions["ii"])
    ref["10"]["inputs"]["denoise"]=.65
    assert ref==revisions["iii"]
    ref["10"]["inputs"]["denoise"]=.8
    del ref["4"]["inputs"]["images.image_1"],ref["4"]["inputs"]["vae"]
    assert ref==revisions["iv"]
    print("Six G2d requests and three guides, four C1 blade/shaft regions, scorer controls and four G3b graph routes verified.")

if __name__=="__main__":
    check()
