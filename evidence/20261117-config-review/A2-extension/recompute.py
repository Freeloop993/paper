"""Recalculate A2 extension from readings.json. Run with --verify-images for source QA."""
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import statistics
import subprocess

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'readings.json').read_text('utf-8'))
QUAD = [('FL','RR'),('FR','RL')]
HEX = [('M1','M4'),('M2','M5'),('M3','M6')]
FIELDS = ['id','group','W_px','L_px','W_over_L'] + [f'd_{a}_{b}_px' for a,b in QUAD + HEX] + ['D_mean_px','D_max_px','body_w_px','body_l_px','PV01','PV02','prop_d_mean_px','d_over_D_mean','d_over_D_max','prop_status']
RFIELDS = ['id','hub','tip_span_px','rA_px','rB_px','radius_sum_px','hub_midpoint_offset_px','hub_to_chord_line_px','angle_at_hub_deg']

def digest(b):
    return hashlib.sha256(b).hexdigest()

def calculate(s):
    p = s['points']
    pairs = {4:QUAD,6:HEX}[s['rotor_count']]
    hubs = [k for k in p if not k.startswith('body_')]
    assert set(hubs) == {k for pair in pairs for k in pair}
    f = s['nose_unit_xy']
    assert math.isclose(math.hypot(*f),1)
    r = [-f[1],f[0]]
    def proj(k,v): return sum(x*y for x,y in zip(p[k],v))
    def span(v): return max(proj(k,v) for k in hubs)-min(proj(k,v) for k in hubs)
    def extent(a,b,v): return None if p[a] is None or p[b] is None else proj(a,v)-proj(b,v)
    w,l = span(r),span(f)
    ds = {f'd_{a}_{b}_px':math.dist(p[a],p[b]) for a,b in pairs}
    mean,largest = statistics.mean(ds.values()),max(ds.values())
    bw = extent('body_right','body_left',r)
    bl = extent('body_nose','body_tail',f)
    tips = s['propellers']['tips']
    rot = []
    if tips:
        assert set(tips) == set(hubs)
        for k,(a,b) in tips.items():
            x,y = p[k]
            u,v = a[0]-x,a[1]-y
            i,j = b[0]-x,b[1]-y
            ab = math.dist(a,b)
            ha,hb = math.hypot(u,v),math.hypot(i,j)
            cross = abs(u*j-v*i)
            rot.append(dict(zip(RFIELDS,[s['id'],k,ab,ha,hb,ha+hb,math.hypot(u+i,v+j)/2,cross/ab,math.degrees(math.atan2(cross,u*i+v*j))])))
    d = statistics.mean(o['tip_span_px'] for o in rot) if rot else None
    return dict(id=s['id'],group=s['group'],W_px=w,L_px=l,W_over_L=w/l,**ds,D_mean_px=mean,D_max_px=largest,body_w_px=bw,body_l_px=bl,PV01=bl/bw if bl and bw else None,PV02=bw/mean if bw else None,prop_d_mean_px=d,d_over_D_mean=d/mean if d else None,d_over_D_max=d/largest if d else None,prop_status=s['propellers']['status']), rot

