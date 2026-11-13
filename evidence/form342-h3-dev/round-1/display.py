"""Create side-by-side plates and a browsable image/receipt index after unblinding."""
from pathlib import Path
from html import escape
import csv,json
from PIL import Image,ImageDraw,ImageFont,ImageOps

root=Path(__file__).resolve().parent
def load(name):
    return json.loads((root/name).read_bytes())
def font(size):
    return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',size)
def stamp(draw,xy,s,size,fill='#183034'):
    draw.text(xy,s,font=font(size),fill=fill)
slots={r['id']:r for r in load('manifest.json')['rows']}
res=load('results.json')
with (root/'by-image.csv').open(encoding='utf-8-sig') as f:
    reads={r['slot']:r for r in csv.DictReader(f)}
names={'S0':'共同基准','S1':'方正机壳','S2':'外露承座','S3':'折叠铰接','S4':'前伸云台','S5':'多块顶盖','G-w10':'臂宽 10 mm','G-w15':'臂宽 15 mm','G-w20':'臂宽 20 mm','G-r1.4':'机身长宽 1.4','G-r1.8':'机身长宽 1.8','G-r2.4':'机身长宽 2.4'}
cats={'body_plan':'机壳','arm_root':'臂根','camera':'相机舱','cover':'上盖'}
cn={'pod':'流线','box':'方正','seamless':'无缝','socket':'承座','hinge':'铰接','inside':'内嵌','projecting':'前伸','single':'单缝','multi':'多盖','U':'不可判'}
def reading(r):
    if r['condition']=='S0':
        return ' / '.join(cn[r[k]] for k in cats)
    if r['target']:
        return cats[r['target']]+'：'+cn[r[r['target']]]
    value=r['width_D' if '-w' in r['condition'] else 'L_B']
    if not value:
        return '该项不可量'
    return ('臂宽 / 对角毂距 ' if '-w' in r['condition'] else '机身长 / 宽 ')+f'{float(value):.3f}'
def rows_for(group):
    return [label for label in names if label.startswith(group)]
sections=[]
for group,title in [('S','文字档位'),('G','参考图尺寸档位')]:
    w,head,row_h=1220,76,280
    plate=Image.new('RGB',(w,head+6*row_h),'white');draw=ImageDraw.Draw(plate)
    stamp(draw,(16,5),group+' 组 · '+title,27)
    stamp(draw,(16,43),'条件图',17)
    for i in range(3):
        stamp(draw,(251+323*i,43),'独立生成 '+str(i+1),16)
    cards=[]
    for j,label in enumerate(rows_for(group)):
        y=head+j*row_h
        draw.line((0,y,w,y),fill='#becdca')
        stamp(draw,(14,y+9),label+'  '+names[label],18)
        guide=slots[label+'-1']['input_source']
        with Image.open(root/guide) as g:
            plate.paste(g.convert('RGB').resize((143,143),Image.Resampling.LANCZOS),(16,y+52))
        cells=[]
        for i in range(3):
            sid=f'{label}-{i+1}';r=reads[sid];x=240+323*i
            src='actual/'+sid+'/original.png'
            if (root/src).is_file():
                with Image.open(root/src) as im:
                    plate.paste(im.convert('RGB').resize((234,234),Image.Resampling.LANCZOS),(x,y+4))
            short=reading(r)
            stamp(draw,(x,y+240),short,15)
            cells.append(f'<td><a href="{src}"><img loading="lazy" src="{src}" alt="{sid}"></a><b>{sid}</b><p>{escape(short)}</p><small>{escape(r["note"])}</small><p><a href="actual/{sid}/receipt.json">H3 回执</a> · <a href="actual/{sid}/submission.json">实发词</a></p></td>')
        cards.append(f'<tr><th>{label} {names[label]}<a href="{guide}"><img src="{guide}" alt="条件图"></a></th>'+''.join(cells)+'</tr>')
    plate.save(root/(group+'-comparison.jpg'),quality=91,optimize=True)
    sections.append('<h2>'+group+' 组 · '+title+'</h2><table><thead><tr><th>条件和输入</th><th>重复 1</th><th>重复 2</th><th>重复 3</th></tr></thead><tbody>'+''.join(cards)+'</tbody></table>')
html='''<!DOCTYPE html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>H3 第一轮 · 条件图、原图和盲读</title><style>body{font:16px/1.45 system-ui;color:#182b2b;max-width:1320px;margin:24px auto;padding:0 14px}table{width:100%;table-layout:fixed;border-collapse:collapse}td,th{border-top:1px solid #b8c6c1;text-align:left;vertical-align:top;padding:8px}th:first-child{width:15%}img{display:block;width:100%;height:auto;margin:.4em 0}p{margin:.4em 0}small{color:#465958}a{color:#176352}</style><h1>H3 第一轮 · 条件图、原图和盲读</h1><p>点图查看 1024 像素原件。行内是同一个请求的三次独立调用，无固定种子。图下为揭盲前封存的独立 AI 读数。</p><p><a href="by-image.csv">逐图读数</a> · <a href="freeze.md">冻结口径</a> · <a href="results.json">完整统计</a></p>'''
(root/'comparison.html').write_text(html+''.join(sections)+'</html>',encoding='utf8')
with Image.open(root/'S-comparison.jpg') as left, Image.open(root/'G-comparison.jpg') as right:
    pair = Image.new('RGB',(left.width+right.width+22,left.height),'#e0e7e5')
    pair.paste(left,(0,0))
    pair.paste(right,(left.width+22,0))
    pair.save(root/'both-groups.jpg',quality=93,optimize=True)
