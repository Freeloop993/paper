"""Apply the frozen G2 scoring rule to each sealed reader separately."""
from pathlib import Path
import hashlib,json,math,sys
from statistics import mean
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
G2=ROOT/'experiments/g2-control'
sys.path.insert(0,str(G2))
from measure import report
def read(p):return json.loads(p.read_bytes())
def save(p,v):p.write_bytes((json.dumps(v,indent=2,ensure_ascii=False)+'\n').encode())
def main():
    dest=HERE;key=read(dest/'blind-key.json')
    scores={};points={}
    for name in ('A','B'):
        f=HERE/('reading-'+name+'.json');raw=read(f)
        cases=raw['cases'];assert set(cases)=={k['id'] for k in key}
        joint={}
        for k in key:
            item=cases[k['id']];p=item['points'];assert isinstance(p,list) and len(p)==4
            assert all(q is None or (type(q)==list and len(q)==2 and all(type(v)==int and 0<=v<1024 for v in q)) for q in p)
            assert len({tuple(q) for q in p if q is not None})==sum(q is not None for q in p)
            points[name,k['case']]=p;joint[k['case']]=None if None in p else p
        result=report(joint)
        blocks=list(result['strict_monotonic_by_seed'].values());unreadable=result['unreadable']
        if result['all_six_within_and_both_strict']:label='通过'
        elif unreadable>=2 or blocks==[False,False]:label='失败'
        elif unreadable:label='证据不足'
        elif any(blocks):label='部分'
        else:label='失败'
        result.update(reader=name,reader_sha256=hashlib.sha256(f.read_bytes()).hexdigest(),conclusion_under_this_reading=label)
        scores[name]=result
    distances=[]
    for k in key:
        c=k['case'];delta=[math.dist(a,b) if a is not None and b is not None else None for a,b in zip(points['A',c],points['B',c])]
        distances.append(dict(case=c,per_hub_px=delta))
    save(dest/'scored.json',dict(readers=scores,between=distances,independent_human_readings_at_report=0))
    for name,r in scores.items():
        print(name,r['conclusion_under_this_reading'],r['strict_monotonic_by_seed'],[(q['case'],round(q['ratio'],4) if q['ratio'] is not None else None) for q in r['rows']])
    vals=[float(v) for r in distances for v in r['per_hub_px'] if v is not None];print(len(vals),mean(vals) if vals else None,max(vals) if vals else None)
if __name__=='__main__':main()
