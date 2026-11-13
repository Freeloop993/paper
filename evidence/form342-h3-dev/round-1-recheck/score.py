"""Join the sealed reread to the key, separately from first-round primary results."""
from pathlib import Path
from collections import Counter
from statistics import mean
from PIL import Image,ImageDraw,ImageFont
import csv,json,hashlib,sys,shutil
root=Path(__file__).resolve().parent
old=root.parent/'round-1'
def load(p):
    return json.loads(p.read_bytes())
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def jsonsave(p,data):
    p.write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf8'))
if sys.argv[1]=='seal':
    packet=Path(sys.argv[2])
    source=packet/'findings.jsonl'
    rows=[json.loads(v) for v in source.read_bytes().splitlines() if v.strip()]
    assert {r['id'] for r in rows}=={p.stem for p in packet.glob('K*.png')} and len(rows)==36
    for r in rows:
        assert len(r['roots'])==len(r['root_evidence'])==4 and all(x in ('H','S','B','U') for x in r['roots'])
        assert r['cover'] in ['C','M','U'] and r['nose'] in ['N','P','U']
        assert all(isinstance(v,str) and v.strip() for v in [*r['root_evidence'],r['nose_evidence'],r['cover_evidence']])
    assert not (root/'seal.json').exists()
    shutil.copyfile(source,root/'blind.jsonl')
    jsonsave(root/'seal.json',dict(count=36,sha256=sha(source),key_sha256=sha(root/'key.json'),rubric_sha256=sha(root/'rubric.md')))
    sys.exit()
lock=load(root/'seal.json')
assert sha(root/'blind.jsonl')==lock['sha256'] and sha(root/'key.json')==lock['key_sha256']
key=load(root/'key.json')
rec={key[r['id']]:r for line in (root/'blind.jsonl').read_bytes().splitlines() if line.strip() for r in [json.loads(line)]}
orig={r['slot']:r for r in csv.DictReader((old/'by-image.csv').open(encoding='utf-8-sig'))}
cols=[]
for slot,r in sorted(rec.items()):
    cnt=Counter(r['roots']); consensus=next((x for x in 'BSH' if cnt[x]>=3),'U')
    o=orig[slot]
    cols.append(dict(slot=slot,new_blind_id=r['id'],root_old=o['arm_root'],root_new=consensus,roots=''.join(r['roots']),root_evidence=' / '.join(r['root_evidence']),camera_old=o['camera'],direction_evidence_old=o['camera_v2'],nose_new=r['nose'],nose_evidence=r['nose_evidence'],cover_old=o['cover'],cover_new=r['cover'],cover_evidence=r['cover_evidence']))
with (root/'by-image.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=cols[0].keys());writer.writeheader();writer.writerows(cols)
by={row['slot']:row for row in cols}
summary={}
for label in ['S0','S1','S2','S3','S4','S5','all']:
    group=[r for r in cols if label=='all' or r['slot'].startswith(label+'-')]
    summary[label]={k:dict(Counter(r[k] for r in group)) for k in ['root_new','nose_new','cover_new']}
jsonsave(root/'recheck-results.json',summary)
small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',15)
textmap={'B':'无缝','S':'承座','H':'铰接','U':'待判','N':'无外突','P':'前伸','C':'单盖','M':'多盖'}
sheet=Image.new('RGB',(3*360,4*345),'#ffffff');draw=ImageDraw.Draw(sheet)
for j,group in enumerate(['S0','S2','S3','S4']):
    for i in range(3):
        slot=f'{group}-{i+1}';r=by[slot]
        im=Image.open(old/'actual'/slot/'original.png').convert('RGB')
        crop=im.crop((295,260,729,758))
        crop.thumbnail((350,310))
        x=i*360;y=j*345
        sheet.paste(crop,(x+(360-crop.width)//2,y+28))
        draw.text((x+10,y+3),slot+'   臂根 '+textmap[r['root_new']]+'   机鼻 '+textmap[r['nose_new']]+'   上盖 '+textmap[r['cover_new']],font=small,fill='#153636')
sheet.save(root/'parts.jpg',quality=92)
print(json.dumps(summary,ensure_ascii=False))
