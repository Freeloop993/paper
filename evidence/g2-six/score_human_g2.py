"""Score a returned anonymous G2 human JSON on the analysis machine."""
from pathlib import Path
import json,math,sys
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parents[1]/'experiments/g2-control'))
from measure import report
def score(private_file):
    data=json.loads(private_file.read_bytes())
    if data.get('schema')!='g2-hub-human-v1':raise ValueError('Wrong task form')
    key={r['id']:r['case'] for r in json.loads((HERE/'blind-key.json').read_bytes())}
    rows=data['rows']
    if len(rows)!=6 or {r['image'] for r in rows}!=set(key):raise ValueError('Missing or duplicate images')
    dataset={}
    for r in rows:
        points=r['points']
        if (not isinstance(points,list) or len(points)!=4 or any(p is not None and (not isinstance(p,list) or len(p)!=2 or any(type(v)!=int or not 0<=v<1024 for v in p)) for p in points)
            or r['front'] not in ('up','not_up','unknown') or type(r['seconds']) not in (float,int) or not math.isfinite(r['seconds']) or r['seconds']<0):
            raise ValueError('Invalid reading')
        dataset[key[r['image']]]=None if None in points else points
    return report(dataset)
if __name__=='__main__':print(json.dumps(score(Path(sys.argv[1])),indent=2))
