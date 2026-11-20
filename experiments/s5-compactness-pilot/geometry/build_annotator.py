"""生成给第二位判读者的取点页面（单个离线 HTML）。图用评议页面里嵌的同一批 JPEG，逐字节相同。
顺序：先是 14 张分层抽出的重点图（约三成，各构型、各类型都有），再是其余 30 张；两段内部按图的摘要排序，与机型和评分无关。
用法：python3 build_annotator.py"""
import hashlib, json, pathlib

HERE = pathlib.Path(__file__).resolve().parent; ROOT = HERE.parent
KEY = json.loads((ROOT / 'researcher-key.json').read_text(encoding='utf-8'))
html = (ROOT / 'participant' / '无人机外观评议.html').read_text(encoding='utf-8')
PACK = json.loads(next(l for l in html.split('\n') if l.startswith('const PACK = '))[len('const PACK = '):].rstrip().rstrip(';'))
ROTORS = {'四旋翼': 4, '六旋翼': 6, '八旋翼': 8, '共轴四轴八桨': 4}

ids = sorted(KEY['singles'], key=lambda c: KEY['images'][c]['rgb_sha256'])
# 分层：每个类型按摘要顺序取一张，四旋翼凑到 10 张，其余 4 张（六旋翼 2、八旋翼 1、共轴 1）
quad = [c for c in ids if KEY['images'][c]['config'] == '四旋翼']; first, seen = [], set()
for c in quad:
    t = KEY['images'][c]['type']
    if t not in seen: seen.add(t); first.append(c)
first = first[:10]
for cfg, n in [('六旋翼', 2), ('八旋翼', 1), ('共轴四轴八桨', 1)]: first += [c for c in ids if KEY['images'][c]['config'] == cfg][:n]
order = first + [c for c in ids if c not in first]
pack = {'schema': 's5-geometry-v1', 'first': len(first), 'items': [{'id': c, 'rotors': ROTORS[KEY['images'][c]['config']]} for c in order], 'images': {c: PACK['images'][c] for c in order}}
pack['pack'] = hashlib.sha256(json.dumps([pack['schema'], pack['items'], sorted(hashlib.sha256(v.encode()).hexdigest() for v in pack['images'].values())]).encode()).hexdigest()[:12]
out = HERE / 'annotator' / '无人机取点.html'
out.write_text((HERE / 'annotator' / 'template.html').read_text(encoding='utf-8').replace('__PACK__', json.dumps(pack, ensure_ascii=False)), encoding='utf-8')
(HERE / 'annotator' / 'order.json').write_text(json.dumps({'pack': pack['pack'], 'rater_pack': PACK['pack'], 'first': len(first), 'order': [{'id': c, 'name': KEY['images'][c]['name'], 'rotors': ROTORS[KEY['images'][c]['config']]} for c in order],
    'html_sha256': hashlib.sha256(out.read_bytes()).hexdigest()}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(out.name, '%.2f MB' % (out.stat().st_size / 1e6), 'pack', pack['pack'], 'first', [KEY['images'][c]['name'].split()[0] for c in first])
