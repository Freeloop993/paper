"""Check recorded provider outputs against frozen submissions and the blind-key pixel hashes."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parent
load=lambda p: json.loads(p.read_bytes())
plan=load(root/'manifest.json')
key=load(root/'unblind.json')
by_slot={r['slot']:r for r in key.values()}
slots=plan['rows']
ids=set()
digests=set()
revised=0
request_ids=set()
usage={}
starts=[]
ends=[]
for row in slots:
    sid=row['id']
    assert sid not in ids
    ids.add(sid)
    cell=root/'actual'/sid
    submitted=load(cell/'submission.json')
    assert all(submitted[k]==v for k,v in row.items())
    assert submitted['endpoint']==plan['endpoint']
    assert hashlib.sha256((root/row['input_source']).read_bytes()).hexdigest()==row['input_sha256']
    rec=load(cell/'receipt.json')
    assert rec['http']==200
    original=cell/'original.png'
    sha=hashlib.sha256(original.read_bytes()).hexdigest()
    verified=load(cell/'verified.json')
    assert sha==verified['sha256']==by_slot[sid]['original']
    with Image.open(original) as img:
        assert img.format=='PNG' and img.size==(1024,1024)
        assert hashlib.sha256(img.convert('RGB').tobytes()).hexdigest()==verified['rgb_sha256']==by_slot[sid]['rgb']
    starts.append(submitted['start'])
    ends.append(rec['received'])
    if rec.get('request_id'):request_ids.add(rec['request_id'])
    for k in ['generated_images','total_tokens','input_tokens','output_tokens']:
        if k in rec.get('usage',{}):
            usage[k]=usage.get(k,0)+rec['usage'][k]
    revised+=bool(rec['item'].get('revised_prompt'))
    digests.add(sha)
summary=dict(expected=len(slots),outputs=len(ids),distinct_original_sha256=len(digests),distinct_nonempty_http_request_ids=len(request_ids),returned_revised_prompts=revised,provider_usage=usage,first_submitted_utc=min(starts),last_received_utc=max(ends),billed_amount=None)
(root/'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(summary))
