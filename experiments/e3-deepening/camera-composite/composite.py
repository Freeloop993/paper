"""B2 + v1.6 相机舱拼合草案（不调用生成模型）。
1) 在 B2 机鼻顶面找出深色窗条，用正下方壳面逐列向上填平；
2) 在 S16-S4 原图中取机身上缘以上、亮度低于壳面的相机舱像素；
3) 按两图机身宽度之比缩放，贴到 B2 机鼻上缘，只覆盖 B2 的背景像素（机身压住相机舱下缘）。
"""
import sys
from PIL import Image, ImageFilter
BG = 238
def lum(p): return (p[0] * 299 + p[1] * 587 + p[2] * 114) / 1000
def body_top(im, cx, half=40):
    px = im.load(); w, h = im.size
    for y in range(h):
        if all(lum(px[x, y]) < BG for x in range(cx - half, cx + half, 4)): return y
def width_at(im, y, cx):
    px = im.load(); l = cx; r = cx
    while lum(px[l, y]) < BG: l -= 1
    while lum(px[r, y]) < BG: r += 1
    return r - l, l, r
def shell_top(im, cx):
    """机身壳面上缘：从上往下，第一行中心 ±40 像素全为亮壳色（>185）且非背景。"""
    px = im.load(); w, h = im.size
    for y in range(h):
        vals = [lum(px[x, y]) for x in range(cx - 40, cx + 40, 4)]
        if all(185 < v < BG for v in vals): return y
def fill_window(b2):
    px = b2.load(); w, h = b2.size; cx = w // 2; top = body_top(b2, cx, 20)
    filled = 0
    for x in range(cx - 110, cx + 110):
        ys = [y for y in range(top - 5, top + 45) if lum(px[x, y]) < 150]
        if not ys: continue
        y0, y1 = min(ys), max(ys)
        src = y1 + 4
        for y in range(y0 - 2, y1 + 4):
            if lum(px[x, y]) < BG: px[x, y] = px[x, src]; filled += 1
    return filled, top
def camera_piece(src):
    im = Image.open(src).convert("RGB"); w, h = im.size; cx = w // 2; px = im.load()
    st = shell_top(im, cx)
    mask = Image.new("L", im.size, 0); mp = mask.load()
    for y in range(max(0, st - 160), st + 14):
        for x in range(cx - 130, cx + 130):
            v = lum(px[x, y])
            if v < 200: mp[x, y] = 255
            elif v < BG and y < st: mp[x, y] = int(255 * (BG - v) / (BG - 200))
    # 只保留与中心相连的相机舱，去掉桨叶等其他碎块
    seed = next((cx, y) for y in range(st + 13, st - 160, -1) if mp[cx, y] >= 128)
    keep = set([seed]); stack = [seed]
    while stack:
        x, y = stack.pop()
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if (nx, ny) not in keep and cx - 130 <= nx < cx + 130 and st - 160 <= ny < st + 14 and mp[nx, ny] >= 128:
                keep.add((nx, ny)); stack.append((nx, ny))
    near = set((x + dx, y + dy) for x, y in keep for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))
    for y in range(max(0, st - 160), st + 14):
        for x in range(cx - 130, cx + 130):
            if (x, y) not in near: mp[x, y] = 0
    bbox = mask.getbbox()
    return im, mask, st, bbox
def compose(b2_path, src, out):
    b2 = Image.open(b2_path).convert("RGB"); w, h = b2.size; cx = w // 2
    filled, b2top = fill_window(b2)
    b2shell = shell_top(b2, cx)
    im, mask, st, bbox = camera_piece(src)
    # 机身宽度比例：各自壳面上缘以下 60 像素处
    wb, _, _ = width_at(b2, b2shell + 60, cx); ws, _, _ = width_at(im, st + 60, im.size[0] // 2)
    k = wb / ws
    piece = im.crop(bbox); m = mask.crop(bbox)
    piece = piece.resize((round(piece.width * k), round(piece.height * k)), Image.LANCZOS)
    m = m.resize(piece.size, Image.LANCZOS)
    # 对齐：相机舱相对壳面上缘的位置按比例保持
    dx = round(cx + (bbox[0] - im.size[0] // 2) * k); dy = round(b2shell + (bbox[1] - st) * k)
    # 只覆盖 B2 背景：机身压住相机舱
    bpx = b2.load(); mp = m.load()
    for y in range(m.height):
        for x in range(m.width):
            X, Y = dx + x, dy + y
            if lum(bpx[X, Y]) < BG - 4: mp[x, y] = 0
    b2.paste(piece, (dx, dy), m)
    b2.save(out)
    return dict(filled=filled, b2_shell_top=b2shell, src_shell_top=st, scale=round(k, 3), paste=(dx, dy, piece.size))
if __name__ == "__main__":
    b2, outdir = sys.argv[1], sys.argv[2]
    for r in sys.argv[3:]:
        print(r, compose(b2, f"{outdir}/S16-S4-{r}.png", f"{outdir}/B2-cam-{r}.png"))
