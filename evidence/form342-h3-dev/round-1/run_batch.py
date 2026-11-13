"""Submit exactly the frozen slots; preserve outputs and failures without retries."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import os, getpass, json, sys
import h3_transport as api

root = Path(__file__).resolve().parent
api.ROOT = root
api.OUT = root/'actual'
api.OUT.mkdir(exist_ok=False)
rows = json.loads((root/'manifest.json').read_bytes())['rows']
assert all(api.sha((root/r['input_source']).read_bytes()) == r['input_sha256'] for r in rows)
if not os.environ.get('MINIMAX_API_KEY'):
    os.environ['MINIMAX_API_KEY'] = getpass.getpass('MiniMax (hidden): ')
key=os.environ['MINIMAX_API_KEY']
if not api.execute(rows[0],key):
    sys.exit(1)
with ThreadPoolExecutor(max_workers=3) as pool:
    for offset in range(1,len(rows),3):
        subset=rows[offset:offset+3]
        success=list(pool.map(lambda r:api.execute(r,key),subset))
        if not all(success):
            print('A slot failed. Subsequent submissions on hold.',flush=True)
            sys.exit(2)
