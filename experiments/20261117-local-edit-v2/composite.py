"""生成后处理：把遮罩内的生成像素按软遮罩合回底图，并核对遮罩外逐像素不变。
用法：python composite.py <底图> <生成图> <遮罩> <输出>
原始生成图与合成图都保留；遮罩外不变是程序保证，不作为模型保持能力的证据。
"""
import sys
from PIL import Image, ImageChops
base, gen, mask, out = sys.argv[1:5]
b = Image.open(base).convert("RGB"); g = Image.open(gen).convert("RGB"); m = Image.open(mask).convert("L")
c = Image.composite(g, b, m); c.save(out)
outside = Image.eval(m, lambda v: 255 if v == 0 else 0)
diff = ImageChops.difference(b, c).convert("L"); changed_out = sum(1 for d, o in zip(diff.getdata(), outside.getdata()) if o and d)
print(out, "遮罩外改动像素", changed_out)
