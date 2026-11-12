"""Compile G2d from the archived middle C1 guide and registered four-rotor targets."""
import copy
import hashlib
import json
import math
import statistics
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OLD = ROOT / "evidence/historic-guides"
G2 = HERE.parent / "g2-control"
SEEDS = (2026111105, 2026111106)
PROMPT = (
    "Develop one compact drone for everyday personal aerial photography. Integrate the camera "
    "into the body and resolve the arm roots. Show a complete quadrotor in strict orthographic "
    "top view, front up, on white. Choose the fuselage silhouette, sections and material "
    "transitions freely. Soft lighting, matte neutral gray shell, distinct dark camera window. "
    "Show volume with shading. No guide markings."
)

def read(path):
    return json.loads(path.read_bytes())

def write(path, value):
    path.write_bytes((json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode())

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def measure_middle():
    """Last dark pixel along each inward diagonal, measured from the nominal hub."""
    guide = OLD / "control_L2.png"
    record = next(r for r in read(OLD / "executed-guides.json") if r["case"] == "L2S1C1")
    assert digest(guide) == record["guide_sha256"]
    diagonal = math.hypot(424, 424)
    with Image.open(guide) as image:
        gray = image.convert("L")
        lengths = []
        for x, y in [(300,300), (724,300), (300,724), (724,724)]:
            sx, sy = (1 if x < 512 else -1), (1 if y < 512 else -1)
            steps = [i for i in range(213) if gray.getpixel((x+sx*i, y+sy*i)) < 128]
            lengths.append(max(steps) * math.sqrt(2))
    return {"source_sha256": digest(guide), "arm_axis_lengths_px": lengths,
            "fixed_arm_length_px": round(statistics.mean(lengths), 3),
            "blade_radius_px": diagonal * 0.23 / 2, "arm_width_px": 12,
            "shaft_ring_radius_px": 10, "shaft_ring_stroke_px": 3}

def render(centers, shape, target, *, blade_scale=1.0):
    scale = 3
    canvas = Image.new("RGB", (1024*scale, 1024*scale), "white")
    draw = ImageDraw.Draw(canvas)
    scaled = lambda coords: [(x*scale, y*scale) for x, y in coords]
    for x, y in centers:
        dx, dy = 512-x, 512-y
        norm = math.hypot(dx,dy)
        length = shape["fixed_arm_length_px"]
        tip = (x+dx*length/norm, y+dy*length/norm)
        draw.line(scaled([tip,(x,y)]), fill="#222222", width=shape["arm_width_px"]*scale)
    radius = shape["blade_radius_px"]
    blade = [(9*blade_scale,-4*blade_scale),(.4*radius,-9*blade_scale),(.8*radius,-7*blade_scale),(radius,0),(.8*radius,7*blade_scale),(.4*radius,9*blade_scale),(9*blade_scale,4*blade_scale)]
    for x,y in centers:
        # Take the orientation at the same quadrant of the archived square, at every target level.
        ax = -math.copysign(212/math.hypot(212,212), y-512)
        ay = math.copysign(212/math.hypot(212,212), x-512)
        for sign in (-1,1):
            vertices = [(x+sign*u*ax-v*ay, y+sign*u*ay+v*ax) for u,v in blade]
            draw.polygon(scaled(vertices), fill="#222222")
        rr = shape["shaft_ring_radius_px"]
        draw.ellipse(((x-rr)*scale,(y-rr)*scale,(x+rr)*scale,(y+rr)*scale),
                     fill="white", outline="#222222", width=shape["shaft_ring_stroke_px"]*scale)
    canvas.resize((1024,1024),Image.Resampling.LANCZOS).save(target)

def main():
    for child in ("requests","guides"):
        (HERE/child).mkdir(exist_ok=True)
    shape = measure_middle()
    target_rows = read(G2/"paired-layout-targets.json")["targets"]
    original = next(r["graph"] for r in read(OLD/"executed-guides.json") if r["case"]=="L2S1C1")
    cases, files = [], {}
    for row in (r for r in target_rows if r["rotors"]==4):
        level, centers = row["relative_span_target"], row["motor_centers_xy_px"]
        guide = HERE/"guides"/f"parts-r{round(100*level):03}.png"
        render(centers, shape, guide)
        files[guide.relative_to(HERE).as_posix()] = digest(guide)
        for seed in SEEDS:
            case = f"G2d-r{round(100*level):03}-s{seed}"
            graph = copy.deepcopy(original)
            graph["4"]["inputs"]["prompt"] = PROMPT
            # B02 presentation vocabulary; keep technical sampling and Canny nodes from C1.
            graph["4"]["inputs"]["negative_prompt"] = read(G2/"requests/G2-n4-r100-s2026111001.json")["prompt"]["4"]["inputs"]["negative_prompt"]
            graph["5"]["inputs"]["image"] = guide.name
            graph["10"]["inputs"]["seed"] = seed
            graph["12"]["inputs"]["filename_prefix"] = case
            destination = HERE/"requests"/(case+".json")
            write(destination, {"prompt":graph})
            files[destination.relative_to(HERE).as_posix()] = digest(destination)
            cases.append(dict(case=case,level=level,seed=seed,targets=centers,base_wh=row["base_span_ratio"],guide=guide.name))
    write(HERE/"manifest.json",dict(batch="G2d",shape=shape,cases=cases,files=files))

if __name__=="__main__":
    main()
