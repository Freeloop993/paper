"""Run local software controls with the tracked PR75 export; creates no model calls."""
import argparse
from pathlib import Path
from tempfile import TemporaryDirectory
import json
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
    run(db,"decide","keep","--candidate","s/9","--reason","fixture",reject="actual candidate")
    run(db,"decide","keep","--candidate","s/2","--reason","second control")
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
    print(json.dumps({"mode":"software_control","pr75_c2_eligible_exports":len(cfgs),
          "structured_candidates":s["returned_images"],"free_candidates":rep["returned_images"],
          "tested":["mismatched image set","duplicate attempt","missing original output","invalid candidate",
                    "rollback","free mode isolation","unknown resolution","failed retry","wrong receipt",
                    "paired conditions and different briefs","duplicate condition rejected",
                    "clock absent/discrepant: outputs retained, pair pending",
                    "post-close source reconciliation leaves timing fixed",
                    "1 reserved/10 returned: retained 10; next planned submission withheld"],
          "live_calls":0,"author_pilot_sessions":0},ensure_ascii=False,indent=2))


if __name__=="__main__":
    import os
    ENV=dict(os.environ,PYTHONUTF8="1",PYTHONDONTWRITEBYTECODE="1")
    p=argparse.ArgumentParser();p.add_argument("pr75",type=Path)
    a=p.parse_args()
    with TemporaryDirectory(dir=SCRIPT.parent) as d:
        check(a.pr75.resolve(),Path(d))
