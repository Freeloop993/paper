"""Verify immutable local L1 archive against the frozen requests, inputs and server history."""
import argparse
from datetime import datetime
import hashlib
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

from PIL import Image

HERE = Path(__file__).resolve().parent
SHA = lambda raw: hashlib.sha256(raw).hexdigest()


def verify(archive, remote_sha, dest, checkpoint=None):
    assert SHA(archive.read_bytes()) == remote_sha.lower()
    rows = json.loads((HERE / "manifest.json").read_bytes())
    positions = [r["position"] for r in rows]
    expected_files = {"attempt.json", "request.actual.json", "response.original.json",
                      "history.original.json", "original.png", "receipt.json"}
    index = []
    with ZipFile(archive) as z:
        assert z.testzip() is None
        names = z.namelist()
        assert len(names) == len(set(names))
        assert all(n.startswith("L1-actual/") and "\\" not in n and ".." not in PurePosixPath(n).parts for n in names)
        root = "L1-actual/"
        read = lambda name: z.read(root + name)
        state = json.loads(read("progress.json"))
        if checkpoint is None:
            assert state["state"] == "completed" and state["completed"] == positions
        else:
            assert checkpoint in range(4,29,4) and state["completed"] == positions[:checkpoint]
        assert state["digest"] == SHA("".join(r["request_sha256"] for r in rows).encode())
        binding = {r["input_image"]:r["input_sha256"] for r in json.loads(read("bound-inputs.json"))}
        assert binding == {r["input_image"]:r["input_sha256"] for r in rows}
        expected = {root+"progress.json", root+"bound-inputs.json"}
        last = None
        for row in rows[:checkpoint]:
            case = row["position"]
            expected.update(root+case+"/"+name for name in expected_files)
            case_file = lambda name: read(case+"/"+name)
            raw = case_file("request.actual.json")
            assert raw == (HERE / "requests" / (case+".json")).read_bytes()
            request = json.loads(raw)["prompt"]
            receipt = json.loads(case_file("receipt.json"))
            attempt = json.loads(case_file("attempt.json"))
            assert receipt["position"] == case == attempt["position"]
            assert SHA(raw) == attempt["sha256"] == receipt["request_sha256"] == row["request_sha256"]
            assert receipt["input_sha256"] == binding[row["input_image"]]
            started = datetime.fromisoformat(attempt["submitted_at"])
            ended = datetime.fromisoformat(receipt["completed_at"])
            assert started < ended and (last is None or last <= started)
            last = ended
            pid = json.loads(case_file("response.original.json"))["prompt_id"]
            history = json.loads(case_file("history.original.json"))[pid]
            assert history["prompt"][1] == pid == receipt["prompt_id"]
            assert history["prompt"][2] == request
            assert history["status"]["completed"] and history["status"]["status_str"] == "success"
            assert history["outputs"]["12"]["images"] == [receipt["server_output"]]
            cached = [str(k) for event,payload in history["status"]["messages"]
                      if event == "execution_cached" for k in payload["nodes"]]
            image = case_file("original.png")
            assert len(image) == receipt["bytes"] and SHA(image) == receipt["original_sha256"]
            with Image.open(BytesIO(image)) as im:
                assert im.format == "PNG" and im.size == (1024,1024)
                pixels = SHA(im.convert("RGB").tobytes())
                if "prompt" in im.info:
                    assert json.loads(im.info["prompt"]) == request
            index.append(dict(position=case, prompt_id=pid, original_sha256=SHA(image), rgb_sha256=pixels,
                              cached_nodes=cached, sampler_cached="10" in cached, seconds=(ended-started).total_seconds()))
        assert set(names) == expected
        assert len({item["prompt_id"] for item in index}) == len(rows[:checkpoint])
        for name in names:
            target = dest / name
            data = z.read(name)
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                assert target.read_bytes() == data, target
            else:
                target.write_bytes(data)
    report = dict(archive_sha256=remote_sha, archive_bytes=archive.stat().st_size, archive_entries=len(expected),
                  planned=len(rows), attempted=len(index), accepted=len(index), completed=len(index),
                  unique_rgb=len({r["rgb_sha256"] for r in index}), sampler_cache_hits=sum(r["sampler_cached"] for r in index),
                  first_submit_utc=json.loads((dest/"L1-actual"/positions[0]/"attempt.json").read_bytes())["submitted_at"], batch_end_utc=state.get("ended_at"), billed_cny=None, results=index)
    (dest/"verification.json").write_bytes((json.dumps(report,ensure_ascii=False,indent=2)+"\n").encode())
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive",type=Path)
    parser.add_argument("remote_sha")
    parser.add_argument("dest",type=Path)
    parser.add_argument("--checkpoint",type=int,help="Verify an explicitly partial, four-position checkpoint")
    args = parser.parse_args()
    summary = verify(args.archive,args.remote_sha,args.dest,args.checkpoint)
    print(json.dumps({k:v for k,v in summary.items() if k != "results"},indent=2))
