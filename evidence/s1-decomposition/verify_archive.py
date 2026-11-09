"""Optional verification against private source archives; no source archive is published."""
from collections import defaultdict
from hashlib import sha256
import json,sys,zipfile
from pathlib import Path
from decompose import P,read,main
def sha(b):return sha256(b).hexdigest()
def run(s1_zip,main_dir):
    rg=read(P/'executed-graphs.json')
    assert sha(s1_zip.read_bytes())==rg['zip_sha256']
    graphs={}
    with zipfile.ZipFile(s1_zip) as z:
        for c,r in rg['cases'].items():
            q,h=[z.read(c+'-'+s+'.json') for s in ('request','history')]
            qj=json.loads(q);hj=json.loads(h);pid=json.loads(z.read(c+'-accepted.json'))['prompt_id']
            assert sha(q)==r['original_request_sha256'] and sha(h)==r['history_sha256']
            assert hj[pid]['prompt'][1]==pid and hj[pid]['status']['status_str']=='success'
            assert hj[pid]['prompt'][2]==qj['prompt']==r['graph']
            assert json.loads(z.read(c+'-output.json'))['sha256']==r['output_sha256']==sha((P.parent/'s1-axis-repeat/originals'/(c+'.png')).read_bytes())
            graphs[c]=qj['prompt']
        for blk in ('B1','B2'):
            t,l,f=[graphs[f'S1-{blk}-{arm}'] for arm in 'TLF']
            assert t['4']==l['4']==f['4'] and l['9']==f['9'] and l['9']['inputs']['strength']==.35
            assert t['10']['inputs']['model']==['1',0] and l['10']['inputs']['model']==f['10']['inputs']['model']==['9',0]
            assert {k for k in l if l[k]!=f[k]}=={'5','12'}
    mapping=read(main_dir/'review-map.json');proto={c['id']:c for c in read(main_dir/'protocol.json')['cases']}
    for r in read(P/'main18-input.json'):
        name=next(n for n,v in mapping.items() if v['case_id']==r['case'])
        folder=main_dir/('blind-review-'+r['reader']);raw=folder/'annotation.json'
        assert sha(raw.read_bytes())==r['raw_annotation_sha256'] and sha((folder/(name+'.png')).read_bytes())==r['original_sha256']==mapping[name]['sha256']
        assert read(raw)['cases'][name]['motors']==r['observed']
        t=proto[r['case']]['target_geometry']['centers'];assert [t[i] for i in (0,1,3,2)]==r['targets']
    assert json.loads(json.dumps(main()))==read(P/'results.json')
if __name__=='__main__':run(Path(sys.argv[1]),Path(sys.argv[2]));print('6 executed graphs + 18 originals x 2 readers verified')
