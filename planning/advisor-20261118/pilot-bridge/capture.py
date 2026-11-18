"""Facilitator-side capture for live C2 sessions and clearly labelled software controls.
Python >=3.10 and Pillow. SQLite transactions bind immutable input, outputs and decisions.
"""
import argparse
import hashlib
import io
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def artifact(db, path):
    path = Path(path)
    data = path.read_bytes()
    key = sha(data)
    db.execute("INSERT OR IGNORE INTO asset VALUES (?,?)", (key, data))
    return {"file": path.name, "sha256": key, "bytes": len(data)}


def asset_bytes(db, ref):
    row = db.execute("SELECT data FROM asset WHERE sha=?", (ref["sha256"],)).fetchone()
    require(row and sha(row[0]) == ref["sha256"], "missing or corrupted artifact")
    return row[0]


def event(db, kind, data):
    db.execute("INSERT INTO event(at,kind,data) VALUES (?,?,?)", (now(), kind, encode(data)))


def log(db):
    return [{"at": at, "kind": kind, **json.loads(data)} for at,kind,data in
            db.execute("SELECT at,kind,data FROM event ORDER BY id")]


def valid_id(s):
    require(re.fullmatch(r"[A-Za-z0-9_.-]{1,80}", s), "use a short anonymous identifier")
    return s


PHASES = ("active", "handoff", "queue", "model", "unknown_wait", "technical_pause")


def stage(db, label):
    last = db.execute("SELECT data FROM event WHERE kind='phase' ORDER BY id DESC LIMIT 1").fetchone()
    if not last or json.loads(last[0])["label"] != label:
        event(db, "phase", {"label": label})


def start(db, a):
    db.execute("CREATE TABLE session(data TEXT NOT NULL)")
    db.execute("CREATE TABLE event(id INTEGER PRIMARY KEY,at TEXT NOT NULL,kind TEXT NOT NULL,data TEXT NOT NULL)")
    db.execute("CREATE TABLE asset(sha TEXT PRIMARY KEY,data BLOB NOT NULL)")
    common = artifact(db, a.guide)
    with Image.open(io.BytesIO(asset_bytes(db, common))) as im:
        require(im.format == "PNG", "common displayed guide must be PNG")
        im.verify()
    s = {"schema":"design-study/c2-capture-v2", "evidence_class":a.stage,
         "participant":valid_id(a.subject), "pair":valid_id(a.pair), "order":a.order,
         "task":a.task, "condition":a.condition, "image_policy":a.policy,
         "model_version":a.model, "protocol_version":a.protocol,
         "displayed_guide":common, "brief":artifact(db,a.brief), "active_limit_s":900, "image_limit":9,
         "opportunity_limit":9,
         "backend_manifest":artifact(db,a.backend_manifest) if a.backend_manifest else None}
    db.execute("INSERT INTO session VALUES (?)", (encode(s),))
    event(db, "opened", {})
    stage(db, "active")


def read_export(db, config):
    cfg = artifact(db, config)
    c = json.loads(asset_bytes(db,cfg))
    require(c["schema"] == "drone-configurator/config-v2", "expected native PR75 config-v2")
    require(c["files"]["config"] == cfg["file"], "config filename disagrees with export")
    refs = {"config":cfg}
    for name in ("prompt","guide"):
        filename = c["files"][name]
        require(filename == Path(filename).name, "unsafe sibling filename")
        refs[name] = artifact(db, Path(config).parent / filename)
    require(c["reference_image"]["file"] == refs["guide"]["file"] and
            c["reference_image"]["png_sha256"] == refs["guide"]["sha256"], "guide digest mismatch")
    require(c["prompt"]["file"] == refs["prompt"]["file"], "prompt filename mismatch")
    raw = asset_bytes(db, refs["prompt"])
    text = raw.decode("utf-8").replace("\r\n","\n")
    require(text == c["prompt"]["text"] and sha(text.encode()) == c["prompt"]["text_sha256"],
            "TXT differs from compiled prompt")
    refs["text_sha256_lf"] = sha(text.encode())
    refs["source_schema"] = c["schema"]
    require(len(c["layout"]["hubs"]) == 4 and abs(c["layout"]["W_over_L"]-1) < .001
            and abs(c["layout"]["D_mean_mm"]-250) < .01, "C2 expects the common four-axis geometry")
    return refs


