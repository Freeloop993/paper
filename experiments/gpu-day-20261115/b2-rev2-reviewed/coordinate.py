"""Run one authorized B2 stage at a dispatch boundary on 277."""
import fcntl
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from zipfile import ZipFile, ZIP_STORED

kit = Path(__file__).resolve().parent
root = kit.parent
sys.path.insert(0, str(root))
import dispatch_v2 as v

stage = sys.argv[1]
assert stage in ('dev','formal') and __debug__
base_url = 'http://127.0.0.1:8189'
out = kit/('actual-'+stage)
raw = (kit/'manifest.json').read_bytes()
assert v.digest(raw)=='8e6073480b266c05fcba83af1df18f54f26594aee6a414271258991f0b06e198'
manifest = json.loads(raw)
rows = [r for r in manifest['requests'] if r['phase']==stage]
assert len(rows)==3
assert (root/'STOP').exists() and (root/'e2r-actual/RUN_OK').exists()
assert not out.exists()
assert v.digest(Path(v.run_one.__code__.co_filename).read_bytes())==v.LEGACY_RUNNER
v.verify_model_receipt(root)
v.measured_inputs(root,{manifest['parent']:manifest['parent_sha256']})
for row in rows:
    assert v.digest((kit/row['path']).read_bytes())==row['sha256']
if stage=='formal':
    decision=json.loads((kit/'dev-reading.json').read_bytes())
    assert (kit/'actual-dev/RUN_OK').read_text().strip()=='3/3'
    devs=[r for r in manifest['requests'] if r['phase']=='dev']
    assert set(decision['images'])=={r['id'] for r in devs}
    for r in devs:
        result=decision['images'][r['id']]
        assert result['png_sha256']==v.digest((kit/'actual-dev'/r['id']/(r['id']+'.png')).read_bytes())
        assert len(result['criteria'])==3 and all(x in ('yes','no','unclear') for x in result['criteria'])
    assert sum(x['criteria']==['yes']*3 for x in decision['images'].values())>=2

marker=root/'STOP-V2'
token='b2-rev2-reviewed '+stage+' '+str(os.getpid())
with marker.open('x') as f: f.write(token)
may_resume=False
try:
    with (root/'resume-reviewed.lock').open('a') as outer,(root/'dispatch-v2.lock').open('a') as lock:
        # Let the current image finish, including its receipt, before starting this batch.
        limit=time.monotonic()+1300
        for handle in (outer,lock):
            while True:
                try:
                    fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic()>=limit:raise TimeoutError('Original runner still active')
                    time.sleep(2)
        assert marker.read_text()==token
        v.clear_service(base_url)
        history=json.loads(v.call(base_url+'/history?max_items=1000',timeout=20))
        old_prefixes={r['id'].replace('REV2v2-','REV2-') for r in manifest['requests']}
        ids=old_prefixes|{r['id'] for r in rows}
        assert not any(n.get('inputs',{}).get('filename_prefix') in ids for h in history.values() for n in h['prompt'][2].values()),'Existing revision request'
        out.mkdir()
        for r in rows:
            assert marker.read_text()==token
            v.clear_service(base_url)
            request=kit/r['path']
            assert v.digest(request.read_bytes())==r['sha256']
            dest=out/r['id'];dest.mkdir()
            record=v.run_one(base_url,root/'inputs',request,dest,1200)
            assert record['request_sha256']==r['sha256'] and record['id']==r['id']
            with (out/'progress.jsonl').open('a') as f:
                f.write(json.dumps(record)+'\n');f.flush();os.fsync(f.fileno())
            print('completed',r['id'],flush=True)
        (out/'RUN_OK').write_text('3/3\n')
        may_resume=True
finally:
    if marker.is_file() and marker.read_text()==token:
        if may_resume:
            marker.unlink()
            with (kit/('resumed-after-'+stage+'.log')).open('x') as log:
                subprocess.Popen(['bash',str(root/'resume-reviewed.sh'),str(root)],cwd=root,stdout=log,stderr=log,start_new_session=True,stdin=subprocess.DEVNULL)
            print('Original queue released',flush=True)
        else:
            print('Hold at boundary for reconciliation',flush=True)

archive=kit/(stage+'-originals.zip')
with ZipFile(archive,'x',ZIP_STORED) as z:
    for path in sorted(out.rglob('*')):
        if path.is_file():z.write(path,path.relative_to(kit))
    z.write(root/'inputs'/manifest['parent'],'inputs/'+manifest['parent'])
    z.write(kit/'manifest.json','manifest.json')
    z.write(root/'posthandoff-weights.sha256','weights.sha256')
import base64
data=archive.read_bytes()
for i,start in enumerate(range(0,len(data),150000)):
    (kit/f'{stage}-{i:02d}.txt').write_bytes(base64.b64encode(data[start:start+150000]))
(kit/(stage+'-download.json')).write_text(json.dumps(dict(size=len(data),pieces=(len(data)+149999)//150000,sha256=hashlib.sha256(data).hexdigest())))
