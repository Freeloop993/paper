"""由每张 H3 基准图派生各档刺激：同一张图，只改一个量。
- 臂长：机身不动，沿每条臂的方向拉伸或压缩臂的直段，电机和桨整体平移。对角轴距 220、260、300 mm 三档。
- 桨径：轴距和电机不动，桨叶绕电机中心径向缩放 0.8、1.0、1.2 倍；朝机身一侧（臂的方向）不缩放。
中间档就是 H3 原图本身。所有改动都是几何重采样，不重新生成，也不改颜色。
用法：python3 derive.py（读 actual/F?-D260/original.png，写 stimuli/ 和 derive.json）"""
import json, pathlib, warnings
import numpy as np
from PIL import Image
from scipy import ndimage
warnings.filterwarnings('ignore')
HERE = pathlib.Path(__file__).resolve().parent
BASE_MM, LEVELS_MM, PROP_SCALE = 260, {'S': 220, 'B': 260, 'L': 300}, {'Pm': 0.8, 'Pp': 1.2}

def hubs_of(rgb):
    lum = rgb.astype(float) @ np.array([0.299, 0.587, 0.114])
    lab, n = ndimage.label(lum < 70); sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    out = []
    for k in np.argsort(sizes)[::-1][:4] + 1:
        ys, xs = np.nonzero(lab == k); pts = np.stack([xs, ys], 1).astype(float); c = pts.mean(0)
        w, v = np.linalg.eigh(np.cov((pts - c).T)); major, minor = v[:, -1], v[:, 0]
        a, b = (pts - c) @ major, (pts - c) @ minor
        near = np.abs(a - (a.max() + a.min()) / 2) < 12          # 两个桨尖的中点附近，就是电机
        out.append((c + major * (a.max() + a.min()) / 2 + minor * b[near].mean(), (a.max() - a.min()) / 2))
    return out
def sample(rgb, xin, yin):
    return np.stack([ndimage.map_coordinates(rgb[..., ch].astype(float), [yin, xin], order=3, mode='nearest') for ch in range(3)], -1).clip(0, 255).astype(np.uint8)

def derive(rgb, arm_mm=BASE_MM, prop=1.0):
    H, W = rgb.shape[:2]; hp = hubs_of(rgb); hubs = np.array([h for h, _ in hp]); c = hubs.mean(0)
    yy, xx = np.mgrid[0:H, 0:W].astype(float); xin, yin = xx.copy(), yy.copy(); new_hubs = []
    for (hub, half) in hp:
        R = np.linalg.norm(hub - c); u = (hub - c) / R; n = np.array([-u[1], u[0]])
        quad = ((xx - c[0]) * np.sign(u[0]) >= 0) & ((yy - c[1]) * np.sign(u[1]) >= 0)
        d = R * (arm_mm / BASE_MM - 1)                           # 电机沿臂方向移动的像素数
        s0, s1 = 0.47 * R, R - 58
        s = (xx - c[0]) * u[0] + (yy - c[1]) * u[1]; t = (xx - c[0]) * n[0] + (yy - c[1]) * n[1]
        sin = np.where(s < s0, s, np.where(s <= s1 + d, s0 + (s - s0) * (s1 - s0) / (s1 + d - s0), s - d))
        xq, yq = c[0] + sin * u[0] + t * n[0], c[1] + sin * u[1] + t * n[1]
        hub2 = hub + d * u; new_hubs.append(hub2)
        if prop != 1.0:                                          # 在已平移后的位置上，绕电机中心缩放桨叶
            dx, dy = xx - hub2[0], yy - hub2[1]; rho = np.hypot(dx, dy) + 1e-9
            cosu = (dx * u[0] + dy * u[1]) / rho; w = (1 - cosu ** 2) ** 2          # 垂直于臂的方向权重为 1，沿臂方向为 0
            k = 1 + (prop - 1) * w; rm = 30.0
            rin = np.where(rho <= rm, rho, rm + (rho - rm) / k)
            near = rho < half * max(prop, 1) + 40
            px, py = hub2[0] + dx / rho * rin, hub2[1] + dy / rho * rin
            s2 = (px - c[0]) * u[0] + (py - c[1]) * u[1]; t2 = (px - c[0]) * n[0] + (py - c[1]) * n[1]
            sin2 = np.where(s2 < s0, s2, np.where(s2 <= s1 + d, s0 + (s2 - s0) * (s1 - s0) / (s1 + d - s0), s2 - d))
            xq = np.where(near, c[0] + sin2 * u[0] + t2 * n[0], xq); yq = np.where(near, c[1] + sin2 * u[1] + t2 * n[1], yq)
        xin, yin = np.where(quad, xq, xin), np.where(quad, yq, yin)
    outside = (xin < 0) | (xin > W - 1) | (yin < 0) | (yin > H - 1)        # 取样点落到画外时保留原位置的背景
    xin, yin = np.where(outside, xx, xin), np.where(outside, yy, yin)
    out = sample(rgb, xin, yin); nh = np.array(new_hubs)
    diag = np.mean(sorted(np.linalg.norm(nh[:, None] - nh[None], axis=2)[np.triu_indices(4, 1)])[-2:])
    half = np.mean([h for _, h in hp]); rm = 30.0
    return out, {'diagonal_px': round(float(diag), 1), 'prop_px': round(float(2 * (rm + (half - rm) * prop)), 1), 'd_over_D': round(float(2 * (rm + (half - rm) * prop) / diag), 3)}

if __name__ == '__main__':
    (HERE / 'stimuli').mkdir(exist_ok=True); log = {}
    for f in ('F1', 'F2', 'F3', 'F4'):
        rgb = np.asarray(Image.open(HERE / 'actual' / (f + '-D260') / 'original.png').convert('RGB'))
        for name, mm in LEVELS_MM.items():
            img, g = derive(rgb, arm_mm=mm); Image.fromarray(img).save(HERE / 'stimuli' / ('%s-%s.png' % (f, name)))
            log['%s-%s' % (f, name)] = {'factor': '轴距', 'level_mm': mm, 'prop_scale': 1.0, **g}
        for name, k in PROP_SCALE.items():
            img, g = derive(rgb, prop=k); Image.fromarray(img).save(HERE / 'stimuli' / ('%s-%s.png' % (f, name)))
            log['%s-%s' % (f, name)] = {'factor': '桨径', 'level_mm': BASE_MM, 'prop_scale': k, **g}
    (HERE / 'derive.json').write_text(json.dumps(log, ensure_ascii=False, indent=1) + '\n')
    for k, v in log.items(): print(k, v)
