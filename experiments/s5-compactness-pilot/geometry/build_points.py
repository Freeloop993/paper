"""把三遍取点合成 points.csv。用法：python build_points.py [复看图输出目录]
电机中心来自 auto.json（自动候选）加 fixes.py（逐点人工修正）；机壳前后缘来自 rough.py 的读数，
离机体轮廓 8 像素以内的吸到轮廓上；机壳左右缘在电机中心平均高度那一行上量，量不了的用 rough.py 或 OVERRIDE 的人工值；
桨尖由 mark.blade_reach 从电机中心向外量，OVERRIDE 里可以改或标为不可判。"""
import csv, json, math, pathlib, sys
import numpy as np
from PIL import Image, ImageDraw
import tools, rough, fixes, mark

READER = 'claude-20261120'
# 复看总览图后的人工修改。键：body_top/body_bottom/body_left/body_right（像素），tips（None 表示桨径不可判，或逐桨的桨尖坐标），note。
OVERRIDE = {
    'P06': dict(tips=[(169, 429), None, None, None], note='桨在护圈内，桨尖读自 2 倍放大图，约 ±6 像素'),
    'P07': dict(tips=[(220, 428), None, None, None], note='桨在护圈内，桨尖读自 2 倍放大图，约 ±6 像素；机头朝下'),
    'P09': dict(tips=[(335, 159), None, None, None], note='前后电机由侧梁相连，自动量法失效，桨尖读自总览图，约 ±5 像素'),
    'P10': dict(tips=[(245, 460), None, None, None], note='桨在涵道内，桨尖读自 2 倍放大图，约 ±6 像素'),
    'P11': dict(body_left=440, body_right=584, note='电机平均高度那一行连着宽臂，机壳左右缘人工取'),
    'P16': dict(tips=None, note='桨叶收拢，桨径不可判；原图略带透视'),
    'P17': dict(note='机头的云台载荷不计入机壳；这张图可能是底面，待核'),
    'P18': dict(note='机身近白，在白底上很淡'),
    'P21': dict(tips=[(450, 161), None, None, None], note='电机下有桁架，自动量法失效，桨尖读自总览图，约 ±5 像素'),
    'P25': dict(tips=[(169, 278), None, None, None], note='桨在网罩内，桨尖读自 2 倍放大图，约 ±6 像素'),
    'P27': dict(tips=[(204, 105), None, None, None], note='机臂细而弯，自动量法失效，桨尖读自总览图，约 ±5 像素'),
    'P29': dict(keep=[1, 2, 3], note='左后桨的自动读数沿天线杆走偏，不用'),
    'P30': dict(tips=None, note='半透明桨叶在涵道内，桨径不可判'),
    'P36': dict(note='原图小，放大后发虚，电机中心约 ±5 像素'),
    'P39': dict(keep=[1, 2], note='相邻桨叶相接，只有前两个桨的桨尖读数可用'),
    'P41': dict(note='原图上下被裁，最上和最下两对桨的桨叶不完整'),
    'P43': dict(keep=[1], nose_axis='x', note='机身横置，机头不朝上：长取水平方向，宽取竖直方向；H 形机架，只有左上桨的桨尖读数可用'),
}

def snap(m, fixed, v, axis, tol=8):
    line = m[:, fixed] if axis == 'y' else m[fixed, :]
    edges = [i for i in range(max(1, v - tol), min(1023, v + tol) + 1) if line[i] != line[i - 1]]
    return min(edges, key=lambda i: abs(i - v)) if edges else v

def build():
    auto = json.loads((tools.HERE / 'auto.json').read_text()); hubs = fixes.final(auto); rows = []
    for p in tools.IDS:
        m = tools.mask(p); r = rough.to_image(p); o = OVERRIDE.get(p, {}); h = hubs[p]
        cx, cy = sum(x for x, _ in h) / len(h), sum(y for _, y in h) / len(h); mx, my = round(cx), round(cy)
        top = o.get('body_top', snap(m, mx, r['top'], 'y')); bottom = o.get('body_bottom', snap(m, mx, r['bottom'], 'y'))
        side = 'manual'
        if 'left' in r: left, right = snap(m, my, r['left'], 'x'), snap(m, my, r['right'], 'x')
        else:
            run = mark.run(m, my, mx, 'x'); left, right = run if run else (None, None); side = 'row_run'
        left, right = o.get('body_left', left), o.get('body_right', right)
        if 'body_left' in o or 'body_right' in o: side = 'manual'
        tips = []
        for i, (x, y) in enumerate(h):
            reach, tip = mark.blade_reach(m, x, y, cx, cy); tips.append(tip)
            if reach < 15: tips[-1] = None            # 电机中心落在白色上，量不出来
        if 'tips' in o: tips = o['tips'] if o['tips'] is not None else [None] * len(h)
        if 'keep' in o: tips = [t if i + 1 in o['keep'] else None for i, t in enumerate(tips)]
        rows.append({'image_id': p, 'name': tools.SAMPLES[p]['brand'] + ' ' + tools.SAMPLES[p]['model'], 'config': tools.SAMPLES[p]['config'], 'rotors': len(h), 'reader': READER,
                     'hubs': h, 'row_y': my, 'midline_x': mx, 'top': top, 'bottom': bottom, 'left': left, 'right': right, 'side_source': side, 'tips': tips, 'nose_axis': o.get('nose_axis', 'y'), 'note': o.get('note', '')})
    return rows

