"""P06 single-image, condition-aware measurement on the unscaled PNG."""
from pathlib import Path
import hashlib
import json
import math
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

root = Path(__file__).resolve().parent
image_bytes = (root / 'result.png').read_bytes()
rgb = Image.open(root / 'result.png').convert('RGB')
gray = np.asarray(rgb.convert('L'), dtype=float)
spec = json.loads((root / 'freeze.json').read_bytes())
for name, key in [('square.txt','prompt_sha256'),('square.png','guide_sha256')]:
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==spec[key]
# Manually identified cap centers and small search windows for the visible tips.
rotors = [((314,400),98,529), ((941,400),726,1157),
          ((941,891),726,1157), ((314,891),98,529)]

def tip_near(hub, approx_x, threshold):
    x,y = hub
    left,top = approx_x-6,y-9
    yy,xx = np.nonzero(gray[top:y+10,left:approx_x+7] < threshold)
    xx,yy=xx+left, yy+top
    extreme = xx.min() if approx_x<x else xx.max()
    return np.array([extreme, np.mean(yy[xx==extreme])])

def mid_chord(hub, tip, threshold):
    midpoint = (tip + hub)/2
    dx,dy = tip - hub
    normal = np.array([-dy,dx])/np.hypot(dx,dy)
    offsets = np.arange(-38,38.1,.25)
    xs,ys = midpoint[:,None]+normal[:,None]*offsets
    inside = map_coordinates(gray,[ys,xs],order=1)<threshold
    center = np.argmin(abs(offsets))
    assert inside[center] and not inside[0] and not inside[-1]
    start = np.flatnonzero(~inside[:center])[-1]+1
    stop = center+np.flatnonzero(~inside[center:])[0]
    return float((stop-start)*.25)

def measure(hub, left, right, threshold):
    hub=np.array(hub)
    tips = [tip_near(hub,x,threshold) for x in (left,right)]
    radii = [np.linalg.norm(t-hub) for t in tips]
    widths = [mid_chord(hub,t,threshold) for t in tips]
    dot = np.dot(tips[0]-hub,tips[1]-hub)/np.prod(radii)
    return dict(hub=hub.tolist(), tips=[t.tolist() for t in tips],
        radii_px=radii, short_long_radius=min(radii)/max(radii),
        mid_chords_px=widths, narrow_wide_mid_chord=min(widths)/max(widths),
        tip_angle_deg=math.degrees(math.acos(np.clip(dot,-1,1))))
rows = [measure(*r,145) for r in rotors]
hubs=np.array([r[0] for r in rotors])
dx,dy=np.ptp(hubs,axis=0)
wl=float(dx/dy)
thresholds={'angle_min_deg':165,'short_to_long_radius_min':0.90,'short_to_long_midchord_width_min':0.85}
def blades_ok(r):
    return (r['tip_angle_deg'] >= thresholds['angle_min_deg'] and
            r['short_long_radius'] >= thresholds['short_to_long_radius_min'] and
            r['narrow_wide_mid_chord'] >= thresholds['short_to_long_midchord_width_min'])
out = dict(calls=1,formal_new_images=0,independent_readers=0,
    size=rgb.size,sha256=hashlib.sha256(image_bytes).hexdigest(),rgb_sha256=hashlib.sha256(rgb.tobytes()).hexdigest(),
    geometry=dict(ratio=wl,span_px=[int(dx),int(dy)],ratio_pass=abs(wl-1)<=0.10),
    symmetry_screen_passes=sum(bool(blades_ok(r)) for r in rows), rotors=rows,
    sensitivity_120_165=[all(blades_ok(measure(*r,t)) for r in rotors) for t in (120,165)],
    camera_top_projection='Continuous upper shell. No round optical front face visible from above.',
    camera_presence='unverified', camera_orientation='unverified', camera_integration='unverified',
    orientation_observed='Four nearly horizontal blade axes. Guide requests tangents at 45/135 degrees.',
    tip_read_method='AI selected centers and tip windows. Local grayscale threshold 145 with sensitivity 120 and 165; perpendicular midspan connected width.')
(root/'measurement.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(wl,out['symmetry_screen_passes'],out['sensitivity_120_165'])
for r in rows:
    print([round(v,2) for v in r['radii_px']],r['mid_chords_px'],round(r['tip_angle_deg'],2),round(r['short_long_radius'],4),round(r['narrow_wide_mid_chord'],4))