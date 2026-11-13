from pathlib import Path
import json,csv,hashlib
from collections import Counter
from PIL import Image
root=Path(__file__).resolve().parent
def j(p):return json.loads(p.read_bytes())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=j(root/'manifest.json')['rows']
unique=set();usage=Counter();audit=[]
for r in rows:
    cell=root/'actual'/r['id']
    sub=j(cell/'submission.json')
    assert all(sub[k]==v for k,v in r.items())
    assert sub['endpoint']==j(root/'manifest.json')['endpoint']
    assert sha(root/r['input_source'])==r['input_sha256']
    rec=j(cell/'receipt.json');vf=j(cell/'verified.json')
    assert rec['http']==200 and sha(cell/'original.png')==vf['sha256']
    with Image.open(cell/'original.png') as im:
        assert im.size==(1024,1024) and im.format=='PNG' and hashlib.sha256(im.convert('RGB').tobytes()).hexdigest()==vf['rgb_sha256']
    unique.add(vf['rgb_sha256'])
    usage.update({k:v for k,v in rec['usage'].items() if isinstance(v,int)})
    audit.append(dict(slot=r['id'],start=sub['start'],received=rec['received'],original_sha=vf['sha256'],rgb_sha=vf['rgb_sha256'],guide_sha=r['input_sha256'],submitted=r['fields']['prompt'],provider_revised=rec['item'].get('revised_prompt')))
with (root/'prompt-audit.csv').open('w',encoding='utf-8-sig',newline='') as f:
    out=csv.DictWriter(f,fieldnames=audit[0]);out.writeheader();out.writerows(audit)
print('outputs',len(rows),'unique RGB',len(unique),'revised',sum(bool(r['provider_revised']) for r in audit),'time',min(r['start'] for r in audit),max(r['received'] for r in audit),'usage',dict(usage))
