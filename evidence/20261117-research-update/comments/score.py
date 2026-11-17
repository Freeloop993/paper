"""Score one complete blind questionnaire, using two finite-population strata."""
import argparse, json
from pathlib import Path
from functools import lru_cache
from scipy.stats import hypergeom
from build import TOPICS

@lru_cache(None)
def interval(x,n,N):
    # Invert two-sided hypergeometric tests; 97.5% per stratum for a joint 95% bound.
    possible=[K for K in range(x,N-n+x+1) if hypergeom.sf(x-1,N,K,n)>=.0125 and hypergeom.cdf(x,N,K,n)>=.0125]
    return [min(possible),max(possible)]

def score(key,data):
    if data['version']!='S2-20261117-a' or data['complete'] is not True:raise ValueError('需要本版完整答卷')
    rows=data['answers']
    if set(rows)!=set(key) or len(rows)!=150:raise ValueError('答卷条目不全或有多余项')
    for r in rows.values():
        tags=r['topics']
        if r['scope'] not in ('涉及','未涉及','信息不足') or not isinstance(tags,list) or not tags or len(set(tags))!=len(tags) or not set(tags)<=set(TOPICS+['以上均未提到']) or ('以上均未提到' in tags and len(tags)>1): raise ValueError('答案取值有误')
    buckets={s:[rows[k] for k in key if key[k]['layer']==s] for s in ('A','U')}
    if [len(buckets[s]) for s in ('A','U')]!=[50,100]:raise ValueError('对应键不符')
    def measure(fn):
        x,y=[sum(fn(r) for r in buckets[s]) for s in ('A','U')]
        lo1,hi1=interval(x,50,228);lo2,hi2=interval(y,100,1090)
        return {'retained_x_of_50':x,'excluded_x_of_100':y,'weighted_proportion':(228*x/50+1090*y/100)/1318,'conservative_95_bounds':[(lo1+lo2)/1318,(hi1+hi2)/1318]}
    out={s:measure(lambda r:r['scope']==s) for s in ['涉及','信息不足']}
    out['themes']={t:measure(lambda r:t in r['topics']) for t in TOPICS}
    a,u=out['涉及']['retained_x_of_50'],out['涉及']['excluded_x_of_100']
    out['confirmed_appearance']={'retained_positive_rate':a/50,'excluded_positive_rate':u/100,'estimated_recall':(4.56*a/(4.56*a+10.90*u) if a+u else None)}
    return out
if __name__=='__main__':
    p=argparse.ArgumentParser()
    for k in ['private_key','response']:p.add_argument(k,type=Path)
    a=p.parse_args()
    print(json.dumps(score(json.loads(a.private_key.read_bytes()),json.loads(a.response.read_bytes())),ensure_ascii=False,indent=2))
