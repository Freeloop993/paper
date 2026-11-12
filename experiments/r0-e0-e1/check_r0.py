"""Verify the two R0 receipts and original pixels independently of the submission loop."""
import argparse
import csv
from hashlib import sha256
from io import BytesIO, StringIO
import json
from pathlib import Path
from zipfile import ZipFile
from PIL import Image

HERE = Path(__file__).resolve().parent


def inspect(archive):
    rows = [r for r in json.loads((HERE / "manifest.json").read_bytes())["cases"] if r["stage"] == "R0"]
    results = []
    with ZipFile(archive) as z:
        assert z.testzip() is None
        assert len(z.namelist()) == len(set(z.namelist()))
        summary = json.loads(z.read("R0-actual/summary.json"))
        assert [s["case"] for s in summary] == [r["case"] for r in rows]
        for row, observation in zip(rows, summary):
            directory = "R0-actual/" + row["case"] + "/"
            raw = z.read(directory + "request.json")
            assert raw == (HERE / row["request"]).read_bytes() and sha256(raw).hexdigest() == row["sha256"]
            ack = json.loads(z.read(directory + "ack.json"))
            pid = ack["prompt_id"]
            assert observation["prompt_id"] == pid and observation["accepted"] and observation["completed"]
            hist = json.loads(z.read(directory + "history.json"))[pid]
            assert hist["prompt"][2] == json.loads(raw)["prompt"]
            assert hist["status"]["completed"] and hist["status"]["status_str"] == "success"
            msgs = hist["status"]["messages"]
            clocks = {k: v["timestamp"] for k, v in msgs if "timestamp" in v}
            seconds = (clocks["execution_success"] - clocks["execution_start"]) / 1000
            assert seconds == observation["history_seconds"]
            outputs = hist["outputs"]["12"]["images"]
            assert len(outputs) == 1 and outputs[0]["type"] == "output"
            image = z.read(directory + "original.png")
            digest = sha256(image).hexdigest()
            assert digest == observation["output_sha256"]
            with Image.open(BytesIO(image)) as im:
                assert im.format == "PNG" and im.size == (1024, 1024)
                im.load()
                if "prompt" in im.info:
                    assert json.loads(im.info["prompt"]) == json.loads(raw)["prompt"]
            samples = list(csv.reader(StringIO(z.read(directory + "gpu-samples.csv").decode())))
            peak = max(int(s[1].strip()) for s in samples if len(s) == 2 and s[1].strip().isdigit())
            assert peak == observation["gpu_peak_observed_mib"]
            results.append(dict(case=row["case"], prompt_id=pid, image_sha256=digest,
                                history_seconds=seconds, gpu_peak_observed_mib=peak,
                                cached_nodes=[n for k, v in msgs if k == "execution_cached" for n in v["nodes"]]))
    assert len({r["prompt_id"] for r in results}) == 2
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    print(json.dumps(inspect(parser.parse_args().archive), indent=2))
