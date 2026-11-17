"""Execute the registered dual-reference and E6 corrections on the existing 277 service."""
import base64
import fcntl
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from zipfile import ZipFile, ZIP_STORED

kit = Path(__file__).resolve().parent
root = kit.parent
sys.path.insert(0, str(root))
import dispatch_v2 as v
import remainder

service = "http://127.0.0.1:8189"
project = kit / "experiments/gpu-day-20261115"
dual = project / "b2-rev2b"
hexa = project / "hexa-fix"

def read(path):
    return json.loads(path.read_bytes())

def record(path, data):
    with path.open("x", encoding="utf8") as fp:
        json.dump(data, fp, ensure_ascii=False, indent=2)

def run_batch(stage, paths, rows):
    out = kit / stage
    out.mkdir()
    for path, row in zip(paths, rows, strict=True):
        assert (root / "STOP-V2").read_text() == token and not (root/"STOP-V3").exists()
        v.clear_service(service)
        assert v.digest(path.read_bytes()) == row["request_sha256"]
        rid = row["id"]
        dest = out / rid
        dest.mkdir()
        actual = v.run_one(service, root/"inputs", path, dest, 1200)
        assert actual["id"] == rid and actual["request_sha256"] == row["request_sha256"]
        with (out/"progress.jsonl").open("a") as fh:
            fh.write(json.dumps(actual)+"\n")
            fh.flush()
            os.fsync(fh.fileno())
        print("completed", rid, flush=True)
    (out/"RUN_OK").write_text(str(len(rows)))
    files = [p for p in sorted(out.rglob("*")) if p.is_file()]
    archive = kit / (stage+"-originals.zip")
    with ZipFile(archive,"x",ZIP_STORED) as z:
        for p in files:
            z.write(p,p.relative_to(kit))
        for p in paths:
            z.write(p,p.relative_to(kit))
        for name in sorted({name for r in rows for name in r.get("images",r.get("inputs",[]))}):
            z.write(root/"inputs"/name,"inputs/"+name)
        z.write((dual if stage=="dev" else hexa)/"manifest.json","manifest.json")
        z.write(root/"posthandoff-weights.sha256","weights.sha256")
        z.write(kit/"transition.json","transition.json")
    raw = archive.read_bytes()
    pieces = (len(raw)+149999)//150000
    for i in range(pieces):
        (kit/f"{stage}-{i:03d}.txt").write_bytes(base64.b64encode(raw[i*150000:(i+1)*150000]))
    record(kit/(stage+"-download.json"),dict(size=len(raw),pieces=pieces,sha256=v.digest(raw)))
    print("archived",stage,len(rows),flush=True)

def batches():
    assert v.digest(Path(v.run_one.__code__.co_filename).read_bytes())==v.LEGACY_RUNNER
    assert (root/"STOP").is_file() and (root/"e2r-actual/RUN_OK").is_file()
    v.verify_model_receipt(root)
    active = read(root/"manifest-v2.json")
    assert v.freeze(root)==active
    old = {r["id"]:r for r in active["requests"] if r["order"] in (6,7,14)}
    orig = {r["id"]:r for r in v.read_rows(root)[0]}
    allowed = read(kit/"experiments/approved-inputs.json")
    allowed = {**allowed["parents"],**allowed["guides"]}
    requests = []
    for folder,sub,options in ((dual,"dev",[]),(hexa,"requests",["--allow-shared-seeds","HEXA3-wl"])):
        subprocess.run([sys.executable,"-B",str(kit/"experiments/preflight.py"),str(folder/sub),"--inputs",str(root/"inputs"),*options],check=True)
        rows=read(folder/"manifest.json")["requests"]
        paths=[]
        for row in rows:
            rid=row["id"]
            path=folder/sub/((f"{row['order']:02d}-" if "order" in row else "")+rid+".json")
            paths.append(path)
            assert v.digest(path.read_bytes())==row["request_sha256"]
            g=read(path)
            if folder==hexa:
                before=old[row["replaces"]]
                found=[root/k/before["source"] for k in ("queue","done") if (root/k/before["source"]).is_file()]
                assert len(found)==1
                _, seed, raw=v.compile_row(orig[before["old"]],found[0].read_bytes())
                original=json.loads(raw)
                original["prompt"]["12"]["inputs"]["filename_prefix"]=rid
                original["prompt"]["4"]["inputs"]["negative_prompt"]=read(hexa/"manifest.json")["negative"]
                assert original==g and seed==row["seed"]
            else:
                enc=g["prompt"]["4"]["inputs"]
                names=[g["prompt"][enc["images.image_"+str(i)][0]]["inputs"]["image"] for i in (1,2)]
                assert names==row["images"]==["E3R3-B2.png","E3R3-C1.png"]
                assert g["prompt"]["10"]["inputs"]["seed"]==row["seed"]
            input_names=row.get("images",row.get("inputs"))
            v.measured_inputs(root,{n:allowed[n]["sha256"] for n in input_names})
        requests.append((paths,rows))
    assert [len(b[1]) for b in requests]==[3,39]
    assert set(old)=={r["replaces"] for r in requests[1][1]}
    assert len({r["id"] for _,rows in requests for r in rows})==42
    return requests,old

token="dual-hexa-handoff"
if __name__=="__main__":
    assert __debug__
    datasets,old=batches()
    with (root/"STOP-V2").open("x") as fh:
        fh.write(token)
    with (root/"resume-reviewed.lock").open("a") as outer:
        fcntl.flock(outer,fcntl.LOCK_EX)
        with (root/"dispatch-v2.lock").open("a") as inner:
            fcntl.flock(inner,fcntl.LOCK_EX)
            v.clear_service(service)
            seen=json.loads(v.call(service+"/history?max_items=1000",timeout=20))
            current={v["inputs"]["filename_prefix"] for h in seen.values() for v in h["prompt"][2].values() if "filename_prefix" in v.get("inputs",{})}
            assert not current.intersection({r["id"] for _,rows in datasets for r in rows})
            assert not (kit/"dev").exists() and not (kit/"hexa").exists()
            receipts=[json.loads(l) for l in (root/"takeover-v2/progress.jsonl").read_text().splitlines()]
            historical=[r for r in receipts if r["id"] in old]
            legacy=[json.loads(l) for l in (root/"progress.jsonl").read_text().splitlines()]
            assert not any(r.get("id") in old for r in legacy)
            assert all(r["state"]=="completed" for r in historical)
            for r in historical:
                f=root/"takeover-v2"/r["id"]
                assert v.digest((f/"request.json").read_bytes())==old[r["id"]]["sha256"]==r["request_sha256"]
                assert v.digest((f/(r["id"]+".png")).read_bytes())==r["png_sha256"]
            record(kit/"transition.json",dict(boundary=time.strftime("%Y-%m-%dT%H:%M:%S%z"),old_hexa_completed=historical,old_hexa_unsubmitted=sorted(set(old)-{r["id"] for r in historical}),new_development=3,corrected_hexa=39))
            print("boundary; historical E6",len(historical),flush=True)
            run_batch("dev",*datasets[0])
            run_batch("hexa", *datasets[1])
        print("resuming non-E6 schedule",flush=True)
        remainder.execute(root,service)
