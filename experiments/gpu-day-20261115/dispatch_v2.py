"""Bounded continuation of the 15 November queue. The original manifest is immutable."""
import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

from queue_runner import call, run_one

MANIFEST = "4c65c6b509fbfe64e237205601d48746ffa2bed80112bb72b875a99ad7af8116"
WEIGHTS = "27afb333450178532f6b849bf6475091da675068dd89c245ba09c67125d977b2"
LEGACY_RUNNER = "2ae33a85b2ead0bcea980be5382dffda007f342ddf3ecdcfdf36ff178211439a"
PAIRED = {5: 2026112263, 13: 2026112263, 7: 2026112323, 14: 2026112323}

def digest(b):
    return hashlib.sha256(b).hexdigest()

def check(test, msg):
    if not test:
        raise ValueError(str(msg))

def read_rows(root):
    raw = (root / "manifest.json").read_bytes()
    check(digest(raw) == MANIFEST, "baseline manifest changed")
    data = json.loads(raw)
    return data["requests"], {x["input"]: x["sha256"] for x in data["inputs"]}

def compile_row(row, raw):
    check(digest(raw) == row["request_sha256"], "frozen request changed: " + row["id"])
    req = json.loads(raw)
    graph = req["prompt"]
    rid = row["id"]
    seed = row["seed"]
    check(graph["12"]["inputs"]["filename_prefix"] == rid and graph["10"]["inputs"]["seed"] == seed, rid)
    check(row["input_images"] == [v["inputs"]["image"] for v in graph.values() if v["class_type"] == "LoadImage"], rid)
    if row["order"] in PAIRED:
        seed = PAIRED[row["order"]] + int(rid.rsplit("-r", 1)[1]) - 1
        rid = "P2-" + rid
        graph["12"]["inputs"]["filename_prefix"] = rid
        graph["10"]["inputs"]["seed"] = seed
        raw = json.dumps(req, ensure_ascii=False, indent=2).encode()
    return rid, seed, raw

def freeze(root):
    rows, inputs = read_rows(root)
    records = []
    for row in rows:
        filename = "%02d-%s.json" % (row["order"], row["id"])
        sources = [root / d / filename for d in ("queue","done","running","failed")]
        sources = [src for src in sources if src.is_file()]
        check(len(sources) == 1, filename)
        rid, seed, raw = compile_row(row, sources[0].read_bytes())
        records.append(dict(order=row["order"], old=row["id"], id=rid, seed=seed,
                            source=filename, sha256=digest(raw), inputs=row["input_images"],
                            disposition="historical" if row["order"] <= 3 else "run"))
    return dict(original_manifest=MANIFEST, requests=records, inputs=inputs)

def measured_inputs(root, inputs):
    for name, expected in inputs.items():
        check(Path(name).name == name and digest((root/"inputs"/name).read_bytes()) == expected, name)

def verify_model_receipt(root):
    raw=(root/"weights.json").read_bytes()
    check(digest(raw)==WEIGHTS, "model reference bytes differ")
    expected={x["path"]:x["sha256"] for x in json.loads(raw)["weights"]}
    lines=(root/"posthandoff-weights.sha256").read_text().splitlines()
    actual={line.split()[1]:line.split()[0] for line in lines}
    check(len(lines)==4 and expected==actual, "measured model digests differ")

def recorded_terminal_error(out):
    history=out/"history.json"
    if not history.is_file():
        return False
    h=json.loads(history.read_bytes())
    if h.get("status",{}).get("status_str")!="error":
        return False
    messages=[msg for event,msg in h["status"]["messages"] if event=="execution_error"]
    # Unknown errors and infrastructure faults require reconciliation.
    return bool(messages) and all(str(m.get("exception_type","")).split(".")[-1] in
        {"ValueError","TypeError"} for m in messages)

def clear_service(service):
    status=json.loads(call(service+"/queue",timeout=10))
    check(status["queue_running"]==[] and status["queue_pending"]==[], "Comfy has an unresolved job")

