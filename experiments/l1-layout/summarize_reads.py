"""Summarize L1 independent reader returns without assigning missing votes."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from statistics import mean

HERE = Path(__file__).resolve().parent
RUBRIC = [["像产品图","介于两者之间","像示意图"], ["能，位置明确","大概能","不能"],
          ["有过渡","不明显","直杆"], ["有","无","看不清"]]


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def save(path, value):
    path.write_bytes((json.dumps(value,ensure_ascii=False,indent=2)+"\n").encode())


def point(p):
    if p is not None:
        assert isinstance(p,list) and len(p)==2
        assert all(type(v) in (int,float) and math.isfinite(v) and 0<=v<1024 for v in p)
    return p


def measure(row, target):
    hubs = [point(p) for p in row["hubs"]]
    tips = [[point(t) for t in pair] for pair in row["tips"]]
    assert len(row["blades"]) == len(hubs) == len(tips) == 4
    assert all(len(pair)==2 for pair in tips)
    assert all(n is None or (type(n) is int and n>=0) for n in row["blades"])
    if None in hubs or row["motor_count"] != 4 or len(set(map(tuple,hubs))) != 4:
        return None,None,None
    # Reader order TL, TR, BR, BL; frozen guide order BR, BL, TL, TR.
    expected = [target[i] for i in (2,3,0,1)]
    err = mean(math.dist(a,b) for a,b in zip(hubs,expected))/600
    xs, ys = zip(*hubs)
    wl = (max(xs)-min(xs))/(max(ys)-min(ys)) if max(ys)>min(ys) else None
    d = mean((math.dist(hubs[0],hubs[2]),math.dist(hubs[1],hubs[3])))
    dd = None
    if d and row["blades"]==[2]*4 and all(None not in t for t in tips):
        dd = mean(math.dist(a,b) for a,b in tips)/d
    return err, wl, dd


def summarize(evidence, private, human=None):
    manifest = read(HERE/"manifest.json")
    guides = {r["wl"]:r["hubs_px"] for r in read(HERE/"guides.json") if r["kind"]=="line"}
    cases = {r["position"]:r for r in manifest}
    output = evidence/"readings"
    output.mkdir(exist_ok=True)
    observations = []
    for reader in ["A","B"]+(["H"] if human else []):
        mapping = read(private/("mapping-"+reader+".json"))
        source = human if reader=="H" else private/reader/"readings.json"
        if reader=="H":
            form = read(source)
            assert form["pack"]==hashlib.sha256(json.dumps(mapping,sort_keys=True).encode()).hexdigest()[:24]
            raw = {r["code"]:r for r in form["rows"]}
        else:
            raw = read(source)
        assert set(raw)==set(mapping) and len(raw)==28
        for code, mark in raw.items():
            row = cases[mapping[code]]
            answers = mark["answers"]
            assert len(answers)==4 and all(a in levels for a,levels in zip(answers,RUBRIC))
            err,wl,dd = (None,None,None) if reader=="H" else measure(mark,guides[row["wl"]])
            observations.append(dict(reader=reader, code=code, position=row["position"], group=row["condition"],target_wl=row["wl"],
                         normalized_error=err,wl=wl,dd=dd,residue=answers[-1],scores=[2-RUBRIC[i].index(answers[i]) for i in range(3)]))
        (output/("reader-"+reader+".json")).write_bytes(source.read_bytes())
        save(output/("key-"+reader+".json"),mapping)
    grouped = {}
    for c in "ABCDEFG":
        results = {}
        for reader in sorted({o["reader"] for o in observations}):
            rows = [o for o in observations if o["group"]==c and o["reader"]==reader]
            errors = [r["normalized_error"] for r in rows]
            means = []
            for wl in (.7,1.3):
                v = [r["wl"] for r in rows if r["target_wl"]==wl]
                means.append(mean(v) if None not in v else None)
            ok = None if reader=="H" else (all(x is not None and x<=.05 for x in errors) and None not in means and means[1]>means[0])
            marks = [r["residue"] for r in rows]
            results[reader]=dict(max_offset=max(errors) if None not in errors else None,
                                 readable=sum(x is not None for x in errors) if reader!="H" else None,
                                 wl_means=means, geometry_pass=ok, residue_yes=marks.count("有"), residue_unclear=marks.count("看不清"),
                                 residue_excluded=marks.count("有")>=2, scores=[mean(r["scores"][i] for r in rows) for i in range(3)])
        grouped[c]=results
    save(output/"summary.json",dict(human_forms=int(bool(human)), observed=observations,groups=grouped))
    return grouped


if __name__=="__main__":
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("evidence",type=Path)
    ap.add_argument("private",type=Path)
    ap.add_argument("--human",type=Path)
    args=ap.parse_args()
    print(json.dumps(summarize(args.evidence,args.private,args.human),ensure_ascii=False,indent=2))
