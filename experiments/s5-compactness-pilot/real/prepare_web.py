"""把检索得到的真实产品顶视图整理成评议用图：抠成白底、去色、机头朝上、统一占幅。
每张图的来源页、原图地址和摘要在 web/downloads.json。个别机型检索不到够清楚的顶视图，改用厂商官方 3D 模型的渲染（renders/），在 SAMPLES 里注明。
用法：python3 prepare_web.py（写 stimuli/、samples.json 和 web/rejected.json）"""
import hashlib, json, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = pathlib.Path(__file__).resolve().parent
SIDE, FILL, MIN_PX = 1024, 0.80, 330
# 品牌, 机型, 类型, 文件（web/originals/ 下，或 render:<模型摘要>）, 需要转多少度才机头朝上
# 筛掉的：Mavic Mini（抠图后留有一块阴影）、Phantom 4 Pro（白底白机，太淡）、Autel EVO Lite+（原图太小，放大后发虚）、Autel EVO Nano+（原图太小）；
# 外形与已有样本相近而未收：Mini 4 Pro、EVO Max 4T、HOVERAir X1。
SAMPLES = [
    ('DJI', 'Mavic 4 Pro', '折叠航拍', 'DJI_Mavic_4_Pro__00', 0), ('DJI', 'Air 3S', '折叠航拍', 'r2_DJI_Air_3S__00', 0), ('DJI', 'Mini 5 Pro', '折叠航拍', 'DJI_Mini_5_Pro__09', 0),
    ('DJI', 'Mavic Pro', '折叠航拍', 'r2_DJI_Mavic_Pro_Platinum__04', 0),
    ('DJI', 'Spark', '小型固定臂', 'DJI_Spark__07', 0), ('DJI', 'Neo', '全包护圈', 'DJI_Neo__01', 0), ('DJI', 'Flip', '全包护圈', 'r2_DJI_Flip__00', 0),
    ('DJI', 'Matrice 30', '行业机', 'DJI_Matrice_30__02', 0), ('DJI', 'Inspire 3', '专业影视', 'r2_DJI_Inspire_3__03', 0),
    ('DJI', 'Avata 2', '涵道穿越机', 'render:9bf3095545781b0c16178c1eec89c637', 0), ('DJI', 'FPV', '穿越机', 'render:e4e0a592c53ea71bfc3cd948397e31a1', 0),
    ('Autel', 'EVO II Pro', '折叠航拍', 'Autel_EVO_II_Pro__04', 0),
    ('Parrot', 'ANAFI', '折叠航拍', 'r2_Parrot_Anafi_4K_HDR__07', 180), ('Parrot', 'ANAFI Ai', '折叠航拍', 'Parrot_Anafi_Ai__04', 180),
    ('Parrot', 'Bebop 2', '经典固定臂', 'Parrot_Bebop_2__00', 0), ('Skydio', 'Skydio 2', '小型固定臂', 'r2_Skydio_2__04', 0), ('Skydio', 'X10', '行业机', 'Skydio_X10__06', 0),
    ('Hubsan', 'Zino Mini Pro', '折叠航拍', 'Hubsan_Zino_Mini_Pro__08', 0), ('FIMI', 'X8 Mini', '折叠航拍', 'r2_FIMI_X8_Mini__00', 0), ('Yuneec', 'Mantis Q', '折叠航拍', 'Yuneec_Mantis_Q__08', 0),
    ('Yuneec', 'Typhoon Q500 4K', '经典固定臂', 'Yuneec_Typhoon_Q500_4K__05', 0), ('3DR', 'Solo', '经典固定臂', '3DR_Solo__00', 0), ('GoPro', 'Karma', '折叠航拍', 'GoPro_Karma__11', 180),
    ('Insta360', 'Antigravity A1', '折叠航拍', 'Insta360_Antigravity_A1__06', 0), ('HOVERAir', 'X1 Pro Max', '全包护圈', 'r2_HoverAir_X1_Pro_Max__03', 180),
    ('Ryze', 'Tello', '小型固定臂', 'Ryze_Tello__01', 0), ('ZeroTech', 'Dobby', '小型折叠', 'ZeroTech_Dobby__09', 90), ('PowerVision', 'PowerEgg X', '异形', 'PowerVision_PowerEgg_X__00', 0),
    ('iFlight', 'Nazgul5', '穿越机', 'iFlight_Nazgul5_FPV__01', 180), ('GEPRC', 'CineLog35', '涵道穿越机', 'GEPRC_CineLog35__00', 180), ('Sony', 'Airpeak S1', '专业影视', 'Sony_Airpeak_S1__05', 0),
    ('Freefly', 'Astro', '专业影视', 'Freefly_Astro__00', 0),
]
# 四旋翼以外的多旋翼：品牌, 机型, 类型, 文件, 转角, 构型。三旋翼、双旋翼和多数共轴机型检索不到合格的顶视图（太小、斜视或只有自制机架），没有收。
MULTI = [
    ('DJI', 'Matrice 600 Pro', '行业机', 'r3_DJI_Matrice_600_Pro_hexacopter__00', 0, '六旋翼'), ('DJI', 'S900', '专业影视', 'r3_DJI_S900_hexacopter__00', 0, '六旋翼'),
    ('Yuneec', 'H520', '行业机', 'r3_Yuneec_H520_hexacopter__01', 0, '六旋翼'), ('Yuneec', 'Tornado H920', '专业影视', 'r3_Yuneec_Tornado_H920_hexacopter__08', 0, '六旋翼'),
    ('DJI', 'Agras T30', '农业植保', 'r3_DJI_Agras_T30__00', 0, '六旋翼'), ('Hylio', 'AG-216', '农业植保', 'r3_Hylio_AG-216__00', 0, '六旋翼'),
    ('Inspired Flight', 'IF1200', '行业机', 'r3_Inspired_Flight_IF1200_hexacopter__00', 0, '六旋翼'), ('Aurelia', 'X6', '行业机', 'r3_Aurelia_X6_hexacopter__05', 0, '六旋翼'),
    ('DJI', 'Agras MG-1', '农业植保', 'r3_DJI_Agras_MG-1_octocopter__02', 0, '八旋翼'), ('Freefly', 'Alta 8', '专业影视', 'r3_Freefly_Alta_8_octocopter__00', 0, '八旋翼'),
    ('Skyfront', 'Perimeter 8', '行业机', 'r3_Skyfront_Perimeter_8__01', 0, '八旋翼'), ('DJI', 'Agras T50', '农业植保', 'r4_DJI_Agras_T50__06', 0, '共轴四轴八桨'),
]
def cut(rgb):
    """从四边向内找与边缘颜色相近的区域当背景，其余是机体。返回前景掩膜。"""
    a = rgb.astype(int); edge = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]); bg = np.median(edge, 0)
    near = np.abs(a - bg).sum(2) < 42
    lab, n = ndimage.label(near); border = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1]); border.discard(0)
    back = np.isin(lab, list(border)); fg = ~back
    lab2, n2 = ndimage.label(fg); sizes = ndimage.sum(np.ones_like(lab2), lab2, range(1, n2 + 1))
    keep = np.flatnonzero(sizes >= max(60, 0.002 * sizes.max())) + 1 if n2 else []
    return np.isin(lab2, keep)
