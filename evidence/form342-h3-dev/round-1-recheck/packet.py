from pathlib import Path
import hashlib, json, secrets, sys, shutil
from PIL import Image
root=Path(__file__).resolve().parent
old=root.parent/'round-1'
packet=Path(sys.argv[1])
packet.mkdir(exist_ok=False,parents=True)
shutil.copyfile(root/'rubric.md',packet/'rubric.md')
key={}
originals=list((old/'actual').glob('*/original.png'))
secrets.SystemRandom().shuffle(originals)
for src in originals:
    tag='K'+secrets.token_hex(4).upper()
    assert tag not in key
    raw=src.read_bytes()
    assert json.loads((src.parent/'verified.json').read_bytes())['sha256']==hashlib.sha256(raw).hexdigest()
    with Image.open(src) as im:
        Image.frombytes('RGB',im.size,im.convert('RGB').tobytes()).save(packet/(tag+'.png'))
    key[tag]=src.parent.name
assert len(key)==36
(root/'key.json').write_bytes(json.dumps(key,sort_keys=True,indent=2).encode())
