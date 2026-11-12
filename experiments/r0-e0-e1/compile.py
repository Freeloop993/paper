"""Offline request compiler. The generated files never submit a request."""
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
GUIDES = ROOT / "prototypes/drone-configurator/public/research-guides"
R0_DIGEST = "78dcb88c9c4bad7c5a69d2c5fac1e9e759f22f3e3708bbd5776652d82cdd893c"
CLOSED_SUFFIX = "Use the attached layout only for rotor positions and blade size; do not reproduce its black marks."


def read(path):
    return json.loads(path.read_bytes())


def dump(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2) + "\n").encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main(commit):
    if not re.fullmatch("[0-9a-f]{40}", commit):
        raise ValueError("Pin the published guide commit with its full SHA.")
    template = read(ROOT / "experiments/g2d/requests/G2d-r100-s2026111105.json")["prompt"]
    guides = {(s["wl"], s["dd"]): s for s in read(GUIDES/"guides.json")}
    manifest = []
    def record(case, body, **info):
        path = HERE / "requests" / (case + ".json")
        path.parent.mkdir(exist_ok=True)
        path.write_bytes(body)
        manifest.append(dict(case=case, request="requests/"+path.name, sha256=digest(body), **info))

    old = (HERE/"L2S1C1-request.original.json").read_bytes()
    historical = next(r for r in read(ROOT/"evidence/historic-guides/executed-guides.json") if r["case"] == "L2S1C1")
    assert digest(old) == R0_DIGEST and json.loads(old)["prompt"] == historical["graph"]
    for seed in (2026110201, 2026111200):
        assert old.count(b"2026110201") == 1
        body = old.replace(b"2026110201", str(seed).encode())
        record("R0-"+str(seed), body, stage="R0", arm="control", seed=seed,
               guide="evidence/historic-guides/control_L2.png", guide_sha256=historical["guide_sha256"])
    for stage, seeds in [("E0", (2026111201, 2026111202)),
                         ("E1", (2026111211, 2026111212, 2026111213, 2026111214))]:
        factors = {"wl": (.70, 1.00, 1.30)}
        if stage == "E1":
            factors["dd"] = (.40, .50, .60)
        for factor, levels in factors.items():
            for level in levels:
                guide = guides[(level, .50) if factor == "wl" else (1., level)]
                guide_path = (GUIDES / guide["file"]).relative_to(ROOT).as_posix()
                assert digest((ROOT/guide_path).read_bytes()) == guide["sha256"]
                sentence = (f"The left-right motor spacing is {level:.2f} times the front-back motor spacing."
                            if factor == "wl" else f"Each rotor diameter is {level:.2f} of the diagonal motor distance.")
                positive = template["4"]["inputs"]["prompt"] + " " + sentence
                for arm in (("control","closed") if stage == "E0" else ("control","text")):
                    for repeat, seed in enumerate(seeds if arm == "control" else seeds[:2], 1):
                        case = f"{stage}-{arm}-{factor}{level:.2f}-r{repeat}"
                        if arm == "closed":
                            body = {"model":"gpt-image-2.5-flare", "promptText":positive+" "+CLOSED_SUFFIX,
                                    "ratio":"1:1", "imageSize":"1K", "count":1,
                                    "referenceImages":[{"tag":"layout","url":f"https://raw.githubusercontent.com/Freeloop993/paper/{commit}/{guide_path}"}],
                                    "rationale":"E0 closed reference-image comparison for a registered UAV industrial design study."}
                        else:
                            graph = copy.deepcopy(template)
                            graph["4"]["inputs"]["prompt"] = positive
                            graph["10"]["inputs"]["seed"] = seed
                            graph["12"]["inputs"]["filename_prefix"] = case
                            if arm == "text":
                                for key in range(5,10):
                                    del graph[str(key)]
                                graph["10"]["inputs"]["model"] = ["1",0]
                            else:
                                graph["5"]["inputs"]["image"] = guide["file"]
                            body = {"prompt": graph}
                        record(case, dump(body), stage=stage, arm=arm, factor=factor, level=level,
                               repeat=repeat, seed=None if arm=="closed" else seed,
                               guide=None if arm=="text" else guide_path,
                               guide_sha256=None if arm=="text" else guide["sha256"])
    (HERE/"manifest.json").write_bytes(dump({"guide_commit":commit,"cases":manifest}))
    print(len(manifest),"request files written.")


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("guide_commit")
    main(parser.parse_args().guide_commit)

