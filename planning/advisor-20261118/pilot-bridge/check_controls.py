"""Run local software controls with the tracked PR75 export; creates no model calls."""
import argparse
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import sqlite3
import subprocess
import sys
import time

from PIL import Image, PngImagePlugin

SCRIPT = Path(__file__).with_name("capture.py")


def run(db, *args, reject=None):
    result = subprocess.run([sys.executable, str(SCRIPT), str(db), *map(str, args)],
                            capture_output=True, encoding="utf-8", env=ENV)
    if reject:
        assert result.returncode and reject in result.stderr, (result.stderr, reject)
    else:
        assert result.returncode == 0, result.stderr
    return result.stdout


def write(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False),encoding="utf-8")
    return path


def make_request(directory, token, text, sources=()):
    graph = {"4":{"class_type":"TextEncodeQwenImage21","inputs":{"prompt":text}},
             "10":{"class_type":"KSampler","inputs":{"seed":11}}}
    for i,source in enumerate(sources,15):
        graph[str(i)]={"class_type":"LoadImage","inputs":{"image":source}}
    return write(directory/f"{token}.request.json",{"prompt":graph}),graph


def fake_backend(directory, token, graph, count):
    # Only software_control databases are used. Outputs are plain coloured 8×8 squares.
    pid=f"SOFTWARE-CONTROL-{token}"
    t=int(time.time()*1000)
    ack=write(directory/f"{token}.ack.json",{"prompt_id":pid,"node_errors":{}})
    files=[]
    for i in range(count):
        f=directory/f"{token}_{i:02d}.png"
        info=PngImagePlugin.PngInfo()
        info.add_text("prompt",json.dumps(graph)); info.add_text("purpose","software_control")
        Image.new("RGB",(8,8),(12+i,34,56)).save(f,pnginfo=info)
        files.append(f)
    hist=write(directory/f"{token}.history.json",{
        "prompt":[1,pid,graph],"status":{"status_str":"success","completed":True,
        "messages":[["execution_start",{"prompt_id":pid,"timestamp":t}],["execution_success",{"prompt_id":pid,"timestamp":t}]]},
        "outputs":{"12":{"images":[{"filename":f.name,"type":"output"} for f in files]}}})
    return ack,hist,files


def check_exports(pr75):
    import sqlite3
    from capture import read_export
    exports=pr75/"review/20261118-round3/exports"
    validated=[]
    with sqlite3.connect(":memory:") as db:
        db.execute("create table asset(sha text primary key,data blob)")
        for f in sorted(exports.glob("*/*.json")):
            if not f.name.startswith("drone-config-"):
                continue
            cfg=json.loads(f.read_bytes())
            if (len(cfg["layout"]["hubs"])==4 and abs(cfg["layout"]["W_over_L"]-1)<.001
                    and abs(cfg["layout"]["D_mean_mm"]-250)<.01):
                read_export(db,f)
                validated.append(f)
    return validated


