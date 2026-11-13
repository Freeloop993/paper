"""Run the four registered H3 development slots once, in manifest order."""
import getpass
import json
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
sys.path.insert(0, str(root.parent / 'form342-h3-dev' / 'round-2'))
import h3_transport as api

api.ROOT = root
api.OUT = root / 'actual'
manifest = (root / 'manifest.json').read_bytes()
assert api.sha(manifest) == 'd2942cad4f83a26a32794f69233b2dd1fb3b5c627c098577acec109d3e03f6c8'
rows = json.loads(manifest)['rows']
for row in rows:
    assert api.sha((root / row['input_source']).read_bytes()) == row['input_sha256']
    assert api.sha(row['fields']['prompt'].encode()) == row['prompt_sha256']
key = os.getenv('MINIMAX_API_KEY') or getpass.getpass('MiniMax H3 credential (hidden): ')
api.OUT.mkdir(exist_ok=False)
for row in rows:
    if not api.execute(row, key):
        sys.exit(1)
