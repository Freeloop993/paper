"""Recompute A2 image-plane measurements. Only --verify-images needs Pillow and Poppler."""
import argparse
import csv
import hashlib
import io
import json
import math
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
QUAD = [('FL', 'RR'), ('FR', 'RL')]
HEX = [('M1', 'M4'), ('M2', 'M5'), ('M3', 'M6')]
DIAGS = [f'd_{a}_{b}_px' for a, b in QUAD + HEX]
FIELDS = ['id', 'group', 'W_px', 'L_px', 'W_over_L', *DIAGS, 'D_mean_px',
          'D_max_px', 'body_w_px', 'body_l_px', 'PV01', 'PV02',
          'prop_d_mean_px', 'd_over_D_mean', 'd_over_D_max', 'prop_status']
ROTOR_FIELDS = ['id', 'hub', 'tip_span_px', 'rA_px', 'rB_px', 'radius_sum_px',
                'hub_midpoint_offset_px', 'hub_to_chord_line_px', 'angle_at_hub_deg']


def rotor_readings(s):
    props = s['propellers']
    if props['tips'] is None:
        return []
    hubs = [name for name in s['points'] if not name.startswith('body_')]
    if set(props['tips']) != set(hubs):
        raise ValueError(f"{s['id']}: incomplete rotor coverage")
    rows = []
    for name in hubs:
        a, b = props['tips'][name]
        h = s['points'][name]
        ra, rb = math.dist(a, h), math.dist(b, h)
        span = math.dist(a, b)
        ax, ay = a[0] - h[0], a[1] - h[1]
        bx, by = b[0] - h[0], b[1] - h[1]
        cross = abs(ax * by - ay * bx)
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        rows.append(dict(id=s['id'], hub=name, tip_span_px=span, rA_px=ra, rB_px=rb,
                         radius_sum_px=ra + rb, hub_midpoint_offset_px=math.dist(h, mid),
                         hub_to_chord_line_px=cross / span,
                         angle_at_hub_deg=math.degrees(math.atan2(cross, ax * bx + ay * by))))
    return rows


