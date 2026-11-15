import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

root=Path(__file__).resolve().parent
verified=json.loads((root/'hexa-verified.json').read_bytes())
actual={r['id']:r for r in verified['records']}
frozen=json.loads((root/'experiments/gpu-day-20261115/hexa-fix/manifest.json').read_bytes())['requests']
old=verified['transition']['old_hexa_completed']
values=('0.70','1.00','1.30')
rows=[('首案', [r for r in frozen if r['order']==6])]
for order,prefix,count in [(7,'主比较',4),(14,'扩展',8)]:
    for val in values:
        group=sorted([r for r in frozen if r['order']==order and '-wl'+val+'-' in r['id']],key=lambda r:r['seed'])
        assert len(group)==count
        for i in range(0,count,4):rows.append((prefix+' '+val,group[i:i+4]))
assert sum(len(rr) for _,rr in rows)==len(actual)==39
size=240;gap=6;left=120;height=size+30
sheet=Image.new('RGB',(left+4*(size+gap)+gap,len(rows)*height+44),'#f1f3f1')
draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
draw.text((10,5),'E6 农业植保六旋 · 更正后的全部 39 份输出',fill='#263737',font=font)
for j,(label,group) in enumerate(rows):
    y=40+j*height
    draw.text((8,y+85),label,fill='#263737',font=font)
    for i,r in enumerate(group):
        x=left+i*(size+gap)
        with Image.open(root/'images/hexa'/(r['id']+'.png')) as im:sheet.paste(im.convert('RGB').resize((size,size),Image.Resampling.LANCZOS),(x,y))
        draw.text((x,y+size+1),r['id'],fill='#263737',font=font)
sheet.save(root/'hexa-overview.jpg',quality=93)
drafts=rows[0][1];board=Image.new('RGB',(1200,742),'#f1f3f1');dd=ImageDraw.Draw(board)
dd.text((8,5),'更正后的植保六旋首案：上排完整顶视，下排同位置等倍截取药箱、横向机臂和喷杆区域',font=font,fill='#243131')
for i,r in enumerate(drafts):
    x=i*400;dd.text((x+9,38),r['id'],font=font,fill='#243131')
    with Image.open(root/'images/hexa'/(r['id']+'.png')) as im:
        board.paste(im.convert('RGB').resize((395,395),Image.Resampling.LANCZOS),(x,66))
        board.paste(im.convert('RGB').crop((312,370,710,644)),(x,467))
board.save(root/'hexa-drafts.jpg',quality=96)
counts={str(n):sum(r['order']==n for r in frozen) for n in (6,7,14)}
info={'corrected_batch_completed':counts,'earlier_negative_prompt_completed':len(old),'earlier_ids':[r['id'] for r in old],'corrected_images':len(actual),'independent_design_scores':None,'note':'3 个首案、36 个布局响应。按是否完成提交和完整回收计数。造型命中及数据趋势另据独立判读。'}
(root/'hexa-accounting.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf8')
