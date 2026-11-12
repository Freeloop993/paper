"""Submit the 42 D2 requests serially and retain their actual receipts and timing."""
import json
from pathlib import Path
import re
import threading
import time
import zipfile

import l1_core as core

KIT = Path(__file__).resolve().parent
ROOT = KIT.parent
OUT = ROOT/"D2-actual"
PERF = ROOT/"D2-cache-change"
LOG = ROOT/"comfy-d2-server.log"
DIGEST = "714dd8fde416c0602581fbd7ac3f020178bfd2c41d9e58a4c9a15f00b0635ac8"


def preflight(rows, bindings):
    assert len(rows) == len({r["position"] for r in rows}) == 42
    assert [r["arm"] for r in rows] == list("P"*10+"K"*28+"I"*4)
    assert core.digest("".join(r["request_sha256"] for r in rows).encode()) == DIGEST
    assert len(bindings) == 8 and set(bindings) == {r["input_image"] for r in rows if "input_image" in r}
    for row in rows:
        raw = (KIT/"requests"/(row["position"]+".json")).read_bytes()
        assert core.digest(raw) == row["request_sha256"]
        graph = json.loads(raw)["prompt"]
        images = [n["inputs"]["image"] for n in graph.values() if n["class_type"]=="LoadImage"]
        assert images == ([row["input_image"]] if "input_image" in row else [])
    queue = core.checked_get("/queue").json()
    assert not queue["queue_running"] and not queue["queue_pending"]


def bind_inputs(bindings):
    for name, source in bindings.items():
        raw = (KIT/"inputs"/name).read_bytes()
        assert core.digest(raw) == source["sha256"]
        params = dict(type="input",filename=name)
        reply = core.session.get(core.BASE+"/view", params=params,timeout=30)
        if reply.status_code == 404:
            upload = core.session.post(core.BASE+"/upload/image",data={"type":"input"},
                files={"image":(name,raw,"image/png")},timeout=30)
            upload.raise_for_status()
            result = upload.json()
            assert result["name"]==name and not result["subfolder"]
            reply = core.checked_get("/view",**params)
        reply.raise_for_status()
        assert core.digest(reply.content) == source["sha256"]
    core.record(OUT/"bound-inputs.json",bindings)


def read_bytes(pid):
    io = (Path("/proc")/str(pid)/"io").read_text().splitlines()
    return int(next(s.split(": ")[1] for s in io if s.startswith("read_bytes: ")))


def observe_stages(start, stop, events):
    began=time.monotonic()
    partial=b""
    keys=("Requested to load","prepared for dynamic","Prompt executed in","got prompt","| 0/40","| 40/40")
    with LOG.open("rb") as stream:
        stream.seek(start)
        while True:
            data=stream.read()
            if data:
                lines=re.split(rb"[\r\n]+",partial+data)
                partial=lines.pop()
                for raw in lines:
                    line=raw.decode(errors="replace")
                    if any(key in line for key in keys):
                        events.append({"seconds":round(time.monotonic()-began,2),"log":line[:280]})
            if stop.wait(.3):
                break


def timing(folder, start, pid, baseline, events):
    with LOG.open("rb") as f:
        f.seek(start)
        lines = f.read().decode(errors="replace").splitlines()
    selected = [s for s in lines if "Requested to load" in s or "Prompt executed in" in s
                or re.search(r"100%.*?40/40",s)]
    hist = json.loads((folder/"history.original.json").read_bytes())
    messages = next(iter(hist.values()))["status"]["messages"]
    cached = [str(n) for kind, payload in messages if kind=="execution_cached" for n in payload["nodes"]]
    core.record(folder/"performance.json",dict(utc=core.now(),pid=pid,process_disk_read_bytes=read_bytes(pid)-baseline,
                cached_nodes=cached,sampler_cached="10" in cached,server_log=selected,stage_events=events))
    return cached


def archive():
    target = ROOT/"D2-originals.zip"
    tmp = target.with_suffix(".partial")
    with zipfile.ZipFile(tmp,"w",zipfile.ZIP_DEFLATED) as z:
        for top in (OUT,PERF):
            for p in sorted(top.rglob("*")):
                if p.is_file() and p.suffix!=".tmp":
                    z.write(p,p.relative_to(ROOT))
    tmp.replace(target)
    sha = core.digest(target.read_bytes())
    print("ARCHIVE",target.name,sha,flush=True)
    return sha


def main():
    rows = json.loads((KIT/"manifest.json").read_bytes())
    bindings = json.loads((KIT/"input-bindings.json").read_bytes())
    preflight(rows, bindings)
    after = json.loads((PERF/"after.json").read_bytes())
    assert "--cache-classic" in core.checked_get("/system_stats").json()["system"]["argv"]
    pid = after["pid"]
    assert "--cache-classic" in (Path("/proc")/str(pid)/"cmdline").read_bytes().decode().split("\0")
    OUT.mkdir(exist_ok=False)
    core.KIT,core.OUT = KIT,OUT
    progress = dict(started_at=core.now(),manifest_positions=len(rows),digest=DIGEST,completed=[],unavailable=[])
    try:
        bind_inputs(bindings)
        for row in rows:
            name = row["position"]
            progress["current"] = name
            core.record(OUT/"progress.json",progress)
            if row["arm"]=="I" and not after.get("vae_encode"):
                progress["unavailable"].append(name)
                continue
            baseline = read_bytes(pid)
            start = LOG.stat().st_size
            row = dict(row,input_sha256=bindings.get(row.get("input_image"),{}).get("sha256"))
            events=[]
            stop=threading.Event()
            watcher=threading.Thread(target=observe_stages,args=(start,stop,events),daemon=True)
            watcher.start()
            try:
                core.run_one(row)
            finally:
                stop.set()
                watcher.join()
            cached = timing(OUT/name,start,pid,baseline,events)
            progress["completed"].append(name)
            core.record(OUT/"progress.json",progress)
            print("SAVED",len(progress["completed"]),name,"cached",cached,flush=True)
            if len(progress["completed"]) in (10,22,38): archive()
        progress["state"] = "finished_with_missing" if progress["unavailable"] else "completed"
    except Exception as error:
        progress.update(state="stopped",error=f"{type(error).__name__}: {error}")
        raise
    finally:
        progress["ended_at"]=core.now()
        core.record(OUT/"progress.json",progress)
        sha=archive()
        (ROOT/"D2-final-sha256.txt").write_text(sha+"  D2-originals.zip\n")


if __name__=="__main__":
    main()
