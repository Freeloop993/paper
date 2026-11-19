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
    """四个电机中心和各自的桨半径。电机上的高光有时把一副桨断成两块，所以依次试几组阈值和闭运算，取第一组读成对称四块的。"""
    lum = rgb.astype(float) @ np.array([0.299, 0.587, 0.114]); tried = []
    for thr, close in [(t, c) for t in (70, 90, 110, 130, 150, 60) for c in (0, 5, 9)]:      # 深色机身用低阈值，浅色机身（Qwen 的图）要到 130 以上
        dark = lum < thr
        if close: dark = ndimage.binary_closing(dark, structure=np.ones((close, close)))
        lab, n = ndimage.label(dark)
        if n < 4: continue
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1)); out = []
        for k in np.argsort(sizes)[::-1][:4] + 1:
            ys, xs = np.nonzero(lab == k); pts = np.stack([xs, ys], 1).astype(float); c = pts.mean(0)
            w, v = np.linalg.eigh(np.cov((pts - c).T)); major, minor = v[:, -1], v[:, 0]
            a, b = (pts - c) @ major, (pts - c) @ minor
            near = np.abs(a - (a.max() + a.min()) / 2) < 12          # 两个桨尖的中点附近，就是电机
            out.append((c + major * (a.max() + a.min()) / 2 + minor * b[near].mean(), (a.max() - a.min()) / 2))
        halves = [h for _, h in out]; hubs = np.array([h for h, _ in out]); c = hubs.mean(0)
        far = [int(np.argmax(np.linalg.norm(hubs - hubs[i], axis=1))) for i in range(4)]
        opp = max(np.linalg.norm(hubs[i] + hubs[far[i]] - 2 * c) for i in range(4))
        tried.append((thr, close, [round(float(h), 1) for h in halves], round(float(opp), 1)))
        diag = np.mean([np.linalg.norm(hubs[i] - hubs[far[i]]) for i in range(4)])
        if max(halves) / min(halves) < 1.12 and opp < 30 and min(halves) > 0.12 * diag: return out      # 桨太短说明只读到了电机
    raise AssertionError(('四副桨没有读成对称的四块', tried))
def sample(rgb, xin, yin):
    return np.stack([ndimage.map_coordinates(rgb[..., ch].astype(float), [yin, xin], order=3, mode='nearest') for ch in range(3)], -1).clip(0, 255).astype(np.uint8)

def layers(rgb):
    """把图分成机身和四个可移动的组件（臂、电机、桨）。机身 = 前景做开运算后含中心的那一块，细的臂被开运算去掉。"""
    lum = rgb.astype(float) @ np.array([0.299, 0.587, 0.114])
    bgc = np.median(np.concatenate([rgb[:12].reshape(-1, 3), rgb[-12:].reshape(-1, 3)]), 0)
    fg = lum < min(248, bgc @ np.array([0.299, 0.587, 0.114]) - 5)                 # 不做开运算，免得把细的桨尖丢掉
    lab0, n0 = ndimage.label(fg); big = np.flatnonzero(ndimage.sum(np.ones_like(lab0), lab0, range(1, n0 + 1)) >= 40) + 1
    fg = np.isin(lab0, big)                                                         # 只去掉零星噪点
    hp = hubs_of(rgb); hubs = np.array([h for h, _ in hp]); c = hubs.mean(0)
    yy, xx = np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]]
    r = 30; disk = np.hypot(*np.mgrid[-r:r + 1, -r:r + 1]) <= r
    core = ndimage.binary_opening(fg, structure=disk); lab, _ = ndimage.label(core)
    body = ndimage.binary_dilation(lab == lab[int(c[1]), int(c[0])], iterations=3)
    for hub, half in hp: body &= np.hypot(xx - hub[0], yy - hub[1]) > half * 0.55          # 电机和桨不算机身
    rest, _ = ndimage.label(fg & ~body); parts = []
    for hub, half in hp:
        k = rest[int(round(hub[1])), int(round(hub[0]))]
        m = (rest == k) if k else np.zeros_like(fg)
        near = np.unique(rest[(np.hypot(xx - hub[0], yy - hub[1]) < half + 25) & (rest > 0)])      # 桨尖有时与桨身断开成单独一小块，一并归入
        for kk in near:
            cy, cx = ndimage.center_of_mass(rest == kk)
            if np.hypot(cx - hub[0], cy - hub[1]) < half + 25: m |= rest == kk
        touch = m & ndimage.binary_dilation(body, iterations=5)
        root = np.array([xx[touch].mean(), yy[touch].mean()]) if touch.any() else c + 0.45 * (hub - c)
        parts.append({'hub': hub, 'half': half, 'mask': m, 'root': root})
    return bgc, body, parts, c

