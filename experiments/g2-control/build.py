"""Compile only; no network client. Pillow for rendering lossless PNG guides."""
import copy, hashlib, json, math, sys
from pathlib import Path
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parent;ROOT=P.parents[1]
def load(p):return json.loads(p.read_bytes())
def save(p,v):
    p.parent.mkdir(exist_ok=True,parents=True);p.write_bytes((json.dumps(v,indent=2,ensure_ascii=False)+'\n').encode())
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
TARGETS=load(P/'paired-layout-targets.json')['targets']
GRAPH=load(ROOT/'evidence/s1-decomposition/executed-graphs.json')['cases']['S1-B1-L']['graph']
RADIUS=69 # rounded 0.23 x 600 / 2; historical scale, new application choice
SEEDS={'G2':[2026111001,2026111002],'COMMON':[2026111201,2026111202]}
def compile_set(directory,batch,rotors,strength):
    files={};rows=[]
    for t in TARGETS:
        n=t['rotors'];target=t['relative_span_target']
        if n not in rotors:continue
        tag=f'{batch}-n{n}-r{int(round(target*100)):03}'; im=Image.new('RGB',(1024,1024),'white'); draw=ImageDraw.Draw(im)
        xy=t['motor_centers_xy_px']
        for x,y in xy:
            draw.ellipse((x-RADIUS,y-RADIUS,x+RADIUS,y+RADIUS),outline='black',width=2)
            draw.line((x-6,y,x+6,y),fill='black',width=2);draw.line((x,y-6,x,y+6),fill='black',width=2)
        assert all(0<=x-RADIUS and x+RADIUS<1024 and 0<=y-RADIUS and y+RADIUS<1024 for x,y in xy)
        assert min(math.dist(x,y) for i,x in enumerate(xy) for y in xy[i+1:])>2*RADIUS
        guide=directory/'guides'/(tag+'.png');guide.parent.mkdir(exist_ok=True,parents=True);im.save(guide);files[str(guide.relative_to(directory).as_posix())]=digest(guide)
        for s in SEEDS[batch]:
            cid=f'{tag}-s{s}';g=copy.deepcopy(GRAPH)
            g['5']['inputs']['image']=guide.name;del g['7']
            g['9']['inputs'].update(image=['6',0],strength=strength,start_percent=0,end_percent=1)
            brief=('Develop one compact drone for everyday personal aerial photography. Integrate the camera into the body and resolve the arm roots. ' if batch=='G2' else 'Develop one compact optical imaging platform. Integrate the camera into the body and resolve the arm roots. ')
            g['4']['inputs']['prompt']=brief+f'Exactly {n} rotors. Interpret the circles and crosses only as rotor disk and motor center locations. Choose the fuselage silhouette, sections and material transitions freely. Show one complete drone in strict orthographic top view, front up, on white. Soft lighting, matte neutral gray shell, distinct dark camera window. Show volume with shading. No guide markings.'
            g['10']['inputs']['seed']=s;g['12']['inputs']['filename_prefix']=cid
            f=directory/'requests'/(cid+'.json');save(f,{'prompt':g});files[str(f.relative_to(directory).as_posix())]=digest(f)
            rows.append({'case':cid,'n':n,'level':target,'seed':s,'base_wh':t['base_span_ratio'],'targets':xy,'guide':guide.name})
    save(directory/'manifest.json',{'kind':'offline_candidate_not_authorized','batch':batch,'strength':strength,'source_targets_sha256':digest(P/'paired-layout-targets.json'),'radius_px':RADIUS,'cases':rows,'files':files})
    return rows
if __name__=='__main__':compile_set(P,'G2',{4},1.0)
