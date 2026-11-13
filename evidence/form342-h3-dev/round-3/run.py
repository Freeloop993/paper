from pathlib import Path
import json, sys, os, getpass, subprocess
root=Path(__file__).resolve().parent
sys.path.insert(0,str(root.parent/'round-2'))
import h3_transport as api
api.ROOT=root
api.OUT=root/'actual'
manifest=(root/'manifest.json').read_bytes()
repo=root.parents[2]
tracked=subprocess.check_output(['git','show','HEAD:'+str((root/'manifest.json').relative_to(repo).as_posix())],cwd=repo)
assert tracked==manifest
rows=json.loads(manifest)['rows']
assert len(rows)==8 and len(set(x['id'] for x in rows))==8
assert all(api.sha((root/x['input_source']).read_bytes())==x['input_sha256'] for x in rows)
api.OUT.mkdir(exist_ok=False)
key=os.environ.get('MINIMAX_API_KEY') or getpass.getpass('MiniMax H3 (hidden): ')
for row in rows:
    if not api.execute(row,key):
        raise SystemExit(1)
