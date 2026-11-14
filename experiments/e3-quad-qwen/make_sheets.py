"""把 E3 九张原图拼成按方向并排的比较图，附机头与臂根等倍放大。

用法：python3 make_sheets.py <原图目录> <输出目录>
原图目录内应有 E3-A1.png … E3-C3.png（1024×1024）。输出 sheet-A.jpg、sheet-B.jpg、sheet-C.jpg、all-nine.jpg。
放大区域按固定像素矩形截取，九张一致：机头 x 312–712、y 110–410；四个臂根各取 240×240，中心在画面中心 ±150 px。
"""
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CJK = os.environ.get("THESIS_CJK_FONT", "/System/Library/Fonts/STHeiti Medium.ttc")
NOSE = (312, 110, 712, 410)
ROOTS = [(512 + dx * 150 - 120, 512 + dy * 150 - 120, 512 + dx * 150 + 120, 512 + dy * 150 + 120)
         for dy, dx in [(-1, -1), (-1, 1), (1, -1), (1, 1)]]  # 左前、右前、左后、右后
LABEL = {"A": "A 流线舱·无缝·无外突·单盖·同色", "B": "B 同 A（第二组变体）", "C": "C 切角方壳·外露承座·前伸相机舱·多块顶盖·碳纹臂"}


def font(size):
    return ImageFont.truetype(CJK, size)


def root_mosaic(img, cell=300):
    m = Image.new("RGB", (cell * 2 + 6, cell * 2 + 6), "white")
    for k, box in enumerate(ROOTS):
        m.paste(img.crop(box).resize((cell, cell), Image.LANCZOS), ((k % 2) * (cell + 6), (k // 2) * (cell + 6)))
    return m


def sheet(direction, imgs, seeds, out):
    W, gap, top = 606, 24, 70
    nose_h = int(W * (NOSE[3] - NOSE[1]) / (NOSE[2] - NOSE[0]))
    H = top + W + 50 + nose_h + 50 + W + 30
    S = Image.new("RGB", (3 * W + 4 * gap, H), "white"); d = ImageDraw.Draw(S)
    d.text((gap, 18), LABEL[direction], font=font(34), fill=(20, 20, 20))
    for i, (img, seed) in enumerate(zip(imgs, seeds)):
        x = gap + i * (W + gap)
        S.paste(img.resize((W, W), Image.LANCZOS), (x, top))
        d.text((x, top + W + 8), f"{direction}{i + 1}  种子 {seed}", font=font(26), fill=(20, 20, 20))
        y2 = top + W + 50
        S.paste(img.crop(NOSE).resize((W, nose_h), Image.LANCZOS), (x, y2))
        d.text((x, y2 + nose_h + 8), "机头（1.5 倍）", font=font(24), fill=(60, 60, 60))
        y3 = y2 + nose_h + 50
        S.paste(root_mosaic(img).resize((W, W), Image.LANCZOS), (x, y3))
    d.text((gap, H - 28), "臂根（1.25 倍；左上=左前、右上=右前、左下=左后、右下=右后）", font=font(22), fill=(60, 60, 60))
    S.save(out, quality=90)


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2]); dst.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((Path(__file__).resolve().parent / "manifest.json").read_text(encoding="utf-8"))
    seeds = {r["id"]: r["seed"] for r in manifest["requests"]}
    grid = Image.new("RGB", (3 * 520 + 40, 3 * 560 + 40), "white"); g = ImageDraw.Draw(grid)
    for r, direction in enumerate("ABC"):
        ids = [f"E3-{direction}{i}" for i in (1, 2, 3)]
        imgs = [Image.open(src / f"{i}.png").convert("RGB") for i in ids]
        sheet(direction, imgs, [seeds[i] for i in ids], dst / f"sheet-{direction}.jpg")
        for c, (i, img) in enumerate(zip(ids, imgs)):
            grid.paste(img.resize((500, 500), Image.LANCZOS), (20 + c * 520, 20 + r * 560))
            g.text((20 + c * 520, 20 + r * 560 + 505), i.replace("E3-", ""), font=font(28), fill=(20, 20, 20))
    grid.save(dst / "all-nine.jpg", quality=90)
    print("ok")


if __name__ == "__main__":
    main()