def derive(rgb, arm_mm=BASE_MM, prop=1.0):
    """机身一层不动；每个组件沿臂根到电机的方向按比例位移（臂根不动，电机和桨整体移动），桨叶可再绕电机径向缩放。"""
    H, W = rgb.shape[:2]; bgc, body, parts, c = layers(rgb)
    yy, xx = np.mgrid[0:H, 0:W].astype(float); out = rgb.astype(float); new_hubs = []
    gone = np.zeros((H, W)); 
    for q in parts: gone = np.maximum(gone, ndimage.gaussian_filter(ndimage.binary_dilation(q['mask'], iterations=3).astype(float), 1.0))
    out = out * (1 - gone[..., None]) + bgc * gone[..., None]                   # 先把四个组件从原位置抹掉
    keep = ndimage.gaussian_filter(body.astype(float), 0.8)[..., None]
    out = out * (1 - keep) + rgb * keep                                         # 机身照原样盖回，再把组件画在上面
    overlap = 0
    for q in parts:
        hub, half, root = q['hub'], q['half'], q['root']; R = np.linalg.norm(hub - c); u = (hub - c) / R
        d = R * (arm_mm / BASE_MM - 1) * u; hub2 = hub + d; new_hubs.append(hub2)
        ax = hub2 - root; L = np.linalg.norm(ax); rm = 34.0
        tau = np.clip(((xx - root[0]) * ax[0] + (yy - root[1]) * ax[1]) / (L * max(L - rm, 1.0)), 0, 1)     # 到电机边缘就算整段位移
        sx, sy = xx - tau * d[0], yy - tau * d[1]
        if prop != 1.0:
            dx, dy = sx - hub[0], sy - hub[1]; rho = np.hypot(dx, dy) + 1e-9
            cosu = (dx * u[0] + dy * u[1]) / rho; k = 1 + (prop - 1) * (1 - cosu ** 2) ** 2
            rin = np.where(rho <= 30, rho, 30 + (rho - 30) / k)
            sx, sy = hub[0] + dx / rho * rin, hub[1] + dy / rho * rin           # 对整个组件都按这个映射取样；浅色的桨尖也在组件里
        alpha = ndimage.map_coordinates(ndimage.gaussian_filter(q['mask'].astype(float), 0.8), [sy, sx], order=1, mode='constant', cval=0)
        moved = np.stack([ndimage.map_coordinates(rgb[..., ch].astype(float), [sy, sx], order=3, mode='nearest') for ch in range(3)], -1)
        far = np.hypot(xx - root[0], yy - root[1]) > 45                         # 臂根附近本来就和机身相接，不算重叠
        overlap += int(((alpha > 0.5) & ndimage.binary_erosion(body, iterations=4) & far).sum())
        alpha = np.clip(alpha * 1.6, 0, 1)[..., None]
        out = out * (1 - alpha) + moved * alpha
    nh = np.array(new_hubs); diag = np.mean(sorted(np.linalg.norm(nh[:, None] - nh[None], axis=2)[np.triu_indices(4, 1)])[-2:])
    half = np.mean([q['half'] for q in parts])
    return out.clip(0, 255).astype(np.uint8), {'diagonal_px': round(float(diag), 1), 'prop_px': round(float(2 * (30 + (half - 30) * prop)), 1), 'd_over_D': round(float(2 * (30 + (half - 30) * prop) / diag), 3), 'overlap_px': overlap}

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
