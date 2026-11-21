# -*- coding: utf-8 -*-
"""a8-ai-reader 1.0 —— 给独立 AI 判读者用的看图与记点工具。
只做三件事：把图放大给你看、记下你报的坐标、把每一步写进操作日志。它不替你找点。
所有命令都在本目录里运行：  python tool.py <命令> ...
  list                              列出本目录的图号和各自的完成情况
  look  <图号>                      整张图加坐标刻度，存到 views/
  zoom  <图号> <cx> <cy> [半宽=40] [x,y ...]   以 (cx,cy) 为中心放大 8 倍；后面的 x,y 会画成十字
  hubs  <图号> x,y x,y x,y x,y      四个候选点各放大一格（顺序：左上 右上 右下 左下），十字画在候选点上
  band  <图号> <y> [x0 x1]          y 这一行上下各 20 像素的横条放大 4 倍，行本身画成细线
  col   <图号> <x> [y0 y1]          x 这一列左右各 20 像素的竖条放大 4 倍
  vals  <图号> row <y> <x0> <x1>    打印这一行 x0..x1 每个像素的灰度（0 黑 255 白）
  vals  <图号> col <x> <y0> <y1>    打印这一列 y0..y1 每个像素的灰度
  set   <图号> tl=x,y tr=x,y br=x,y bl=x,y upper=x,y lower=x,y left=x right=x
                                    记点。可以分几次记，后记的覆盖先记的。left/right 只给 x，y 由工具取四轴 y 均值四舍五入
  blank <图号> <点名>[,点名...] "原因"   这个点定不了，留空并写明原因
  diagram <图号>                    这张是黑底的点线示意图：只要四个轴，其余四项自动留空
  show  <图号>                      把已记的点叠在整张图上，供最后复看
  finish --model "..." --exposure "..." --deviations "..." --hard "..."
                                    全部做完后运行：检查有没有漏项，写出 response.csv 和 reader.json
"""
import csv, datetime, hashlib, json, pathlib, sys
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
VIEWS = HERE / 'views'
STATE = HERE / 'state.json'
LOG = HERE / 'oplog.jsonl'
HUBS = ('tl', 'tr', 'br', 'bl')
LANDMARKS = HUBS + ('upper', 'lower', 'left', 'right')
TOOL = 'a8-ai-reader 1.0'
SIZE = 1024


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')


def log(cmd, args, result):
    with LOG.open('a', encoding='utf-8') as f:
        f.write(json.dumps({'at': now(), 'cmd': cmd, 'args': args, 'result': result}, ensure_ascii=False) + '\n')


def tokens():
    with (HERE / 'response-blank.csv').open(encoding='utf-8-sig', newline='') as f:
        return [r['token'] for r in csv.DictReader(f)]


def state():
    return json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}


def save(s):
    STATE.write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding='utf-8')


def image(token):
    if token not in tokens():
        sys.exit('本目录没有这个图号：' + token)
    im = Image.open(HERE / (token + '.png')).convert('RGB')
    assert im.size == (SIZE, SIZE)
    return im


