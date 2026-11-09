"""Compile only the registered four screening configurations."""
import copy, hashlib, json, math, shutil
from pathlib import Path
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parent
G2=P.parent/'g2-control'
CONFIGS={'a':('skeleton',.7,1.),'b':('skeleton',.7,.5),'c':('marks',.7,.5),'d':('skeleton',.5,1.)}
def write(p,v):p.write_bytes((json.dumps(v,indent=2,ensure_ascii=False)+'\n').encode())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def guide(target,dest):
    im=Image.new('RGB',(1024,1024),'white');draw=ImageDraw.Draw(im)
    for x,y in target:
        dx,dy=x-512,y-512;distance=math.hypot(dx,dy)
        end=(round(512+dx*80/distance),round(512+dy*80/distance))
        draw.line([(x,y),end],fill='black',width=2)
        draw.ellipse((x-69,y-69,x+69,y+69),outline='black',width=2)
        draw.ellipse((x-5,y-5,x+5,y+5),fill='black')
    im.save(dest)
def build():
    (P/'requests').mkdir(exist_ok=True);(P/'guides').mkdir(exist_ok=True)
    base=json.loads((G2/'requests/G2-n4-r100-s2026111001.json').read_bytes())['prompt']
    t=next(row for row in json.loads((G2/'manifest.json').read_bytes())['cases'] if row['level']==1)['targets']
    guide(t,P/'guides/skeleton.png');shutil.copyfile(G2/'guides/G2-n4-r100.png',P/'guides/marks.png')
    rows=[]
    for k,(kind,strength,end) in CONFIGS.items():
        cid='G2b-'+k;g=copy.deepcopy(base);g['5']['inputs']['image']=kind+'.png';g['9']['inputs'].update(strength=strength,end_percent=end)
        g['10']['inputs']['seed']=2026111104;g['12']['inputs']['filename_prefix']=cid
        f=P/'requests'/(cid+'.json');write(f,{'prompt':g})
        rows.append(dict(case=cid,guide=kind+'.png',strength=strength,end=end,seed=2026111104,target=t,request_sha256=sha(f),guide_sha256=sha(P/'guides'/(kind+'.png'))))
    write(P/'screen.json',dict(cases=rows,primary='All four actual motor hubs localizable, continuous body and four arms, complete drone readable, and no copied guide marks.',tie_break='Require both independent AI readers to pass all items. Select lowest mean of per-reader mean Euclidean error to nominal targets; if an exact tie use alphabetical ID. Append independently sealed human responses when available.',waiver=False))
if __name__=='__main__':build()
