import hashlib
import json
import sys
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
from PIL import Image,ImageDraw,ImageFont

root=Path(__file__).resolve().parent
phase=sys.argv[1]
if phase not in ('dev','hexa'):raise ValueError(phase)
source=root/'experiments/gpu-day-20261115'/('b2-rev2b' if phase=='dev' else 'hexa-fix')
def digest(b):return hashlib.sha256(b).hexdigest()
def signature(g):return {k:(v['class_type'],v['inputs']) for k,v in g.items()}
meta=json.loads((root/(phase+'-record.json')).read_bytes())
archive=root/(phase+'-originals.zip')
assert archive.stat().st_size==meta['size'] and digest(archive.read_bytes())==meta['sha256']
allowed=json.loads((root/'experiments/approved-inputs.json').read_bytes())
allowed={**allowed['parents'],**allowed['guides']}
expected_weights={r['path']:r['sha256'] for r in json.loads((root.parent/'gpu-day-takeover/weights.json').read_bytes())['weights']}
def png(path,data):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    return Image.open(BytesIO(data)).convert('RGB')
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert z.read('manifest.json')==(source/'manifest.json').read_bytes()
    rows=json.loads(z.read('manifest.json'))['requests']
    assert len(rows)==(3 if phase=='dev' else 39) and int(z.read(phase+'/RUN_OK'))==len(rows)
    assert {x.split()[1]:x.split()[0] for x in z.read('weights.sha256').decode().splitlines()}==expected_weights
    actual=[json.loads(l) for l in z.read(phase+'/progress.jsonl').splitlines()]
    assert [r['id'] for r in rows]==[r['id'] for r in actual]
    assert len({a['prompt_id'] for a in actual})==len({a['png_sha256'] for a in actual})==len(rows)
    transition=json.loads(z.read('transition.json'));assert len(transition['old_hexa_completed'])==15 and len(transition['old_hexa_unsubmitted'])==24
    for row,a in zip(rows,actual):
        rid=row['id'];prefix=phase+'/'+rid+'/'
        req=z.read(prefix+'request.json')
        reqname=(str(row['order']).zfill(2)+'-' if phase=='hexa' else '')+rid+'.json'
        assert req==(source/('requests' if phase=='hexa' else 'dev')/reqname).read_bytes()
        assert digest(req)==a['request_sha256']==row['request_sha256']
        g=json.loads(req)['prompt'];h=json.loads(z.read(prefix+'history.json'));ack=json.loads(z.read(prefix+'ack.json'))
        assert ack['prompt_id']==a['prompt_id']==h['prompt'][1] and h['status']['status_str']=='success' and h['status']['completed']
        assert not any('10' in map(str,d.get('nodes',[])) for e,d in h['status']['messages'] if e=='execution_cached')
        assert g['10']['inputs']['seed']==row['seed']
        img=z.read(prefix+rid+'.png');assert digest(img)==a['png_sha256']
        im=Image.open(BytesIO(img));assert im.size==(1024,1024)
        embedded=json.loads(im.info['prompt'])
        assert signature(g)==signature(embedded)==signature(h['prompt'][2])
        ids=[p for p,v in g.items() if v['class_type']=='LoadImage']
        names=[g[p]['inputs']['image'] for p in ids];assert names==row.get('images',row.get('inputs'))
        for node,name in zip(ids,names):
            assert digest(z.read('inputs/'+name))==allowed[name]['sha256']
            assert embedded[node]['is_changed']==[allowed[name]['sha256']]
        outputs=h['outputs']['12']['images'];assert len(outputs)==1 and outputs[0]['filename'].startswith(rid)
        png(root/'images'/phase/(rid+'.png'),img)
    data=dict(phase=phase,count=len(rows),archive=meta,records=actual,transition=transition)
    (root/(phase+'-verified.json')).write_text(json.dumps(data,indent=2),encoding='utf8')
    if phase=='dev':
        sources=[Image.open(BytesIO(z.read('inputs/'+n))).convert('RGB') for n in ('E3R3-B2.png','E3R3-C1.png')]
        sources += [Image.open(root/'images/dev'/(r['id']+'.png')).convert('RGB') for r in rows]
        labels=['原 B2 · 整机','C1 · 仅参考机头','开发 1','开发 2','开发 3']
        size=290;pad=8;sheet=Image.new('RGB',(5*(size+pad)+pad,3*size+125),'#f5f4f0')
        draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
        for i,(im,label) in enumerate(zip(sources,labels)):
            x=pad+(size+pad)*i;draw.text((x,8),label,font=font,fill='#243331')
            sheet.paste(im.resize((size,size),Image.Resampling.LANCZOS),(x,40))
            draw.text((x,340),'机头 · 同位等倍',font=font,fill='#243331')
            sheet.paste(im.crop((365,160,655,450)),(x,375))
            draw.text((x,674),'机尾 · 同位等倍',font=font,fill='#243331')
            sheet.paste(im.crop((365,565,655,855)),(x,704))
        sheet.save(root/'dev-comparison.jpg',quality=96,subsampling=0)
print(phase,len(rows),'verified')
