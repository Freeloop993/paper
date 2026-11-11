"""First reading in native pixels. Bearing is clockwise from the image horizontal, modulo 180°."""
from pathlib import Path
import hashlib
import json
import math
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

root = Path(__file__).resolve().parent
img = Image.open(root/'product.png').convert('RGB')
gray = np.asarray(img.convert('L'), dtype=float)
j = json.loads((root/'geometry-targets.json').read_bytes())
plan = json.loads((root/'check-plan.json').read_bytes())
assert hashlib.sha256((root/'quad-guide.png').read_bytes()).hexdigest() == plan['input_guide_sha256']
assert hashlib.sha256((root/'prompt.txt').read_bytes()).hexdigest() == plan['prompt_sha256']
# AI located the four visible spindle centers and cropped tip windows by inspecting the original.
observations = [
    ((311,298), (480,115), (140,478)),
    ((942,298), (772,115), (1114,477)),
    ((944,901), (773,1091), (1115,724)),
    ((311,901), (140,724), (484,1090)),
]

def bearing(a,b):
    return math.degrees(math.atan2(b[1]-a[1],b[0]-a[0]))%180

def endpoint(hub, near):
    x,y = near
    iy,ix = np.nonzero(gray[y-12:y+13,x-12:x+13]<140)
    points=np.column_stack([ix+x-12,iy+y-12])
    ds=np.linalg.norm(points-hub,axis=1)
    return points[ds>=ds.max()-0.6].mean(axis=0)

def chord(hub, end):
    delta=end-hub
    perp=np.array([-delta[1],delta[0]])/np.linalg.norm(delta)
    dist=np.arange(-45,45.1,.25)
    xs,ys=(hub+end)[:,None]/2+perp[:,None]*dist
    inside=map_coordinates(gray,[ys,xs],order=1)<145
    mid=len(dist)//2
    assert inside[mid] and not inside[0] and not inside[-1]
    left=np.flatnonzero(~inside[:mid])[-1]+1
    right=mid+np.flatnonzero(~inside[mid:])[0]
    return float((right-left)*.25)

rows=[]
for (hub,*windows), target, prev in zip(observations,plan['targets_deg'],j['previous_axes']):
    h=np.array(hub)
    a,b=[endpoint(h,near) for near in windows]
    deg=bearing(a,b)
    prior=bearing(*prev['tips'])
    difference=lambda phase: abs((phase-target+90)%180-90)
    radii=[float(np.linalg.norm(t-h)) for t in [a,b]]
    widths=[chord(h,t) for t in [a,b]]
    rows.append(dict(hub=hub,tip_windows_px=windows,tips_px=[a.tolist(),b.tolist()],
                     phase_deg=deg,target_deg=target,phase_error_deg=difference(deg),
                     prior_phase_deg=prior,prior_error_deg=difference(prior),
                     blade_radii_px=radii,midspan_widths_px=widths))
hubs=np.array([r['hub'] for r in rows])
size=np.array(img.size)
span=np.ptp(hubs,axis=0)
goal=np.array(j['hubs_norm'])
report=dict(calls=1,formal_images=0,human_reviewers=0,ai_reading='condition-aware; spindle centers and tip regions visually identified',
    product_sha256=hashlib.sha256((root/'product.png').read_bytes()).hexdigest(),rgb_sha256=hashlib.sha256(img.tobytes()).hexdigest(),
    size=img.size,rotors=rows,ratio=span[0]/span[1],span_norm=(span/size).tolist(),target_span_norm=np.ptp(goal,axis=0).tolist(),
    mean_hub_error_norm=float(np.linalg.norm(hubs/size-goal,axis=1).mean()),
    cmf_visual={'upper_shell':'blue, fine texture and broad light gradients visible','exposed_arms':'contrasting dark woven pattern visible; appears coarse','propellers':'dark graphite, smooth with less visible texture than arms'},
    nose_camera='Not established from this top view.')
(root/'observation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for r in rows:
    print([round(r[k],2) for k in ['target_deg','phase_deg','phase_error_deg','prior_error_deg']],r['blade_radii_px'],r['midspan_widths_px'])
print('ratio',report['ratio'],'spans',report['span_norm'],report['target_span_norm'])
