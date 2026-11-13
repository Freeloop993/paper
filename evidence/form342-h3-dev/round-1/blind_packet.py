"""Export a randomized RGB-only packet; seal reader output BEFORE joining the key."""
import argparse
import csv
import hashlib
import json
import secrets
import shutil
from datetime import datetime,timezone
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,obj):
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
parser=argparse.ArgumentParser()
parser.add_argument('action',choices=['prepare','seal'])
parser.add_argument('packet',type=Path)
args=parser.parse_args()
packet=args.packet
rows=json.loads((ROOT/'manifest.json').read_bytes())['rows']
if args.action=='prepare':
    assert not (ROOT/'unblind.json').exists()
    packet.mkdir(parents=True,exist_ok=False)
    shutil.copyfile(ROOT/'blind-instructions.md',packet/'instructions.md')
    secrets.SystemRandom().shuffle(rows)
    key={}
    for row in rows:
        cell=ROOT/'actual'/row['id']
        blind='I'+secrets.token_hex(4).upper()
        assert blind not in key
        key[blind]={'slot':row['id'],'original':None}
        if not (cell/'original.png').is_file():
            continue
        original=cell/'original.png'
        verify=json.loads((cell/'verified.json').read_bytes())
        assert sha(original)==verify['sha256']
        with Image.open(original) as im:
            clean=Image.frombytes('RGB',(1024,1024),im.convert('RGB').tobytes())
        assert hashlib.sha256(clean.tobytes()).hexdigest()==verify['rgb_sha256']
        clean.save(packet/(blind+'.png'))
        key[blind].update(original=sha(original),rgb=verify['rgb_sha256'],blind_png=sha(packet/(blind+'.png')))
    write(ROOT/'unblind.json',key)
    print('Prepared',len(list(packet.glob('I*.png'))),'anonymized originals')
else:
    output=packet/'readings.jsonl'
    reads=[json.loads(line) for line in output.read_bytes().splitlines() if line.strip()]
    ids={f.stem for f in packet.glob('I*.png')}
    assert ids=={r['id'] for r in reads} and len(reads)==len(ids)
    enums={'body_plan':['pod','box','U'],'arm_root':['seamless','socket','hinge','U'],'camera':['inside','projecting','U'],'cover':['single','multi','U'],'camera_v2':['consistent','wrong','invisible','U'],'quality':['product','middle','diagram'],'residue':['yes','no','U'],'guard':['yes','no','U']}
    for row in reads:
        assert all(row[k] in allowed for k,allowed in enums.items()),row['id']
        assert all(len(row[k])==4 for k in ('hubs','widths','blades'))
        assert all(pt is None or len(pt)==2 and all(isinstance(v,(int,float)) and 0<=v<1024 for v in pt) for pt in row['hubs'])
        assert all(v is None or isinstance(v,(int,float)) and 0<v<1024 for v in [row['shell_L'],row['shell_B'],*row['widths']])
        assert all(v is None or isinstance(v,int) and 0<=v<=12 for v in row['blades'])
    lock=ROOT/'blind-lock.json'
    assert not lock.exists()
    dest=ROOT/'blind-readings.jsonl'
    shutil.copyfile(output,dest)
    write(lock,{'utc':datetime.now(timezone.utc).isoformat(),'readings_sha256':sha(dest),'rows':len(reads),'instructions_sha256':sha(packet/'instructions.md'),'key_sha256':sha(ROOT/'unblind.json'),'method':'independent AI, fresh context; re-encoded randomized RGB; estimates and nulls retained'})
    print('Sealed',len(reads),sha(dest))
