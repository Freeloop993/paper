"""Fixed transverse midsection at half shell length, using first reader's saved end marks."""
from pathlib import Path
import csv, json
from statistics import mean
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter1d
ROOT=Path(__file__).resolve().parent
old=ROOT.parent/'round-1'
rows=list(csv.DictReader((old/'by-image.csv').open(encoding='utf-8-sig')))
positions=json.loads((old/'reader-method/guides.json').read_text(encoding='utf-8-sig'))
codes=sorted(json.loads((old/'unblind.json').read_bytes()))
sheet=Image.new('RGB',(3*358,3*320),'white')
measurements=[]
for row in [r for r in rows if r['condition'].startswith('G-r')]:
    index=codes.index(row['blind'])+1
    marks=positions[str(index)]
    top,bottom=[v/(816/1074)-28 for v in marks[:2]]
    mid=round((top+bottom)/2)
    slot=row['slot']
    im=Image.open(old/'actual'/slot/'original.png').convert('RGB')
    grey=np.asarray(im.convert('L'),dtype=float)
    xs=np.arange(1024)
    # Search outward from near the centre for the two sides of the central shell.
    # Display the selected endpoints for visual confirmation against shadows and internal seams.
    def edges(y):
        line=gaussian_filter1d(grey[y-1:y+2].mean(axis=0),1.1)
        grad=np.gradient(line)
        left=np.argmin(grad[375:485])+375
        right=np.argmax(grad[542:651])+542
        return int(left),int(right)
    left,right=edges(mid)
    w=right-left
    near=[edges(mid+d) for d in (-5,+5)]
    i=len(measurements)
    measurements.append(dict(slot=slot,blind=row['blind'],y=mid,x1=left,x2=right,L_px=row['shell_L'],B50_px=w,L_B50=round(int(row['shell_L'])/w,4),B_minus5=near[0][1]-near[0][0],B_plus5=near[1][1]-near[1][0]))
    crop=im.crop((340,mid-145,684,mid+145))
    d=ImageDraw.Draw(crop)
    for x in [left,right]:
        dx=x-340
        d.line((dx,134,dx,142),fill='#ff0080',width=2)
        d.line((dx,148,dx,156),fill='#ff0080',width=2)
        d.ellipse((dx-1,144,dx+1,146),fill='#ff0080')
    x,y=i%3*358,i//3*320
    sheet.paste(crop,(x,y+23))
    ImageDraw.Draw(sheet).text((x+5,y+3),f'{slot}   y {mid}   {left}..{right} = {w}px',fill='black')
sheet.save(ROOT/'section-audit.jpg',quality=94)
with (ROOT/'sections.csv').open('w',encoding='utf-8-sig',newline='') as stream:
    out=csv.DictWriter(stream,fieldnames=list(measurements[0]))
    out.writeheader();out.writerows(measurements)
for dim in ['1.4','1.8','2.4']:
    subset=[r for r in measurements if r['slot'].startswith('G-r'+dim)]
    print(dim,[(r['B50_px'],r['L_B50']) for r in subset])
