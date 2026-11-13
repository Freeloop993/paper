"""Compile the S, W and matched low-contrast cells of H3 round 2."""
from pathlib import Path
import hashlib,json,math,random,shutil
import numpy as np
from PIL import Image,ImageDraw

root=Path(__file__).resolve().parent
old=root.parent/'round-1'
pilot=root.parents[2]/'experiments/form342-h3-pilot'
spec=json.loads((pilot/'exports/A/spec.json').read_bytes())['layout']
def save(path,value):
    path.write_bytes((json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode())
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
d=json.loads((old/'dictionary.json').read_bytes())
d['version']='shape-dictionary-v1.2'
d['fixed_lines']['cmf']='Matte light grey shell and arms in one continuous colour, dark grey motors, black propellers.'
d['params']['cover']['single']='A plain top cover with no seams crossing it.'
save(root/'dictionary.json',d)
guides=root/'guides'
guides.mkdir(exist_ok=True)
shutil.copyfile(old/'guides/dots.png',guides/'dots.png')
shutil.copyfile(old/'guides/G-w10.png',guides/'W10.png')
aa=4
canvas=Image.new('RGB',(1024*aa,1024*aa))
draw=ImageDraw.Draw(canvas)
for x,y,u,v in spec['links']:
    length=math.hypot(u-x,v-y)
    dx,dy=-(v-y)/length*25*spec['pxPerMm']/2,(u-x)/length*25*spec['pxPerMm']/2
    draw.polygon([(round(a*aa),round(b*aa)) for a,b in [(x+dx,y+dy),(u+dx,v+dy),(u-dx,v-dy),(x-dx,y-dy)]],fill=(32,92,255))
for h in spec['hubs']:
    x,y=h['x_px'],h['y_px']
    draw.ellipse(tuple(round(z*aa) for z in (x-10,y-10,x+10,y+10)),fill=(255,0,0))
canvas.resize((1024,1024),Image.Resampling.LANCZOS).save(guides/'W25.png')
for name in ['dots','W25']:
    arr=np.asarray(Image.open(guides/(name+'.png')).convert('RGB'),dtype=float)
    blue=arr[:,:,2]/255
    red=np.clip((arr[:,:,0]-32*blue)/255,0,1)
    low=np.rint(blue[:,:,None]*np.array([60,60,60])+red[:,:,None]*np.array([110,30,30])).astype('uint8')
    assert np.all(low[(arr==[255,0,0]).all(axis=2)]==[110,30,30]) and np.all(low[(arr==[32,92,255]).all(axis=2)]==60)
    Image.fromarray(low).save(guides/('low-'+name+'.png'))
changes={'S0':{},'S1':{'body_plan':'box'},'S2':{'arm_root':'socket'},'S3':{'arm_root':'hinge'},'S4':{'camera':'projecting'},'S5':{'cover':'multi'},'W10':{},'W25':{}}
conditions=[*changes,'L-S0','L-S2','L-S4','L-W25']
sentence='The bars in the layout show the arm width.'
rows=[]
rng=random.Random(236202611)
for n in (1,2,3):
    group=conditions.copy()
    rng.shuffle(group)
    for cond in group:
        normal=cond.removeprefix('L-')
        choice=d['base']|changes[normal]
        lines=[d['fixed_lines'][k] if k in d['fixed_lines'] else d['params'][k][choice[k]] for k in d['line_order']]
        name='dots'
        if normal.startswith('W'):
            name=normal
            lines.append(sentence)
        if cond!=normal:name='low-'+name
        path=guides/(name+'.png')
        rows.append(dict(id=f'{cond}-{n}',condition=cond,rep=n,target=choice,input_source=path.relative_to(root).as_posix(),input_sha256=digest(path),fields=dict(model='MiniMax-H3-Image',size='1024x1024',n=1,output_format='png',response_format='b64_json',prompt='\n'.join(lines))))
by_id={r['id']:r for r in rows}
assert len(by_id)==len(rows)==36
for r in rows:
    if r['condition'].startswith('L-'):
        other=by_id[r['id'][2:]]
        assert r['fields']==other['fields'] and r['input_sha256']!=other['input_sha256']
assert sum(r['fields']['prompt'].endswith(sentence) for r in rows)==9
save(root/'manifest.json',dict(endpoint='https://api.minimax.io/v1/images/edits',origin='f1f283d',comparison='second-round regular versus low contrast, same condition, unpaired random outputs',rows=rows))