def attempts(events):
    return {e["attempt"]:e for e in events if e["kind"]=="sealed"}


def latest_receipts(events):
    return {e["attempt"]:e for e in events if e["kind"]=="receipt"}


def candidates(events):
    return {f"{e['attempt']}/{i}":obj for e in events if e["kind"]=="receipt"
            for i,obj in enumerate(e["outputs"],1)}


def opportunity_id(call):
    return call.get("opportunity", call["attempt"])


def presentation_records(events):
    records = {key: {"status": "unknown", "first_visible_at": None, "basis": "unrecorded"}
               for key in candidates(events)}
    for event_data in events:
        if event_data["kind"] == "presentation":
            for key in event_data["candidates"]:
                records[key] = {name: event_data[name] for name in ("status","first_visible_at","basis")}
    return records


def present(db, events, a):
    records = presentation_records(events)
    calls = attempts(events)
    keys = a.candidate
    require(len(keys) == len(set(keys)) and all(k in records for k in keys), "provide distinct real candidates")
    require(a.status == "shown" or not (a.at or a.now), "only shown candidates have a first-visible time")
    require(all(records[k]["status"] != "shown" or
                (a.at and not records[k]["first_visible_at"] and a.status == "shown") for k in keys),
            "first presentation already registered")
    measured_at = now() if a.now else a.at
    if measured_at:
        measured = datetime.fromisoformat(measured_at)
        require(measured.tzinfo is not None, "provide a time with UTC offset")
        limit = next((e["at"] for e in events if e["kind"]=="closed"),now())
        require(all(datetime.fromisoformat(calls[k.rsplit("/",1)[0]]["at"]) <= measured <=
                    datetime.fromisoformat(limit) for k in keys), "presentation outside session or before seal")
        measured_at = measured.astimezone(timezone.utc).isoformat(timespec="microseconds")
    evidence = artifact(db, a.evidence) if a.evidence else None
    basis = "live_facilitator" if a.now else "reported_timestamp" if a.at else "status_only"
    event(db,"presentation",{"candidates":keys,"status":a.status,"first_visible_at":measured_at,
                             "basis":basis,"reason":a.reason,"evidence":evidence})
    if a.now:
        stage(db,"active")


