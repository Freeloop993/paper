"""Unregistered pixel differences and their exact LS translation / scale / residual partition."""
import json, math
from pathlib import Path
from statistics import mean
P=Path(__file__).resolve().parent
def read(p): return json.loads(p.read_bytes())
def fit(t,o):
    if len(t)!=len(o) or any(v is None for v in o): return None
    centroid=lambda a: tuple(map(mean,zip(*a)))
    c,d=centroid(t),centroid(o)
    cent=lambda a,c:[(x-c[0],y-c[1]) for x,y in a]
    a,b=cent(t,c),cent(o,d)
    e=mean(x*x+y*y for x,y in a)
    s=mean(x*u+y*v for (x,y),(u,v) in zip(a,b))/e
    res=[math.dist((s*x,s*y),(u,v)) for (x,y),(u,v) in zip(a,b)]
    err=[math.dist(x,y) for x,y in zip(t,o)]
    ds=math.dist(c,d); mse=mean(x*x for x in err)
    components=[ds**2,(s-1)**2*e,mean(x*x for x in res)]
    assert math.isclose(sum(components),mse,rel_tol=1e-10,abs_tol=1e-8)
    ul,ur,ll,lr=o
    return dict(centroid=d,shift_xy=[v-u for u,v in zip(c,d)],shift_px=ds,scale=s,
                residual_mean_px=mean(res),residual_rms_px=math.sqrt(components[-1]),
                raw_mean_px=mean(err),raw_max_px=max(err),mse_components_px2=components,
                scale_share_mse=components[1]/mse if mse else None,
                ratio_vh=((ll[1]-ul[1])+(lr[1]-ur[1]))/((ur[0]-ul[0])+(lr[0]-ll[0])))
def main():
    p=P.parent/'s1-axis-repeat'
    a=read(p/'paired-input.json');b=read(p/'independent.json')['cases'];g=read(P/'executed-graphs.json')['cases']
    first=read(p/'comparison.json')['cases'];rows=[]
    for k in sorted(a['cases'],key=lambda r:r['case']):
        c=k['case']; f=next(v for v in first if v['case']==c)
        for field,points in [('first',k['first_points']),('second',b[k['blind_id']]['points'])]:
            z=fit(a['targets'],points);assert math.isclose(z['raw_mean_px'],f[field]['mean_px'])
            rows.append(dict(case=c,route=c[-1],seed=g[c]['graph']['10']['inputs']['seed'],reader=field,**z))
    olds=[{**{k:r[k] for k in ('case','reader','seed','condition','body_ratio_target')},'fit':fit(r['targets'],r['observed'])} for r in read(P/'main18-input.json')]
    assert len(rows)==12 and len(olds)==36
    return dict(s1=rows,main18=olds)
if __name__=='__main__': print(json.dumps(main(),ensure_ascii=False,indent=2))
