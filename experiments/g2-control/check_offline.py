"""Mechanical controls only. No files returned by these controls are observations."""
from copy import deepcopy
from pathlib import Path
import json,hashlib,sys,importlib.util
from PIL import Image
from measure import report,vec
P=Path(__file__).resolve().parent
def read(p):return json.loads(p.read_bytes())
def digest(b):return hashlib.sha256(b).hexdigest()
for path,total in [(P,6),(P.parent/'common-control',12)]:
    m=read(path/'manifest.json');assert len(m['cases'])==total and len(m['files'])==total*3//2
    for n,h in m['files'].items():assert digest((path/n).read_bytes())==h
    for r in m['cases']:
        f=path/'requests'/(r['case']+'.json');g=read(f)['prompt']
        assert g['9']['inputs']['image']==['6',0] and g['6']['inputs']['image']==['5',0] and g['10']['inputs']['model']==['9',0]
        assert g['10']['inputs']['seed']==r['seed'] and g['5']['inputs']['image']==r['guide']
        with Image.open(path/'guides'/r['guide']) as im:
            assert im.size==(1024,1024) and set(im.convert('L').getdata())=={0,255}
            assert im.getpixel((512,512))==(255,255,255)
            for x,y in r['targets']:assert im.getpixel((x,y))==(0,0,0) and im.getpixel((x+69,y))==(0,0,0)
m=read(P/'manifest.json')['cases'];fake={i['case']:vec(i['targets']) for i in m}
assert report(fake)['all_six_within_and_both_strict']
flat={k:deepcopy(fake[m[1]['case']]) for k in fake};assert not any(report(flat)['strict_monotonic_by_seed'].values())
fake[m[0]['case']]=None;assert report(fake)['unreadable']==1 and not report(fake)['all_six_within_and_both_strict']
p=P.parent/'hub-annotator';sys.path.insert(0,str(p))
from compare_human import score,E
key=read(p/'key-analysis-only.json');a=read(E/'paired-input.json');first={r['case']:r for r in a['cases']}
for k in key:
    with Image.open(E/'human-pack'/(k['id']+'.png')) as blind,Image.open(E/'originals'/(k['case']+'.png')) as original:
        assert not blind.info and blind.tobytes()==original.convert('RGB').tobytes() and digest(blind.tobytes())==k['rgb_sha256']
packet={'schema':'s1-hub-human-v1','code':'QA_ONLY','rows':[dict(image=k['id'],points=first[k['case']]['first_points'],front='unknown',seconds=1) for k in key]}
q=score(packet);assert q['assessable']==6 and q['zero_of_six_confirmed_by_this_reader'] is True and all(row['human_to_ai_first_px']==[0]*4 for row in q['cases'])
print('G2/common 18 graphs; correct, flat and missing measurement controls; 6 blinded RGB images; known-coordinate joins verified. No experimental observations.')
