"""Index actual returned rewrites without treating lexical matches as image readings."""
import csv,json
from pathlib import Path
root=Path(__file__).resolve().parent
rows=json.loads((root/'manifest.json').read_bytes())['rows']
with (root/'prompt-audit.csv').open('w',encoding='utf-8-sig',newline='') as f:
    out=csv.writer(f)
    out.writerow(['slot','submitted_prompt','provider_revised_prompt','http_request_id','reported_image_count'])
    for row in rows:
        receipt=json.loads((root/'actual'/row['id']/'receipt.json').read_bytes())
        out.writerow([row['id'],row['fields']['prompt'],receipt['item'].get('revised_prompt'),receipt.get('request_id'),receipt.get('usage',{}).get('generated_images')])
