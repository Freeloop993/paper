"""由 a 版题面（已迁入 archive）取出同样的 150 条和 9 个主题，套进 b 版模板，生成可以直接发出的单文件页面。
题目、顺序、编号都不变，所以 a 版的对应键（archive/…/researcher/s2/key.json）照用。用法：python3 build_form_b.py"""
import hashlib, json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
A = ROOT / 'archive' / 'paper-reading-room' / 'studies' / '20261117-offline' / 'participants' / 'S2-review.html'
KEY = ROOT / 'archive' / 'paper-reading-room' / 'studies' / '20261117-offline' / 'researcher' / 's2' / 'key.json'
payload = re.search(r'<script type="application/json" id="payload">(.*?)</script>', A.read_text(encoding='utf-8'), re.S).group(1)
d = json.loads(payload); key = json.loads(KEY.read_text(encoding='utf-8'))
assert len(d['items']) == 150 and [i['id'] for i in d['items']] == list(key), '题目与对应键不一致'
out = HERE / 'S2-评论核查.html'
out.write_text((HERE / 'form-b.template.html').read_text(encoding='utf-8').replace('__DATA__', payload), encoding='utf-8')
print(out.name, out.stat().st_size, 'bytes; items', len(d['items']), '; sha256', hashlib.sha256(out.read_bytes()).hexdigest()[:16], '; a 版 sha256', hashlib.sha256(A.read_bytes()).hexdigest()[:16])