if __name__ == '__main__':
    (HERE / 'stimuli').mkdir(exist_ok=True); [p.unlink() for p in (HERE / 'stimuli').glob('*.png')]
    dl = {l['file'].rsplit('.', 1)[0]: l for l in json.load(open(HERE / 'web' / 'downloads.json')) if 'file' in l}
    old = json.loads((HERE / 'samples.json').read_text()).get('samples', {}) if (HERE / 'samples.json').exists() else {}
    out, rejected, n = {}, [], 0
    for brand, model, kind, ref, rot, config in [(*t, '四旋翼') for t in SAMPLES] + MULTI:
        if ref.startswith('render:'):
            h = ref[7:]; rgba = Image.open(HERE / 'renders' / (h + '.png')).convert('RGBA'); white = Image.new('RGBA', rgba.size, 'white'); white.alpha_composite(rgba)
            rgb = np.asarray(white.convert('RGB')); fg = np.asarray(rgba.getchannel('A')) > 40
            src = {'source_type': '厂商官方 3D 模型的顶视渲染', 'image_url': 'https://se-cdn.djiits.com/uploads/3d/%s.glb' % h, 'page_url': 'https://store.dji.com', 'sha256': hashlib.sha256((HERE / 'models' / (h + '.glb')).read_bytes()).hexdigest()}
        else:
            l = dl[ref]; im = Image.open(HERE / 'web' / 'originals' / l['file']).convert('RGBA'); white = Image.new('RGBA', im.size, 'white'); white.alpha_composite(im)
            rgb = np.asarray(white.convert('RGB')); fg = cut(rgb)
            src = {'source_type': '图片检索', 'image_url': l['image_url'], 'page_url': l['page_url'], 'page_title': l['page_title'], 'domain': l['domain'], 'sha256': l['sha256'], 'fetched': l['got'], 'original_px': list(im.size)}
        ys, xs = np.nonzero(fg); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if max(bw, bh) < MIN_PX: rejected.append({'brand': brand, 'model': model, 'why': '机体在原图里只有 %d×%d 像素，放大后不清楚' % (bw, bh), **src}); continue
        gray = np.asarray(Image.fromarray(rgb).convert('L')).copy(); gray[~ndimage.binary_dilation(fg, iterations=2)] = 255
        crop = Image.fromarray(gray[y0:y1 + 1, x0:x1 + 1]).rotate(rot, expand=True, fillcolor=255)
        k = SIDE * FILL / max(crop.size); crop = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
        img = Image.new('L', (SIDE, SIDE), 255); img.paste(crop, ((SIDE - crop.width) // 2, (SIDE - crop.height) // 2))
        n += 1; rid = 'P%02d' % n; img.convert('RGB').save(HERE / 'stimuli' / (rid + '.png'))
        solid = fg[y0:y1 + 1, x0:x1 + 1]; w, h = (bh, bw) if rot in (90, 270) else (bw, bh)
        out[rid] = {'brand': brand, 'model': model, 'type': kind, 'config': config, 'rotated_deg': rot, 'object_px_in_source': [int(bw), int(bh)], 'upscale': round(float(k), 2),
                    'bbox_w_over_h': round(float(w / h), 3), 'fill_of_bbox': round(float(solid.mean()), 3), 'mean_gray': round(float(gray[y0:y1 + 1, x0:x1 + 1][solid].mean()), 1), **src}
    (HERE / 'samples.json').write_text(json.dumps({'collected': '2026-11-19', 'method': '用 Bing 图片检索各机型的顶视图（检索词和全部候选见 web/search-results*.json），逐张目视筛选真顶视、整机完整、背景干净、来源可查的图；排除 AI 生成的假图、第三方 3D 模型站和带水印的图库图',
        'processing': '抠成白底、去色、机头朝上、整机外接框长边占画面 80%', 'samples': out}, ensure_ascii=False, indent=1) + '\n')
    (HERE / 'web' / 'rejected.json').write_text(json.dumps(rejected, ensure_ascii=False, indent=1) + '\n')
    print(len(out), 'kept;', len(rejected), 'rejected for resolution:', [r['brand'] + ' ' + r['model'] for r in rejected])
    print('upscale > 1.6:', [(v['brand'] + ' ' + v['model'], v['upscale']) for v in out.values() if v['upscale'] > 1.6])