def verify(s,manuals,preview):
    from PIL import Image,ImageDraw,ImageFont
    pdf = manuals/s['filename']
    assert digest(pdf.read_bytes()) == s['pdf_sha256'], pdf
    n = str(s['pdf_page'])
    ppm = subprocess.check_output(['pdftoppm','-r',str(DATA['dpi']),'-f',n,'-l',n,'-singlefile',str(pdf)])
    page = Image.open(io.BytesIO(ppm)).convert('RGB')
    assert list(page.size) == s['page_size_px']
    im = page.crop(s['crop_ltrb_px'])
    assert digest(im.tobytes()) == s['crop_rgb_sha256'], s['id']
    gray = im.convert('L')
    pts = s['points']
    assert all(0<=x<im.width and 0<=y<im.height for xy in pts.values() if xy for x,y in [xy])
    for k,pair in s.get('hub_fasteners',{}).items():
        assert pts[k] == [(a+b+1)//2 for a,b in zip(*pair)]
    if 'hub_refinement' in s:
        angles = [a*math.pi/180 for a in range(0,360,2)]
        for k,(u,v),radius in zip(['FL','FR','RL','RR'],s['hub_refinement']['seeds'],s['hub_refinement']['r_px'],strict=True):
            def score(x,y,r):
                return sum(255-gray.getpixel((round(x+r*math.cos(a)),round(y+r*math.sin(a)))) for a in angles)
            _,x,y,r = max((score(x,y,r),x,y,r) for x in range(u-4,u+5) for y in range(v-4,v+5) for r in [20+i/4 for i in range(21)])
            assert [x,y]==pts[k] and radius==r
    for k,seeds in s['propellers'].get('window_centers',{}).items():
        for (x,y),expect in zip(seeds,s['propellers']['tips'][k],strict=True):
            R = DATA['tip_window_radius_px']
            candidates = ((i,j) for j in range(max(0,y-R),min(im.height,y+R+1)) for i in range(max(0,x-R),min(im.width,x+R+1)) if gray.getpixel((i,j))<=DATA['tip_gray_max'])
            assert list(max(candidates,key=lambda v:math.dist(v,pts[k])))==expect
    if preview:
        out = ROOT/'preview'
        out.mkdir(exist_ok=True)
        im.save(out/(s['id']+'-crop.png'))
        draw = ImageDraw.Draw(im)
        font = ImageFont.truetype('arial.ttf',17)
        def mark(xy,color,label,dy):
            x,y = xy
            draw.ellipse((x-7,y-7,x+7,y+7),outline=color,width=2)
            draw.ellipse((x-1,y-1,x+1,y+1),fill=color)
            tw = int(draw.textlength(label,font=font))
            tx = min(im.width-tw-4,x+10)
            draw.text((tx,y+dy),label,font=font,fill=color,stroke_width=2,stroke_fill='white')
        for k,pair in (s['propellers']['tips'] or {}).items():
            draw.line(list(map(tuple,pair)),fill='#098452',width=1)
            for suf,xy in zip('AB',pair):
                mark(xy,'#077246',k+suf,9)
        for k,xy in pts.items():
            if xy:
                mark(xy,'#af3139' if k.startswith('body_') else '#005ca9',k,-25)
        draw.line((30,72,30,28),fill='#104e72',width=3)
        draw.polygon([(30,17),(23,33),(37,33)],fill='#104e72')
        draw.text((43,38),'NOSE',font=font,fill='#104e72',stroke_width=2,stroke_fill='white')
        im.save(out/(s['id']+'-marked.png'))

def table(fields,rows):
    buf = io.StringIO(newline='')
    wr = csv.DictWriter(buf,fieldnames=fields,lineterminator='\n')
    wr.writeheader()
    for row in rows:
        wr.writerow({k:(f'{v:.6f}' if isinstance(v,(int,float)) else v) for k,v in row.items()})
    return buf.getvalue()

if __name__=='__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--write',action='store_true',help='create CSVs instead of checking them')
    ap.add_argument('--verify-images',action='store_true')
    ap.add_argument('--preview',action='store_true',help='write marked and original crops; implies image check')
    ap.add_argument('--manuals',type=Path,default=ROOT/'../../A1-A4-C1/manuals.local')
    args = ap.parse_args()
    rows,rotors=[],[]
    for s in DATA['samples']:
        if args.verify_images or args.preview:
            verify(s,args.manuals,args.preview)
        row,rs=calculate(s)
        rows.append(row)
        rotors.extend(rs)
    for name,fields,data in [('metrics.csv',FIELDS,rows),('rotors.csv',RFIELDS,rotors)]:
        file = ROOT/name
        value = table(fields,data)
        if args.write: file.write_bytes(value.encode('utf-8'))
        elif file.read_text('utf-8-sig') != value: raise SystemExit(name+' mismatch')
    print(f'OK: {len(rows)} models; {len(rotors)} measured two-blade rotors; source/image check={args.verify_images or args.preview}')

