"""把 board.json 画成一页手绘风格的 HTML，供导出 PDF 和 JPG。
用法：python3 render_blueprint.py [输出.html]。导出见 export_blueprint.mjs。
只读 board.json，不联网；线条的抖动由固定种子生成，重复运行结果相同。"""
import html, json, pathlib, random, re, sys

here = pathlib.Path(__file__).parent
board = json.loads((here / 'board.json').read_text(encoding='utf-8'))
els, order = board['elements'], board['meta']['order']
rnd = random.Random(20261119)
FILL = {'white': '#ffffff', 'yellow': '#fff1b8', 'green': '#cfeedd', 'pink': '#fbd3da', 'blue': '#d3e6ff', 'peach': '#ffe0c7', 'purple': '#e6defa'}
INK, PAPER, PAD = '#23262b', '#fffdf7', 64
SIZE = {'small': 14, 'body': 16, 'large': 28, 'title': 48}

def j(v, a=1.3): return v + rnd.uniform(-a, a)
def line(x1, y1, x2, y2):
    """一条略有弯曲的手绘线段。"""
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    return 'M%.1f %.1f Q%.1f %.1f %.1f %.1f' % (j(x1), j(y1), j(mx, 2.2), j(my, 2.2), j(x2), j(y2))
def rect_path(x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    d = []
    for _ in range(2):   # 画两遍，像手描
        a = [j(x + r), j(y), j(x + w - r), j(y), j(x + w), j(y + r), j(x + w), j(y + h - r),
             j(x + w - r), j(y + h), j(x + r), j(y + h), j(x), j(y + h - r), j(x), j(y + r)]
        d.append('M%.1f %.1f L%.1f %.1f Q%.1f %.1f %.1f %.1f L%.1f %.1f Q%.1f %.1f %.1f %.1f L%.1f %.1f Q%.1f %.1f %.1f %.1f L%.1f %.1f Q%.1f %.1f %.1f %.1f Z' % (
            a[0], a[1], a[2], a[3], x + w, y, a[4], a[5], a[6], a[7], x + w, y + h, a[8], a[9], a[10], a[11], x, y + h, a[12], a[13], a[14], a[15], x, y, a[0], a[1]))
    return ' '.join(d)
def rich(s):
    """白板的行内标记：**粗体**、以“- ”开头的列表行、换行。"""
    out = []
    for ln in s.split('\n'):
        item = ln.startswith('- ')
        t = html.escape(ln[2:] if item else ln)
        t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
        out.append('<div class="%s">%s</div>' % ('li' if item else 'ln', t or '&nbsp;'))
    return ''.join(out)

svg, dom, rects = [], [], {}
for eid in order:
    e = els[eid]; t = e['type']
    if t == 'container':
        svg.append('<path d="%s" fill="#f6f4ec" stroke="#9a9a92" stroke-width="1.2"/>' % rect_path(e['x'], e['y'], e['w'], e['h'], 18))
        dom.append('<div class="sec" style="left:%dpx;top:%dpx">%s</div>' % (e['x'] + 4, e['y'] - 30, html.escape(e['text'])))
    elif t == 'shape':
        rects[eid] = (e['x'], e['y'], e['w'], e['h'])
        r = e['h'] / 2 if e.get('kind') == 'pill' else 14
        svg.append('<path d="%s" fill="%s" stroke="%s" stroke-width="1.5" stroke-linejoin="round"/>' % (rect_path(e['x'], e['y'], e['w'], e['h'], r), FILL.get(e.get('color', 'green'), e.get('color')), INK))
        dom.append('<div class="box %s" data-id="%s" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx;font-size:%dpx"><div class="in">%s</div></div>' % (
            e.get('textAlign', 'center'), eid, e['x'], e['y'], e['w'], e['h'], SIZE[e.get('size', 'body')], rich(e.get('text', ''))))
    elif t == 'text':
        w = 'width:%dpx;' % e['wrap'] if e.get('wrap') else 'white-space:nowrap;'
        dom.append('<div class="txt %s" style="left:%dpx;top:%dpx;%sfont-size:%dpx">%s</div>' % (e.get('size', 'body'), e['x'], e['y'], w, SIZE[e.get('size', 'body')], rich(e['text'])))
    elif t == 'table':
        cols = sorted(e['cols'].items(), key=lambda kv: kv[1]['at'])
        rows = sorted(e['rows'].items(), key=lambda kv: kv[1]['at'])
        body = ''.join('<tr>%s</tr>' % ''.join('<%s>%s</%s>' % (('th' if n == 0 else 'td'), html.escape(row.get(c, '')), ('th' if n == 0 else 'td')) for c, _ in cols) for n, (_, row) in enumerate(rows))
        dom.append('<table data-id="%s" style="left:%dpx;top:%dpx;width:%dpx"><colgroup>%s</colgroup>%s</table>' % (
            eid, e['x'], e['y'], sum(c['w'] for _, c in cols), ''.join('<col style="width:%dpx">' % c['w'] for _, c in cols), body))

def anchor(r, side):
    x, y, w, h = r
    return {'top': (x + w / 2, y), 'bottom': (x + w / 2, y + h), 'left': (x, y + h / 2), 'right': (x + w, y + h / 2)}[side]
def head(p, q):
    """在 q 处画箭头，方向 p → q。"""
    import math
    a = math.atan2(q[1] - p[1], q[0] - p[0])
    return ' '.join('M%.1f %.1f L%.1f %.1f' % (q[0] - 13 * math.cos(a + s), q[1] - 13 * math.sin(a + s), q[0], q[1]) for s in (0.42, -0.42))
for eid in order:
    e = els[eid]
    if e['type'] != 'arrow': continue
    a, b = rects[e['from']], rects[e['to']]
    if e.get('bends'):
        d = e['bends'][1]
        p, q = anchor(a, 'bottom'), anchor(b, 'top')
        yy = a[1] + a[3] / 2 + d
        pts = [p, (p[0], yy), (q[0], yy), q]
    else:
        fs, ts = e.get('fromSide', 'right'), e.get('toSide', 'left')
        p, q = anchor(a, fs), anchor(b, ts)
        if fs in ('left', 'right') and ts in ('left', 'right'):
            pts = [p, q] if abs(p[1] - q[1]) < 2 else [p, ((p[0] + q[0]) / 2, p[1]), ((p[0] + q[0]) / 2, q[1]), q]
        elif fs in ('top', 'bottom') and ts in ('top', 'bottom'):
            pts = [p, q] if abs(p[0] - q[0]) < 2 else [p, (p[0], (p[1] + q[1]) / 2), (q[0], (p[1] + q[1]) / 2), q]
        else:
            pts = [p, (p[0], q[1]), q] if fs in ('top', 'bottom') else [p, (q[0], p[1]), q]
    d = ' '.join(line(*u, *v) for u, v in zip(pts, pts[1:])) + ' ' + head(pts[-2], pts[-1])
    if e.get('head') == 'both': d += ' ' + head(pts[1], pts[0])
    svg.append('<path d="%s" fill="none" stroke="%s" stroke-width="1.7" stroke-linecap="round"%s/>' % (d, INK, ' stroke-dasharray="7 6"' if e.get('dash') else ''))
    if e.get('label'):
        u, v = max(zip(pts, pts[1:]), key=lambda s: abs(s[0][0] - s[1][0]) + abs(s[0][1] - s[1][1]))
        dom.append('<div class="lab" style="left:%dpx;top:%dpx">%s</div>' % ((u[0] + v[0]) / 2, (u[1] + v[1]) / 2, html.escape(e['label'])))

xs = [r[0] + r[2] for r in rects.values()] + [e['x'] + e['w'] for e in els.values() if e['type'] == 'container']
ys = [e['y'] + e['h'] for e in els.values() if e['type'] == 'container']
W, H = int(max(xs)) + PAD * 2, int(max(ys)) + PAD * 2 + 30
page = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>%(title)s</title><style>
@page{size:%(W)dpx %(H)dpx;margin:0}
html,body{margin:0;width:%(W)dpx;height:%(H)dpx;overflow:hidden;background:%(paper)s}
body{font-family:"PingFang SC","Hiragino Sans GB","STHeiti","Microsoft YaHei",sans-serif;color:%(ink)s;-webkit-print-color-adjust:exact;print-color-adjust:exact}
#b{position:absolute;left:%(pad)dpx;top:%(pad)dpx}
svg{position:absolute;left:0;top:0;overflow:visible}
.box,.txt,.sec,.lab,table{position:absolute;box-sizing:border-box}
.box{display:flex;align-items:center;padding:8px 16px;line-height:1.5}
.box.center{justify-content:center;text-align:center}
.box .in{max-width:100%%}
.li{padding-left:1em;text-indent:-1em}.li:before{content:"·  ";font-weight:700}
.txt{line-height:1.5}.txt.title{font-weight:700;letter-spacing:1px;line-height:1.2}.txt.large{line-height:1.3}
.sec{font-size:15px;font-weight:600;color:#55554f;white-space:nowrap}
.lab{transform:translate(-50%%,-50%%);background:%(paper)s;padding:1px 7px;font-size:14px;white-space:nowrap;border-radius:6px}
table{border-collapse:collapse;background:#fff;font-size:16px;line-height:1.45;table-layout:fixed;outline:1.5px solid %(ink)s;border-radius:4px}
th,td{padding:8px 13px;text-align:left;vertical-align:top;border-top:1px solid #d9d6cb}th{background:#f1eee3;border-top:0}
.foot{position:absolute;left:0;top:%(foot)dpx;font-size:13px;color:#77776f;white-space:nowrap}
</style></head><body><div id="b"><svg width="%(w)d" height="%(h)d" xmlns="http://www.w3.org/2000/svg">%(svg)s</svg>%(dom)s
<div class="foot">总体研究蓝图 · 由 planning/research-panorama/board.json 生成 · 左栏证据截至 2026-11-18，右栏文献截至 2026-11-19 · 绿：已有证据　黄：部分或待证　红：缺口　蓝：文献</div></div>
<script>window.overflow=[...document.querySelectorAll('.box')].filter(b=>b.firstChild.scrollHeight>b.clientHeight-8||b.firstChild.scrollWidth>b.clientWidth-16).map(b=>b.dataset.id);
window.tables=[...document.querySelectorAll('table')].map(t=>[t.dataset.id,t.offsetTop,t.offsetHeight]);</script></body></html>''' % dict(
    title=html.escape(board['meta']['title']), W=W, H=H, w=W - PAD * 2, h=H - PAD * 2, pad=PAD, paper=PAPER, ink=INK, foot=int(max(ys)) + 22, svg=''.join(svg), dom=''.join(dom))
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'blueprint.html')
out.write_text(page, encoding='utf-8')
print(out, W, 'x', H)
