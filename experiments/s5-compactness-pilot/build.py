"""制作评议者用的单文件页面和研究者核对键。
用法：先在 h3/ 下运行 derive.py 得到 20 张刺激图，再运行 python3 build.py（需要 Pillow）。
输出：participant/无人机外观评议.html（发给评议者）、researcher-key.json（研究者自留，不发）。
图像只做三件事：转 RGB 去元数据、缩到 720 像素见方、存成 JPEG。重复运行结果相同。"""
import base64, hashlib, io, json, pathlib
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / 'h3'
VERSION = 'S5-pilot-1.1'
FAMILIES = ['F1', 'F2', 'F3', 'F4']
FACTORS = {'轴距': ['S', 'B', 'L'], '桨径': ['Pm', 'B', 'Pp']}       # 低、中、高；B 是 H3 原图，两个因素共用
TERMS = [   # 词对与两端的说明取自 docs/protocols/word-pairs-v1-draft.md（顶视初稿用的三组）
    {'id': 'span', 'left': {'word': '紧凑', 'hint': '机身、臂与旋翼收拢在一起，部件之间留白少'}, 'right': {'word': '舒展', 'hint': '臂向外伸开，部件之间留白多'}},
    {'id': 'plain', 'left': {'word': '简洁', 'hint': '可见的分件线、开孔、色块少'}, 'right': {'word': '繁复', 'hint': '分件线、开孔、色块多'}},
    {'id': 'whole', 'left': {'word': '整体', 'hint': '臂、相机舱与机身连成连续的形体'}, 'right': {'word': '拼凑', 'hint': '部件像外挂上去的，交接处断开'}},
]
geom = json.loads((SRC / 'derive.json').read_text(encoding='utf-8'))
images, key, code = {}, {}, {}
for f in FAMILIES:
    base = (SRC / 'actual' / (f + '-D260') / 'original.png').read_bytes()
    for v in ('S', 'B', 'L', 'Pm', 'Pp'):
        rgb = Image.open(SRC / 'stimuli' / ('%s-%s.png' % (f, v))).convert('RGB')
        assert rgb.size == (1024, 1024)
        cid = hashlib.sha256(rgb.tobytes()).hexdigest()[:10]
        buf = io.BytesIO(); rgb.resize((720, 720), Image.LANCZOS).save(buf, 'JPEG', quality=90, optimize=True)
        images[cid] = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
        code[(f, v)] = cid; g = geom['%s-%s' % (f, v)]
        key[cid] = {'family': f, 'variant': v, 'arm_mm': g['level_mm'], 'prop_scale': g['prop_scale'], 'd_over_D': g['d_over_D'], 'diagonal_px': g['diagonal_px'],
                    'base': 'h3/actual/%s-D260/original.png' % f, 'base_sha256': hashlib.sha256(base).hexdigest(), 'rgb_sha256': hashlib.sha256(rgb.tobytes()).hexdigest(),
                    'embedded_sha256': hashlib.sha256(buf.getvalue()).hexdigest()}

singles = [code[(f, v)] for f in ('F1', 'F3') for v in ('S', 'B', 'L', 'Pm', 'Pp')]
pairs, pair_key = [], {}
def add(pid, a, b, kind, factor, family, repeat_of=None):
    pairs.append({'id': pid, 'a': a, 'b': b, **({'repeatOf': repeat_of} if repeat_of else {})})
    pair_key[pid] = {'kind': kind, 'factor': factor, 'family': family, 'lower': a, 'higher': b, **({'repeat_of': repeat_of} if repeat_of else {})}
n = 0
def pid():
    global n; n += 1; return 'p%02d' % n
for name, (lo, mid, hi) in FACTORS.items():
    first = None
    for f in FAMILIES:
        p = pid(); add(p, code[(f, lo)], code[(f, hi)], 'low-high', name, f)
        if f == 'F1': first = p
    for f in ('F2', 'F4'):
        add(pid(), code[(f, lo)], code[(f, mid)], 'low-mid', name, f)
        add(pid(), code[(f, mid)], code[(f, hi)], 'mid-high', name, f)
    add(pid(), code[(f1 := 'F1', lo)], code[('F1', hi)], 'repeat', name, 'F1', repeat_of=first)
same = code[('F3', 'B')]
add(pid(), same, same, 'identical', None, 'F3')

pack_id = hashlib.sha256(json.dumps([VERSION, sorted(images), singles, pairs, TERMS], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]
pack = {'schema': 's5-compactness-pilot-v1', 'version': VERSION, 'pack': pack_id, 'terms': TERMS, 'singles': singles, 'pairs': pairs, 'images': images}
html = (HERE / 'template.html').read_text(encoding='utf-8').replace('/*__PACK__*/null', json.dumps(pack, ensure_ascii=False))
out = HERE / 'participant' / '无人机外观评议.html'
out.parent.mkdir(exist_ok=True); out.write_text(html, encoding='utf-8')
(HERE / 'researcher-key.json').write_text(json.dumps({'version': VERSION, 'pack': pack_id, 'html_sha256': hashlib.sha256(html.encode()).hexdigest(),
    'terms': [{'id': t['id'], 'left': t['left']['word'], 'right': t['right']['word']} for t in TERMS],
    'note': '单图评分统一换算为 1=左极（紧凑、简洁、整体），7=右极。成对题 lower、higher 指该因素取值较低、较高的一张：轴距较短与较长，桨较小与较大。',
    'factors': {'轴距': {'unit': '对角轴距 mm', 'levels': {'S': 220, 'B': 260, 'L': 300}, 'higher': '轴距较长的一张'}, '桨径': {'unit': '桨叶缩放倍数', 'levels': {'Pm': 0.8, 'B': 1.0, 'Pp': 1.2}, 'higher': '桨较大的一张'}},
    'images': key, 'singles': singles, 'pairs': pair_key}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(out.name, round(len(html.encode()) / 1e6, 2), 'MB; pack', pack_id, '; images', len(images), '; singles', len(singles), '; pairs', len(pairs))