def seal(db, s, events, a):
    previous = attempts(events)
    require(a.id not in previous and set(previous)==set(latest_receipts(events)), "duplicate or pending attempt")
    require(not any(e["kind"]=="supplemental_call" and e["attempt"]==a.id for e in events),"duplicate call identifier")
    counts = summary(db, s, events)
    require(not counts["supplemental_image_counts_unknown"], "unconfirmed extra output count; reconcile it before requesting more images")
    require(not counts["unknown_attempts"], "unresolved call or image count; enter the subsequently verified receipt first")
    require(not counts["active_limit_exceeded"], "15 minutes active design time reached; finish the record")
    require(a.slots + counts["images_counted_toward_limit"] <= s["image_limit"], "requested positions would exceed nine images")
    opportunity = valid_id(a.opportunity or a.id)
    members = [e for e in previous.values() if opportunity_id(e)==opportunity]
    if members:
        require(not a.retry and a.planned_calls is None and a.step_reason and a.step_reason.strip(),
                "continuing a preplanned opportunity requires a step reason; a retry is a fresh opportunity")
        require(opportunity_id(next(reversed(previous.values())))==opportunity and
                len(members)<members[0].get("planned_calls",1),"opportunity is closed or planned calls exhausted")
        require(not any(e["kind"]=="decision" for e in events[events.index(members[0])+1:]),
                "new designer decision requires a new opportunity")
    else:
        require(counts["recorded_opportunities"] < s.get("opportunity_limit",9), "nine opportunities already used")
        require(a.planned_calls is None or a.planned_calls >= 1,"planned calls must be positive")
        require((a.planned_calls or 1)==1 or (a.step_reason and a.step_reason.strip()),
                "describe multistep plan when opening the opportunity")
    req = artifact(db, a.request)
    graph = json.loads(asset_bytes(db,req))["prompt"]
    spec = read_export(db,a.config) if a.config else None
    require(bool(spec) == (s["condition"]=="S"), "S requires native export; D takes free text only")
    approved = artifact(db,a.approved)
    prompt_nodes = [n["inputs"]["prompt"] for n in graph.values() if n["class_type"]=="TextEncodeQwenImage21"]
    require(len(prompt_nodes)==1, "expected one Qwen positive prompt node")
    text = asset_bytes(db,approved).decode("utf-8").replace("\r\n","\n")
    require(text == prompt_nodes[0] or a.difference,
            "designer-approved text differs from sent text; record what changed and why")
    source = {n["inputs"]["image"] for n in graph.values() if n["class_type"]=="LoadImage"}
    refmap = {}
    for mapping in a.image:
        name, sep, path = mapping.partition("=")
        require(sep and name not in refmap, "expected unique backend-image-name=local-path")
        refmap[name]=artifact(db,path)
    require(source == set(refmap), "backend LoadImage nodes and registered inputs differ")
    parent = candidates(events).get(a.parent) if a.parent else None
    require(not a.parent or parent, "unknown parent candidate")
    allowed = set()
    if s["image_policy"]=="same-guide":
        allowed.add(s["displayed_guide"]["sha256"])
    elif spec:
        allowed.add(spec["guide"]["sha256"])
    if parent:
        allowed.add(parent["sha256"])
    require({r["sha256"] for r in refmap.values()}==allowed,"image inputs differ from registered guide/parent policy")
    if a.retry:
        require(a.retry in previous, "unknown retry target")
    if members:
        first = members[0]
        require(all((first["confirmed_text"]["sha256"]==approved["sha256"],first["goal"]==a.goal,
                     first["keep"]==a.keep, first["compiled"]==spec)),
                "changed confirmed design input requires a new opportunity")
    observed_loaders=[{"class":n["class_type"],"inputs":n["inputs"]} for n in graph.values()
                      if n["class_type"] in ("UNETLoader","CLIPLoader","VAELoader","CheckpointLoaderSimple")]
    seeds=[n["inputs"].get("seed") for n in graph.values() if n["class_type"]=="KSampler"]
    event(db,"sealed",{"attempt":valid_id(a.id),"opportunity":opportunity,
                       "planned_calls":members[0].get("planned_calls",1) if members else a.planned_calls or 1,
                       "step_reason":a.step_reason,"slots":a.slots,"request":req,"compiled":spec,
                       "confirmed_text":approved,"model_image_inputs":refmap,"goal":a.goal,"keep":a.keep,
                       "observed_loaders":observed_loaders,"observed_seeds":seeds,
                       "actual_text_sha256":sha(prompt_nodes[0].encode()), "difference_note":a.difference,
                       "parent":a.parent,"retry_of":a.retry})
    stage(db,"unknown_wait")


def comparable_graph(graph):
    # ComfyUI adds LoadImage.is_changed at runtime. Inputs and every other field remain checked.
    out={}
    for key,node in graph.items():
        clone=dict(node)
        if clone.get("class_type")=="LoadImage":
            clone.pop("is_changed",None)
        out[key]=clone
    return out


