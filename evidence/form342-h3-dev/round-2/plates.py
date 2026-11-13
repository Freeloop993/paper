"""Compare all matching S outputs; no seed-pair inference. Use original pixels for detail sheets."""
from pathlib import Path
import csv,json,html
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent
old=root.parent/'round-1'
def rows(name):
    return list(csv.DictReader((root/name).open(encoding='utf-8-sig')))
matched=rows('two-rounds.csv')
code={'B':'无缝','S':'承座','H':'铰接','U':'待判','N':'无外突','P':'前伸','C':'单盖','M':'多块'}
def font(n):return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
def crop(p,box):
    with Image.open(p) as im:return (im.crop(box) if box else im.copy()).convert('RGB')
def make(name,title,conditions,box,size):
    tw,th=size;head=64;rowh=th+48
    out=Image.new('RGB',(6*tw+18,head+len(conditions)*rowh),'#ffffff')
    draw=ImageDraw.Draw(out)
    draw.text((8,1),title,font=font(23),fill='#153b3d')
    for j,label in enumerate(['第一轮 · 深色臂','第二轮 · 同色臂']):
        draw.text((j*(3*tw+18)+8,33),label+'　　三次独立生成',font=font(17),fill='#335557')
    for i,label in enumerate(conditions):
        y=head+i*rowh
        for c in [r for r in matched if r['condition']==label]:
            for j in [1,2]:
                x=(j-1)*(3*tw+18)+(int(c['rep'])-1)*tw
                im=crop(root/c[f'r{j}_image'],box);im.thumbnail((tw-3,th),Image.Resampling.LANCZOS)
                out.paste(im,(x+(tw-im.width)//2,y))
                cap=label+'-'+c['rep']+'　'+code[c[f'r{j}_root']]+' / '+code[c[f'r{j}_nose']]
                draw.text((x+3,y+th+3),cap,font=font(14),fill='#203d40')
        draw.line((0,y+rowh-3,out.width,y+rowh-3),fill='#d5dddd')
    out.save(root/name,quality=94,optimize=True)
make('roots-two-rounds.jpg','臂根 · 左右同条件，比较无缝、承座、铰接',['S0','S2','S3'],(310,320,714,728),(256,256))
make('camera-two-rounds.jpg','相机 · 上方是指定机头，同时保留下端以核查错端',['S0','S4'],(390,198,634,812),(216,392))
make('all-S-two-rounds.jpg','两轮 S 组全部 36 张 · 盲读后按条件排列',['S0','S1','S2','S3','S4','S5'],None,(202,202))
# Same scale within each detail column; keep declared nose up in all panels.
exceptions=[('第一轮  S2-2','下端疑似模组，待人工核查',old/'actual/S2-2/original.png',380,630),
            ('第二轮  L-W25-3','尾端可见镜圈与暗孔，盲读记为错位',root/'actual/L-W25-3/original.png',312,706)]
board=Image.new('RGB',(930,626),'white');d=ImageDraw.Draw(board)
d.text((14,5),'相机位置核查 · 两图均按指定机头朝上展示',font=font(24),fill='#153b3d')
for x,t in [(12,'全图'),(313,'指定机头 · 局部'),(623,'指定机尾 · 局部')]:
    d.text((x,44),t,font=font(17),fill='#335557')
for i,(slot,note,p,front,rear) in enumerate(exceptions):
    y=78+i*270;d.text((12,y),slot+'　'+note,font=font(18),fill='#203d40')
    full=crop(p,None); full.thumbnail((220,220),Image.Resampling.LANCZOS);board.paste(full,(35,y+28))
    for x,cy in [(305,front),(615,rear)]:
        part=crop(p,(422,cy-62,602,cy+64)).resize((300,210),Image.Resampling.LANCZOS)
        board.paste(part,(x,y+32))
    d.line((0,y+259,board.width,y+259),fill='#d5dddd')
board.save(root/'camera-direction-review.jpg',quality=95)
allrows=rows('by-image.csv')
parts=['# 第二轮全部原图与盲读','组内三次独立请求。每个编号点开可看 1024 原件。','| 条件与输入 | 重复 1 | 重复 2 | 重复 3 |','|---|---|---|---|']
plan=json.loads((root/'manifest.json').read_bytes())['rows']
for tag in ['S0','S1','S2','S3','S4','S5','W10','W25','L-S0','L-S2','L-S4','L-W25']:
    guide=next(s['input_source'] for s in plan if s['condition']==tag)
    t=[f'[{tag}]({guide})']
    for r in sorted((v for v in allrows if v['condition']==tag),key=lambda v:v['rep']):
        a=r['slot'];f='actual/'+a+'/original.png'
        t.append(f'[![{a}]({f})]({f}) {a} · {code[r["root"]]}/{code[r["nose"]]}')
    parts.append('| '+' | '.join(t)+' |')
(root/'gallery.md').write_text('\n'.join(parts)+'\n',encoding='utf8')
