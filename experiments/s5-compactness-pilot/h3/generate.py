"""按登记的 H3 通路出图：POST /v1/images/edits，模型 MiniMax-H3-Image，输入是点线定位图（可再带一张父图）和文字。
用法：MINIMAX_API_KEY=… python3 generate.py <编号> <布局> [父图路径]
密钥只从环境变量读取，不写入任何文件。每次调用（成功或失败）都在 actual/<编号>/ 留下实发参数和回执。"""
import base64, hashlib, json, os, pathlib, sys, time, urllib.error, urllib.request
from layouts import sentence, geometry

HERE = pathlib.Path(__file__).resolve().parent
MODEL, ORIGIN = 'MiniMax-H3-Image', {'global': 'https://api.minimax.io', 'cn': 'https://api.minimaxi.com'}[os.getenv('MINIMAX_REGION', 'global')]
BASE = '''Design a quadcopter for everyday aerial photography. Strict orthographic top view, nose toward the top edge, arms fully unfolded.
Match the four motor centres and arm directions in the layout. {layout} Each motor carries one stationary two-blade, 5-inch propeller. No propeller guards.
A rounded pod with a continuous curved outline. Main shell plan envelope 90 mm long by 50 mm wide.
Each arm is 15 mm wide at midspan.
Each arm tapers gradually out of the shell for at least two arm widths before reaching its running width, with no joint seam.
The camera housing lies within the nose outline. The camera faces horizontally forward; its optical face is hidden from directly overhead.
One top cover seam.
One forward camera only; the tail ends in uninterrupted shell. Join each arm visibly to its motor mount. Satin neutral mid-gray shell and arms, charcoal rotors, soft overhead studio light on white. Preserve the layout scale and framing.
Show the complete product on a plain light background. Omit guide marks and lettering.'''
PARENT = '\nThe second reference image shows this same product. Keep its shell shape and size, camera housing, arm thickness, propellers, colours and lighting unchanged; only move the four motors and arms to the positions given by the layout.'
sha = lambda b: hashlib.sha256(b).hexdigest()
url = lambda b: 'data:image/png;base64,' + base64.b64encode(b).decode()

def main(slot, layout, parent=None):
    key = os.environ['MINIMAX_API_KEY'].strip()
    out = HERE / 'actual' / slot; out.mkdir(parents=True, exist_ok=False)
    guide = (HERE / 'guides' / (layout + '.png')).read_bytes()
    refs = [('layout', guide)] + ([('parent', pathlib.Path(parent).read_bytes())] if parent else [])
    fields = {'model': MODEL, 'size': '1024x1024', 'n': 1, 'output_format': 'png', 'response_format': 'b64_json',
              'prompt': BASE.format(layout=sentence(layout)) + (PARENT if parent else '')}
    (out / 'submission.json').write_text(json.dumps({'slot': slot, 'layout': layout, 'target': geometry(layout), 'endpoint': ORIGIN + '/v1/images/edits',
        'fields': fields, 'images': [{'role': r, 'sha256': sha(b), **({'source': str(parent)} if r == 'parent' else {})} for r, b in refs]}, ensure_ascii=False, indent=1) + '\n')
    req = urllib.request.Request(ORIGIN + '/v1/images/edits', method='POST', headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'},
        data=json.dumps({**fields, 'images': [{'image_url': url(b)} for _, b in refs]}).encode())
    t0, receipt = time.time(), {'sent': time.strftime('%Y-%m-%dT%H:%M:%S%z')}
    try:
        with urllib.request.urlopen(req, timeout=300) as r: status, body = r.status, r.read()
    except urllib.error.HTTPError as e: status, body = e.code, e.read()
    receipt.update(http=status, elapsed_s=round(time.time() - t0, 2))
    try: data = json.loads(body)
    except ValueError: data = {'raw': body[:500].decode('utf-8', 'replace')}
    item = (data.get('data') or [{}])[0] if isinstance(data.get('data'), list) else {}
    png = base64.b64decode(item.pop('b64_json')) if item.get('b64_json') else None
    receipt.update({k: v for k, v in data.items() if k != 'data'}, item=item)
    if png: (out / 'original.png').write_bytes(png); receipt['output_sha256'] = sha(png)
    (out / 'receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=1) + '\n')
    print(slot, 'http', status, 'png' if png else 'NO IMAGE', receipt.get('elapsed_s'), json.dumps({k: receipt.get(k) for k in ('usage', 'base_resp', 'error')}, ensure_ascii=False)[:300])
    return bool(png)

if __name__ == '__main__':
    sys.exit(0 if main(*sys.argv[1:4]) else 1)
