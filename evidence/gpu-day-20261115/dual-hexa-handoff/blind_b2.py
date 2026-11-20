"""Independent, anonymized packets: no PNG graph metadata, no original names."""
from pathlib import Path
from zipfile import ZipFile
from PIL import Image,ImageDraw,ImageFont
from io import BytesIO
import hashlib,json,random,sys
base=Path(__file__).resolve().parent
archives=[base.parent/'gpu-day-takeover'/'B2-rev1-originals.zip',
          base.parent/'b2-rev2-reviewed'/'dev-originals.zip',base/'dev-originals.zip']
def sh(x):return hashlib.sha256(x).hexdigest()
source={}
ref=None
for zidx,arc in enumerate(archives):
    with ZipFile(arc) as z:
        refraw=z.read('inputs/E3R3-B2.png')
        if ref is None:ref=refraw
        else:assert sh(ref)==sh(refraw)
        members=[n for n in z.namelist() if not n.startswith('inputs/') and n.endswith('.png')]
        assert len(members)==[6,3,3][zidx]
        for name in members:
            raw=z.read(name);k=Path(name).stem;assert k not in source
            source[k]=raw
assert len(source)==12
blind=base/'blind-b2';blind.mkdir(exist_ok=True)
def clean(b):
    with Image.open(BytesIO(b)) as old:
        pix=old.convert('RGB');return Image.frombytes('RGB',pix.size,pix.tobytes())
key={}
for code,seed in [('X',514633),('Y',903527)]:
    out=blind/('packet-'+code);out.mkdir(exist_ok=True)
    keys=sorted(source);random.Random(seed).shuffle(keys);key[code]={}
    refimg=clean(ref);refimg.save(out/'reference.png')
    for idx,k in enumerate(keys,1):
        label=code+f'{idx:02}';g=clean(source[k]);g.save(out/(label+'.png'))
        with Image.open(out/(label+'.png')) as reread:assert not reread.info and reread.tobytes()==g.tobytes()
        key[code][label]={'original':k,'source_sha256':sh(source[k]),'rgb_sha256':sh(g.tobytes())}
    for page in range(4):
        ids=['reference']+[code+f'{i:02}' for i in range(page*3+1,page*3+4)]
        w=320;sheet=Image.new('RGB',(4*w,945),'#f3f4f3');d=ImageDraw.Draw(sheet)
        for i,k in enumerate(ids):
            g=Image.open(out/(k+'.png'));x=i*w;d.text((x+8,6),k,fill='black')
            sheet.paste(g.resize((w,w),Image.Resampling.LANCZOS),(x,26))
            sheet.paste(g.crop((352,134,672,424)),(x,355))
            sheet.paste(g.crop((352,610,672,900)),(x,650))
        sheet.save(out/f'view{page+1}.jpg',quality=95,subsampling=0)
(blind/'key.json').write_text(json.dumps(key,indent=2))
print('Two packets, 12 distinct outputs each; key SHA256:',sh((blind/'key.json').read_bytes()))
