"""Check the seven browser exercise downloads independently of the app and browser code."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def verify(directory):
    cases = json.loads((directory / "browser-check.json").read_bytes())
    assert len(cases["results"]) == 7
    first, second = cases["input_example_sha256"]
    graphs = 0
    for case in cases["results"]:
        with zipfile.ZipFile(directory / (case["case"] + ".zip")) as archive:
            assert archive.testzip() is None
            s = json.loads(archive.read("session.json"))
            assert s["scope"] == "offline_rehearsal" and s["model_calls"] == 0
            assert s["phase"] == "locked" and s["events"][-1]["action"] == "lock"
            expected = {"parent": 1, "stop_early": 1, "text": 2, "failed": None, "unknown": None}
            route = case["case"].split("-", 2)[2]
            assert s["final"]["version"] == expected[route]
            assert s["final"]["image_sha256"] == {1: first, 2: second, None: None}[expected[route]]
            for v in s["versions"]:
                raw = archive.read(f"v{v['number']}/request.json")
                assert digest(raw) == v["request_sha256"]
                assert json.loads(raw) == v["request"]
                graph = v["request"]["prompt"]
                assert v["shape_control_image"] is None
                if v["image_sha256"]:
                    h = v["image_sha256"]
                    assert digest(archive.read(f"examples/{h}.png")) == h
                if route == "parent" and v["number"] == 2:
                    h = first
                    assert v["parent_image_sha256"] == h
                    name = graph["15"]["inputs"]["image"]
                    assert name == f"parent-{h}.png"
                    assert digest(archive.read(f"v2/input/{name}")) == h
                else:
                    assert v["parent_image_sha256"] is None and "15" not in graph
                graphs += 1
    print(f"Verified {len(cases['results'])} archives and {graphs} exact request files.")


if __name__ == "__main__":
    verify(Path(sys.argv[1]))

