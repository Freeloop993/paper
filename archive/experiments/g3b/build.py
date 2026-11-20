"""Compile the four registered G3b revisions. Run locally without a Comfy server."""
import copy
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
G3 = HERE.parent / "g3-reference"
ROOT = HERE.parents[1]
PARENT = ROOT/"evidence/s1-axis-repeat/originals/S1-B1-T.png"
STRUCTURED = (
    "Revise one everyday aerial photography quadrotor concept. Part: the front camera and nose. "
    "Change: recess the camera into the nose; taper the outer shell continuously into the camera housing. "
    "Keep: the overall fuselage silhouette and shoulder proportions, top shell panel divisions, arm-root "
    "transitions and motor layout. Keep the same strict orthographic top view, lighting and framing."
)

def main():
    with_reference = json.loads((G3/"with-reference.json").read_bytes())["prompt"]
    text_only = json.loads((G3/"text-only.json").read_bytes())["prompt"]
    parent_sha = hashlib.sha256(PARENT.read_bytes()).hexdigest()
    assert with_reference["15"]["inputs"]["image"] == f"parent-{parent_sha}.png"
    out = HERE/"requests"
    out.mkdir(exist_ok=True)
    rows = []
    for variant, use_reference, strength in [("i",True,1.0),("ii",True,0.8),("iii",True,0.65),("iv",False,0.8)]:
        graph = copy.deepcopy(with_reference if use_reference else text_only)
        if variant=="i":
            graph["4"]["inputs"]["prompt"] = STRUCTURED
        else:
            graph["15"] = copy.deepcopy(with_reference["15"])
            graph["16"] = {"class_type":"VAEEncode","inputs":{"pixels":["15",0],"vae":["3",0]}}
            graph["10"]["inputs"]["latent_image"] = ["16",0]
            graph["10"]["inputs"]["denoise"] = strength
        case = "G3b-"+variant
        graph["12"]["inputs"]["filename_prefix"] = case
        data = (json.dumps({"prompt":graph},indent=2)+"\n").encode()
        (out/(case+".json")).write_bytes(data)
        rows.append(dict(case=case,reference_condition=use_reference,parent_initial_latent=variant!="i",
                         denoise=strength,request_sha256=hashlib.sha256(data).hexdigest()))
    manifest=dict(batch="G3b",seed=2026111101,source_parent_sha256=parent_sha,
                  parent_upload_name=with_reference["15"]["inputs"]["image"],cases=rows)
    (HERE/"manifest.json").write_bytes((json.dumps(manifest,indent=2)+"\n").encode())

if __name__=="__main__":
    main()
