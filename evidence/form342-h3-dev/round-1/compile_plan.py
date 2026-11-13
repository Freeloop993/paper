"""Compile one block-randomized development round from the archived configurator export."""
import hashlib
import json
import math
import random
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
PILOT = ROOT.parents[2] / 'experiments/form342-h3-pilot'
BASE = PILOT / 'guide.png'
spec = json.loads((PILOT / 'exports/A/spec.json').read_bytes())['layout']
dictionary = json.loads((ROOT / 'dictionary.json').read_bytes())
baseline = dictionary['base']
colors = {'blue':(32,92,255), 'red':(255,0,0)}
guides = ROOT / 'guides'
guides.mkdir(exist_ok=True)
shutil.copyfile(BASE, guides / 'dots.png')
origin = spec['size'] / 2
scale = spec['pxPerMm']
AA = 4

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def make_guide(name, value):
    with Image.open(BASE) as img:
        img = img.convert('RGB')
    layer = Image.new('RGB', (1024*AA, 1024*AA))
    draw = ImageDraw.Draw(layer)
    if name.startswith('G-w'):
        for x,y,u,v in spec['links']:
            length = math.hypot(u-x,v-y)
            dx,dy = -(v-y)/length*value*scale/2, (u-x)/length*value*scale/2
            draw.polygon([(round(a*AA),round(b*AA)) for a,b in [(x+dx,y+dy),(u+dx,v+dy),(u-dx,v-dy),(x-dx,y-dy)]], fill=colors['blue'])
        for hub in spec['hubs']:
            x,y = hub['x_px'],hub['y_px']
            draw.ellipse(tuple(round(z*AA) for z in [x-10,y-10,x+10,y+10]), fill=colors['red'])
        img = layer.resize(img.size, Image.Resampling.LANCZOS)
    else:
        mask = Image.new('L',layer.size)
        radius_x = 25*scale
        radius_y = radius_x*value
        ImageDraw.Draw(mask).rounded_rectangle(tuple(round(z*AA) for z in [origin-radius_x,origin-radius_y,origin+radius_x,origin+radius_y]),radius=round(8*AA),fill=255)
        img.paste((192,192,192),mask=mask.resize(img.size,Image.Resampling.LANCZOS))
    path = guides / (name+'.png')
    img.save(path)
    return path

choices = {'S0':{},'S1':{'body_plan':'box'},'S2':{'arm_root':'socket'},'S3':{'arm_root':'hinge'},'S4':{'camera':'projecting'},'S5':{'cover':'multi'}}
for label in ['G-w10','G-w15','G-w20','G-r1.4','G-r1.8','G-r2.4']:
    choices[label] = {}
rows = []
rng = random.Random(136105)
for rep in range(1,4):
    labels = list(choices)
    rng.shuffle(labels)
    for label in labels:
        chosen = baseline | choices[label]
        lines = [dictionary['fixed_lines'][k] if k in dictionary['fixed_lines'] else dictionary['params'][k][chosen[k]] for k in dictionary['line_order']]
        guide = guides / 'dots.png'
        if label.startswith('G'):
            guide = make_guide(label,float(label[3:])) if rep==1 else guides/(label+'.png')
            lines.append('The blue bars in the layout show the arm width.' if label[2]=='w' else 'The grey shape in the layout marks the body footprint; design the shell within it.')
        rows.append(dict(id=f'{label}-{rep}',condition=label,rep=rep,target=chosen,input_source=guide.relative_to(ROOT).as_posix(),input_sha256=digest(guide),fields=dict(model='MiniMax-H3-Image',size='1024x1024',n=1,output_format='png',response_format='b64_json',prompt='\n'.join(lines))))
assert len(rows)==len({r['id'] for r in rows})==36
assert len({r['input_sha256'] for r in rows})==7
(ROOT/'manifest.json').write_text(json.dumps(dict(rows=rows,guide_origin='e997109:experiments/form342-h3-pilot/guide.png',px_per_mm=scale,endpoint='https://api.minimax.io/v1/images/edits'),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
