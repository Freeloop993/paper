"""Validate the public subset of a private original archive. Accept an optional original ZIP."""
import hashlib,json,sys,zipfile
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
def read(p):return json.loads(p.read_bytes())
def sha(b):return hashlib.sha256(b).hexdigest()
def verify():
    v=read(HERE/'verification.json');assert (v['attempted'],v['accepted'],v['completed'],v['retries'])==(6,6,6,0)
    receipts={r['case']:r for r in read(HERE/'executed.json')}
    design=HERE.parents[1]/'experiments/g2-control'
    for row in v['cases']:
        cid=row['case'];p=HERE/'originals'/(cid+'.png');g=receipts[cid]
        assert sha(p.read_bytes())==row['png_sha']==g['output']['sha256']
        with Image.open(p) as im:assert im.size==(1024,1024) and sha(im.convert('RGB').tobytes())==row['rgb_sha']
        assert row['prompt_id']==g['prompt_id'] and g['request_graph']==read(design/'requests'/(cid+'.json'))['prompt']
        assert g['status']['completed'] and g['status']['status_str']=='success' and row['sampler_cached'] is False
    if len(sys.argv)>1:
        f=Path(sys.argv[1]);assert sha(f.read_bytes())==v['archive_sha']
        with zipfile.ZipFile(f) as z:
            for row in receipts.values():
                cid=row['case'];h=z.read(cid+'-history.json');assert sha(h)==row['raw_history_sha256'] and sha(z.read(cid+'-request.json'))==row['raw_request_sha256']
                actual=json.loads(h)[row['prompt_id']]
                assert actual['prompt'][2]==row['request_graph'] and actual['status']==row['status']
                assert '10' not in [n for tag,msg in actual['status']['messages'] if tag=='execution_cached' for n in msg.get('nodes',[])]
    print('Six PNGs, distinct IDs, executed graphs, cached-sampler status and available archive verified.')
    assert len({r['prompt_id'] for r in v['cases']})==len({r['rgb_sha'] for r in v['cases']})==6
if __name__=='__main__':verify()