def check(pr75, w):
    cfgs=check_exports(pr75)
    assert cfgs
    config=cfgs[0]; cj=json.loads(config.read_bytes()); guide=config.parent/cj["files"]["guide"]
    approved=config.parent/cj["files"]["prompt"]
    txt=approved.read_text(encoding="utf-8")
    brief=w/"brief.txt"; brief.write_text("SOFTWARE CONTROL ONLY",encoding="utf-8")
    common=["--stage","software_control","--subject","CTRL","--pair","demo",
            "--model","synthetic/no-call","--protocol","C2-dev","--guide",guide,"--brief",brief,
            "--policy","structured-guide"]
    db=w/"S.db"; run(db,"start",*common,"--order","1","--task","A","--condition","S")
    def seal_args(k,n,req):
        return ["seal","--id",k,"--approved",approved,"--request",req,"--goal","test-target","--keep","test-keep","--slots",str(n)]
    req,graph=make_request(w,"s",txt,["common.png"])
    s_args=seal_args("s",2,req)+["--config",config]
    run(db,*s_args,reject="LoadImage")
    run(db,*s_args,"--image",f"common.png={guide}")
    run(db,*s_args,"--image",f"common.png={guide}",reject="duplicate")
    ack,hist,files=fake_backend(w,"s",graph,2)
    no_clock=json.loads(hist.read_bytes())
    no_clock["status"]["messages"]=[]
    write(hist,no_clock)
    ret=["receive","--id","s","--status","success","--ack",ack,"--history",hist]
    run(db,*ret,"--output",files[0],reject="all original")
    run(db,*ret,"--output",files[0],"--output",files[1])
    received=json.loads(run(db,"report"))
    assert received["shown_candidates"]==0 and received["presentation_status_unknown"]==["s/1","s/2"]
    assert [e["label"] for e in received["events"] if e["kind"]=="phase"][-1]=="handoff"
    run(db,"present","--candidate","s/2","--status","shown","--now","--reason","software display event")
    partial=json.loads(run(db,"report"))
    assert partial["shown_candidates"]==1 and partial["presentation_status_unknown"]==["s/1"]
    run(db,"decide","keep","--candidate","s/9","--reason","fixture",reject="actual candidate")
    run(db,"decide","keep","--candidate","s/2","--reason","second control")
    run(db,"present","--candidate","s/1","--status","shown","--now","--reason","software display event")
    run(db,"decide","rollback","--candidate","s/1","--reason","first control")
    run(db,"close","--reason","end software control")
    s=json.loads(run(db,"report"));assert s["returned_images"]==2 and s["request_matched_successes"]==1
    assert s["live_origin_pending"]==["s"]
    other=w/"D.db"
    brief.write_text("SOFTWARE CONTROL B ONLY",encoding="utf-8")
    run(other,"start",*common,"--order","2","--task","B","--condition","D")
    req2,g2=make_request(w,"d",txt)
    run(other,*seal_args("d",1,req2),"--config",config,reject="D takes free text only")
    run(other,*seal_args("d",1,req2))
    msg=w/"unknown.txt";msg.write_text("SOFTWARE CONTROL / result temporarily unknown",encoding="utf-8")
    run(other,"receive","--id","d","--status","unknown","--failure-log",msg,"--note","test")
    run(other,*seal_args("r",1,req2),"--retry","d",reject="unresolved call")
    run(other,"receive","--id","d","--status","failed","--failure-log",msg,"--note","test correction")
    run(other,*seal_args("r",1,req2),"--retry","d")
    args=["receive","--id","r","--status","success"]
    run(other,*args,"--ack",ack,"--history",hist,"--output",files[0],reject="receipt/request mismatch")
    ack2,hist2,outputs=fake_backend(w,"r",g2,1)
    bad_clock=json.loads(hist2.read_bytes())
    for _, payload in bad_clock["status"]["messages"]:
        payload["timestamp"]=0
    write(hist2,bad_clock)
    run(other,*args,"--ack",ack2,"--history",hist2,"--output",outputs[0])
    run(other,"present","--candidate","r/1","--status","shown","--reason","time unavailable in fixture")
    dview=json.loads(run(other,"report"))
    assert dview["presentation_time_unknown"]==["r/1"]
    receipt_at=[e["at"] for e in dview["events"] if e["kind"]=="receipt" and e["status"]=="success"][0]
    run(other,"present","--candidate","r/1","--status","shown","--at",receipt_at,"--reason","fixture display log","--evidence",brief)
    run(other,"decide","keep","--candidate","r/1","--reason","control finished")
    run(other,"close","--reason","control")
    rep=json.loads(run(other,"report"));assert rep["unknown_attempts"]==[] and rep["returned_images"]==1
    assert rep["live_origin_pending"]==["r"]
    failed=run(db,"pair",other,reject="pair differs")
    for session,attempt in [(db,"s"),(other,"r")]:
        run(session,"review-origin","--id",attempt,"--evidence",brief,"--reason","synthetic control of human review field")
    later=json.loads(run(db,"report"))
    assert later["timing_seconds"]==s["timing_seconds"], "post-close audit must not inflate time"
    report=json.loads(run(db,"pair",other));assert report["consistent"]
    run(db,"pair",db,reject="pair differs")
    over=w/"over.db"
    run(over,"start",*common,"--order","2","--task","B","--condition","D")
    run(over,*seal_args("over",1,req2))
    ack3,hist3,files3=fake_backend(w,"over",g2,10)
    output_args=[arg for f in files3 for arg in ("--output",f)]
    run(over,"receive","--id","over","--status","success","--ack",ack3,"--history",hist3,*output_args)
    over_report=json.loads(run(over,"report"))
    assert over_report["returned_images"]==10 and over_report["outputs_differ_from_plan"]==["over"]
    run(over,*seal_args("over2",1,req2),reject="exceed nine")
    run(over,"present","--candidate","over/1","--status","not-shown","--reason","withheld by test host")
    assert json.loads(run(over,"report"))["presentation"]["over/1"]["status"]=="not-shown"

    grouped=w/"grouped.db"
    run(grouped,"start",*common,"--order","2","--task","B","--condition","D")
    def failed(k):
        run(grouped,"receive","--id",k,"--status","failed","--failure-log",msg,"--note","software fixture")
    run(grouped,*seal_args("call1",1,req2),"--opportunity","op1","--planned-calls","2","--step-reason","two predefined steps")
    failed("call1")
    run(grouped,*seal_args("call2",1,req2),"--opportunity","op1",reject="step reason")
    run(grouped,*seal_args("call2",1,req2),"--opportunity","op1","--step-reason","preplanned step two")
    run(grouped,"dispatch","--id","call2","--evidence",msg)
    failed("call2")
    run(grouped,*seal_args("call3",1,req2),"--opportunity","op1","--step-reason","off-plan",reject="exhausted")
    run(grouped,"log-extra-call","--id","orphan","--opportunity","op1","--reason","incomplete backend log","--evidence",msg)
    run(grouped,*seal_args("new2",1,req2),reject="extra output count")
    run(grouped,"review-extra-count","--id","orphan","--returned-count",0,"--evidence",msg)
    for number in range(2,10):
        token=f"new{number}"
        run(grouped,*seal_args(token,1,req2),"--retry","call2")
        failed(token)
    run(grouped,*seal_args("tenth",1,req2),reject="nine opportunities")
    counts=json.loads(run(grouped,"report"))
    assert (counts["recorded_opportunities"],counts["sealed_calls"],counts["dispatch_evidenced_calls"],
            counts["returned_images"],counts["supplemental_calls_pending"])==(9,10,1,0,["orphan"])
    assert not counts["supplemental_image_counts_unknown"]
    run(grouped,"log-extra-call","--id","overflow","--opportunity","turn10",
        "--reason","off-protocol externally observed call","--evidence",msg,"--output",files[0],"--returned-count",1)
    deviation=json.loads(run(grouped,"report"))
    assert deviation["recorded_opportunities"]==10 and deviation["unplanned_opportunities"]==["turn10"]
    assert deviation["images_counted_toward_limit"]==1 and deviation["shown_candidates"]==0

    multi=w/"multi.db"
    run(multi,"start",*common,"--order","2","--task","B","--condition","D")
    for step in (1,2):
        key=f"step{step}"
        group_args=["--opportunity","pipeline","--step-reason","two frozen stages"]
        if step==1:
            group_args+=["--planned-calls",2]
        run(multi,*seal_args(key,1,req2),*group_args)
        ack_step,hist_step,out_step=fake_backend(w,key,g2,1)
        run(multi,"receive","--id",key,"--status","success","--ack",ack_step,"--history",hist_step,"--output",out_step[0])
    run(multi,"present","--candidate","step1/1","--status","not-shown","--reason","intermediate result")
    run(multi,"present","--candidate","step2/1","--status","shown","--now","--reason","final display")
    run(multi,"decide","keep","--candidate","step2/1","--reason","software decision")
    run(multi,"close","--reason","finished")
    two_steps=json.loads(run(multi,"report"))
    assert (two_steps["recorded_opportunities"],two_steps["dispatch_evidenced_calls"],
            two_steps["returned_images"],two_steps["shown_candidates"])==(1,2,2,1)

    legacy=w/"legacy.db"
    with sqlite3.connect(db) as source, sqlite3.connect(legacy) as old:
        source.backup(old)
        old.execute("DELETE FROM event WHERE kind='presentation'")
        for rowid,raw in old.execute("SELECT id,data FROM event WHERE kind='sealed'").fetchall():
            data=json.loads(raw)
            for key in ("opportunity","planned_calls","step_reason"):
                del data[key]
            old.execute("UPDATE event SET data=? WHERE id=?",(json.dumps(data),rowid))
        sess=json.loads(old.execute("SELECT data FROM session").fetchone()[0])
        sess["schema"]="design-study/c2-capture-v1"
        del sess["opportunity_limit"]
        old.execute("UPDATE session SET data=?",(json.dumps(sess),))
    source.close()
    old.close()
    historical=json.loads(run(legacy,"report"))
    assert historical["recorded_opportunities"]==1 and historical["opportunity_assignment"]=="original_call_ids_only"
    assert historical["shown_candidates"]==0 and len(historical["presentation_status_unknown"])==2
    old_pair=json.loads(run(legacy,"pair",other,reject="pair differs"))
    assert not old_pair["checks"]["presentation_for_timing"] and not old_pair["checks"]["prospective_opportunities"]
    from blind_candidates import prepare
    from zipfile import ZipFile
    from io import BytesIO
    from hashlib import sha256
    packet = w/"blinded"
    unique, occurrences = prepare([db, other], packet)
    assert (unique, occurrences) == (2, 3)
    key = json.loads((packet/"researcher-only.json").read_bytes())
    with ZipFile(packet/"reader.zip") as archive:
        assert sorted(archive.namelist()) == ["C001.png", "C002.png"]
        for code, record in key["images"].items():
            data = archive.read(code+".png")
            assert sha256(data).hexdigest() == record["reader_sha256"]
            with Image.open(BytesIO(data)) as image:
                assert not image.info and image.size == (8,8)
    assert sorted(s["condition"] for s in key["sessions"]) == ["D","S"]
    assert sum(len(s["failed_calls"]) for s in key["sessions"]) == 1
    print(json.dumps({"mode":"software_control","pr75_c2_eligible_exports":len(cfgs),
          "structured_candidates":s["returned_images"],"free_candidates":rep["returned_images"],
          "tested":["mismatched image set","duplicate attempt","missing original output","invalid candidate",
                    "rollback","free mode isolation","unknown resolution","failed retry","wrong receipt",
                    "paired conditions and different briefs","duplicate condition rejected",
                    "clock absent/discrepant: outputs retained, pair pending",
                    "post-close source reconciliation leaves timing fixed",
                    "1 reserved/10 returned: retained 10; next planned submission withheld",
                    "receipt separately from display and active time", "one displayed and one still unknown",
                    "known display with missing time and later independent display record", "explicitly not shown",
                    "two prospectively declared calls per opportunity, with failure and success paths", "reject unplanned continuation",
                    "nine opportunities including failed submissions; tenth refused", "sparse extra call retained",
                    "reconcile unknown extra image count without promoting unverifiable call",
                    "v1 report retains unknown visibility and unverified opportunity grouping",
                    "v1/v2 pair flags missing timing and grouping evidence",
                    "externally reported tenth opportunity and partial output retained separately",
                    "three candidate occurrences of two images: pixel-only reader archive and separate research key"],
          "live_calls":0,"author_pilot_sessions":0},ensure_ascii=False,indent=2))


if __name__=="__main__":
    import os
    ENV=dict(os.environ,PYTHONUTF8="1",PYTHONDONTWRITEBYTECODE="1")
    p=argparse.ArgumentParser();p.add_argument("pr75",type=Path)
    a=p.parse_args()
    with TemporaryDirectory() as d:
        check(a.pr75.resolve(),Path(d))
