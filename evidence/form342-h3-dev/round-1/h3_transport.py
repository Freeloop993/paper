from pathlib import Path
from datetime import datetime, timezone
import json, hashlib, base64, io, time
import requests
from PIL import Image
ENDPOINT='https://api.minimax.io/v1/images/edits'
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n',encoding='utf8')
def now():
    return datetime.now(timezone.utc).isoformat()
def execute(row,key):
    cell=OUT/row['id']
    cell.mkdir(exist_ok=False)
    raw=(ROOT/row['input_source']).read_bytes()
    fields=dict(row['fields'],images=[{'image_url':'data:image/png;base64,'+base64.b64encode(raw).decode('ascii')}])
    save(cell/'submission.json',dict(**row,endpoint=ENDPOINT,start=now()))
    start=time.monotonic()
    try:
        with requests.Session() as s:
            s.trust_env=False
            r=s.post(ENDPOINT,json=fields,headers={'Authorization':'Bearer '+key},timeout=(18,360),allow_redirects=False)
        ans=r.json()
        items=ans.get('data') or []
        item=items[0] if isinstance(items,list) and items else {}
        receipt={k:v for k,v in ans.items() if k in ('created','model','usage','base_resp','output_format','error','id')}
        receipt.update(http=r.status_code,request_id=r.headers.get('x-request-id'),received=now(),elapsed_s=round(time.monotonic()-start,2),item={k:v for k,v in item.items() if k not in ('b64_json','url')})
        save(cell/'receipt.json',receipt)
        if r.status_code!=200 or not item.get('b64_json'):
            print(row['id'],'no output HTTP',r.status_code, flush=True)
            return False
        image=base64.b64decode(item['b64_json'],validate=True)
        (cell/'original.png').write_bytes(image)
        with Image.open(io.BytesIO(image)) as im:
            im.load()
            if im.format!='PNG' or im.size!=(1024,1024): raise ValueError('Unexpected format/size')
            save(cell/'verified.json',dict(sha256=sha(image),size=im.size,bytes=len(image),rgb_sha256=sha(im.convert('RGB').tobytes())))
        print(row['id'],'received',flush=True)
        return True
    except Exception as exc:
        save(cell/'exception.json',dict(kind=type(exc).__name__,end=now()))
        print(row['id'],type(exc).__name__,flush=True)
        return False
