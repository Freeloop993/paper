"""取点用的辅助：加载评议用图、出带坐标网格的图、在粗点附近找近似圆对称的中心、出放大叠点图。
AI 判读者（Claude）标第一遍时用的就是这些。坐标一律是 1024×1024 评议用图的像素，原点在左上，x 向右，y 向下。"""
import json, pathlib, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SAMPLES = json.loads((ROOT / 'real' / 'samples.json').read_text(encoding='utf-8'))['samples']
IDS = list(SAMPLES)

def font(size):
    for p in ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()

def gray(pid):
    return np.asarray(Image.open(ROOT / 'real' / 'stimuli' / (pid + '.png')).convert('L')).astype(np.float32)

def mask(pid, tol=14):
    """前景：从四边漫水填充近白背景，填不到的都算机体（机体内部的白色不会被当成背景）。"""
    g = gray(pid); near = g >= 255 - tol
    lab, _ = ndimage.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return ~np.isin(lab, list(edge))

def grid_cell(pid, size=768, step=50):
    im = Image.open(ROOT / 'real' / 'stimuli' / (pid + '.png')).convert('RGB'); k = size / 1024
    im = im.resize((size, size), Image.LANCZOS); d = ImageDraw.Draw(im, 'RGBA'); f = font(15)
    for v in range(0, 1025, step):
        major = v % 100 == 0; c = (220, 30, 30, 150 if major else 60); p = v * k
        d.line([(p, 0), (p, size)], fill=c, width=1); d.line([(0, p), (size, p)], fill=c, width=1)
        if major and 0 < v < 1024:
            d.text((p + 2, 1), str(v), fill=(200, 0, 0, 255), font=f); d.text((2, p + 1), str(v), fill=(200, 0, 0, 255), font=f)
            d.text((p + 2, size - 18), str(v), fill=(200, 0, 0, 255), font=f); d.text((size - 34, p + 1), str(v), fill=(200, 0, 0, 255), font=f)
    d.rectangle([size // 2 - 60, 20, size // 2 + 60, 44], fill=(255, 255, 255, 230)); d.text((size // 2 - 54, 22), '%s  %s' % (pid, SAMPLES[pid]['config'][:1] and pid), fill=(0, 0, 160, 255), font=font(18))
    return im

def sheet(pids, path, size=768, cols=2):
    rows = -(-len(pids) // cols); out = Image.new('RGB', (cols * size, rows * size), 'white')
    for i, p in enumerate(pids): out.paste(grid_cell(p, size), ((i % cols) * size, (i // cols) * size))
    out.save(path, quality=88)

if __name__ == '__main__':
    out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    for i in range(0, len(IDS), 4): sheet(IDS[i:i + 4], out / ('grid-%02d.jpg' % (i // 4 + 1)))
    print('sheets', -(-len(IDS) // 4))
