"""Rebuild the six registered E2 requests. No network or model calls."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
E1 = ROOT / "evidence/e1-open-20261112/E1-actual"
PRIOR = ROOT / "experiments/r0-e0-e1"
PARENTS = {
    "E1-control-wl1.00-r1": "a1ea6d00c792f49a167bb7509b84fae4096175c002140a8b6e79574ac62ebc0f",
    "E1-control-dd0.50-r1": "2dbdcc5b0ed94403b3969f4488a52a6b1fa6c6262ddc9b7930d7ef0ac3b0c51b",
}
GUIDE = ROOT / "prototypes/drone-configurator/public/research-guides/wl-1.00-dd-0.50.png"
GUIDE_SHA = "4dd33589a21d710153d912ac8dada8d0fc26fe0ac029883794461e53b0f4628e"
INSTRUCTIONS_SHA = "3cac0950cc8afc0b13b79ef83c509a24de423c79fc7ec3f9a8ebeac34cc6dfc6"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def checked(path, expected):
    data = path.read_bytes()
    if digest(data) != expected:
        raise ValueError(f"Source changed: {path}")
    return data


def encode(data):
    return (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf8")


def compile_batch():
    commands = json.loads(checked(HERE / "instructions.json", INSTRUCTIONS_SHA))
    edit_template = json.loads(checked(ROOT / "experiments/g3-reference/with-reference.json",
        "df47c0d1c8601c5ca55b7b18a29ba0dca233b806ef5ef518f159dd4143316ac9"))["prompt"]
    cases = {r["case"]: r for r in json.loads((PRIOR / "manifest.json").read_bytes())["cases"]}
    # This historical text file uses Git's automatic checkout line endings.
    material = (ROOT / "evidence/r0-20261112/environment/verified-material.json").read_bytes().replace(b"\r\n", b"\n")
    if digest(material) != "53300ece548b4dbe542a98468e577f26e63900f9cd31a1d2ceff15ba873bcf07":
        raise ValueError("Historical material record changed")
    receipt = json.loads(material)
    keys = json.loads((ROOT / "experiments/l1-layout/step0/edit-graph-keys.json").read_bytes())
    for node in edit_template.values():
        if sorted(node["inputs"]) != sorted(keys[node["class_type"]]):
            raise ValueError("Edited workflow and archived node keys differ")
    outputs = {}
    rows = []
    for arm, pairs in (("edit", [(p,k) for p in PARENTS for k in commands]),
                       ("control", zip(PARENTS, commands))):
        for parent, instruction in pairs:
            parent_path = E1 / parent / "original.png"
            checked(parent_path, PARENTS[parent])
            seed = 2026111401 + len(rows)
            number = list(PARENTS).index(parent) + 1
            ident = f"E2-{arm}-P{number}-{instruction}"
            if arm == "edit":
                graph = copy.deepcopy(edit_template)
                graph["4"]["inputs"]["prompt"] = commands[instruction]
                graph["4"]["inputs"]["negative_prompt"] = ""
                name = parent + ".png"
                image_path, image_sha = parent_path, PARENTS[parent]
                graph["15"]["inputs"]["image"] = name
            else:
                archived = json.loads((E1 / parent / "request.json").read_bytes())
                frozen = json.loads(checked(PRIOR / cases[parent]["request"], cases[parent]["sha256"]))
                if archived != frozen:
                    raise ValueError(f"E1 request differs: {parent}")
                graph = archived["prompt"]
                graph["4"]["inputs"]["prompt"] += " " + commands[instruction]
                name = graph["5"]["inputs"]["image"]
                if name != GUIDE.name: raise ValueError(name)
                image_path, image_sha = GUIDE, GUIDE_SHA
            graph["10"]["inputs"]["seed"] = seed
            graph["12"]["inputs"]["filename_prefix"] = ident
            request_path = "requests/" + ident + ".json"
            request = encode({"prompt":graph})
            outputs[request_path] = request
            checked(image_path, image_sha)
            rows.append(dict(id=ident, arm=arm, instruction_key=instruction, parent_id=parent,
                parent_sha256=PARENTS[parent], seed=seed, request=request_path, request_sha256=digest(request),
                input_name=name, input_file="input/"+name, input_source=image_path.relative_to(ROOT).as_posix(),
                input_sha256=image_sha))
    outputs["weights.json"] = encode(dict(reference_only=True, historical_commit=receipt["commit"],
        weights=receipt["weights"], sources=receipt["sources"]))
    outputs["manifest.json"] = encode(dict(stage="E2", instruction_sha256=INSTRUCTIONS_SHA, rows=rows))
    return outputs


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name, data in compile_batch().items():
        path = HERE / name
        if args.check:
            checked(path, digest(data))
        else:
            path.parent.mkdir(exist_ok=True)
            path.write_bytes(data)
    print("Six E2 positions verified against both E1 originals, registered wording and guide.")