def measure(s):
    pts = s['points']
    pairs = QUAD if s['group'] == 'rated_quad' else HEX
    fx, fy = s['nose_unit_xy']
    def project(name, axis):
        x, y = pts[name]
        return x * axis[0] + y * axis[1]

    right, front = (-fy, fx), (fx, fy)
    def span(axis):
        values = [project(name, axis) for pair in pairs for name in pair]
        return max(values) - min(values)

    def body_span(a, b, axis):
        if pts[a] is None or pts[b] is None:
            return None
        return project(a, axis) - project(b, axis)

    width, length = span(right), span(front)
    distances = {f'd_{a}_{b}_px': math.dist(pts[a], pts[b]) for a, b in pairs}
    mean_d = sum(distances.values()) / len(distances)
    bw = body_span('body_right', 'body_left', right)
    bl = body_span('body_nose', 'body_tail', front)
    rotors = rotor_readings(s)
    d = sum(r['tip_span_px'] for r in rotors) / len(rotors) if rotors else None
    return dict(id=s['id'], group=s['group'], W_px=width, L_px=length,
                W_over_L=width / length, **distances, D_mean_px=mean_d,
                D_max_px=max(distances.values()), body_w_px=bw, body_l_px=bl,
                PV01=bl/bw if bw and bl else None, PV02=bw/mean_d if bw else None,
                prop_d_mean_px=d, d_over_D_mean=d / mean_d if rotors else None,
                d_over_D_max=d / max(distances.values()) if rotors else None,
                prop_status=s['propellers']['status'])


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def verify_images(s, manuals, shared, preview):
    from PIL import Image, ImageDraw

    pdf = manuals / s['filename']
    if sha256(pdf.read_bytes()) != s['pdf_sha256']:
        raise ValueError(f'{pdf}: PDF SHA-256 mismatch')
    n = str(s['pdf_page'])
    ppm = subprocess.check_output(['pdftoppm', '-r', str(shared['dpi']), '-f',
                                   n, '-l', n, '-singlefile', str(pdf)])
    with Image.open(io.BytesIO(ppm)) as page:
        if list(page.size) != s['page_size_px']:
            raise ValueError(f'{pdf}: page size mismatch')
        im = page.convert('RGB').crop(s['crop_ltrb_px'])
    if sha256(im.tobytes()) != s['crop_rgb_sha256']:
        raise ValueError(f'{pdf}: crop RGB SHA-256 mismatch')
    props = s['propellers']
    if props['tips']:
        gray = im.convert('L')
        radius = shared['tip_window_radius_px']
        for hub, seeds in props['window_centers'].items():
            for (x, y), expected in zip(seeds, props['tips'][hub], strict=True):
                candidates = ((i, j) for j in range(max(0, y-radius), min(im.height, y+radius+1))
                              for i in range(max(0, x-radius), min(im.width, x+radius+1))
                              if gray.getpixel((i, j)) <= shared['tip_gray_max'])
                tip = max(candidates, key=lambda p: math.dist(p, s['points'][hub]))
                if tuple(expected) != tip:
                    raise ValueError(f'{pdf}: {hub} tip {expected} differs from {tip}')
    if preview:
        draw = ImageDraw.Draw(im)
        for hub, tips in (props['tips'] or {}).items():
            draw.line([tuple(p) for p in tips], fill='#318269', width=1)
            for suffix, (x, y) in zip('AB', tips, strict=True):
                draw.ellipse((x-4,y-4,x+4,y+4), outline='#00764c', width=2)
                tx = x+6 if x < im.width-50 else x-33
                ty = y+5 if y < im.height-23 else y-16
                draw.text((tx,ty), hub+suffix, fill='#006843', stroke_width=1, stroke_fill='white')
        for name, xy in s['points'].items():
            if xy is None:
                continue
            x, y = xy
            color = '#b8211c' if name.startswith('body_') else '#0064b0'
            draw.ellipse((x-7,y-7,x+7,y+7), outline=color, width=2)
            draw.point((x,y), fill=color)
            draw.text((x+9,y+5), name, fill=color, stroke_width=1, stroke_fill='white')
        im.save(preview / (s['id'] + '-marked.png'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify-images', type=Path, metavar='MANUAL_DIR')
    parser.add_argument('--preview-dir', type=Path, metavar='LOCAL_DIR')
    parser.add_argument('--check', action='store_true', help='compare with bundled metrics.csv')
    parser.add_argument('--rotors', action='store_true', help='print per-rotor chord and hub checks')
    args = parser.parse_args()
    if args.rotors and args.check:
        parser.error('use --rotors or --check separately')
    if args.preview_dir:
        if not args.verify_images or args.preview_dir.resolve().is_relative_to(HERE):
            parser.error('choose a private preview directory outside A2 and provide --verify-images')
        args.preview_dir.mkdir(exist_ok=True, parents=True)
    data = json.loads((HERE / 'readings.json').read_text(encoding='utf-8'))
    buf = io.StringIO(newline='')
    writer = csv.DictWriter(buf, fieldnames=ROTOR_FIELDS if args.rotors else FIELDS, lineterminator='\n')
    writer.writeheader()
    for sample in data['samples']:
        if args.verify_images:
            verify_images(sample, args.verify_images, data, args.preview_dir)
        rows = rotor_readings(sample) if args.rotors else [measure(sample)]
        for row in rows:
            writer.writerow({k: f'{v:.6f}' if isinstance(v, float) else v for k, v in row.items()})
    result = buf.getvalue()
    if args.check:
        if result != (HERE / 'metrics.csv').read_text(encoding='utf-8-sig'):
            sys.exit('metrics.csv mismatch')
        print('OK: all rows match metrics.csv' + ('; PDF and RGB hashes match' if args.verify_images else ''))
    else:
        sys.stdout.write(result)


if __name__ == '__main__':
    main()
