from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import json,hashlib
from PIL import Image

base=Path(__file__).resolve().parent
def sha(b):return hashlib.sha256(b).hexdigest()
p=base/'pairs-originals.zip';remote=json.loads((base/'pairs-transfer/record.json').read_bytes())
assert p.stat().st_size==remote['size'] and sha(p.read_bytes())==remote['sha256']
with ZipFile(p) as z:
    assert z.testzip() is None
    t=json.loads(z.read('transition.json'))
    hist={v['id']:v for v in t['old_hexa_completed']}
    paired=json.loads(z.read('paired-check.json'))
    assert set(hist)=={r['old'] for r in paired['pairs']} and len(hist)==15
    for r in paired['pairs']:
        i=r['old'];h=hist[i];prefix='historical/'+i+'/'
        raw=z.read(prefix+i+'.png');request=z.read(prefix+'request.json')
        history=json.loads(z.read(prefix+'history.json'));ack=json.loads(z.read(prefix+'ack.json'))
        assert sha(raw)==r['old_png_sha256']==h['png_sha256'] and sha(request)==h['request_sha256']
        graph=json.loads(request)['prompt']
        assert graph['10']['inputs']['seed']==r['seed'] and graph['10']['inputs']['negative']==['4',1]
        assert ack['prompt_id']==h['prompt_id']==history['prompt'][1] and history['status']['completed']
        with Image.open(BytesIO(raw)) as img:
            assert img.size==(1024,1024)
        out=base/'images/historical'/f'{i}.png';out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(raw)
    for name in ['paired-check.json','paired-drafts.jpg']:
        (base/name).write_bytes(z.read(name))
if (base/'hexa-originals.zip').is_file():
    with ZipFile(base/'hexa-originals.zip') as zz, ZipFile(p) as zo:
        for r in paired['pairs']:
            a,b=r['old'],r['corrected']
            old_bytes=zo.read(f'historical/{a}/{a}.png')
            new_bytes=zz.read(f'hexa/{b}/{b}.png')
            assert sha(new_bytes)==r['corrected_png_sha256']
            def pixels(x):
                with Image.open(BytesIO(x)) as im:return im.convert('RGB').tobytes()
            assert (pixels(old_bytes)==pixels(new_bytes))==r['decoded_rgb_identical']
        print('Local RGB values confirmed for every pair.')
print('Historical archive and 15 independent ID, request, image and receipt chains verified.')
