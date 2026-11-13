"""Recompute descriptive layout statistics from the frozen pixel clicks; do not rescore first round."""
import csv,json
from pathlib import Path
from statistics import mean,median
ROOT=Path(__file__).resolve().parent
old=ROOT.parent/'round-1'
def summary(values):
    return dict(mean=mean(values),median=median(values),minimum=min(values),maximum=max(values))
rows=list(csv.DictReader((old/'by-image.csv').open(encoding='utf-8-sig')))
layout=[]
for r in rows:
    tl,tr,br,bl=json.loads(r['hubs'])
    width=((tr[0]-tl[0])+(br[0]-bl[0]))/2
    length=((bl[1]-tl[1])+(br[1]-tr[1]))/2
    layout.append(dict(slot=r['slot'],width=width,length=length,WL=width/length,share=width/1024))
with (ROOT/'sections.csv').open(encoding='utf-8-sig') as f:
    sections=list(csv.DictReader(f))
stats=dict(WL=summary([r['WL'] for r in layout]),share=summary([r['share'] for r in layout]),L_B50={},shift5px=max(abs(int(r[k])-int(r['B50_px'])) for r in sections for k in ['B_minus5','B_plus5']),residuals={})
stats['length_relative_to_hubs']={}
for label in ['1.4','1.8','2.4']:
    vals=[float(r['L_B50']) for r in sections if r['slot'].startswith('G-r'+label)]
    stats['L_B50'][label]=summary(vals)
    rs=[r for r in rows if r['condition']=='G-r'+label]
    stats['length_relative_to_hubs'][label]=dict(input=50*float(label)/250,output=[int(r['shell_L'])/float(r['D_px']) for r in rs],mean=mean(int(r['shell_L'])/float(r['D_px']) for r in rs))
for cond in ['S0','S2','S4','G-w10','G-w15','G-w20','G-r1.4','G-r1.8','G-r2.4']:
    stats['residuals'][cond]=[r['slot'] for r in rows if r['condition']==cond and r['residue']=='yes']
(ROOT/'descriptives.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(stats)
