from pathlib import Path
from PIL import Image
import json,secrets,hashlib,sys,shutil,datetime
root=Path(__file__).resolve().parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,x):p.write_bytes((json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode())
action,kind=sys.argv[1:3]
folder=Path(sys.argv[3])
keyfile=root/(kind+'-key.json')
if action=='prepare':
    folder.mkdir(parents=True,exist_ok=False)
    shutil.copyfile(root/(kind+'.md'),folder/'instructions.md')
    paths=list((root/'actual').glob('*/original.png'))
    assert len(paths)==36
    secrets.SystemRandom().shuffle(paths)
    key={}
    for path in paths:
        id='X'+secrets.token_hex(4).upper()
        assert id not in key
        vf=json.loads((path.parent/'verified.json').read_bytes())
        assert sha(path)==vf['sha256']
        with Image.open(path) as im:
            rgb=im.convert('RGB').tobytes()
            assert hashlib.sha256(rgb).hexdigest()==vf['rgb_sha256']
            Image.frombytes('RGB',im.size,rgb).save(folder/(id+'.png'))
        key[id]=path.parent.name
    save(keyfile,key)
else:
    src=folder/'findings.jsonl'
    rows=[json.loads(l) for l in src.read_bytes().splitlines() if l.strip()]
    assert len(rows)==36 and {r['id'] for r in rows}=={p.stem for p in folder.glob('X*.png')}
    if kind=='morph':
        enums={'body':['box','pod','U'],'nose':['P','N','U'],'cover':['C','M','U'],'camera':['consistent','wrong','invisible','U']}
        notes=['body_note','nose_note','cover_note','camera_note']
    else:
        enums={'guard':['yes','no','U'],'residue':['yes','no','U'],'quality':['product','middle','diagram']}
        notes=['guard_note','residue_note','quality_note','width_note','blade_note']
    for r in rows:
        assert all(r[k] in v for k,v in enums.items()) and all(isinstance(r[k],str) and len(r[k].strip())>=2 for k in notes),r['id']
        if kind=='morph':
            assert len(r['roots'])==len(r['root_notes'])==4 and all(k in 'BSHU' and len(k)==1 for k in r['roots']) and all(r['root_notes'])
        else:
            assert len(r['widths'])==len(r['hubs'])==len(r['blades'])==4
            assert all(n is None or 0<n<1024 for n in r['widths'])
            assert all(pt is None or len(pt)==2 and all(0<=x<1024 for x in pt) for pt in r['hubs'])
            assert all(n is None or isinstance(n,int) and 0<=n<=12 for n in r['blades'])
    dest=root/(kind+'-ai.jsonl')
    assert not dest.exists()
    shutil.copyfile(src,dest)
    const={k:rows[0][k] for k in enums if len({r[k] for r in rows})==1}
    save(root/(kind+'-ai-lock.json'),dict(timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),file_sha=sha(dest),key_sha=sha(keyfile),rows=len(rows),constant_columns_needing_human_confirmation=const))
    print(kind,len(rows),sha(dest),const)
