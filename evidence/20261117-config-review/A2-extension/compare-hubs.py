"""Compare motor centres across the two saved readings using only the page directions."""
import json, math
from pathlib import Path
root = Path(__file__).resolve().parent
load = lambda name: json.loads((root / name).read_text(encoding="utf-8"))
models = {v["id"]: v for v in load("readings.json")["samples"]}
key = load("repeat-key.json")
aliases = dict(upper_left="FL", upper_right="FR", lower_left="RL", lower_right="RR")
def spans(points):
    xx, yy = zip(*points)
    return (max(xx) - min(xx)) / (max(yy) - min(yy))
for sample in load("second-reading.json")["images"]:
    model = models[key[Path(sample["input_file_name"]).stem]]
    first, second = [], []
    for hub in sample["motors"]:
        first.append(model["points"][aliases.get(hub["id"], hub["id"])])
        second.append((hub["x"], hub["y"]))
    assert len(second) == model["rotor_count"] and len(set(second)) == len(second)
    delta = [math.dist(a, b) for a, b in zip(first, second)]
    print(model["id"], len(delta), f"first W/L {spans(first):.6f}, second {spans(second):.6f}, absolute difference {abs(spans(first)-spans(second)):.6f}, max hub distance {max(delta):.3f} px")