"""Private local processing. Only publish authorized aggregates, never the raw response."""
import hashlib,json,math,re,sys
from pathlib import Path
from statistics import mean
P=Path(__file__).resolve().parent;E=P.parents[1]/'evidence/s1-axis-repeat';sys.path.insert(0,str(E))
from compare import metrics
def read(p):return json.loads(p.read_bytes())
def score(packet):
    if packet.get('schema')!='s1-hub-human-v1' or not re.fullmatch(r'[a-zA-Z0-9_-]{1,16}',packet.get('code','')):raise ValueError('schema or anonymous code')
    key={r['id']:r for r in read(P/'key-analysis-only.json')};a=read(E/'paired-input.json');first={r['case']:r for r in a['cases']};second=read(E/'independent.json')['cases']
    rows=packet['rows']
    if len(rows)!=6 or set(r['image'] for r in rows)!=set(key):raise ValueError('incomplete or duplicate image set')
    out=[]
    for r in rows:
        k=key[r['image']];c=first[k['case']];pts=r['points']
        if hashlib.sha256((E/'human-pack'/(r['image']+'.png')).read_bytes()).hexdigest()!=k['png_sha256']:raise ValueError('pack mismatch')
        if (not isinstance(pts,list) or len(pts)!=4 or any(p is not None and (not isinstance(p,list) or len(p)!=2 or any(type(x)!=int or not 0<=x<1024 for x in p)) for p in pts) or r['front'] not in ('up','not_up','unknown') or type(r['seconds']) not in (int,float) or not math.isfinite(r['seconds']) or r['seconds']<0): raise ValueError('invalid reading')
        valid=[tuple(p) for p in pts if p is not None]
        if len(set(valid))!=len(valid):raise ValueError('duplicate point')
        m=None
        if len(valid)==4:
            try:m=metrics(pts,a['targets'],a['thresholds'])
            except ZeroDivisionError:pass
        pairs=[[None if p is None else math.dist(p,q) for p,q in zip(pts,ai)] for ai in (c['first_points'],second[c['blind_id']]['points'])]
        out.append(dict(case=k['case'],human_front=r['front'],seconds=r['seconds'],readable_axes=len(valid),human_metrics=m,human_to_ai_first_px=pairs[0],human_to_ai_repeat_px=pairs[1]))
    valid=[z for z in out if z['human_metrics'] is not None]
    return dict(image_count=6,assessable=len(valid),missing_or_indeterminate=6-len(valid),passes=sum(z['human_metrics']['coordinate_pass'] for z in valid),zero_of_six_confirmed_by_this_reader=(not any(z['human_metrics']['coordinate_pass'] for z in valid)) if len(valid)==6 else None,cases=out)
if __name__=='__main__':print(json.dumps(score(read(Path(sys.argv[1]))),indent=2))
