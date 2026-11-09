"""Compile a single paired diagnostic against a real, identified S1 parent PNG."""
import copy,hashlib,json,sys
from pathlib import Path
P=Path(__file__).resolve().parent;root=P.parents[1]; sys.path.insert(0,str(P.parent/'operator-workbench'))
from compiler import compile_input
parent=root/'evidence/s1-axis-repeat/originals/S1-B1-T.png'
sha=hashlib.sha256(parent.read_bytes()).hexdigest()
assert sha=='ac35060507d2694ab6ffe46c18d1b99e46841e6ea3c79181b697505bb818fdc5'
seed=2026111101
text="Integrate the front camera more smoothly into the nose. Retain the body's main silhouette, panel divisions, motor layout and arm-root transitions. Keep the same strict orthographic top view, lighting and framing."
def build():
    outputs=[]
    for ref in [False,True]:
        g=compile_input('A','D',{'instruction':text},seed,sha if ref else None)['prompt']
        # The real parent is a top view. Do not force a change to 3/4 view in this reference test.
        g['4']['inputs']['prompt']="Revise one everyday aerial photography quadrotor concept. "+text
        name='with-reference' if ref else 'text-only'
        g['12']['inputs']['filename_prefix']='G3-'+name
        (P/(name+'.json')).write_bytes((json.dumps({'prompt':g},indent=2)+'\n').encode());outputs.append(copy.deepcopy(g))
    t,r=outputs
    assert r.pop('15')['inputs']['image']==f'parent-{sha}.png'
    assert r['4']['inputs'].pop('images.image_1')==['15',0] and r['4']['inputs'].pop('vae')==['3',0]
    r['12']=t['12'];assert t==r
if __name__=='__main__':build()
