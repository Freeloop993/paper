from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import sys
from math import hypot
base=Path('.')
aux=base/'visual_aids'
aux.mkdir(exist_ok=True)
files=sorted(base.glob('*.png'))
def src(n):
    return Image.open(files[n-1]).convert('RGB')
def full(n):
    im=src(n)
    out=Image.new('RGB',(1074,1074),'white')
    out.paste(im,(31,28))
    d=ImageDraw.Draw(out)
    d.text((0,0),str(n),fill='black')
    for p in range(0,1024,25):
        k=8 if p%100==0 else (5 if p%50==0 else 2)
        x,y=p+31,p+28
        for a,b,c,e in [(x,28-k,x,27),(x,1052,x,1052+k),(31-k,y,30,y),(1055,y,1055+k,y)]: d.line((a,b,c,e),fill='gray')
        if p%100==0:
            for dx,dy in [(x-7,5),(x-7,1060),(0,y-5)]: d.text((dx,dy),str(p),fill='#23546b')
            for q in range(100,1001,100):
                d.line((x-2,q+28,x+2,q+28),fill='#4ca5bc')
                d.line((x,q+26,x,q+30),fill='#4ca5bc')
    out.resize((816,816),Image.Resampling.LANCZOS).save(aux/f'f{n:02}.jpg',quality=94)
if sys.argv[1]=='full':
    for n in range(1,len(files)+1): full(n)
import json
from scipy.ndimage import map_coordinates, gaussian_filter1d
guides=json.loads((aux/'guides.json').read_text(encoding='utf-8-sig')) if (aux/'guides.json').exists() else {}
sc=816/1074
def pic2raw(xy):
    return (np.array(xy)/sc-np.array([31.,28.]))
def picked(n):
    vals=np.array(guides[str(n)])
    hubs=pic2raw(vals[4:12].reshape(4,2))
    exits=pic2raw(vals[12:].reshape(4,2))
    return hubs,exits
def profiles(n,manual=None):
    im=src(n)
    rgb=np.asarray(im,dtype=float)
    hubs,exits=picked(n)
    data=[]
    for i,(h,e) in enumerate(zip(hubs,exits)):
        u=(h-e)/np.linalg.norm(h-e)
        v=np.array([-u[1],u[0]])
        m=(e+h)/2
        t=np.arange(-80,81)
        ss=np.arange(-20,21)
        p=m[:,None,None]+v[:,None,None]*t+u[:,None,None]*ss[:,None]
        strip=np.stack([map_coordinates(rgb[:,:,k],[p[1],p[0]],order=1) for k in range(3)],axis=-1)
        gray=strip[17:24].mean(axis=(0,2))
        grad=np.gradient(gaussian_filter1d(gray,0.85))
        a=np.argmin(grad[10:75])+10
        b=np.argmax(grad[85:151])+85
        if manual and manual[i] is not None: a,b=[80+j for j in manual[i]]
        data.append((a-80,b-80,Image.fromarray(strip.astype('uint8')),m,v))
    return data
def detail(n):
    im=src(n)
    vals=guides[str(n)]
    ylo,yhi=(round(v/sc-28) for v in vals[:2])
    xlo,xhi=(round(v/sc-31) for v in vals[2:4])
    l,r=max(0,xlo-67),min(1024,xhi+67)
    top,bottom=max(0,ylo-60),min(1024,yhi+30)
    w=r-l
    out=Image.new('RGB',(w+246,max(432,bottom-top+29)), 'white')
    d=ImageDraw.Draw(out)
    out.paste(im.crop((l,top,r,bottom)),(0,19))
    d.text((2,2),f'{n}  raw crop',fill='black')
    for g in range((l//25+1)*25,r,25):
        if g%50==0:d.text((g-l-8,4),str(g),fill='#336677')
        d.line((g-l,15,g-l,19),fill='black')
    for g in range((top//25+1)*25,bottom,25):
        if g%50==0:d.text((w+2,19+g-top-6),str(g),fill='#336677')
        d.line((w-2,19+g-top,w+2,19+g-top),fill='black')
    for i,(a,b,s,m,v) in enumerate(profiles(n)):
        x=w+60
        y=24+i*96
        d.text((x,y-18),f'{["TL","TR","BR","BL"][i]} {a}..{b} = {b-a}',fill='black')
        out.paste(s,(x,y))
        for edge in [a,b]:
            d.line((x+80+edge,y-3,x+80+edge,y+8),fill='#ff2b4e')
            d.line((x+80+edge,y+32,x+80+edge,y+43),fill='#ff2b4e')
        for k in range(-70,71,10):
            d.line((x+80+k,y+42,x+80+k,y+45),fill='black')
            if k%20==0:d.text((x+74+k,y+46),str(k),fill='#336677')
    out.save(aux/f'd{n:02}.png')
if sys.argv[1]=='detail':
    for no in sys.argv[2:]:detail(int(no))
def hubsheet(start,end):
    out=Image.new('RGB',(600,130*(end-start+1)),'white')
    d=ImageDraw.Draw(out)
    for j,n in enumerate(range(start,end+1)):
        im=src(n)
        hubs,_=picked(n)
        for i,h in enumerate(hubs):
            x,y=map(round,h)
            px=i*150+15
            py=j*130+16
            patch=im.crop((x-29,y-29,x+30,y+30)).resize((118,118),Image.Resampling.NEAREST)
            out.paste(patch,(px,py))
            d.text((px+5,py-15),f'{n} {["TL","TR","BR","BL"][i]} {x},{y}',fill='black')
            cx,cy=px+58,py+58
            for delta in [-1,1]:
                d.line((cx+delta*33,cy,cx+delta*53,cy),fill='#5dcfc8')
                d.line((cx,cy+delta*33,cx,cy+delta*53),fill='#5dcfc8')
    out.save(aux/f'h{start:02}.png')
if sys.argv[1]=='hubs':
    for start in range(1,37,6): hubsheet(start,start+5)
def focuses():
    boxes=[(7,(450,305,575,391)),(9,(446,646,577,689)),(14,(440,318,582,384)),(19,(455,641,569,687)),(22,(427,302,594,397)),(23,(450,651,576,707)),(24,(450,650,572,694)),(27,(453,650,574,697)),(30,(449,597,576,648))]
    out=Image.new('RGB',(3*345,3*225),'white')
    d=ImageDraw.Draw(out)
    for i,(n,b) in enumerate(boxes):
        x,y=345*(i%3),225*(i//3)
        im=src(n).crop(b); out.paste(im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST),(x,y+18))
        d.text((x,y),str(n),fill='black')
    out.save(aux/'camera.png')
    im=Image.new('RGB',(550,4*148),'white')
    d=ImageDraw.Draw(im)
    for i,(a,b,s,m,v) in enumerate(profiles(17)):
        im.paste(s.resize((483,123),Image.Resampling.NEAREST),(0,i*148+20))
        d.text((5,i*148+3),f'{i+1} {a} {b}',fill='black')
    im.save(aux/'marked.png')
if sys.argv[1]=='focus':focuses()