def execute(root, service):
    import fcntl
    check(__debug__, "Python -O disables upstream assertions")
    check(digest(Path(run_one.__code__.co_filename).read_bytes()) == LEGACY_RUNNER, "unregistered transport")
    check((root/"STOP").is_file(), "legacy stop marker missing")
    lock=(root/"dispatch-v2.lock").open("a")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    for proc in Path("/proc").glob("[0-9]*/cmdline"):
        try: args=proc.read_bytes().split(b"\0")
        except (FileNotFoundError,PermissionError,ProcessLookupError): continue
        check(not any(a.split(b"/")[-1]==b"queue_runner.py" for a in args),"legacy dispatcher active")
    verify_model_receipt(root)
    plan=freeze(root)
    frozen=json.loads((root/"manifest-v2.json").read_bytes())
    check(plan==frozen,"v2 freeze differs")
    measured_inputs(root, plan["inputs"])
    baseline={r["id"]:r for r in read_rows(root)[0]}
    state=root/"takeover-v2";state.mkdir(exist_ok=True)
    journal=state/"progress.jsonl"
    past=[json.loads(x) for x in journal.read_text().splitlines()] if journal.exists() else []
    known={p["id"] for p in past if p["state"] in ("completed","isolated_error")}
    check(len(known)==len(past), "unresolved v2 receipt")
    check(not any((root/"running").glob("*.json")) and not any((root/"failed").glob("*.json")), "unresolved legacy request")
    first=[json.loads(x) for x in (root/"progress.jsonl").read_text().splitlines()]
    prior={x["id"]:x for x in first if x["ok"]}
    check(len(prior)==len(first),"ambiguous legacy receipts")
    for row in plan["requests"]:
        old=row["old"]; rid=row["id"]; fname=row["source"]
        if old in prior:
            check((root/"done"/fname).is_file() and prior[old]["request_sha256"]==baseline[old]["request_sha256"],"legacy receipt mismatch")
            check(old==rid, "amended condition already submitted")
            continue
        if row["disposition"]=="historical" or rid in known:
            continue
        if (root/"STOP-V2").exists():
            print("Boundary stop", flush=True);return
        src=root/"queue"/fname
        _,_,raw=compile_row(baseline[old],src.read_bytes())
        check(digest(raw)==row["sha256"],rid)
        measured_inputs(root,{n:plan["inputs"][n] for n in row["inputs"]})
        clear_service(service)
        od=state/rid
        od.mkdir()  # existing directory means possible submission: never repost
        path=od/"frozen.json";path.write_bytes(raw)
        try:
            rec=run_one(service,root/"inputs",path,od,1200)
            check(rec["request_sha256"]==row["sha256"] and rec["id"]==rid,rid)
            rec["state"]="completed"
        except Exception as exc:
            terminal=recorded_terminal_error(od)
            rec=dict(id=rid,state="isolated_error" if terminal else "stop_unknown_or_system",error=str(exc))
            try: (od/"queue-after-error.json").write_bytes(call(service+"/queue",timeout=10))
            except OSError: pass
        rec["batch"]=row["order"]
        with journal.open("a",encoding="utf8") as fh:
            fh.write(json.dumps(rec,ensure_ascii=False)+"\n");fh.flush();os.fsync(fh.fileno())
        print(rec["state"],rid,flush=True)
        if rec["state"]=="stop_unknown_or_system":raise RuntimeError(rid+" requires reconciliation")
        known.add(rid)
    print("All scheduled rows accounted for",flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser();ap.add_argument("action",choices=["freeze","run"]);ap.add_argument("--root",type=Path,required=True)
    a=ap.parse_args()
    if a.action=="freeze":
        sys.stdout.buffer.write((json.dumps(freeze(a.root),ensure_ascii=False,indent=2)+"\n").encode())
    else:execute(a.root,"http://127.0.0.1:8189")
