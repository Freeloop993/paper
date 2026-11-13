"""Native-pixel centreline crops of four images flagged for human direction review."""
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parent
out=Image.new('RGB',(4*246,568),'white')
for i,s in enumerate(['S2-2','S4-1','S4-2','S4-3']):
    crop=Image.open(root.parent/'round-1'/'actual'/s/'original.png').convert('RGB').crop((393,234,631,776))
    out.paste(crop,(i*246,24))
    ImageDraw.Draw(out).text((i*246+6,4),s+'  TOP = prescribed nose',fill='black')
out.save(root/'orientation-review.jpg',quality=95)
