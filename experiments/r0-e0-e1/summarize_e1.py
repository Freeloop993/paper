"""Compute the frozen per-arm/factor readouts from independent, native RGB readings."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from statistics import mean, median, stdev

from blind_pack import HERE, rank, selection


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def xy(point):
    if point is None:
        return None
    if (not isinstance(point, list) or len(point) != 2 or
            any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v < 1024 for v in point)):
        raise ValueError(f"Invalid image coordinate {point!r}")
    return point


def metrics(mark):
    hubs = [xy(p) for p in mark["hubs"]]
    tips = [[xy(p) for p in two] for two in mark["tips"]]
    if len(hubs)!=4 or len(tips)!=4 or any(len(t)!=2 for t in tips):
        raise ValueError("Expected four hub slots and two tip slots per hub")
    result = {"wl":None, "dd":None}
    if None in hubs or len(set(map(tuple, hubs))) != 4:
        return result
    xs,ys=zip(*hubs)
    if max(ys)>min(ys):
        result["wl"] = (max(xs)-min(xs))/(max(ys)-min(ys))
    if any(p is None for two in tips for p in two):
        return result
    opposite = mean([math.dist(hubs[0],hubs[2]),math.dist(hubs[1],hubs[3])])
    if opposite and all(math.dist(a,b)>0 for a,b in tips):
        result["dd"] = mean(math.dist(a,b) for a,b in tips)/opposite
    return result


def analyze(root, human_file=None):
    inputs = read(HERE/"manifest.json")["cases"]
    planned = [r for r in inputs if r["stage"] in ("E0","E1") and r["arm"]!="closed"]
    batch = {r["stage"]:root/("e"+r["stage"][1]+"-open-20261112") for r in planned}
    marks = {}
    for stage, d in batch.items():
        marks[stage] = {reader:read(d/f"reader-{reader}.json") for reader in ("A","B")}
        for reader,pack in marks[stage].items():
            expected = {rank("AI-"+reader,r["case"])[:16]+".png" for r in planned if r["stage"]==stage}
            if set(pack) != expected:
                raise ValueError(f"Coverage mismatch for {stage} reader {reader}")
    sample = selection(inputs)
    human = {}
    if human_file:
        response=read(human_file)
        human_keys={rank("human",c)[:16]+".png":c for c in sample}
        ids=[]
        for stage, directory in batch.items():
            idx=read(directory/"index.json")
            ids.extend((rank("human",c)[:16],idx[c]["sha256"]) for c in sample if c in idx)
        fingerprint=hashlib.sha256(json.dumps(sorted(ids)).encode()).hexdigest()
        if (response.get("schema")!="topview-point-reader-v1" or response.get("pack")!=fingerprint
                or not response.get("ended") or response.get("exposure")!={"labels":"未看过","ai":"未看过"}):
            raise ValueError("Need the matching finished independent human form; retain exposed returns separately")
        if len(response["rows"])!=len(sample) or {x["image"] for x in response["rows"]}!=set(human_keys):
            raise ValueError("Unexpected human sample")
        human={human_keys[row["image"]]:metrics(row) for row in response["rows"]}
    rows=[]
    for p in planned:
        case=p["case"];stage=p["stage"]
        a,b=[metrics(marks[stage][reader][rank("AI-"+reader,case)[:16]+".png"]) for reader in ("A","B")]
        mid={k:mean((a[k],b[k])) if a[k] is not None and b[k] is not None else None for k in ("wl","dd")}
        value = mid[p["factor"]]
        deviation = value - p["level"] if value is not None else None
        rows.append({"case":case,"stage":stage,"arm":p["arm"],"factor":p["factor"],"level":p["level"],
                     "repeat":p["repeat"],"A":a,"B":b,"paired":mid,"human":human.get(case),
                     "factor_deviation":deviation,
                     "factor_hit_0_10":abs(deviation)<=0.10+1e-12 if deviation is not None else None})
    errors={}
    for metric in ("wl","dd"):
        ab=[abs(r["A"][metric]-r["B"][metric]) for r in rows if r["paired"][metric] is not None]
        ah=[abs(r["paired"][metric]-r["human"][metric]) for r in rows if r["human"] is not None
            and r["human"][metric] is not None and r["paired"][metric] is not None]
        a_error=median(ab) if ab else None; h_error=median(ah) if ah else None
        # An incomplete human calibration stays visible alongside descriptive medians.
        err=max(a_error,h_error) if a_error is not None and len(ah)==len(sample) else None
        errors[metric]={"ai_pairs":len(ab),"median_AI_difference":a_error,"human_pairs":len(ah),
                        "planned_human":len(sample),"median_AI_human_difference":h_error,"calibrated_error":err}
    wl_h=errors["wl"]["median_AI_human_difference"]
    expand = wl_h>0.05 if len(human)==len(sample) and errors["wl"]["human_pairs"]==len(sample) else None
    results=[]
    for arm in ("control","text"):
        for metric in ("wl","dd"):
            pool=[r for r in rows if (r["stage"],r["arm"],r["factor"])==("E1",arm,metric)]
            strata=[]
            for level in sorted({r["level"] for r in pool}):
                selected=[r for r in pool if r["level"]==level]
                values=[r["paired"][metric] for r in selected if r["paired"][metric] is not None]
                hits=sum(abs(v-level)<=0.10+1e-12 for v in values)
                strata.append({"level":level,"total":len(selected),"readable":len(values),
                               "missing":len(selected)-len(values),"mean":mean(values) if values else None,
                               "sample_sd":stdev(values) if len(values)>1 else None,"hits":hits,
                               "hit_rate_all_slots":hits/len(selected),"hit_rate_readable":hits/len(values) if values else None})
            means=[s["mean"] for s in strata]
            adj=[b-a for a,b in zip(means,means[1:])] if None not in means else []
            err=errors[metric]["calibrated_error"]
            results.append({"arm":arm,"factor":metric,"levels":strata,"adjacent_differences":adj,
                 "strictly_increasing":all(d>0 for d in adj) if adj else None,
                 "passes_twice_calibrated_error":all(d>2*err for d in adj) if adj and err is not None and expand is False else None})
    return {"schema":"e1-independent-geometry-v1","human_forms":int(bool(human)),
            "human_full_read_triggered":expand,"measurement_error":errors,
            "geometry":results,"per_image":rows}


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("evidence",type=Path)
    parser.add_argument("--human",type=Path)
    args=parser.parse_args()
    print(json.dumps(analyze(args.evidence,args.human),ensure_ascii=False,indent=2))
