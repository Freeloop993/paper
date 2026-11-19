"""对拿不准的电机中心出中等倍数的大视野图。用法：python zoom.py <输出文件> P05-1 P05-2 …"""
import json, sys
from PIL import Image, ImageDraw
import tools, fixes
def sheet(keys, path, half=80, zoom=2.5, cols=6):
    final = fixes.final(json.loads((tools.HERE / 'auto.json').read_text())); cell = int(half * 2 * zoom); f = tools.font(13)
    sh = Image.new('RGB', (cols * cell, -(-len(keys) // cols) * (cell + 18)), 'white')
    for n, key in enumerate(keys):
        p, i = key.split('-'); x, y = final[p][int(i) - 1]
        im = Image.open(tools.ROOT / 'real' / 'stimuli' / (p + '.png')).convert('RGB')
        c = im.crop((x - half, y - half, x + half, y + half)).resize((cell, cell), Image.LANCZOS); d = ImageDraw.Draw(c, 'RGBA'); k = cell // 2
        for t in range(-half, half + 1, 10):
            q = k + t * zoom; a = 130 if t % 50 == 0 else 45
            d.line([(q, 0), (q, cell)], fill=(255, 0, 0, a)); d.line([(0, q), (cell, q)], fill=(255, 0, 0, a))
        for a, b in [((k - 30, k), (k - 8, k)), ((k + 8, k), (k + 30, k)), ((k, k - 30), (k, k - 8)), ((k, k + 8), (k, k + 30))]: d.line([a, b], fill=(0, 230, 0, 255), width=2)
        ox, oy = (n % cols) * cell, (n // cols) * (cell + 18); sh.paste(c, (ox, oy + 18)); ImageDraw.Draw(sh).text((ox + 4, oy + 2), '%s (%d,%d) grid 10px, bold 50px' % (key, x, y), fill=(0, 0, 0), font=f)
    sh.save(path, quality=90)
if __name__ == '__main__': sheet(sys.argv[2:], sys.argv[1])
