"""Save first unblinded visual read of all 12 main W/L outputs.
Coordinates identify visible rotor-axis caps in image pixels, not physical
motor mounts. Explicitly distinguish projected from engineering geometry.
"""
from primary_axes import coarse,ids,root,images_dir
import csv,json,hashlib,statistics,math
from PIL import Image,ImageDraw,ImageFont
# Positions on enlarged native-pixel crops for rows with all six caps in frame.
# Local x comes from column offset; local y comes from row offset. Two rows
# with caps near the crop edge are read directly from the full 1024 image.
observed={
'0.70-r01':[(195,50),(311,40),(449,48),(577,47),(693,45),(811,62)],
'0.70-r02':[(185,179),(315,177),(449,185),(579,197),(687,203),(806,176)],
'0.70-r03':[(186,332),(331,332),(454,356),(546,371),(704,360),(786,345)],
'1.00-r01':[(186,40),(311,33),(456,53),(575,43),(674,43),(799,50)],
'1.00-r02':[(174,203),(335,196),(458,199),(580,208),(680,212),(791,196)],
'1.00-r03':[(192,308),(310,306),(445,326),(570,344),(670,342),(800,319)],
'1.00-r04':[(166,475),(329,470),(454,486),(561,507),(676,509),(802,487)],
'1.30-r01':[(191,40),(320,42),(450,40),(558,72),(686,72),(803,47)],
'1.30-r02':[(176,173),(333,174),(465,179),(582,193),(690,193),(806,168)],
'1.30-r03':[(175,316),(319,317),(467,330),(560,352),(678,352),(795,335)]}
full={'0.70-r04':[(365,169),(653,166),(893,503),(655,846),(364,846),(125,504)],
      '1.30-r04':[(277,171),(750,167),(892,489),(732,844),(275,820),(122,490)]}
notes={'0.70-r02':'At least one visible motor has a single blade; shaft still visible.',
       '1.30-r03':'The two lateral motors have three blades; their central caps remain visible.',
       '0.70-r04':'Motor housing projects noticeably away from the blade caps; view/depth caution.',
       '1.30-r04':'Right-rear blade pivot displaced from cylindrical housing centre. Axis reading is a visible cap proxy only; do not certify physical/coaxial geometry.'}
out=[]
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
grid=Image.new('RGB',(4*262,3*295+46),'#f1f3ef');draw=ImageDraw.Draw(grid)
draw.text((6,5),'12 张预定主比较 · 粉色圆标为知条件 AI 从原图读到的轴心 · 尚未独立复测',font=font,fill='#213131')
for i,key in enumerate(ids):
    target=float(key.split('-r')[0]);rep=int(key.split('-r')[1]);rid='HEXA3-wl'+key
    if key in full:points=full[key]
    else:
        points=[]
        for k,((x,y),(xx,yy)) in enumerate(zip(coarse[key],observed[key])):
            cx,cy=round(x*1024/260),round(y*1024/260)
            points.append((round(cx+(xx-126*(k+1)-62)/2),round(cy+(yy-145*(i%4)-62)/2)))
    p=images_dir/(rid+'.png');d=hashlib.sha256(p.read_bytes()).hexdigest()
    x,y=zip(*points);w=max(x)-min(x);l=max(y)-min(y);q=(w/l)*math.sqrt(3)/2
    out.append(dict(id=rid,target=target,rep=rep,seed=2026112322+rep,png_sha256=d,
        click_order='front-left,front-right,middle-right,rear-right,rear-left,middle-left',
        points_px=points,W_px=w,L_px=l,q=round(q,4),note=notes.get(key,'')))
    with Image.open(p) as src:im=src.convert('RGB')
    a=ImageDraw.Draw(im)
    for u,v in points:a.ellipse((u-13,v-13,u+13,v+13),outline='#e40058',width=4)
    xx,yy=i%4*262,46+i//4*295
    grid.paste(im.resize((260,260),Image.Resampling.LANCZOS),(xx,yy))
    draw.text((xx+6,yy+261),f'{key}  实读 q≈{q:.2f}',font=font,fill='#243131')
grid.save(root/'hexa-primary-axes.jpg',quality=96)
groups={str(v):round(statistics.median(r['q'] for r in out if r['target']==v),3) for v in (.7,1.,1.3)}
byrep=[[r['q'] for r in out if r['rep']==rep] for rep in range(1,5)]
obj={'scope':'12 primary observations only; 3 design drafts and 24 extensions excluded.','reader':'condition-aware first AI reading; not independent or blinded; location rounded to pixels.','measure':'q = (range(x)/range(y))/(2/sqrt(3)); visible rotor cap centres, not blade tips; housing projection offsets marked.','target_groups_median_descriptive':groups,'strictly_ordered_paired_seeds':sum(a<b<c for a,b,c in byrep),'paired_seed_count':4,'rounding':'integer native-image positions from enlarged crops / two native originals; decimals are arithmetic, not ground-truth precision.','notes':'No formal binary threshold, independent reading, or product acceptability has been inferred.','records':out}
(root/'hexa-primary-axes.json').write_text(json.dumps(obj,indent=2,ensure_ascii=False),encoding='utf8')
print(groups,byrep,obj['strictly_ordered_paired_seeds'])