def font(size=13):
    for name in ('/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def crop_view(im, x0, y0, x1, y1, scale, marks=(), hline=None, vline=None, tick=10):
    """裁出 [x0,x1)×[y0,y1) 放大 scale 倍（最近邻，像素边界看得见），四边留白标原图坐标。"""
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(SIZE, x1), min(SIZE, y1)
    part = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.NEAREST)
    m = 46
    out = Image.new('RGB', (part.width + 2 * m, part.height + 2 * m), (255, 255, 255))
    out.paste(part, (m, m))
    d = ImageDraw.Draw(out)
    f = font(12)
    d.rectangle((m - 1, m - 1, m + part.width, m + part.height), outline=(120, 120, 120))
    for x in range((x0 // tick) * tick, x1 + 1, tick):
        if x0 <= x <= x1:
            px = m + (x - x0) * scale
            d.line((px, m - 6, px, m - 1), fill=(0, 0, 0))
            d.line((px, m + part.height, px, m + part.height + 6), fill=(0, 0, 0))
            d.text((px, m - 20), str(x), fill=(0, 0, 0), font=f, anchor='ma')
            d.text((px, m + part.height + 8), str(x), fill=(0, 0, 0), font=f, anchor='ma')
    for y in range((y0 // tick) * tick, y1 + 1, tick):
        if y0 <= y <= y1:
            py = m + (y - y0) * scale
            d.line((m - 6, py, m - 1, py), fill=(0, 0, 0))
            d.line((m + part.width, py, m + part.width + 6, py), fill=(0, 0, 0))
            d.text((m - 8, py), str(y), fill=(0, 0, 0), font=f, anchor='rm')
            d.text((m + part.width + 8, py), str(y), fill=(0, 0, 0), font=f, anchor='lm')
    # 坐标 (x,y) 指原图的那一个像素；标记画在这个像素的中心
    cx = lambda x: m + (x - x0) * scale + scale // 2
    cy = lambda y: m + (y - y0) * scale + scale // 2
    if hline is not None and y0 <= hline < y1:
        d.line((m, cy(hline), m + part.width, cy(hline)), fill=(255, 0, 255))
    if vline is not None and x0 <= vline < x1:
        d.line((cx(vline), m, cx(vline), m + part.height), fill=(255, 0, 255))
    colours = [(0, 220, 0), (255, 140, 0), (0, 160, 255), (255, 0, 255)]
    for i, (x, y) in enumerate(marks):
        if x0 <= x < x1 and y0 <= y < y1:
            c = colours[i % 4]
            arm = max(scale * 3, 14)
            gap = max(scale // 2 + 1, 3)
            segs = [(cx(x) - arm, cy(y), cx(x) - gap, cy(y)), (cx(x) + gap, cy(y), cx(x) + arm, cy(y)),
                    (cx(x), cy(y) - arm, cx(x), cy(y) - gap), (cx(x), cy(y) + gap, cx(x), cy(y) + arm)]
            for seg in segs:  # 黑边加亮色芯，深底浅底都看得见；十字中间留空，不盖住要看的那个像素
                d.line(seg, fill=(0, 0, 0), width=4)
            for seg in segs:
                d.line(seg, fill=c, width=2)
    return out


def pt(text):
    x, y = text.split(',')
    return int(round(float(x))), int(round(float(y)))


def out(token, name, im):
    VIEWS.mkdir(exist_ok=True)
    path = VIEWS / ('%s-%s.png' % (token, name))
    im.save(path)
    return str(path)


def cmd_list(_):
    s = state()
    for t in tokens():
        r = s.get(t, {})
        done = [k for k in LANDMARKS if k in r.get('points', {}) or k in r.get('blank', {})]
        print(t, '完成' if len(done) == 8 else '已记 %d/8' % len(done))
    return {}


def cmd_look(a):
    im = image(a[0])
    v = crop_view(im, 0, 0, SIZE, SIZE, 1, tick=64)
    d = ImageDraw.Draw(v)
    for k in range(64, SIZE, 64):  # 浅色网格，每 64 像素一条
        col = (255, 255, 0) if k % 256 == 0 else (200, 200, 120)
        for p in range(0, SIZE, 12):
            d.point((46 + k, 46 + p), fill=col)
            d.point((46 + p, 46 + k), fill=col)
    p = out(a[0], 'look', v)
    print(p)
    return {'view': p}


def cmd_zoom(a):
    im = image(a[0])
    cx, cy = int(round(float(a[1]))), int(round(float(a[2])))
    rest = a[3:]
    half = 40
    if rest and ',' not in rest[0]:
        half = max(8, min(80, int(rest[0])))
        rest = rest[1:]
    marks = [pt(t) for t in rest]
    scale = 8 if half <= 40 else 4
    v = crop_view(im, cx - half, cy - half, cx + half, cy + half, scale, marks, tick=10 if half > 20 else 5)
    p = out(a[0], 'zoom-%d-%d-%d' % (cx, cy, half), v)
    print(p)
    return {'view': p, 'marks': marks}


def cmd_hubs(a):
    im = image(a[0])
    pts = [pt(t) for t in a[1:5]]
    if len(pts) != 4:
        sys.exit('hubs 要四个点：左上 右上 右下 左下')
    cells = [crop_view(im, x - 30, y - 30, x + 30, y + 30, 6, [(x, y)], tick=10) for x, y in pts]
    w, h = cells[0].size
    sheet = Image.new('RGB', (2 * w, 2 * h), (255, 255, 255))
    for i, pos in enumerate([(0, 0), (w, 0), (w, h), (0, h)]):  # 左上 右上 右下 左下，按画面位置摆
        sheet.paste(cells[i], pos)
        ImageDraw.Draw(sheet).text((pos[0] + 6, pos[1] + 4), HUBS[i] + ' (%d,%d)' % pts[i], fill=(200, 0, 0), font=font(14))
    p = out(a[0], 'hubs-' + '-'.join('%d_%d' % q for q in pts), sheet)
    print(p)
    return {'view': p, 'candidates': pts}


def cmd_band(a):
    im = image(a[0])
    y = int(round(float(a[1])))
    x0, x1 = (int(a[2]), int(a[3])) if len(a) >= 4 else (0, SIZE)
    scale = 4 if x1 - x0 <= 260 else (2 if x1 - x0 <= 520 else 1)
    v = crop_view(im, x0, y - 20, x1, y + 21, scale, hline=y, tick=10 if scale >= 4 else (20 if scale == 2 else 64))
    p = out(a[0], 'band-%d-%d-%d' % (y, x0, x1), v)
    print(p)
    return {'view': p}


def cmd_col(a):
    im = image(a[0])
    x = int(round(float(a[1])))
    y0, y1 = (int(a[2]), int(a[3])) if len(a) >= 4 else (0, SIZE)
    scale = 4 if y1 - y0 <= 260 else (2 if y1 - y0 <= 520 else 1)
    v = crop_view(im, x - 20, y0, x + 21, y1, scale, vline=x, tick=10 if scale >= 4 else (20 if scale == 2 else 64))
    p = out(a[0], 'col-%d-%d-%d' % (x, y0, y1), v)
    print(p)
    return {'view': p}


def cmd_vals(a):
    im = image(a[0]).convert('L')
    kind, fixed, lo, hi = a[1], int(a[2]), int(a[3]), int(a[4])
    lo, hi = max(0, lo), min(SIZE - 1, hi)
    vals = [im.getpixel((v, fixed) if kind == 'row' else (fixed, v)) for v in range(lo, hi + 1)]
    for i in range(0, len(vals), 10):
        print('%4d: ' % (lo + i) + ' '.join('%3d' % v for v in vals[i:i + 10]))
    return {'kind': kind, 'fixed': fixed, 'from': lo, 'to': hi}


def row_of(points):
    if all(k in points for k in HUBS):
        return int(round(sum(points[k][1] for k in HUBS) / 4 + 1e-9))
    return None


def cmd_set(a):
    token = a[0]
    image(token)
    s = state()
    r = s.setdefault(token, {'points': {}, 'blank': {}})
    sides = {}
    for item in a[1:]:
        k, v = item.split('=')
        if k not in LANDMARKS:
            sys.exit('没有这个点名：' + k)
        if k in ('left', 'right'):
            sides[k] = int(round(float(v.split(',')[0])))
        else:
            r['points'][k] = list(pt(v))
        r['blank'].pop(k, None)
    p = r['points']
    if 'tl' in p and 'tr' in p and not p['tl'][0] < p['tr'][0]:
        sys.exit('左上点应在右上点的左边，没有记。')
    if 'bl' in p and 'br' in p and not p['bl'][0] < p['br'][0]:
        sys.exit('左下点应在右下点的左边，没有记。')
    if 'tl' in p and 'bl' in p and not p['tl'][1] < p['bl'][1]:
        sys.exit('左上点应在左下点的上面，没有记。')
    if 'upper' in p and 'lower' in p and not p['upper'][1] < p['lower'][1]:
        sys.exit('上端应在下端的上面，没有记。')
    row = row_of(p)
    for k in ('left', 'right'):  # 轴变了以后，左右缘跟着回到新的那一行
        if k in p and row is not None:
            p[k][1] = row
    if sides:
        if row is None:
            sys.exit('四个轴没有记全，左右缘所在的那一行定不了。先记四个轴；轴确实不全时用 blank 把 left,right 留空。')
        for k, x in sides.items():
            p[k] = [x, row]
        if 'left' in p and 'right' in p and not p['left'][0] < p['right'][0]:
            sys.exit('左缘应在右缘的左边，没有记。')
    save(s)
    print('已记：', json.dumps(p, ensure_ascii=False))
    if row is not None:
        print('四轴 y 均值四舍五入后的那一行：y =', row, '（左右缘取这一行与中央机壳两侧的交点）')
    return {'points': p, 'row': row}


def cmd_blank(a):
    token, names, reason = a[0], a[1].split(','), ' '.join(a[2:]).strip()
    image(token)
    if not reason:
        sys.exit('留空要写原因。')
    s = state()
    r = s.setdefault(token, {'points': {}, 'blank': {}})
    for k in names:
        if k not in LANDMARKS:
            sys.exit('没有这个点名：' + k)
        r['points'].pop(k, None)
        r['blank'][k] = reason
    if any(k in HUBS for k in names):  # 轴不全，左右缘所在的行定不了
        for k in ('left', 'right'):
            r['points'].pop(k, None)
            r['blank'].setdefault(k, '四轴不全，定不了截面所在的行')
    save(s)
    print('已留空：', names, reason)
    return {'blank': names, 'reason': reason}


def cmd_diagram(a):
    token = a[0]
    image(token)
    s = state()
    r = s.setdefault(token, {'points': {}, 'blank': {}})
    for k in ('upper', 'lower', 'left', 'right'):
        r['points'].pop(k, None)
        r['blank'][k] = '点线示意图，只填四轴'
    r['diagram'] = True
    save(s)
    print('已标为点线示意图，只需记四个轴。')
    return {'diagram': True}


def cmd_show(a):
    token = a[0]
    im = image(token)
    r = state().get(token, {'points': {}, 'blank': {}})
    v = crop_view(im, 0, 0, SIZE, SIZE, 1, tick=64)
    d = ImageDraw.Draw(v)
    f = font(14)
    for k, (x, y) in r['points'].items():
        c = (0, 200, 0) if k in HUBS else (255, 0, 255)
        X, Y = 46 + x, 46 + y
        d.ellipse((X - 9, Y - 9, X + 9, Y + 9), outline=c)
        d.line((X - 3, Y, X + 3, Y), fill=c)
        d.line((X, Y - 3, X, Y + 3), fill=c)
        d.text((X + 12, Y - 18), '%s %d,%d' % (k, x, y), fill=c, font=f)
    row = row_of(r['points'])
    if row is not None:
        for px in range(0, SIZE, 6):
            d.point((46 + px, 46 + row), fill=(255, 0, 255))
    p = out(token, 'show', v)
    print(p)
    print('已记的点：', json.dumps(r['points'], ensure_ascii=False))
    print('留空的点：', json.dumps(r['blank'], ensure_ascii=False))
    return {'view': p, 'points': r['points'], 'blank': r['blank']}


def cmd_finish(a):
    opts = {}
    for i in range(0, len(a), 2):
        opts[a[i].lstrip('-')] = a[i + 1]
    for k in ('model', 'exposure', 'deviations', 'hard'):
        if k not in opts:
            sys.exit('finish 还缺 --' + k)
    s, rows, missing = state(), [], []
    for t in tokens():
        r = s.get(t, {'points': {}, 'blank': {}})
        row = {'token': t}
        reasons = []
        for k in LANDMARKS:
            if k in r['points']:
                row[k + '_x'], row[k + '_y'] = r['points'][k]
            elif k in r['blank']:
                row[k + '_x'] = row[k + '_y'] = ''
                reasons.append('%s：%s' % (k, r['blank'][k]))
            else:
                missing.append('%s/%s' % (t, k))
        row['reason'] = '；'.join(dict.fromkeys(reasons))
        rows.append(row)
    if missing:
        sys.exit('还有没记也没留空的点：' + ' '.join(missing))
    fields = ['token'] + [k + '_' + ax for k in LANDMARKS for ax in 'xy'] + ['reason']
    with (HERE / 'response.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    lines = LOG.read_text(encoding='utf-8').splitlines() if LOG.exists() else []
    info = {'tool': TOOL, 'finished_at': now(), 'images': len(rows), 'commands_logged': len(lines) + 1,
            'first_command_at': json.loads(lines[0])['at'] if lines else None,
            'response_sha256': hashlib.sha256((HERE / 'response.csv').read_bytes()).hexdigest(),
            'self_report': opts}
    (HERE / 'reader.json').write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding='utf-8')
    print('已写出 response.csv 和 reader.json，共 %d 张。' % len(rows))
    return info


def main():
    if len(sys.argv) < 2 or 'cmd_' + sys.argv[1] not in globals():
        print(__doc__)
        return
    cmd, args = sys.argv[1], sys.argv[2:]
    result = globals()['cmd_' + cmd](args)
    log(cmd, args, result)


if __name__ == '__main__':
    main()
