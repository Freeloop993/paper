from pathlib import Path
from PIL import Image
import json,secrets,sys,hashlib,datetime,shutil
root=Path(__file__).resolve().parent
packet=Path(sys.argv[2])
def save(path,obj):
    path.write_bytes((json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode())
if sys.argv[1]=='prepare':
    packet.mkdir(parents=True,exist_ok=False)
    files=list((root/'actual').glob('*/original.png'))
    secrets.SystemRandom().shuffle(files)
    key={}
    for f in files:
        tag='V'+secrets.token_hex(4).upper()
        assert tag not in key
        with Image.open(f) as im:
            Image.frombytes('RGB',im.size,im.convert('RGB').tobytes()).save(packet/(tag+'.png'))
        key[tag]=f.parent.name
    assert len(key)==36
    save(root/'audit-key.json',key)
else:
    source=packet/'audit.jsonl'
    data=[json.loads(line) for line in source.read_bytes().splitlines()]
    assert len(data)==36 and {r['id'] for r in data}=={f.stem for f in packet.glob('V*.png')}
    assert all(r['quality'] in ('product','middle','diagram') and r['guard'] in ('yes','no','U') and all(len(r[k].strip())>=3 for k in ['quality_note','guard_note']) for r in data)
    dst=root/'audit-readings.jsonl'
    assert not dst.exists()
    shutil.copyfile(source,dst)
    save(root/'audit-lock.json',dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),sha256=hashlib.sha256(source.read_bytes()).hexdigest(),key_sha256=hashlib.sha256((root/'audit-key.json').read_bytes()).hexdigest(),rows=36))
