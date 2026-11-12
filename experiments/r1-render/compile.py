"""Compile or verify the paired R1 requests offline."""
import argparse
from hashlib import sha256
from itertools import product
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
E1 = HERE.parent / "r0-e0-e1"


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def artifacts():
    frozen = {row["case"]: row for row in json.loads((E1 / "manifest.json").read_bytes())["cases"]}
    rows = []
    for rep in (1, 2):
        parent = frozen[f"E1-control-wl1.00-r{rep}"]
        source = (E1 / parent["request"]).read_bytes()
        if sha256(source).hexdigest() != parent["sha256"]:
            raise ValueError(f"Parent digest mismatch: {parent['case']}")
        for cfg, strength, end in product((1, 3), (0.7, 0.5), (1, 0.6)):
            case = f"R1-cfg{cfg}-s{strength:.1f}-end{end:.1f}-r{rep}"
            reference = (cfg, strength, end) == (1, 0.7, 1)
            obj = json.loads(source)
            controls = obj["prompt"]["9"]["inputs"]
            controls.update(strength=strength, end_percent=end)
            obj["prompt"]["10"]["inputs"]["cfg"] = cfg
            data = encoded(obj)
            if reference and data != source:
                raise ValueError("Baseline must match E1 byte for byte")
            path = f"requests/{case}.json"
            rows.append(dict(case=case, cfg=cfg, strength=strength, end_percent=end,
                             seed=parent["seed"], parent=parent["case"], mode="reference_E1" if reference else "new",
                             request=path, sha256=sha256(data).hexdigest(), parent_sha256=parent["sha256"],
                             guide=parent["guide"], guide_sha256=parent["guide_sha256"]))
            yield path, data
    yield "manifest.json", encoded({"positions": 16, "new_requests": 14, "E1_references": 2, "cases": rows})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name, expected in artifacts():
        target = HERE / name
        if args.check:
            if target.read_bytes() != expected:
                raise ValueError(f"Frozen artifact differs: {name}")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(expected)
