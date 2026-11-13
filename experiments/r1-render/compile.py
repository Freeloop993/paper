"""Compile or verify the paired R1 requests offline."""
import argparse
from hashlib import sha256
from itertools import product
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
E1 = HERE.parent / "r0-e0-e1"
# E1-actual receipt files at ae30028eb6eb101e7ebba7fcccfcd0f5254d5fb4.
E1_RECEIPTS = {
    "E1-control-wl1.00-r1": {
        "prompt_id": "66ffa10f-e4be-48f2-b8a1-96cfd3977263",
        "history_sha256": "2fc8957aa53219553d22423ca851305e30c7c42ad78309dcf5997d5951d0332e",
        "image_sha256": "a1ea6d00c792f49a167bb7509b84fae4096175c002140a8b6e79574ac62ebc0f",
    },
    "E1-control-wl1.00-r2": {
        "prompt_id": "fdaa02ea-d767-48d8-b36f-887149ebb48b",
        "history_sha256": "fb6c4cf58e80a691bf40fcec1b271c6eaa024217bf791f36e61d2c0bb1026541",
        "image_sha256": "2e277d53b9e6478697d72c2d790e30472b63177236e146f9d56334b1e61bf5f5",
    },
}


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def artifacts():
    frozen = {row["case"]: row for row in json.loads((E1 / "manifest.json").read_bytes())["cases"]}
    parents = []
    for rep in (1, 2):
        parent = frozen[f"E1-control-wl1.00-r{rep}"]
        source = (E1 / parent["request"]).read_bytes()
        if sha256(source).hexdigest() != parent["sha256"]:
            raise ValueError(f"Parent digest mismatch: {parent['case']}")
        parents.append((rep, parent, source))

    rows = []
    for cfg, strength, end in product((1, 3), (0.7, 0.5), (1, 0.6, 0.35)):
        reference = (cfg, strength, end) == (1, 0.7, 1)
        # Keep the historical end1.0 filename and the integer 1 in its JSON.
        end_label = str(float(end))
        for rep, parent, source in parents:
            case = f"R1-cfg{cfg}-s{strength:.1f}-end{end_label}-r{rep}"
            obj = json.loads(source)
            controls = obj["prompt"]["9"]["inputs"]
            controls.update(strength=strength, end_percent=end)
            obj["prompt"]["10"]["inputs"]["cfg"] = cfg
            data = encoded(obj)
            if reference and data != source:
                raise ValueError("Baseline must match E1 byte for byte")
            path = f"requests/{case}.json"
            row = dict(case=case, cfg=cfg, strength=strength, end_percent=end,
                       seed=parent["seed"], parent=parent["case"], mode="reference_E1" if reference else "new",
                       request=path, sha256=sha256(data).hexdigest(), parent_sha256=parent["sha256"],
                       guide=parent["guide"], guide_sha256=parent["guide_sha256"])
            if reference:
                row["e1_receipt"] = E1_RECEIPTS[parent["case"]]
            rows.append(row)
            yield path, data
    references = sum(row["mode"] == "reference_E1" for row in rows)
    yield "manifest.json", encoded({"positions": len(rows), "new_requests": len(rows) - references,
                                    "E1_references": references, "cases": rows})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name, expected in artifacts():
        target = HERE / name
        if args.check:
            if target.read_bytes() != expected:
                raise ValueError(f"Frozen artifact differs: {name}")
        elif not target.exists() or target.read_bytes() != expected:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(expected)
