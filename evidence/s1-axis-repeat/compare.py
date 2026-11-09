"""Recalculate matched centre distances from S1's retained first and independent readings."""
import hashlib
import json
import math
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ORDER = ["upper_left","upper_right","lower_left","lower_right"]


def metrics(points, targets, limits):
    diagonal = math.dist(targets[0], targets[3])
    errors = [math.dist(c, t) for c, t in zip(points, targets)]
    a,b,c,d = points
    ratio = ((c[1]-a[1])+(d[1]-b[1]))/((b[0]-a[0])+(d[0]-c[0]))
    avg = statistics.mean(errors)
    return dict(mean_px=avg,max_px=max(errors),mean_norm=avg/diagonal,max_norm=max(errors)/diagonal,
                ratio_vh=ratio,coordinate_pass=avg/diagonal<=limits["mean_hub_error_max"] and
                max(errors)/diagonal<=limits["max_hub_error_max"] and abs(ratio-1)<=limits["ratio_abs_error_max"])


def run():
    reads=json.loads((ROOT/"paired-input.json").read_bytes())
    independent=json.loads((ROOT/"independent.json").read_bytes())["cases"]
    rows=[]
    for src in sorted(reads["cases"],key=lambda x:x["case"]):
        a=src["first_points"]
        b=independent[src["blind_id"]]["points"]
        if not (len(a)==len(b)==4 and all(len(p)==2 for p in a+b)):
            raise ValueError("Missing centres require an explicit coverage report")
        png=ROOT/"originals"/(src["case"]+".png")
        if hashlib.sha256(png.read_bytes()).hexdigest()!=src["original_sha256"]:
            raise ValueError("Original PNG mismatch")
        baseline=metrics(a,reads["targets"],reads["thresholds"])
        repeat=metrics(b,reads["targets"],reads["thresholds"])
        assert math.isclose(baseline["mean_px"],src["first_recorded_mean_px"]) and baseline["coordinate_pass"]==src["first_recorded_gate"]
        pair=[math.dist(i,j) for i,j in zip(a,b)]
        rows.append(dict(case=src["case"],blind_id=src["blind_id"],paired_distances_px=pair,
                         mean_between_px=statistics.mean(pair),max_between_px=max(pair),
                         mean_target_delta_px=repeat["mean_px"]-baseline["mean_px"],
                         first=baseline,second=repeat,front_up_first=src["first_front_up"],
                         front_up_second=independent[src["blind_id"]]["front_up"]))
    flat=[n for r in rows for n in r["paired_distances_px"]]
    return dict(point_order=ORDER,unit="px on 1024 square",count=len(flat),
                mean_between_px=statistics.mean(flat),median_between_px=statistics.median(flat),
                max_between_px=max(flat),first_passes=sum(r["first"]["coordinate_pass"] for r in rows),
                second_passes=sum(r["second"]["coordinate_pass"] for r in rows),cases=rows)


if __name__=="__main__":
    print(json.dumps(run(),ensure_ascii=False,indent=2))
