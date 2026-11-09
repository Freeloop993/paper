"""Paired reading differences and original target errors in image pixels."""
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

folder=Path(__file__).resolve().parent
data=json.loads((folder/"comparison.json").read_bytes())
rows=data["cases"]
fig,(a,b)=plt.subplots(1,2,figsize=(9.4,4.3),layout="constrained")
for i,r in enumerate(rows):
    for j,v in enumerate(r["paired_distances_px"]):
        a.plot(v,i+(j-1.5)*.085,"o",color="#257A79",ms=4)
    b.plot(r["first"]["mean_px"],i-.10,"o",ms=5,mfc="white",mec="#404B63",label="First AI reading" if i==0 else None)
    b.plot(r["second"]["mean_px"],i+.10,"s",ms=4,color="#257A79",label="Independent AI reading" if i==0 else None)
limit=.03*(424**2*2)**.5
b.axvline(limit,color="#ba612b",ls="--",lw=1.3,label="Mean-error limit (17.99 px)")
for ax in (a,b):
    ax.set_yticks(range(len(rows)),[r["case"].replace('S1-','') for r in rows])
    ax.set_ylim(len(rows)-.5,-.5);ax.set_axisbelow(True);ax.grid(axis='x',alpha=.2)
    ax.spines[['top','right']].set_visible(False)
a.set_xlim(-.3,7);b.set_xlim(0,120)
a.set_title("Distance between AI readings",loc="left");b.set_title("Mean distance to target",loc="left")
a.set_xlabel("Corresponding shaft centre (px)");b.set_xlabel("Four centres per image (px)")
b.legend(loc="lower left",fontsize=8)
fig.savefig(folder/"paired-distances.png",dpi=165)
