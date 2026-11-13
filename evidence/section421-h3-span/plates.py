"""Build contact sheets from full returned frames; never align hubs or retouch guides."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
import hashlib

root = Path(__file__).resolve().parent
font_dir = Path('C:/Windows/Fonts')
title = ImageFont.truetype(str(font_dir / 'msyhbd.ttc'), 33)
label = ImageFont.truetype(str(font_dir / 'msyh.ttc'), 23)
small = ImageFont.truetype(str(font_dir / 'msyh.ttc'), 19)
manifest = json.loads((root / 'manifest.json').read_bytes())
source = {r['id']: r for r in manifest['rows']}
checks = []
for key, row in source.items():
    folder = root / 'actual' / key
    reference = (root / row['input_source']).read_bytes()
    original = (folder / 'original.png').read_bytes()
    rec = json.loads((folder / 'receipt.json').read_bytes())
    ver = json.loads((folder / 'verified.json').read_bytes())
    sent = json.loads((folder / 'submission.json').read_bytes())
    assert sent['fields'] == row['fields']
    assert hashlib.sha256(reference).hexdigest() == sent['input_sha256'] == row['input_sha256']
    assert hashlib.sha256(original).hexdigest() == ver['sha256']
    with Image.open(folder / 'original.png') as im:
        assert im.size == (1024,1024) and im.format == 'PNG'
        assert hashlib.sha256(im.convert('RGB').tobytes()).hexdigest() == ver['rgb_sha256']
    assert rec['http'] == 200 and rec['usage']['generated_images'] == 1
    checks.append(dict(id=key, sha256=ver['sha256'], rgb=ver['rgb_sha256'], http=rec['http'], returned=rec['received']))
assert len({c['rgb'] for c in checks}) == 4
(root / 'verification.json').write_text(json.dumps(checks,indent=2)+'\n','utf8')

def sheet(name, heading, items, subline):
    tile, margin = 544, 18
    sheet = Image.new('RGB',(margin + (tile + margin)*len(items), tile+161),'#f6f6f0')
    draw = ImageDraw.Draw(sheet)
    draw.text((margin,9),heading,font=title,fill='#223d38')
    draw.text((margin,59),subline,font=small,fill='#405e55')
    for i,(key,caption) in enumerate(items):
        x = margin + i*(tile+margin)
        draw.text((x,96),caption,font=label,fill='#1e413a')
        filepath = (root.parent.parent/'experiments/form342-h3-pilot/actual/C/original.png'
                    if key == 'previous-C' else root/'actual'/key/'original.png')
        with Image.open(filepath) as im:
            sheet.paste(im.convert('RGB').resize((tile,tile),Image.Resampling.LANCZOS),(x,143))
    sheet.save(root/name,quality=94,subsampling=0)

sheet('wheelbase-h3.jpg','同一套长渐缩圆舱 · 只改轴距',
      [('B250','对照　250 mm'),('B421','B　300 mm')],
      '两份实发词仅轴距数值不同；定位图按同一比例导出。两张完整 H3 原图等幅显示。')
sheet('directions-h3.jpg','4.2.1 · 三个造型方向',
      [('A421','A　250 mm · 短肩圆舱'),('B421','B　300 mm · 长渐缩圆舱'),('C421','C　250 mm · 切角壳与外露承座')],
      '四轴 True X，90 × 50 mm 壳体输入，15 mm 臂宽，5 英寸双叶。颜色与材质提示相同。')

sheet('c-before-after.jpg','C · 上一版与本轮原图',
      [('previous-C','上一版 C　短宽比方壳 · 20 mm 臂'),('C421','本轮 C　90 × 50 mm 壳 · 15 mm 臂')],
      '同为 250 mm、切角壳、承座、前伸模组和双叶要求。两张完整原图同幅显示，各一张。')
