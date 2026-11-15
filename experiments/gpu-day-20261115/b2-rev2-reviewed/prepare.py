import base64
import hashlib
import json
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, 'D:/codex/thesis-research/2026-11-14')
from thesis_handoff_tools import github

root = Path(__file__).resolve().parent
source = 'e2dd53b47660084376a7d0cb640eef79553f86fb'
base = 'https://api.github.com/repos/Freeloop993/paper/contents/experiments/gpu-day-20261115/b2-rev2/'
phrase = ('Edit this drone image. Change only the nose: fit a compact forward-facing gimbal camera under the front edge of the fuselage, '
          'at the top of the image. The top of the housing projects slightly beyond the nose outline. '
          'Its lens faces horizontally forward and is occluded by the housing in this strict top view.')
parent = root.parent / 'gpu-day-takeover/inputs/E3R3-B2.png'
digest = lambda b: hashlib.sha256(b).hexdigest()
def build(item):
    phase, i = item
    old = f'REV2-{phase}-B2-r{i}'
    response = github().get(base+f'{phase}/{old}.json',params={'ref':source},timeout=30)
    response.raise_for_status()
    content = response.json()
    data = base64.b64decode(content['content'])
    assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==content['sha']
    request = json.loads(data)
    g = request['prompt']
    text = g['4']['inputs']
    prev, keep = text['prompt'].split(' Keep everything else exactly the same: ')
    assert 'two short side arms' in prev and g['15']['inputs']['image']==parent.name
    text['prompt'] = phrase+' Keep everything else exactly the same: '+keep
    rid = old.replace('REV2-', 'REV2v2-')
    assert g['12']['inputs']['filename_prefix']==old
    g['12']['inputs']['filename_prefix'] = rid
    seed = g['10']['inputs']['seed']
    assert seed == (2026112140 if phase=='dev' else 2026112143)+i
    out = root/phase/(rid+'.json')
    out.parent.mkdir(exist_ok=True)
    raw = (json.dumps(request,ensure_ascii=False,indent=2)+'\n').encode()
    out.write_bytes(raw)
    return {'id':rid,'phase':phase,'seed':seed,'path':phase+'/'+out.name,
            'sha256':digest(raw),'source_request':digest(data)}
with ThreadPoolExecutor(4) as ex:
    rows=list(ex.map(build,[(p,i) for p in ('dev','formal') for i in range(1,4)]))
(root/'manifest.json').write_bytes((json.dumps({'source_commit':source,'parent':parent.name,
    'parent_sha256':digest(parent.read_bytes()),'requests':rows},indent=2)+'\n').encode())
print('6 requests compiled',digest((root/'manifest.json').read_bytes()))
