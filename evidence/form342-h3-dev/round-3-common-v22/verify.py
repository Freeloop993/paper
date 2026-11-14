"""Recompute the post-hoc readout from the sealed observations and archived RGBs."""
import hashlib
import json
from collections import Counter
from pathlib import Path

from PIL import Image


HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "round-3"


def read(path):
    return json.loads(path.read_bytes())


def sha(data):
    return hashlib.sha256(data).hexdigest()


def score():
    register = read(HERE / "record.json")
    raw = (HERE / "readings.json").read_bytes()
    assert sha(raw) == register["sealed_reader_sha256"]
    assert sha((SOURCE / "blind-readings.json").read_bytes()) == register["prior_reading_sha256"]
    records = json.loads(raw)
    key = register["images"]
    earlier = {r["slot"]: r for r in read(SOURCE / "results.json")["rows"]}
    assert len(records) == len(key) == len(earlier) == 8
    assert {r["id"] for r in records} == set(key)
    assert {image["slot"] for image in key.values()} == set(earlier)
    rows = []
    for obs in records:
        link = key[obs["id"]]
        slot = link["slot"]
        path = SOURCE / "actual" / slot
        original = path / "original.png"
        verified = read(path / "verified.json")
        assert sha(original.read_bytes()) == verified["sha256"] == link["original_sha256"]
        with Image.open(original) as im:
            assert im.size == (1024, 1024)
            assert sha(im.convert("RGB").tobytes()) == link["reader_rgb_sha256"] == verified["rgb_sha256"]
        hubs = obs["hubs"]
        assert len(hubs) == len(obs["roots"]) == len(obs["blades"]) == 4
        for point in hubs:
            if point is not None:
                assert len(point) == 2 and all(isinstance(v, int) and 0 <= v < 1024 for v in point)
        wl = None
        if all(hubs) and len(set(map(tuple, hubs))) == 4:
            xs, ys = zip(*hubs)
            if max(ys) > min(ys):
                wl = (max(xs) - min(xs)) / (max(ys) - min(ys))
        double = obs["blades"] == [2, 2, 2, 2]
        joint = double and obs["camera"] != "wrong" and obs["quality"] == "product"
        roots = next((code for code in "BSH" if obs["roots"].count(code) >= 3), "U")
        assert obs["camera"] in {"consistent", "wrong", "invisible", "U"}
        rows.append({"slot": slot, "id": obs["id"], "root": roots, "blades": obs["blades"],
                     "double": double, "camera": obs["camera"], "quality": obs["quality"],
                     "guard": obs["guard"], "residue": obs["residue"], "nose": obs["nose"],
                     "prior_nose": earlier[slot]["nose"], "body": obs["body"], "cover": obs["cover"],
                     "wl": wl, "joint_as_in_round2": joint})
    rows.sort(key=lambda r: (not r["slot"].startswith("S0-"), r["slot"]))
    return {"n": len(rows), "double": sum(r["double"] for r in rows),
            "joint_as_in_round2": sum(r["joint_as_in_round2"] for r in rows),
            "camera": dict(Counter(r["camera"] for r in rows)), "rows": rows}


if __name__ == "__main__":
    result = score()
    assert result == read(HERE / "results.json")
    print("Verified 8 RGBs, both reader-file digests, all keyed readouts and descriptive W/L.")