def receive(db, s, events, a):
    item=attempts(events).get(a.id)
    prior=latest_receipts(events).get(a.id)
    require(item and (prior is None or (prior["status"]=="unknown" and a.status!="unknown")),
            "unknown attempt or final receipt already present")
    req=json.loads(asset_bytes(db,item["request"]))["prompt"]
    ackref=artifact(db,a.ack) if a.ack else None
    histref=artifact(db,a.history) if a.history else None
    rawref=artifact(db,a.failure_log) if a.failure_log else None
    outputs=[]
    unverified=[]
    execution_window = None
    origin = "not_applicable"
    if a.status=="success":
        require(ackref and histref and not rawref,"success requires original ack and history")
        ack=json.loads(asset_bytes(db,ackref)); pid=ack["prompt_id"]
        require(pid and not ack.get("node_errors"),"invalid acknowledgement")
        h=json.loads(asset_bytes(db,histref)); h=h.get(pid,h)
        require(h["prompt"][1]==pid and comparable_graph(h["prompt"][2])==req,"receipt/request mismatch")
        require(h["status"]["status_str"]=="success" and h["status"]["completed"],"backend did not finish")
        timestamps = {key:info.get("timestamp") for key,info in h["status"].get("messages",[])
                      if isinstance(info,dict) and info.get("prompt_id")==pid}
        start_ms = timestamps.get("execution_start")
        finish_ms = timestamps.get("execution_success")
        if isinstance(start_ms,(int,float)) and isinstance(finish_ms,(int,float)):
            execution_window = [start_ms, finish_ms]
        if not execution_window:
            origin = "clock_missing"
        elif datetime.fromisoformat(item["at"]).timestamp()*1000 <= start_ms <= finish_ms <= datetime.now(timezone.utc).timestamp()*1000:
            origin = "within_session_clock_window"
        else:
            origin = "clock_discrepancy"
        require(not any(e.get("run_id")==pid for e in events),"this run was already recorded")
        expected_names=[obj["filename"] for node in h["outputs"].values() for obj in node.get("images",[])
                        if obj.get("type")=="output"]
        require(expected_names and sorted(expected_names)==sorted(Path(f).name for f in a.output),
                "attach all original output filenames exactly as reported by backend")
        by_name={Path(f).name:f for f in a.output}
        require(len(by_name)==len(expected_names),"ambiguous duplicate output names")
        graph_digests={key:node["inputs"]["image"] for key,node in req.items() if node["class_type"]=="LoadImage"}
        for name in expected_names:
            ref=artifact(db,by_name[name])
            checked_inputs=[]
            with Image.open(io.BytesIO(asset_bytes(db,ref))) as im:
                require(im.format=="PNG","original PNG required"); embedded=json.loads(im.info["prompt"])
                require(comparable_graph(embedded)==req,"embedded PNG workflow differs from sealed request")
                for key,model_name in graph_digests.items():
                    fingerprint=embedded[key].get("is_changed")
                    if isinstance(fingerprint,list) and len(fingerprint)==1:
                        fingerprint=fingerprint[0]
                    if isinstance(fingerprint,str) and re.fullmatch(r"[a-f0-9]{64}",fingerprint):
                        require(fingerprint==item["model_image_inputs"][model_name]["sha256"],"loaded image hash mismatch")
                        checked_inputs.append(model_name)
                im.verify()
            ref["loaded_image_content_verified"]=sorted(checked_inputs)
            ref["load_by_name_only"]=sorted(set(graph_digests.values())-set(checked_inputs))
            outputs.append(ref)
    else:
        require(rawref and a.note,"failed/unknown requires preserved log and note")
        unverified=[artifact(db,p) for p in a.output]
        pid=None
    event(db,"receipt",{"attempt":a.id,"status":a.status,"run_id":pid,"ack":ackref,"history":histref,
                        "failure_log":rawref,"note":a.note,"outputs":outputs,"unverified_files":unverified,
                        "backend_epoch_ms":execution_window,"live_origin":origin})
    if not any(e["kind"]=="closed" for e in events):
        stage(db,"handoff")


