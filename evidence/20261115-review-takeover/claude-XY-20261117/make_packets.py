"""把正式造型响应实验 24 张与 E2 的 6 张做成两个互相独立的匿名判读包（X、Y）。
- 只保留像素（重新保存为无元数据 PNG），文件名为随机编码，两包编码与顺序都不同；
- 对照表 key.json 只留在 blind/ 目录，不放进任何判读包。
"""
import hashlib, json, random, sys
from pathlib import Path
from PIL import Image
B = Path(sys.argv[1]); RAW = B / "raw"
rng = random.Random(20261115)
s12 = sorted(p.stem for p in RAW.glob("S12-*.png")); assert len(s12) == 24, len(s12)
e2 = ["E2R-B2-A-parent", "E2R-B2-A-layout", "E2R-B2-B-parent", "E2R-C1-A-parent", "E2R-C1-B-layout", "E2R-C1-B-parent"]
parent_of = {k: ("E3R3-B2" if "-B2-" in k else "E3R3-C1") for k in e2}
key = {}
def clean_save(src, dst):
    im = Image.open(src).convert("RGB"); out = Image.new("RGB", im.size); out.putdata(list(im.getdata())); out.save(dst, "PNG")
for pk in ("X", "Y"):
    d = B / f"packet-{pk}"; (d / "shape").mkdir(parents=True, exist_ok=True); (d / "edit").mkdir(parents=True, exist_ok=True)
    codes = rng.sample(range(100, 1000), 24); order = s12[:]; rng.shuffle(order)
    for i, (sid, c) in enumerate(zip(order, codes), 1):
        name = f"{i:02d}-{c}.png"; clean_save(RAW / f"{sid}.png", d / "shape" / name); key[f"{pk}/shape/{name}"] = sid
    order = e2[:]; rng.shuffle(order); codes = rng.sample(range(100, 1000), 6)
    for i, (eid, c) in enumerate(zip(order, codes), 1):
        clean_save(RAW / f"{eid}.png", d / "edit" / f"{i}-{c}-修改后.png"); clean_save(RAW / f"{parent_of[eid]}.png", d / "edit" / f"{i}-{c}-参照.png")
        key[f"{pk}/edit/{i}-{c}"] = eid
(B / "key.json").write_text(json.dumps(key, ensure_ascii=False, indent=1), encoding="utf-8")
print("packets built;", len(key), "entries")
