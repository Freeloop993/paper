"""用第四章 E3 第三轮的四张 Qwen 原图做评议图：每张派生五档，同一个设计里只差一个量。
基准图取自分支 claude/e3-quad-qwen（e96d419）的 evidence/e3-quad-qwen-20261115/round-3/originals/，没有新出图。
臂长三档为电机到中心距离的 0.87、1.00、1.13 倍；桨径三档为 0.8、1.0、1.2 倍。几何编辑用 ../h3/derive.py 的分层做法。
用法：python3 derive_all.py（写 stimuli/ 和 derive.json）"""
import hashlib, json, pathlib, sys, warnings
import numpy as np
from PIL import Image
warnings.filterwarnings('ignore')
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'h3'))
import derive as d
BASES = {'Q1': 'E3R3-A1', 'Q2': 'E3R3-A2', 'Q3': 'E3R3-A3', 'Q4': 'E3R3-B1'}     # B2 是作者选中的方案，不给预试评议者看；B3 的桨离机身太近，加大后会与机身重叠
PAD = 0         # 不加边：各档离画面边缘最少也有十几个像素（见 derive.json 的 margin_px）
ARM, PROP = {'S': 0.87, 'B': 1.0, 'L': 1.13}, {'Pm': 0.8, 'Pp': 1.2}
(HERE / 'stimuli').mkdir(exist_ok=True); log = {}
for fam, name in BASES.items():
    raw = (HERE / 'bases' / (name + '.png')).read_bytes(); src = np.asarray(Image.open(HERE / 'bases' / (name + '.png')).convert('RGB'))
    bg = np.median(np.concatenate([src[:12].reshape(-1, 3), src[-12:].reshape(-1, 3)]), 0).astype(np.uint8)
    rgb = src if PAD == 0 else np.pad(src, ((PAD, PAD), (PAD, PAD), (0, 0)), constant_values=0)
    if PAD: rgb[:PAD] = rgb[-PAD:] = bg; rgb[:, :PAD] = rgb[:, -PAD:] = bg
    for v, k in ARM.items():
        img, g = d.derive(rgb, arm_mm=d.BASE_MM * k); Image.fromarray(img).save(HERE / 'stimuli' / ('%s-%s.png' % (fam, v)))
        log['%s-%s' % (fam, v)] = {'base': name, 'base_sha256': hashlib.sha256(raw).hexdigest(), 'arm_scale': k, 'prop_scale': 1.0, **g}
    for v, k in PROP.items():
        img, g = d.derive(rgb, prop=k); Image.fromarray(img).save(HERE / 'stimuli' / ('%s-%s.png' % (fam, v)))
        log['%s-%s' % (fam, v)] = {'base': name, 'base_sha256': hashlib.sha256(raw).hexdigest(), 'arm_scale': 1.0, 'prop_scale': k, **g}
(HERE / 'derive.json').write_text(json.dumps(log, ensure_ascii=False, indent=1) + '\n')
worst = 10 ** 9
for k, v in log.items():
    im = np.asarray(Image.open(HERE / 'stimuli' / (k + '.png')).convert('L')); ys, xs = np.nonzero(im < 235)
    v['margin_px'] = int(min(xs.min(), ys.min(), im.shape[1] - 1 - xs.max(), im.shape[0] - 1 - ys.max())); worst = min(worst, v['margin_px'])
(HERE / 'derive.json').write_text(json.dumps(log, ensure_ascii=False, indent=1) + '\n')
print('images', len(log), 'max overlap', max(v['overlap_px'] for v in log.values()), 'min margin', worst)
assert worst >= 12 and max(v['overlap_px'] for v in log.values()) == 0, '有图出画或桨与机身重叠'
