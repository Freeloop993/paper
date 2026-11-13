from pathlib import Path
from collections import Counter
import hashlib, json, sys
import numpy as np
from visual_measure import files, aux, guides, sc, picked, profiles
def write_rows():
    cats=json.loads((aux/'observations.json').read_text(encoding='utf-8-sig'))
    offsets=np.loadtxt(aux/'hub_offsets.txt',encoding='utf-8-sig',dtype=int).reshape(36,4,2)
    rows=[]
    for n,f in enumerate(files,1):
        g=guides[str(n)]
        c=cats[str(n)]
        hubs=np.rint(picked(n)[0]).astype(int)+offsets[n-1]
        widths=[int(b-a) for a,b,*_ in profiles(n)]
        r=dict(id=f.stem,body_plan=c['bp'],arm_root=c['ar'],camera=c['cam'],camera_v2=c['cv'],cover=c['cover'],
               shell_L=round((g[1]-g[0])/sc),shell_B=None if c['flag']=='B' else round((g[3]-g[2])/sc),
               hubs=hubs.tolist(),widths=widths,blades=list(map(int,c['bl'])),guard='no',residue=c['res'],quality='product',note=c['note'])
        rows.append(r)
    Path('readings.jsonl').write_bytes(('\n'.join(json.dumps(r,ensure_ascii=False,separators=(',',':')) for r in rows)+'\n').encode('utf-8'))
def check():
    blob=Path('readings.jsonl').read_bytes()
    rows=[json.loads(line) for line in blob.decode('utf-8').splitlines()]
    order='id body_plan arm_root camera camera_v2 cover shell_L shell_B hubs widths blades guard residue quality note'.split()
    cats={'body_plan':'pod box U','arm_root':'seamless socket hinge U','camera':'inside projecting U','camera_v2':'consistent invisible wrong U','cover':'single multi U','guard':'yes no U','residue':'yes no U','quality':'product middle diagram'}
    ids=[p.stem for p in Path('.').glob('*.png')]
    assert len(rows)==len(set(ids))==36 and Counter(r['id'] for r in rows)==Counter(ids)
    for r in rows:
        assert list(r)==order
        assert all(r[k] in v.split() for k,v in cats.items())
        assert all(r[k] is None or type(r[k]) is int and 0<r[k]<1024 for k in ['shell_L','shell_B'])
        assert all(len(r[k])==4 for k in ['hubs','widths','blades'])
        assert all(p is None or len(p)==2 and all(type(v) is int and 0<=v<1024 for v in p) for p in r['hubs'])
        assert all(x is None or type(x) is int and 0<x<1024 for k in ['widths','blades'] for x in r[k])
        h=r['hubs']
        assert h[0][0]<h[1][0] and h[3][0]<h[2][0] and h[0][1]<h[3][1] and h[1][1]<h[2][1]
        assert r['note'].strip()
    print(len(rows),'unique rows;',sum(r['shell_B'] is None for r in rows),'unreadable shell widths')
    print(hashlib.sha256(blob).hexdigest())
if __name__=='__main__':
    if sys.argv[1]=='write':write_rows()
    check()