def summary(db,s,events):
    closed=next((e for e in events if e["kind"]=="closed"),None)
    stop=closed["at"] if closed else now()
    phases=[e for e in events if e["kind"]=="phase"]
    secs={k:0.0 for k in PHASES}
    for i,e in enumerate(phases):
        end=phases[i+1]["at"] if i+1<len(phases) else stop
        secs[e["label"]]+=(datetime.fromisoformat(end)-datetime.fromisoformat(e["at"])).total_seconds()
    receipts=list(latest_receipts(events).values())
    unresolved_origin=[]
    for r in receipts:
        if r["status"]!="success":
            continue
        if r["live_origin"]!="within_session_clock_window" and not any(
            e["kind"]=="origin_review" and e["attempt"]==r["attempt"] and e["run_id"]==r["run_id"]
            for e in events):
            unresolved_origin.append(r["attempt"])
    calls = attempts(events)
    extras = [e for e in events if e["kind"]=="supplemental_call"]
    extra_counts = {e["attempt"]:e["returned_count"] for e in extras}
    extra_counts.update({e["attempt"]:e["returned_count"] for e in events if e["kind"]=="extra_count_review"})
    verified_files={(r["attempt"],f["file"],f["sha256"]) for r in receipts for f in r["outputs"]}
    partial_files=len({(r["attempt"],f["file"],f["sha256"]) for r in events if r["kind"]=="receipt"
                       for f in r.get("unverified_files",[])}-verified_files)
    groups = {opportunity_id(e) for e in calls.values()}
    additional_groups = sorted({e["opportunity"] for e in extras}-groups)
    presentations = presentation_records(events)
    dispatches = {r["attempt"] for r in receipts if r["status"]=="success"}
    dispatches.update(e["attempt"] for e in events if e["kind"]=="dispatch")
    shown = [k for k,v in presentations.items() if v["status"]=="shown"]
    return {"session":s,"events":events,"timing_seconds":secs,"active_limit_exceeded":secs["active"]>900,
            "closed":bool(closed),"live_origin_pending":unresolved_origin,
            "recorded_opportunities":len(groups)+len(additional_groups),"unplanned_opportunities":additional_groups,
            "opportunity_assignment":"original_call_ids_only" if any("opportunity" not in e for e in calls.values()) else "prospective",
            "sealed_calls":len(calls),"dispatch_evidenced_calls":len(dispatches),
            "dispatch_unconfirmed_calls":sorted(set(calls)-dispatches),
            "supplemental_calls_pending":[e["attempt"] for e in extras],
            "supplemental_image_counts_unknown":[k for k,v in extra_counts.items() if v is None],
            "supplemental_output_files":sum(len(e["outputs"]) for e in extras),
            "partial_receipt_files":partial_files,
            "images_counted_toward_limit":len(presentations)+partial_files+sum(v for v in extra_counts.values() if v is not None),
            "presentation":presentations,"shown_candidates":len(shown),
            "presentation_time_unknown":[k for k in shown if not presentations[k]["first_visible_at"]],
            "presentation_status_unknown":[k for k,v in presentations.items() if v["status"]=="unknown"],
            "reserved_positions":sum(e["slots"] for e in attempts(events).values()),
            "returned_images":len(candidates(events)), "receipted_attempts":len(receipts),
            "request_matched_successes":sum(r["status"]=="success" for r in receipts),
            "outputs_differ_from_plan":[r["attempt"] for r in receipts if r["status"]=="success" and
                                        len(r["outputs"])!=attempts(events)[r["attempt"]]["slots"]],
            "unresolved":sorted(set(attempts(events))-set(latest_receipts(events))),
            "unknown_attempts":[r["attempt"] for r in receipts if r["status"]=="unknown"]}


def pair_check(first, other_path):
    require(other_path.is_file(), "second session missing")
    with sqlite3.connect(other_path.resolve().as_uri()+"?mode=ro", uri=True) as db:
        other_session=json.loads(db.execute("SELECT data FROM session").fetchone()[0])
        second=summary(db,other_session,log(db))
    runs=[first,second]
    entries=[r["session"] for r in runs]
    tests={k:entries[0][k]==entries[1][k] for k in (
        "participant","pair","protocol_version","model_version","evidence_class","image_policy")}
    tests["common_guide_bytes"]=entries[0]["displayed_guide"]["sha256"]==entries[1]["displayed_guide"]["sha256"]
    manifests=[s["backend_manifest"] for s in entries]
    tests["backend_manifest"]=((not any(manifests) and entries[0]["evidence_class"]=="software_control")
                               or bool(all(manifests) and manifests[0]["sha256"]==manifests[1]["sha256"]))
    for key,want in (("task",{"A","B"}),("order",{1,2}),("condition",{"S","D"})):
        tests[key]={s[key] for s in entries}==want
    tests["distinct_briefs"]=entries[0]["brief"]["sha256"]!=entries[1]["brief"]["sha256"]
    tests["closed"]=all(r["closed"] for r in runs)
    tests["verified_live_origin"]=all(not r["live_origin_pending"] for r in runs)
    tests["actual_attempts"]=all(r["receipted_attempts"]>0 for r in runs)
    tests["candidate_received_both"]=all(r["returned_images"]>0 for r in runs)
    success_ids=[{e["run_id"] for e in r["events"] if e["kind"]=="receipt" and e["status"]=="success"} for r in runs]
    tests["separate_backend_runs"]=success_ids[0].isdisjoint(success_ids[1])
    tests["results_accounted"]=all(not r["unknown_attempts"] and not r["unresolved"]
                                   and not r["supplemental_calls_pending"] and not r["partial_receipt_files"] for r in runs)
    tests["limits"]=all(not r["active_limit_exceeded"] and not r["supplemental_image_counts_unknown"]
                        and r["images_counted_toward_limit"]<=r["session"]["image_limit"]
                        and r["recorded_opportunities"]<=r["session"].get("opportunity_limit",9) for r in runs)
    tests["prospective_opportunities"]=all(r["opportunity_assignment"]=="prospective" for r in runs)
    tests["presentation_for_timing"]=all(r["shown_candidates"] and not r["presentation_time_unknown"] and
                                         not r["presentation_status_unknown"] for r in runs)
    tests["decisions_have_display_evidence"]=all(
        not e.get("candidate") or (r["presentation"].get(e["candidate"],{}).get("first_visible_at") or "~")<=e["at"]
        for r in runs for e in r["events"] if e["kind"]=="decision")
    used=[{encode(e["observed_loaders"]) for e in r["events"] if e["kind"]=="sealed"} for r in runs]
    tests["declared_loaders_in_actual_requests"]=used[0]==used[1]
    return {"checks":tests,"consistent":all(tests.values()),"evidence_class":entries[0]["evidence_class"]}


