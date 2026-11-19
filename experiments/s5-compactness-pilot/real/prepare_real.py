"""把官方 3D 模型的顶视渲染整理成评议用图：白底、去色、统一占幅。
样本是 DJI 官方商城产品页 3D 展示所用的模型（见 sources.json），代表真实在售或在售过的机型。模型文件和渲染图有版权，不入库。
用法：先 node render.mjs，再 python3 prepare_real.py（写 stimuli/ 和 samples.json）"""
import hashlib, json, pathlib
import numpy as np
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
SIDE, FILL = 1024, 0.80
SAMPLES = [   # 评议编号, 机型, 模型文件, 商城产品页
    ('R01', 'DJI Mini 2 系列（WM161）', 'ecd6727edc061ef6eefa27af3278102d', 'https://store.dji.com/product/dji-mini-3-pro'),
    ('R02', 'DJI Mini 3', '385aa9579ba03d6cc2c1f6a395140b13', 'https://store.dji.com/product/dji-mini-3'),
    ('R03', 'DJI Mini 4 Pro', 'eb2acccc1b1a4a5c3407e0a06555f0b9', 'https://store.dji.com/product/dji-mini-4-pro'),
    ('R04', 'DJI Air 2S', '66371f2fbf595bfe531d2c38ab1b50d6', 'https://store.dji.com/product/dji-air-2s'),
    ('R05', 'DJI Air 3', 'c039de9cb62986112676d8ec11fcad0d', 'https://store.dji.com/product/dji-air-3'),
    ('R06', 'DJI Air 3S', '4d82789a6f5701790bacda5e7e37910c', 'https://store.dji.com/product/dji-air-3s'),
    ('R07', 'DJI Mavic 3 Pro', 'ebadae4e6f89889722ac0c1f0ac2ce4a', 'https://store.dji.com/product/dji-mavic-3-pro'),
    ('R08', 'DJI Mavic 3 Classic', 'd6245c35ede52733cac0ad22a95edbe7', 'https://store.dji.com/product/dji-mavic-3-classic'),
    ('R09', 'DJI Avata 2', '9bf3095545781b0c16178c1eec89c637', 'https://store.dji.com/product/dji-avata-2'),
    ('R10', 'DJI FPV', 'e4e0a592c53ea71bfc3cd948397e31a1', 'https://store.dji.com/product/dji-fpv'),
    ('R11', 'DJI Inspire 3', '8a0121488c580d1ec30ed08ca241eee4', 'https://store.dji.com/product/dji-inspire-3'),
]
if __name__ == '__main__':
    (HERE / 'stimuli').mkdir(exist_ok=True); yaw = json.loads((HERE / 'yaw.json').read_text()); out = {}
    for rid, model, h, page in SAMPLES:
        rgba = Image.open(HERE / 'renders' / (h + '.png')).convert('RGBA'); a = np.asarray(rgba.getchannel('A'))
        ys, xs = np.nonzero(a > 40); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        white = Image.new('RGBA', rgba.size, 'white'); white.alpha_composite(rgba); gray = white.convert('L')
        k = SIDE * FILL / max(x1 - x0 + 1, y1 - y0 + 1); m = 10
        crop = gray.crop((max(x0 - m, 0), max(y0 - m, 0), min(x1 + m, rgba.width), min(y1 + m, rgba.height)))
        crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
        img = Image.new('L', (SIDE, SIDE), 255); img.paste(crop, ((SIDE - crop.width) // 2, (SIDE - crop.height) // 2)); img.convert('RGB').save(HERE / 'stimuli' / (rid + '.png'))
        solid = a[y0:y1 + 1, x0:x1 + 1] > 40; lum = np.asarray(gray)[y0:y1 + 1, x0:x1 + 1]
        glb = HERE / 'models' / (h + '.glb')
        out[rid] = {'model': model, 'glb': 'https://se-cdn.djiits.com/uploads/3d/%s.glb' % h, 'glb_sha256': hashlib.sha256(glb.read_bytes()).hexdigest(), 'glb_bytes': glb.stat().st_size,
                    'page': page, 'yaw_deg': yaw.get(h + '.glb', 0), 'bbox_w_over_h': round(float((x1 - x0 + 1) / (y1 - y0 + 1)), 3), 'fill_of_bbox': round(float(solid.mean()), 3),
                    'mean_gray': round(float(lum[solid].mean()), 1)}
        print(rid, model, out[rid]['bbox_w_over_h'], out[rid]['fill_of_bbox'], out[rid]['mean_gray'])
    (HERE / 'samples.json').write_text(json.dumps({'collected': '2026-11-19', 'source': 'DJI 官方商城（store.dji.com，澳大利亚站）产品页的 3D 展示模型，经内置浏览器读取页面数据得到地址；模型内部名称用于核对机型',
        'render': 'model-viewer 3.5.0；正上方俯视，视场 8 度（接近正投影），商城同款环境光；机头朝上', 'samples': out}, ensure_ascii=False, indent=1) + '\n')
