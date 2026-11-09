"""Verify original PNG pixels, frozen request graph and matching history of this joint run."""
from pathlib import Path
import hashlib,json,sys,zipfile
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
def read(p):return json.loads(p.read_bytes())
def sha(data):return hashlib.sha256(data).hexdigest()
def verify(archive=None):
    seen=set()
    for label in ('g2b-actual','g3-actual'):
        e=ROOT/'evidence'/label;rec=read(e/'receipts.json')
        assert len(rec['cases'])==(4 if label=='g2b-actual' else 2) and rec['attempted']==rec['accepted']==rec['completed'] and rec['retries']==0
        for row in rec['cases']:
            name=row['case'];pid=row['prompt_id']
            assert pid not in seen;seen.add(pid)
            if label=='g2b-actual':f=ROOT/'experiments/g2b-screen/requests'/(name+'.json')
            else:f=ROOT/'experiments/g3-reference'/(name.removeprefix('G3-')+'.json')
            assert read(f)['prompt']==row['graph']
            p=e/'originals'/(name+'.png')
            assert sha(p.read_bytes())==row['png_sha256']
            with Image.open(p) as im:assert im.size==(1024,1024) and sha(im.convert('RGB').tobytes())==row['rgb_sha256']
            assert row['status']['completed'] and row['status']['status_str']=='success' and row['sampler_cached'] is False
            if archive:
                with zipfile.ZipFile(archive) as z:
                    h=z.read(name+'-history.json');assert sha(h)==row['raw_history_sha256']
                    assert json.loads(h)[pid]['prompt'][2]==row['graph']
                    assert sha(z.read(name+'-request.json'))==row['raw_request_sha256']
                    assert '10' not in [n for key,msg in json.loads(h)[pid]['status']['messages'] if key=='execution_cached' for n in msg.get('nodes',[])]
        if archive:assert sha(Path(archive).read_bytes())==rec['archive_sha256']
    print('Verified four screening outputs and two revision outputs.')
if __name__=='__main__':verify(sys.argv[1] if len(sys.argv)>1 else None)