def command():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database",type=Path)
    sub=parser.add_subparsers(dest="cmd",required=True)
    p=sub.add_parser("start")
    for key in ("subject","pair","protocol","model","guide","brief"):p.add_argument("--"+key,required=True)
    p.add_argument("--order",type=int,choices=(1,2),required=True)
    p.add_argument("--condition",choices=("S","D"),required=True)
    p.add_argument("--task",choices=("A","B"),required=True)
    p.add_argument("--stage",choices=("software_control","author_pilot"),required=True)
    p.add_argument("--policy",choices=("same-guide","structured-guide"),required=True)
    p.add_argument("--backend-manifest")
    p=sub.add_parser("seal")
    for key in ("id","approved","request","goal","keep"):p.add_argument("--"+key,required=True)
    for key in ("config","parent","retry","difference"):p.add_argument("--"+key)
    p.add_argument("--opportunity");p.add_argument("--planned-calls",type=int);p.add_argument("--step-reason")
    p.add_argument("--image",action="append",default=[])
    p.add_argument("--slots",type=int,choices=range(1,10),required=True)
    p=sub.add_parser("receive")
    p.add_argument("--id",required=True);p.add_argument("--status",choices=("success","failed","unknown"),required=True)
    for key in ("ack","history","failure-log","note"):p.add_argument("--"+key)
    p.add_argument("--output",action="append",default=[])
    p=sub.add_parser("phase");p.add_argument("label",choices=PHASES)
    p=sub.add_parser("dispatch")
    p.add_argument("--id",required=True);p.add_argument("--evidence",required=True)
    dispatch_clock=p.add_mutually_exclusive_group()
    dispatch_clock.add_argument("--now",action="store_true");dispatch_clock.add_argument("--at")
    p=sub.add_parser("log-extra-call")
    for key in ("id","opportunity","reason"):p.add_argument("--"+key,required=True)
    p.add_argument("--evidence",action="append",required=True);p.add_argument("--output",action="append",default=[])
    p.add_argument("--returned-count",type=int)
    p=sub.add_parser("review-extra-count")
    p.add_argument("--id",required=True);p.add_argument("--evidence",required=True);p.add_argument("--returned-count",type=int,required=True)
    p=sub.add_parser("present");p.add_argument("--candidate",action="append",required=True)
    p.add_argument("--status",choices=("shown","not-shown","unknown"),required=True)
    p.add_argument("--reason",required=True);p.add_argument("--evidence")
    timing=p.add_mutually_exclusive_group();timing.add_argument("--now",action="store_true");timing.add_argument("--at")
    p=sub.add_parser("review-origin")
    for key in ("id","evidence","reason"):p.add_argument("--"+key,required=True)
    p=sub.add_parser("decide");p.add_argument("choice",choices=("keep","reject","rollback","manual","stop"))
    p.add_argument("--candidate");p.add_argument("--reason",required=True);p.add_argument("--manual-output")
    p=sub.add_parser("close");p.add_argument("--reason",required=True);p.add_argument("--post-task")
    p=sub.add_parser("pair");p.add_argument("other",type=Path)
    sub.add_parser("report")
    a=parser.parse_args()
    require(a.cmd=="start" or a.database.is_file(),"session database missing")
    with sqlite3.connect(a.database) as db:
        db.execute("BEGIN IMMEDIATE")
        if a.cmd=="start":
            require(not db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall(),"database exists")
            start(db,a);return
        s=json.loads(db.execute("SELECT data FROM session").fetchone()[0]);events=log(db)
        if a.cmd=="report":
            print(json.dumps(summary(db,s,events),ensure_ascii=False,indent=2));return
        if a.cmd=="pair":
            result=pair_check(summary(db,s,events),a.other)
            print(json.dumps(result,ensure_ascii=False,indent=2))
            require(result["consistent"], "pair differs; inspect the listed fields")
            return
        closed=any(e["kind"]=="closed" for e in events)
        require(not closed or a.cmd in ("review-origin","dispatch","log-extra-call","review-extra-count") or
                (a.cmd=="present" and not a.now) or
                (a.cmd=="receive" and latest_receipts(events).get(a.id,{}).get("status")=="unknown"),
                "session closed")
        if a.cmd=="seal":seal(db,s,events,a)
        if a.cmd=="receive":receive(db,s,events,a)
        if a.cmd=="phase":stage(db,a.label)
        if a.cmd=="present":present(db,events,a)
        if a.cmd=="dispatch":
            submitted = attempts(events).get(a.id)
            require(submitted and not any(e["kind"]=="dispatch" and e["attempt"]==a.id for e in events),
                    "unknown or already documented dispatch")
            sent_at = now() if a.now else a.at
            if sent_at:
                parsed=datetime.fromisoformat(sent_at)
                limit=next((r["at"] for r in events if r["kind"]=="receipt" and r["attempt"]==a.id and r["status"]=="success"),now())
                require(parsed.tzinfo is not None and datetime.fromisoformat(submitted["at"])<=parsed<=datetime.fromisoformat(limit),
                        "dispatch time must be offset-aware and within the sealed request interval")
                sent_at=parsed.astimezone(timezone.utc).isoformat(timespec="microseconds")
            event(db,"dispatch",{"attempt":a.id,"sent_at":sent_at,"evidence":artifact(db,a.evidence),
                                 "basis":"facilitator_provided_dispatch_record"})
        if a.cmd=="log-extra-call":
            known = attempts(events)
            require(a.id not in known and not any(e["kind"]=="supplemental_call" and e["attempt"]==a.id for e in events),
                    "duplicate call identifier")
            valid_id(a.opportunity)
            require(a.returned_count is None or a.returned_count>=len(a.output),"reported total below number of supplied outputs")
            event(db,"supplemental_call",{"attempt":valid_id(a.id),"opportunity":a.opportunity,"reason":a.reason,
                                          "evidence":[artifact(db,f) for f in a.evidence],
                                          "outputs":[artifact(db,f) for f in a.output],"status":"unverified",
                                          "returned_count":a.returned_count})
        if a.cmd=="review-extra-count":
            original=next((e for e in events if e["kind"]=="supplemental_call" and e["attempt"]==a.id),None)
            require(original and a.returned_count>=len(original["outputs"]),"unknown supplemental call or too few images")
            event(db,"extra_count_review",{"attempt":a.id,"returned_count":a.returned_count,"evidence":artifact(db,a.evidence)})
        if a.cmd=="review-origin":
            r=latest_receipts(events).get(a.id)
            require(r and r["status"]=="success"
                    and a.id in summary(db,s,events)["live_origin_pending"], "no live origin review pending")
            event(db,"origin_review",{"attempt":a.id,"run_id":r["run_id"],"evidence":artifact(db,a.evidence),
                                      "reason":a.reason,"basis":"facilitator_documented_review",
                                      "evidence_class":s["evidence_class"]})
        if a.cmd=="decide":
            require(a.choice=="stop" or a.candidate in candidates(events),"choose an actual candidate")
            require(not a.manual_output or a.choice=="manual","attach manual artifact to a manual decision")
            event(db,"decision",{"choice":a.choice,"candidate":a.candidate,"reason":a.reason,
                                 "manual_output":artifact(db,a.manual_output) if a.manual_output else None})
        if a.cmd=="close":
            require(set(attempts(events))==set(latest_receipts(events)),"await outstanding receipt")
            decisions=[e for e in events if e["kind"]=="decision"]
            require(decisions and all(e["at"]<=decisions[-1]["at"] for e in events if e["kind"]=="receipt"),
                    "record final decision after latest receipt")
            event(db,"closed",{"reason":a.reason,"post_task":artifact(db,a.post_task) if a.post_task else None})


if __name__=="__main__":
    try:
        command()
    except (ValueError,OSError,KeyError,TypeError,sqlite3.Error) as exc:
        raise SystemExit(f"Rejected: {exc}") from None
