"""Prepare a detached, metadata-free set. Keep the decoding key outside the readers' folder."""
import hashlib,json,os,secrets,sys
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parent
dst=Path(sys.argv[1])
dst.mkdir(exist_ok=False,parents=True)
rows=json.loads((root/'manifest.json').read_bytes())['rows']
assert len(rows)==8 and all((root/'actual'/r['id']/'verified.json').is_file() for r in rows)
secrets.SystemRandom().shuffle(rows)
key={}
for row in rows:
    folder=root/'actual'/row['id']
    with Image.open(folder/'original.png') as im:
        rgb=im.convert('RGB')
        rgb.info.clear()
        assert hashlib.sha256(rgb.tobytes()).hexdigest()==json.loads((folder/'verified.json').read_bytes())['rgb_sha256']
        code=secrets.token_hex(4)
        assert code not in key
        key[code]=row['id']
        rgb.save(dst/(code+'.png'))
with (root/'blind-key.json').open('x',encoding='utf-8') as f:
    json.dump(key,f,indent=2)
