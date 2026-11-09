"""Score one sealed reader at a time. CLI: python measure.py reader.json (no model calls)."""
import json,math,sys
from pathlib import Path
from statistics import mean
P=Path(__file__).resolve().parent
def read(p):return json.loads(p.read_bytes())
def spans(a):return [max(v)-min(v) for v in zip(*a)]
def qualify(points):
    return (isinstance(points,list) and len(points)==4 and all(isinstance(p,list) and len(p)==2 and all(type(v)==int and 0<=v<1024 for v in p) for p in points) and len(set(map(tuple,points)))==4)
def vec(a):return sorted(sorted(a,key=lambda p:p[1])[:2])+sorted(sorted(a,key=lambda p:p[1])[2:])
def report(dataset):
    manifest=read(P/'manifest.json')['cases']; ids={i['case'] for i in manifest}
    if set(dataset)!=ids:raise ValueError('supply exactly the registered cases; null means missing')
    rows=[]
    for c in manifest:
        pts=dataset[c['case']];r={'case':c['case'],'seed':c['seed'],'target':c['level'],'readable':False,'ratio':None}
        if pts is not None and not qualify(pts):raise ValueError('invalid coordinates')
        if pts is not None:
            t=vec(c['targets']);o=pts # recorded UL UR LL LR, never reorder observed geometry to improve a fit
            w,h=spans(o)
            if h==0 or w==0:raise ValueError('degenerate span')
            obs=(w/h)/c['base_wh'];errors=[math.dist(p,q) for p,q in zip(o,t)]
            cent=lambda a: list(map(mean,zip(*a)));tc,oc=cent(t),cent(o)
            tc0=[(x-tc[0],y-tc[1]) for x,y in t];oc0=[(x-oc[0],y-oc[1]) for x,y in o]
            s=sum(x*u+y*v for (x,y),(u,v) in zip(tc0,oc0))/sum(x*x+y*y for x,y in tc0)
            diag=max(math.dist(i,j) for i in t for j in t)
            # S1-style no-registration absolute gate, generalized to each layout's own V/H, not r.
            vh=lambda q: ((q[2][1]-q[0][1])+(q[3][1]-q[1][1]))/((q[1][0]-q[0][0])+(q[3][0]-q[2][0]))
            s1=[[300,300],[724,300],[300,724],[724,724]]
            literal=[math.dist(x,y) for x,y in zip(o,s1)];den=math.dist(s1[0],s1[3])
            r['literal_s1_square_gate']=mean(literal)/den<=.03 and max(literal)/den<=.05 and abs(vh(o)-1)<=.1
            r.update(readable=True,ratio=obs,abs_error=abs(obs-c['level']),scale=s,shift_xy=[v-u for u,v in zip(tc,oc)],residual_mean_px=mean(math.dist((s*x,s*y),b) for (x,y),b in zip(tc0,oc0)),mean_px=mean(errors),max_px=max(errors),s1_style_gate=mean(errors)/diag<=.03 and max(errors)/diag<=.05 and abs(vh(o)-vh(t))<=.10)
        rows.append(r)
    blocks={}
    for seed in sorted({r['seed'] for r in rows}):
        a=sorted((r for r in rows if r['seed']==seed),key=lambda r:r['target'])
        blocks[seed]=all(i['ratio']<j['ratio'] for i,j in zip(a,a[1:])) if all(r['readable'] for r in a) else None
    return dict(rows=rows,strict_monotonic_by_seed=blocks,all_six_within_and_both_strict=all(r.get('abs_error',1) <=.10 for r in rows) and all(v is True for v in blocks.values()),unreadable=sum(not r['readable'] for r in rows))
if __name__=='__main__':print(json.dumps(report(read(Path(sys.argv[1]))),indent=2))
