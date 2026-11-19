"""五种布局的目标值与点线定位图。像素比例沿用 evidence/section421-h3-span：对角轴距 250 mm 对应 593.7 px。"""
import json, math, pathlib
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
PX_PER_MM = 593.97 / 250          # B250 定位图：前排横向间距 419.84 px，即对角 593.7 px
PROP_MM, SHELL_MM = 127, (90, 50)
LAYOUTS = {   # 编号: (对角轴距 mm, 横向跨度/纵向跨度)
    'D220': (220, 1.00), 'D260': (260, 1.00), 'D300': (300, 1.00),
    'R125': (260, 1.25), 'R150': (260, 1.50),
}
def geometry(name):
    d, r = LAYOUTS[name]
    w, l = d * r / math.hypot(1, r), d / math.hypot(1, r)
    hubs = [(512 + sx * w / 2 * PX_PER_MM, 512 + sy * l / 2 * PX_PER_MM) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    return {'diagonal_mm': d, 'w_over_l': r, 'width_mm': round(w, 1), 'length_mm': round(l, 1), 'd_over_D': round(PROP_MM / d, 3),
            'shell_width_over_D': round(SHELL_MM[1] / d, 3), 'hubs_px': [[round(x, 1), round(y, 1)] for x, y in hubs]}
def sentence(name):
    g = geometry(name)
    if g['w_over_l'] == 1: return 'True X, %d mm opposite-motor span, equal horizontal and vertical spacing.' % g['diagonal_mm']
    return 'Wide X, %d mm opposite-motor span: the motors are %d mm apart side to side and %d mm apart front to back.' % (g['diagonal_mm'], round(g['width_mm']), round(g['length_mm']))
if __name__ == '__main__':
    (HERE / 'guides').mkdir(exist_ok=True); out = {}
    for name in LAYOUTS:
        g = geometry(name); h = g['hubs_px']
        im = Image.new('RGB', (1024, 1024), 'black'); d = ImageDraw.Draw(im)
        d.line([tuple(h[0]), tuple(h[2])], fill=(30, 90, 255), width=3); d.line([tuple(h[1]), tuple(h[3])], fill=(30, 90, 255), width=3)
        for x, y in h: d.ellipse([x - 10, y - 10, x + 10, y + 10], fill=(255, 0, 0))
        im.save(HERE / 'guides' / (name + '.png')); out[name] = g
    (HERE / 'layouts.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
    print(json.dumps(out, ensure_ascii=False))
