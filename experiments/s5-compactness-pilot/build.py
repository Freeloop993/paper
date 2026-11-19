"""制作评议者用的单文件页面和研究者核对键（2.0 版）。
第一部分：12 个不同的设计，一次一张，按三组词评分。第二部分：同一个设计只差一个量的两张图并排，问哪一架更紧凑。
用法：先运行 qwen/prepare.py 和 qwen/derive_all.py，再运行 python3 build.py（需要 Pillow、numpy、scipy）。
输出：participant/无人机外观评议.html（发给评议者）、researcher-key.json（研究者自留，不发）。
所有图都统一占幅（整机外接框长边占画面 80%），转 RGB 去元数据，缩到 720 像素见方，存成 JPEG。"""
import base64, hashlib, io, json, pathlib, sys
import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / 'qwen'))
from prepare import DESIGNS, normalise
VERSION = 'S5-pilot-2.0'
FAMILIES = ['Q1', 'Q2', 'Q3', 'Q4']
FACTORS = {'轴距': ('S', 'L'), '桨径': ('Pm', 'Pp')}          # 每个因素只比最低档和最高档
TERMS = [   # 词对与两端的说明取自 docs/protocols/word-pairs-v1-draft.md（顶视初稿用的三组）
    {'id': 'span', 'left': {'word': '紧凑', 'hint': '机身、臂与旋翼收拢在一起，部件之间留白少'}, 'right': {'word': '舒展', 'hint': '臂向外伸开，部件之间留白多'}},
    {'id': 'plain', 'left': {'word': '简洁', 'hint': '可见的分件线、开孔、色块少'}, 'right': {'word': '繁复', 'hint': '分件线、开孔、色块多'}},
    {'id': 'whole', 'left': {'word': '整体', 'hint': '臂、相机舱与机身连成连续的形体'}, 'right': {'word': '拼凑', 'hint': '部件像外挂上去的，交接处断开'}},
]
images, key = {}, {}
def embed(rgb_image, meta):
    rgb = rgb_image.convert('RGB'); cid = hashlib.sha256(rgb.tobytes()).hexdigest()[:10]
    buf = io.BytesIO(); rgb.resize((720, 720), Image.LANCZOS).save(buf, 'JPEG', quality=90, optimize=True)
    images[cid] = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
    key[cid] = {**meta, 'rgb_sha256': hashlib.sha256(rgb.tobytes()).hexdigest(), 'embedded_sha256': hashlib.sha256(buf.getvalue()).hexdigest()}
    return cid

measures = json.loads((HERE / 'qwen' / 'designs.json').read_text(encoding='utf-8'))
singles = [embed(Image.open(HERE / 'qwen' / 'designs' / (n + '.png')), {'kind': 'design', 'name': n, 'base': 'qwen/bases/%s.png' % n, **measures[n]}) for n in DESIGNS]

geom = json.loads((HERE / 'qwen' / 'derive.json').read_text(encoding='utf-8')); code = {}
for f in FAMILIES:
    for v in ('S', 'B', 'L', 'Pm', 'Pp'):
        g = geom['%s-%s' % (f, v)]; img, _ = normalise(np.asarray(Image.open(HERE / 'qwen' / 'stimuli' / ('%s-%s.png' % (f, v))).convert('RGB')))
        code[(f, v)] = embed(img, {'kind': 'variant', 'family': f, 'variant': v, 'arm_scale': g['arm_scale'], 'prop_scale': g['prop_scale'], 'd_over_D': g['d_over_D'],
                                   'base': 'qwen/bases/%s.png' % g['base'], 'base_sha256': g['base_sha256']})
pairs, pair_key, n = [], {}, 0
def add(a, b, kind, factor, family, repeat_of=None):
    global n; n += 1; pid = 'p%02d' % n
    pairs.append({'id': pid, 'a': a, 'b': b, **({'repeatOf': repeat_of} if repeat_of else {})})
    pair_key[pid] = {'kind': kind, 'factor': factor, 'family': family, 'lower': a, 'higher': b, **({'repeat_of': repeat_of} if repeat_of else {})}
    return pid
for name, (lo, hi) in FACTORS.items():
    first = [add(code[(f, lo)], code[(f, hi)], 'low-high', name, f) for f in FAMILIES][0]
    add(code[('Q1', lo)], code[('Q1', hi)], 'repeat', name, 'Q1', repeat_of=first)
add(code[('Q3', 'B')], code[('Q3', 'B')], 'identical', None, 'Q3')
used = set(singles) | {p[k] for p in pairs for k in ('a', 'b')}
images = {c: u for c, u in images.items() if c in used}; key = {c: v for c, v in key.items() if c in used}

pack_id = hashlib.sha256(json.dumps([VERSION, sorted(images), singles, pairs, TERMS], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]
pack = {'schema': 's5-compactness-pilot-v1', 'version': VERSION, 'pack': pack_id, 'terms': TERMS, 'singles': singles, 'pairs': pairs, 'images': images}
html = (HERE / 'template.html').read_text(encoding='utf-8').replace('/*__PACK__*/null', json.dumps(pack, ensure_ascii=False))
out = HERE / 'participant' / '无人机外观评议.html'
out.parent.mkdir(exist_ok=True); out.write_text(html, encoding='utf-8')
(HERE / 'researcher-key.json').write_text(json.dumps({'version': VERSION, 'pack': pack_id, 'html_sha256': hashlib.sha256(html.encode()).hexdigest(),
    'terms': [{'id': t['id'], 'left': t['left']['word'], 'right': t['right']['word']} for t in TERMS],
    'note': '单图评分统一换算为 1=左极（紧凑、简洁、整体），7=右极。成对题 lower、higher 指该因素取值较低、较高的一张：轴距较短与较长，桨较小与较大。',
    'factors': {'轴距': {'higher': '轴距较长的一张', 'levels': '电机到中心的距离为原图的 0.87 倍对 1.13 倍'}, '桨径': {'higher': '桨较大的一张', 'levels': '桨叶 0.8 倍对 1.2 倍'}},
    'measures': {'w_over_l': '电机横向跨度比纵向跨度', 'd_over_D': '桨径比对角轴距', 'body_width_over_D': '机身宽比对角轴距', 'body_length_over_D': '机身长比对角轴距', 'bbox_w_over_h': '整机外接框宽高比', 'fill_of_bbox': '整机占外接框面积的比例'},
    'images': key, 'singles': singles, 'pairs': pair_key}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(out.name, round(len(html.encode()) / 1e6, 2), 'MB; pack', pack_id, '; images', len(images), '; singles', len(singles), '; pairs', len(pairs))
