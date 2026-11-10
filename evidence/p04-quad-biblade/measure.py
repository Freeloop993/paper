"""Recalculate the P04 pilot from the first reading, in original image coordinates."""
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import map_coordinates

root = Path(__file__).resolve().parent
def read_json(name):
    return json.loads((root / name).read_bytes())

def digest(data):
    return hashlib.sha256(data).hexdigest()

def refine_center(gray, initial):
    # Find the concentric bolt near the visually identified hub, within +/-2 px.
    theta = np.arange(128) * 2 * np.pi / 128
    radii = np.arange(5, 18, 0.5)[:, None]
    x0, y0 = initial
    def score(x, y):
        ring = map_coordinates(gray, [y + radii*np.sin(theta), x + radii*np.cos(theta)], order=1)
        median = np.median(ring, axis=1)
        return np.abs(np.diff(median)).sum() / (1 + np.median(np.abs(ring-median[:, None])))
    _, x, y = max((score(x,y), x,y) for x in np.arange(x0-2,x0+2.1,.5) for y in np.arange(y0-2,y0+2.1,.5))
    return [float(x),float(y)]

freeze = read_json('freeze.json')
reads = read_json('first-reading.json')
results = {}
for key, reading in reads.items():
    level = key.split('-')[1]
    setting = freeze['levels'][level]
    for ext, field in [('png','guide_sha256'),('txt','prompt_sha256')]:
        assert digest((root / f'{level}.{ext}').read_bytes()) == setting[field]
    png = root / f'{key}.png'
    im = Image.open(png).convert('RGB')
    w,h = im.size
    frame = read_json('targets.json')[level]
    target = np.array(frame['hubs_normalized'])
    gray = np.array(im.convert('L'),dtype=float)
    hubs, angles, lengths = [], [], []
    for rotor in reading['rotors']:
        center = refine_center(gray,rotor['hub_initial'])
        hubs.append(center)
        if rotor['tip_inboard'] is None:
            angles.append(None)
            lengths.append(None)
        else:
            outer = np.array(rotor['tip_outboard']) - center
            inner = np.array(rotor['tip_inboard']) - center
            a,b = np.linalg.norm(outer), np.linalg.norm(inner)
            angles.append(round(math.degrees(math.acos(np.clip(np.dot(outer,inner)/(a*b),-1,1))),2))
            lengths.append([round(a,1),round(b,1)])
    span_x,span_y = np.ptp(hubs,axis=0)
    ratio = span_x/span_y
    ref = setting['target_ratio']
    per_hub = np.linalg.norm(np.array(hubs)/[w,h]-target,axis=1)
    ratio_bounds = [(span_x-2)/(span_y+2),(span_x+2)/(span_y-2)]
    results[key] = dict(size=[w,h],sha256=digest(png.read_bytes()),rgb_sha256=digest(im.tobytes()),
        target_ratio=ref,hubs_px=hubs,span_px=[span_x,span_y],span_normalized=[span_x/w,span_y/h],
        target_span_normalized=list(np.ptp(target,axis=0)),ratio=ratio,ratio_abs_error=abs(ratio-ref),
        ratio_with_independent_one_px_axis_perturbation=ratio_bounds,
        ratio_pass=bool(abs(ratio-ref)<=.10),hub_errors_norm=per_hub.tolist(),mean_hub_error_norm=float(per_hub.mean()),
        angle_deg=angles, length_out_in_px=lengths,visible_blades_per_hub=[r['visible_blades'] for r in reading['rotors']],
        all_four_deployed_confirmed=all(a is not None and a>=165 for a in angles))
assert len({row['rgb_sha256'] for row in results.values()}) == 6
report = dict(study='P04 technical pilot', call_count=6,files=6,formal_images=0, independent_human_readers=0,
    measurement='Condition-aware single AI reading on native image; tip points approximate. Bolt refinement local to each visual pick; no alignment to guides. Unknown second tips excluded from angle calculation only.',
    monotonic_blocks={block: all(a<b for a,b in zip(vals,vals[1:])) for block in ['b1','b2']
        for vals in [[results[f'{block}-{k}']['ratio'] for k in ['r085','r100','r115']]]},images=results)
(root/'outcomes.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
thumb=310
sheet=Image.new('RGB',(thumb*3,(thumb+34)*2),'white')
draw=ImageDraw.Draw(sheet)
font=ImageFont.load_default(size=16)
for row,block in enumerate(['b1','b2']):
    for col,k in enumerate(['r085','r100','r115']):
        key=f'{block}-{k}'
        im=Image.open(root/f'{key}.png').convert('RGB').resize((thumb,thumb),Image.Resampling.LANCZOS)
        x,y=col*thumb,row*(thumb+34)
        sheet.paste(im,(x,y))
        data=results[key]
        draw.text((x+7,y+thumb+7), f"{block.upper()}   target {data['target_ratio']:.2f}    measured {data['ratio']:.3f}",font=font,fill='#222222')
sheet.save(root/'contact-sheet.jpg',quality=91)
for k,r in results.items():
    print(k,round(r['ratio'],4),r['ratio_pass'],r['angle_deg'],r['length_out_in_px'],[round(n,4) for n in r['ratio_with_independent_one_px_axis_perturbation']])
