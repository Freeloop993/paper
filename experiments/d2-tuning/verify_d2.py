"""Verify D2 original bytes, graph evolution, actual node-cache events and order."""
import argparse
from collections import Counter
from datetime import datetime
import hashlib
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

from PIL import Image

HERE = Path(__file__).resolve().parent
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
DIGEST = "714dd8fde416c0602581fbd7ac3f020178bfd2c41d9e58a4c9a15f00b0635ac8"


def verify(archive, remote_sha, dest):
    assert SHA(archive.read_bytes()) == remote_sha
    rows = json.loads((HERE/"manifest.json").read_bytes())
    assert len(rows)==42 and SHA("".join(r["request_sha256"] for r in rows).encode())==DIGEST
    planned = [r["position"] for r in rows]
    bindings = json.loads((HERE/"input-bindings.json").read_bytes())
    index=[]
    with ZipFile(archive) as z:
        names=z.namelist()
        assert z.testzip() is None and len(names)==len(set(names))
        assert all("\\" not in n and ".." not in PurePosixPath(n).parts and n.startswith(("D2-actual/","D2-cache-change/")) for n in names)
        def read(path): return z.read("D2-actual/"+path)
        assert json.loads(read("bound-inputs.json"))==bindings
        state=json.loads(read("progress.json"))
        assert state["digest"]==DIGEST and state["manifest_positions"]==42
        assert state["state"] in ("completed","finished_with_missing")
        missing=state["unavailable"]
        assert missing in ([],[r["position"] for r in rows if r["arm"]=="I"])
        assert state["completed"]==[n for n in planned if n not in missing]
        after=json.loads(z.read("D2-cache-change/after.json"))
        before=json.loads(z.read("D2-cache-change/before.json"))
        assert before["cmd"].count("--cache-none")==1
        assert [("--cache-classic" if x=="--cache-none" else x) for x in before["cmd"]]==after["cmd"]
        assert bool(after["vae_encode"]) == (len(missing)==0)
        last=None
        required={"D2-actual/bound-inputs.json","D2-actual/progress.json",
                  *("D2-cache-change/"+n+".json" for n in ("after","before","launch","l1-timings"))}
        for row in rows:
            name=row["position"]
            if name in missing: continue
            position_files=("attempt.json","request.actual.json","response.original.json","history.original.json",
                            "receipt.json","original.png","performance.json")
            required.update("D2-actual/"+name+"/"+f for f in position_files)
            def f(key): return read(name+"/"+key)
            def j(key): return json.loads(f(key))
            raw=f("request.actual.json")
            assert raw==(HERE/"requests"/(name+".json")).read_bytes()
            receipt,attempt=j("receipt.json"),j("attempt.json")
            assert attempt["sha256"]==receipt["request_sha256"]==row["request_sha256"]==SHA(raw)
            assert attempt["position"]==receipt["position"]==name
            assert receipt["input_sha256"]==bindings.get(row.get("input_image"),{}).get("sha256")
            pid=j("response.original.json")["prompt_id"]
            history=j("history.original.json")[pid]
            assert pid==receipt["prompt_id"]==history["prompt"][1]
            assert history["prompt"][2]==json.loads(raw)["prompt"]
            assert history["status"]["status_str"]=="success" and history["status"]["completed"]
            assert history["outputs"]["12"]["images"]==[receipt["server_output"]]
            cached=[str(node) for event,payload in history["status"]["messages"]
                    if event=="execution_cached" for node in payload["nodes"]]
            perf=j("performance.json")
            assert cached==perf["cached_nodes"] and perf["sampler_cached"]==("10" in cached)
            started,ended=map(datetime.fromisoformat,(attempt["submitted_at"],receipt["completed_at"]))
            assert started<ended and (last is None or last<=started)
            last=ended
            data=f("original.png")
            assert len(data)==receipt["bytes"] and SHA(data)==receipt["original_sha256"]
            with Image.open(BytesIO(data)) as image:
                assert image.format=="PNG" and image.size==(1024,1024)
                if "prompt" in image.info: assert json.loads(image.info["prompt"])==history["prompt"][2]
                rgb=SHA(image.convert("RGB").tobytes())
            index.append(dict(position=name,arm=row["arm"],prompt_id=pid,seconds=(ended-started).total_seconds(),
                              rgb_sha256=rgb,original_sha256=SHA(data),cached_nodes=cached,
                              sampler_cached=perf["sampler_cached"],disk_read_bytes=perf["process_disk_read_bytes"]))
        assert required==set(names)
        assert len({r["prompt_id"] for r in index})==len(index)
        for name in names:
            target=dest/name
            data=z.read(name)
            target.parent.mkdir(exist_ok=True,parents=True)
            if target.exists(): assert target.read_bytes()==data, target
            else: target.write_bytes(data)
    report=dict(archive_sha256=remote_sha,archive_bytes=archive.stat().st_size,planned=42,attempted=len(index),
                accepted=len(index),completed=len(index),unavailable=missing,by_arm=dict(Counter(r["arm"] for r in index)),
                unique_rgb=len({r["rgb_sha256"] for r in index}),sampler_cache_hits=sum(r["sampler_cached"] for r in index),
                runner_started_utc=state["started_at"],batch_end_utc=state["ended_at"],results=index)
    (dest/"verification.json").write_bytes((json.dumps(report,indent=2)+"\n").encode())
    return report


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip",type=Path)
    parser.add_argument("remote_sha")
    parser.add_argument("dest",type=Path)
    args=parser.parse_args()
    report=verify(args.zip,args.remote_sha,args.dest)
    print(json.dumps({k:v for k,v in report.items() if k!="results"},indent=2))
