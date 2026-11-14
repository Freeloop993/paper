"""E2 correction; compile clean native-Qwen edit / layout pairs before any POST."""
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).parent
GUIDE = "qwen-shape-dots-250-15c5ad1c924b.png"
PARENTS = {"B2":"E3R3-B2.png","C1":"E3R3-C1.png"}
SPEC = {
    "B2":"A light-grey streamlined quadcopter with smooth arm shoulders, top-cover panel lines and orange motor rings.",
    "C1":"A light-grey faceted quadcopter with visible arm sockets, carbon-pattern arms, top-cover panels and orange motor rings."
}
SHARED = ("Use the reference for the four motor positions and arm directions. Orthographic top view, the nose at the top. "
          "Each of the four rotors has two equal opposite blades. Show the whole aircraft. "
          "The flight camera faces horizontally forward. From overhead its lens can be occluded; the lens glass must not face the viewer.")
TASK = {
    "A":"Narrow and round only the leading edge of the fuselage nose. Preserve the arms, rear fuselage and the existing camera installation.",
    "B":"Broaden and smooth only the four transitions from the fuselage into the arm roots. Preserve the nose, rotor centres and propellers."
}
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
def build():
    template=json.loads((ROOT/'queue/01-REV1-edit-B2-r1.json').read_bytes())
    rows=[]
    for p,t,seed,control in [('B2','A',2026112501,True),('B2','B',2026112502,False),('C1','A',2026112503,False),('C1','B',2026112504,True)]:
        for route in (['parent','layout'] if control else ['parent']):
            image=PARENTS[p] if route=='parent' else GUIDE
            rid='E2R-'+p+'-'+t+'-'+route
            req=copy.deepcopy(template);g=req['prompt']
            text=' '.join([SPEC[p],SHARED,TASK[t]])
            g['4']['inputs']['prompt']=text
            g['15']['inputs']['image']=image
            g['10']['inputs']['seed']=seed
            g['12']['inputs']['filename_prefix']=rid
            raw=json.dumps(req,ensure_ascii=False,indent=2).encode()
            dest=ROOT/'e2r'/('requests/'+rid+'.json');dest.parent.mkdir(exist_ok=True,parents=True);dest.write_bytes(raw)
            source=ROOT/'inputs'/image if image!='E3R3-C1.png' else ROOT/image
            rows.append(dict(id=rid,parent=p,target=t,route=route,seed=seed,image=image,input_sha256=sha(source.read_bytes()),request_sha256=sha(raw),prompt=text))
    for p,t in [('B2','A'),('C1','B')]:
        a,b=[json.loads((ROOT/'e2r/requests'/ (row['id']+'.json')).read_bytes()) for row in rows if row['parent']==p and row['target']==t]
        for node,key in [('12','filename_prefix'),('15','image')]:b['prompt'][node]['inputs'][key]=a['prompt'][node]['inputs'][key]
        assert a==b
    dst=ROOT/'e2r/manifest.json';dst.write_bytes((json.dumps(rows,ensure_ascii=False,indent=2)+'\n').encode())
if __name__=='__main__':build()
