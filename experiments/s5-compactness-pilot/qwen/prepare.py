"""第一部分用图：从三轮 Qwen 设计候选里取 12 个不同的设计，统一占幅后供单图评分，并量出各自的比例。
基准图取自分支 claude/e3-quad-qwen（e96d419）的 evidence/e3-quad-qwen-20261115，没有新出图。第三轮的 B2 是作者选中的方案，不放进来。
统一占幅：把整机外接框的长边缩放到画面的 80%，居中。这样评的是比例，不是整机在画面里的大小。
用法：python3 prepare.py（写 designs/ 和 designs.json）；派生成对图另见 derive_all.py。"""
import hashlib, json, pathlib, sys, warnings
import numpy as np
from PIL import Image
from scipy import ndimage
warnings.filterwarnings('ignore')
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'h3'))
import derive as d
DESIGNS = ['E3R1-A1', 'E3R1-A3', 'E3R1-B1', 'E3R1-B3', 'E3R1-C2', 'E3R2-A2', 'E3R2-B3', 'E3R2-C2', 'E3R3-A1', 'E3R3-A3', 'E3R3-B1', 'E3R3-C3']
SIDE, FILL = 1024, 0.80
def normalise(rgb):
    """整机外接框长边缩放到画面的 FILL，居中，背景用原图边缘的颜色。"""
    lum = rgb.astype(float) @ np.array([0.299, 0.587, 0.114]); bg = np.median(np.concatenate([rgb[:12].reshape(-1, 3), rgb[-12:].reshape(-1, 3)]), 0)
    fg = lum < min(246, bg @ np.array([0.299, 0.587, 0.114]) - 6); lab, n = ndimage.label(fg)
    keep = np.isin(lab, np.flatnonzero(ndimage.sum(np.ones_like(lab), lab, range(1, n + 1)) >= 60) + 1); ys, xs = np.nonzero(keep)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); k = SIDE * FILL / max(x1 - x0 + 1, y1 - y0 + 1)
    m = 14; crop = Image.fromarray(rgb[max(y0 - m, 0):y1 + m, max(x0 - m, 0):x1 + m])
    crop = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
    out = Image.new('RGB', (SIDE, SIDE), tuple(int(v) for v in bg)); out.paste(crop, ((SIDE - crop.width) // 2, (SIDE - crop.height) // 2))
    return out, {'bbox_w_over_h': round(float((x1 - x0 + 1) / (y1 - y0 + 1)), 3), 'fill_of_bbox': round(float(keep[y0:y1 + 1, x0:x1 + 1].mean()), 3)}
def measure(rgb):
    """电机位置、桨径和机身外接框。深色碳纤维臂会和桨连成一片，读不出时留空，以后人工取点。"""
    try:
        bgc, body, parts, c = d.layers(rgb); hubs = np.array([q['hub'] for q in parts]); half = np.mean([q['half'] for q in parts])
        xs, ys = np.sort(hubs[:, 0]), np.sort(hubs[:, 1]); W, L = xs[2:].mean() - xs[:2].mean(), ys[2:].mean() - ys[:2].mean(); D = np.hypot(W, L)
        by, bx = np.nonzero(body); bw, bl = bx.max() - bx.min() + 1, by.max() - by.min() + 1
        return {'w_over_l': round(float(W / L), 3), 'd_over_D': round(float(2 * half / D), 3), 'body_width_over_D': round(float(bw / D), 3), 'body_length_over_D': round(float(bl / D), 3)}
    except Exception as e:
        return {'w_over_l': None, 'd_over_D': None, 'body_width_over_D': None, 'body_length_over_D': None, 'note': '程序读不出：' + type(e).__name__}
if __name__ == '__main__':
    (HERE / 'designs').mkdir(exist_ok=True); log = {}
    for name in DESIGNS:
        raw = (HERE / 'bases' / (name + '.png')).read_bytes(); rgb = np.asarray(Image.open(HERE / 'bases' / (name + '.png')).convert('RGB'))
        img, g = normalise(rgb); img.save(HERE / 'designs' / (name + '.png'))
        log[name] = {'base_sha256': hashlib.sha256(raw).hexdigest(), **g, **measure(rgb)}
        print(name, {k: v for k, v in log[name].items() if k != 'base_sha256'})
    (HERE / 'designs.json').write_text(json.dumps(log, ensure_ascii=False, indent=1) + '\n')
