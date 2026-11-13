"""Verify H3 outputs and blinded reader file, then compute the two registered results."""
import csv,hashlib,json,math,statistics
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent
def read(path):return json.loads(path.read_bytes())
def digest(data):return hashlib.sha256(data).hexdigest()
key=read(root/'blind-key.json')
raw=(root/'blind-readings.json').read_bytes()
assert digest(raw)==(root/'blind-readings.sha256').read_text().strip()
observations=json.loads(raw)
assert len(observations)==8 and {x['id'] for x in observations}==set(key)
manifest=read(root/'manifest.json')
source={r['id']:r for r in manifest['rows']}
rows=[]; hashes=set()
for ob in observations:
    slot=key[ob['id']]
    case=source[slot]
    directory=root/'actual'/slot
    receipt=read(directory/'receipt.json')
    check=read(directory/'verified.json')
    sent=read(directory/'submission.json')
    assert sent['fields']==case['fields'] and sent['input_sha256']==digest((root/case['input_source']).read_bytes())
    assert receipt['http']==200 and receipt['usage']['generated_images']==1
    assert check['sha256']==digest((directory/'original.png').read_bytes())
    with Image.open(directory/'original.png') as im:
        assert im.size==(1024,1024) and im.format=='PNG'
        sha=digest(im.convert('RGB').tobytes()); assert sha==check['rgb_sha256']
    hashes.add(sha)
    hubs=ob['hubs']; assert len(hubs)==4
    D=statistics.mean([math.dist(hubs[0],hubs[2]),math.dist(hubs[1],hubs[3])]) if all(hubs) else None
    length=(ob['tail_y']-ob['nose_y']) if ob['tail_y'] is not None and ob['nose_y'] is not None else None
    ratio=length/D if length and D else None
    assert ob['nose'] in ('N','P','U') and ob['residue'] in ('yes','no','U')
    rows.append(dict(slot=slot,**ob,D=D,shell_length=length,ratio=ratio,rgb_sha=sha))
assert len(hashes)==8
rows.sort(key=lambda x:x['slot'])
prior=list(csv.DictReader((root.parent/'round-2/by-image.csv').open(encoding='utf-8-sig')))
s0_before=[r['nose'] for r in prior if r['condition']=='S0']
s0_now=[r['nose'] for r in rows if r['slot'].startswith('S0-')]
assert len(s0_before)==3 and len(s0_now)==4
pooled=s0_before+s0_now
groups={k:[r['ratio'] for r in rows if r['slot'].startswith(k+'-') and r['ratio'] is not None] for k in ('S0','K')}
all_measured=all(len(v)==4 for v in groups.values())
residues=[r['residue'] for r in rows]
stats={k:{'n':len(v),'mean':statistics.mean(v) if v else None,'sample_sd':statistics.stdev(v) if len(v)>1 else None} for k,v in groups.items()}
gap=stats['S0']['mean']-stats['K']['mean'] if all_measured else None
kpass=all_measured and gap>max(x['sample_sd'] for x in stats.values()) and residues.count('yes')<=1 and 'U' not in residues
result=dict(reader='one blinded AI; positions approximate; no human reader',rows=rows,
    nose={'previous':s0_before,'new':s0_now,'pooled':{k:pooled.count(k) for k in 'NPU'},'pass':pooled.count('N')>=5 and 'P' not in pooled},
    K={'stats':stats,'signed_difference':gap,'positive_residue':residues.count('yes'),'unknown_residue':residues.count('U'),'pass':kpass})
(root/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n','utf8')
print(json.dumps({'nose':result['nose'],'K':result['K']},ensure_ascii=True))
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
sheet=Image.new('RGB',(4*264,2*295),'#f5f5f2');draw=ImageDraw.Draw(sheet)
for i,r in enumerate(sorted(rows,key=lambda x:(0 if x['slot'].startswith('S0') else 1,x['slot']))):
    x=(i%4)*264+4;y=(i//4)*295
    draw.text((x,y+3),r['slot']+'    鼻 '+r['nose'],font=font,fill='#1e4037')
    with Image.open(root/'actual'/r['slot']/'original.png') as im:
        sheet.paste(im.convert('RGB').resize((256,256),Image.Resampling.LANCZOS),(x,y+31))
sheet.save(root/'all-eight.jpg',quality=92)
