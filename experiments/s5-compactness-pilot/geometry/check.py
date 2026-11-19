"""出复看用的图：按 fixes.py 的结果，每个电机中心一格（原图 64×64 像素放大 3 倍，十字中心留空）；
以及每款一格的总览（电机中心、机壳前后左右缘、桨尖）。用法：python check.py <mark.py 的输出目录> <输出目录>"""
import json, math, pathlib, sys
import numpy as np
from PIL import Image, ImageDraw
import tools, fixes, mark, rough

def hub_sheets(final, out, half=32, zoom=3, cols=12, rows=6):
    items = [(p, i + 1, xy) for p in final for i, xy in enumerate(final[p])]; cell = half * 2 * zoom; f = tools.font(12); per = cols * rows
    for s in range(0, len(items), per):
        part = items[s:s + per]; sh = Image.new('RGB', (cols * cell, -(-len(part) // cols) * (cell + 16)), 'white')
        for n, (p, i, (x, y)) in enumerate(part):
            im = Image.open(tools.ROOT / 'real' / 'stimuli' / (p + '.png')).convert('RGB')
            c = im.crop((x - half, y - half, x + half, y + half)).resize((cell, cell), Image.LANCZOS); d = ImageDraw.Draw(c); k = half * zoom
            for a, b in [((k - 40, k), (k - 9, k)), ((k + 9, k), (k + 40, k)), ((k, k - 40), (k, k - 9)), ((k, k + 9), (k, k + 40))]: d.line([a, b], fill=(0, 230, 0), width=1)
            for t in range(-30, 31, 10): d.line([(k + t * zoom, 0), (k + t * zoom, 4)], fill=(255, 0, 0)); d.line([(0, k + t * zoom), (4, k + t * zoom)], fill=(255, 0, 0))
            ox, oy = (n % cols) * cell, (n // cols) * (cell + 16); sh.paste(c, (ox, oy + 16)); dd = ImageDraw.Draw(sh)
            dd.text((ox + 3, oy + 1), '%s-%d' % (p, i), fill=(0, 0, 0), font=f); dd.rectangle([ox, oy + 16, ox + cell - 1, oy + 15 + cell], outline=(160, 160, 160))
        sh.save(out / ('recheck-%d.jpg' % (s // per + 1)), quality=90)
    return -(-len(items) // per)

if __name__ == '__main__':
    src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    auto = json.loads((src / 'auto.json').read_text()); final = fixes.final(auto)
    print('recheck sheets', hub_sheets(final, out))
    moved = [math.dist(a['auto'], f) for p in auto for a, f in zip(auto[p]['hubs'], final[p])]
    far = [math.dist(a['rough'], f) for p in auto for a, f in zip(auto[p]['hubs'], final[p])]
    print('second pass moved the automatic point: median %.1f px, over 5 px in %d of %d' % (np.median(moved), sum(m > 5 for m in moved), len(moved)))
    print('second pass vs first rough point: median %.1f px, max %.1f px' % (np.median(far), max(far)))
