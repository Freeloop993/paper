import hashlib,json,math,sys
from pathlib import Path
from statistics import mean
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
def read(p):return json.loads(p.read_bytes())
def save(p,obj):p.write_bytes((json.dumps(obj,indent=2,ensure_ascii=False)+'\n').encode())
def main():
    folder=ROOT/'evidence/g2b-actual';key=read(folder/'blind-key.json')
    targets=[[300,300],[724,300],[300,724],[724,724]]
    cases={}
    for reader in ('A','B'):
        path=folder/('reader-'+reader+'.json');data=read(path)['cases']
        assert set(data)==set(r['blind'] for r in key)
        for r in key:
            c=r['case'];item=data[r['blind']];pts=item['points'];assert len(pts)==4
            for q in pts:
                assert q is None or (len(q)==2 and all(type(v)==int and 0<=v<1024 for v in q))
            flags=[item[k] for k in ('body_connected_all_four','copied_flat_marks','readable_as_drone')]
            assert all(type(v)==bool or v is None for v in flags)
            ok=all(q is not None for q in pts) and flags==[True,False,True]
            err=mean(math.dist(x,y) for x,y in zip(pts,targets)) if all(q is not None for q in pts) else None
            cases.setdefault(c,{})[reader]=dict(usable=ok,mean_target_px=err)
    eligible=sorted((mean(a['mean_target_px'] for a in v.values()),k) for k,v in cases.items() if len(v)==2 and all(a['usable'] for a in v.values()))
    result=dict(cases=cases,eligible=eligible,selected=eligible[0][1] if eligible else None,human_records_received=0)
    save(folder/'result.json',result);print(json.dumps(result))
if __name__=='__main__':main()