def write(rows):
    with open(tools.HERE / 'points.csv', 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f); head = ['image_id', 'name', 'config', 'rotors', 'reader']
        for i in range(1, 9): head += ['hub%d_x' % i, 'hub%d_y' % i]
        head += ['midline_x', 'row_y', 'body_top_y', 'body_bottom_y', 'body_left_x', 'body_right_x', 'side_source', 'nose_axis']
        for i in range(1, 9): head += ['tip%d_x' % i, 'tip%d_y' % i]
        w.writerow(head + ['note'])
        for r in rows:
            line = [r['image_id'], r['name'], r['config'], r['rotors'], r['reader']]
            for i in range(8): line += list(r['hubs'][i]) if i < len(r['hubs']) else ['', '']
            line += [r['midline_x'], r['row_y'], r['top'], r['bottom'], '' if r['left'] is None else r['left'], '' if r['right'] is None else r['right'], r['side_source'], r['nose_axis']]
            for i in range(8): line += list(r['tips'][i]) if i < len(r['tips']) and r['tips'][i] is not None else ['', '']
            w.writerow(line + [r['note']])

def overview(rows, out, size=640, cols=3, per=6):
    k = size / 1024; f = tools.font(15)
    for s in range(0, len(rows), per):
        part = rows[s:s + per]; sh = Image.new('RGB', (cols * size, -(-len(part) // cols) * size), 'white')
        for n, r in enumerate(part):
            im = Image.open(tools.ROOT / 'real' / 'stimuli' / (r['image_id'] + '.png')).convert('RGB').resize((size, size), Image.LANCZOS); d = ImageDraw.Draw(im)
            if r['left'] is not None:
                d.rectangle([r['left'] * k, r['top'] * k, r['right'] * k, r['bottom'] * k], outline=(0, 170, 255), width=2)
            else:
                d.line([(0, r['top'] * k), (size, r['top'] * k)], fill=(0, 170, 255), width=2); d.line([(0, r['bottom'] * k), (size, r['bottom'] * k)], fill=(0, 170, 255), width=2)
            d.line([(0, r['row_y'] * k), (size, r['row_y'] * k)], fill=(255, 160, 0), width=1)
            for i, (x, y) in enumerate(r['hubs']):
                d.ellipse([x * k - 4, y * k - 4, x * k + 4, y * k + 4], outline=(0, 230, 0), width=2); d.text((x * k + 6, y * k - 8), str(i + 1), fill=(0, 150, 0), font=f)
                t = r['tips'][i]
                if t is not None: d.line([(x * k, y * k), (t[0] * k, t[1] * k)], fill=(255, 0, 200), width=1); d.ellipse([t[0] * k - 4, t[1] * k - 4, t[0] * k + 4, t[1] * k + 4], outline=(255, 0, 200), width=2)
            d.text((6, 4), r['image_id'] + ' ' + r['side_source'], fill=(0, 0, 160), font=f)
            sh.paste(im, ((n % cols) * size, (n // cols) * size))
        sh.save(out / ('overview-%d.jpg' % (s // per + 1)), quality=88)
    return -(-len(rows) // per)

if __name__ == '__main__':
    rows = build(); write(rows)
    # 左右对称性自查：四旋翼前一对、后一对电机的高度差，以及两对的中线差
    for r in rows:
        if r['rotors'] == 4:
            (ax, ay), (bx, by), (cx, cy), (dx, dy) = r['hubs']; issues = []
            if abs(ay - by) > 6: issues.append('front pair height differs %d' % (ay - by))
            if abs(cy - dy) > 6: issues.append('rear pair height differs %d' % (cy - dy))
            if abs((ax + bx) / 2 - (cx + dx) / 2) > 6: issues.append('midline front %.0f rear %.0f' % ((ax + bx) / 2, (cx + dx) / 2))
            if issues: print(r['image_id'], '; '.join(issues), r['hubs'])
    if len(sys.argv) > 1:
        out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); print('overview sheets', overview(rows, out))
