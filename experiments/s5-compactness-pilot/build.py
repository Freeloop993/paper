"""制作评议者用的单文件页面和研究者核对键。
用法：python3 build.py（需要 Pillow）。输入是 evidence/e1-open-20261112 的 24 张条件图组原图。
输出：participant/无人机外观评议.html（发给评议者）、researcher-key.json（研究者自留，不发）。
图像只做三件事：转 RGB 去元数据、缩到 720 像素见方、存成 JPEG。重复运行结果相同。"""
import base64, hashlib, io, json, pathlib
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parents[1] / 'evidence' / 'e1-open-20261112' / 'E1-actual'
VERSION = 'S5-pilot-1.0'
FACTORS = {'dd': ('d/D', ['0.40', '0.50', '0.60']), 'wl': ('W/L', ['0.70', '1.00', '1.30'])}
TERMS = [   # 词对与两端的说明取自 docs/protocols/word-pairs-v1-draft.md（顶视初稿用的三组）
    {'id': 'span', 'left': {'word': '紧凑', 'hint': '机身、臂与旋翼收拢在一起，部件之间留白少'}, 'right': {'word': '舒展', 'hint': '臂向外伸开，部件之间留白多'}},
    {'id': 'plain', 'left': {'word': '简洁', 'hint': '可见的分件线、开孔、色块少'}, 'right': {'word': '繁复', 'hint': '分件线、开孔、色块多'}},
    {'id': 'whole', 'left': {'word': '整体', 'hint': '臂、相机舱与机身连成连续的形体'}, 'right': {'word': '拼凑', 'hint': '部件像外挂上去的，交接处断开'}},
]

images, key = {}, {}
code = {}
for f, (name, levels) in FACTORS.items():
    for lv in levels:
        for r in range(1, 5):
            src = SRC / ('E1-control-%s%s-r%d' % (f, lv, r)) / 'original.png'
            raw = src.read_bytes()
            rgb = Image.open(io.BytesIO(raw)).convert('RGB')
            assert rgb.size == (1024, 1024), src
            cid = hashlib.sha256(rgb.tobytes()).hexdigest()[:10]
            buf = io.BytesIO(); rgb.resize((720, 720), Image.LANCZOS).save(buf, 'JPEG', quality=88, optimize=True)
            images[cid] = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
            code[(f, lv, r)] = cid
            key[cid] = {'factor': name, 'level': float(lv), 'seed_slot': r, 'source': str(src.relative_to(HERE.parents[1])),
                        'source_sha256': hashlib.sha256(raw).hexdigest(), 'embedded_sha256': hashlib.sha256(buf.getvalue()).hexdigest()}

singles = [code[(f, lv, r)] for f, (_, levels) in FACTORS.items() for r in (1, 3) for lv in levels]
pairs, pair_key = [], {}
def add(pid, a, b, kind, factor, slot, repeat_of=None):
    pairs.append({'id': pid, 'a': a, 'b': b, **({'repeatOf': repeat_of} if repeat_of else {})})
    pair_key[pid] = {'kind': kind, 'factor': factor, 'seed_slot': slot, 'lower': a, 'higher': b, **({'repeat_of': repeat_of} if repeat_of else {})}
n = 0
def pid():
    global n; n += 1; return 'p%02d' % n
for f, (name, (lo, mid, hi)) in FACTORS.items():
    first = None
    for r in range(1, 5):
        p = pid(); add(p, code[(f, lo, r)], code[(f, hi, r)], 'low-high', name, r)
        if r == 1: first = p
    for r in (2, 4):
        add(pid(), code[(f, lo, r)], code[(f, mid, r)], 'low-mid', name, r)
        add(pid(), code[(f, mid, r)], code[(f, hi, r)], 'mid-high', name, r)
    add(pid(), code[(f, lo, 1)], code[(f, hi, 1)], 'repeat', name, 1, repeat_of=first)
same = code[('dd', '0.50', 3)]
add(pid(), same, same, 'identical', None, 3)

pack_id = hashlib.sha256(json.dumps([VERSION, sorted(images), singles, pairs, TERMS], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]
pack = {'schema': 's5-compactness-pilot-v1', 'version': VERSION, 'pack': pack_id, 'terms': TERMS, 'singles': singles, 'pairs': pairs, 'images': images}
html = (HERE / 'template.html').read_text(encoding='utf-8').replace('/*__PACK__*/null', json.dumps(pack, ensure_ascii=False))
out = HERE / 'participant' / '无人机外观评议.html'
out.parent.mkdir(exist_ok=True); out.write_text(html, encoding='utf-8')
(HERE / 'researcher-key.json').write_text(json.dumps({'version': VERSION, 'pack': pack_id, 'html_sha256': hashlib.sha256(html.encode()).hexdigest(),
    'terms': [{'id': t['id'], 'left': t['left']['word'], 'right': t['right']['word']} for t in TERMS],
    'note': '单图评分统一换算为 1=左极（紧凑、简洁、整体），7=右极。成对题 lower、higher 指该因素取值较低、较高的一张。',
    'images': key, 'singles': singles, 'pairs': pair_key}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(out.name, round(len(html.encode()) / 1e6, 2), 'MB; pack', pack_id, '; images', len(images), '; singles', len(singles), '; pairs', len(pairs))
