"""制作评议者用的单文件页面和研究者核对键（3.0 版：真实产品）。
评议者一次看一款真实的四旋翼产品的顶视图，按三组词评分。图由 real/prepare_web.py 整理，来源见 real/samples.json。
用法：python3 build.py（需要 Pillow）。输出 participant/无人机外观评议.html 和 researcher-key.json。
页面里嵌的是各厂商和销售商的产品图，只用于这次评议。"""
import base64, hashlib, io, json, pathlib
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
VERSION = 'S5-pilot-5.0'
TERMS = [   # 词对与两端的说明取自 docs/protocols/word-pairs-v1-draft.md（顶视初稿用的三组）
    {'id': 'span', 'left': {'word': '紧凑', 'hint': '机身、臂与旋翼收拢在一起，部件之间留白少'}, 'right': {'word': '舒展', 'hint': '臂向外伸开，部件之间留白多'}},
    {'id': 'plain', 'left': {'word': '简洁', 'hint': '可见的分件线、开孔、色块少'}, 'right': {'word': '繁复', 'hint': '分件线、开孔、色块多'}},
    {'id': 'whole', 'left': {'word': '整体', 'hint': '臂、相机舱与机身连成连续的形体'}, 'right': {'word': '拼凑', 'hint': '部件像外挂上去的，交接处断开'}},
]
samples = json.loads((HERE / 'real' / 'samples.json').read_text(encoding='utf-8'))['samples']
images, key, singles = {}, {}, []
for rid, meta in samples.items():
    rgb = Image.open(HERE / 'real' / 'stimuli' / (rid + '.png')).convert('RGB'); cid = hashlib.sha256(rgb.tobytes()).hexdigest()[:10]
    buf = io.BytesIO(); rgb.resize((720, 720), Image.LANCZOS).save(buf, 'JPEG', quality=90, optimize=True)
    images[cid] = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(); singles.append(cid)
    key[cid] = {'kind': 'product', 'name': '%s %s %s' % (rid, meta['brand'], meta['model']), 'type': meta['type'], 'config': meta['config'], **{k: meta[k] for k in ('sha256', 'bbox_w_over_h', 'fill_of_bbox', 'mean_gray')},
                'rgb_sha256': hashlib.sha256(rgb.tobytes()).hexdigest(), 'embedded_sha256': hashlib.sha256(buf.getvalue()).hexdigest()}
intro = ('<p>接下来每次看一架多旋翼无人机的顶视图，共 %d 张，都是真实的产品，有四个旋翼的，也有六个、八个旋翼的。请按第一印象，在三组词之间各选一个位置。</p>'
         '<p>每张图里无人机都画得差不多大，并且去掉了颜色，请看它各部分之间的比例和形状，不要管整机大小。没有对错。看不出来就选“看不出”。</p>') % len(singles)
pack_id = hashlib.sha256(json.dumps([VERSION, sorted(images), singles, TERMS], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]
pack = {'schema': 's5-compactness-pilot-v1', 'version': VERSION, 'pack': pack_id, 'terms': TERMS, 'singles': singles, 'pairs': [], 'intro1': intro, 'images': images}
html = (HERE / 'template.html').read_text(encoding='utf-8').replace('/*__PACK__*/null', json.dumps(pack, ensure_ascii=False))
out = HERE / 'participant' / '无人机外观评议.html'
out.parent.mkdir(exist_ok=True); out.write_text(html, encoding='utf-8')
(HERE / 'researcher-key.json').write_text(json.dumps({'version': VERSION, 'pack': pack_id, 'html_sha256': hashlib.sha256(html.encode()).hexdigest(),
    'terms': [{'id': t['id'], 'left': t['left']['word'], 'right': t['right']['word']} for t in TERMS],
    'note': '单图评分统一换算为 1=左极（紧凑、简洁、整体），7=右极。',
    'factors': {}, 'measures': {'bbox_w_over_h': '整机外接框宽高比', 'fill_of_bbox': '整机占外接框面积的比例', 'mean_gray': '机体平均灰度（越大越浅）'},
    'images': key, 'singles': singles, 'pairs': {}}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(out.name, round(len(html.encode()) / 1e6, 2), 'MB; pack', pack_id, '; images', len(images), '; singles', len(singles))
