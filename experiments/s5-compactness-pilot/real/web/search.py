"""按机型做图片检索（Bing 图片），保存候选的原图地址、缩略图地址、标题和来源页。"""
import html, json, pathlib, re, sys, time, urllib.parse, urllib.request
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9'}
MODELS = ['DJI Mavic 4 Pro', 'DJI Mini 5 Pro', 'DJI Mavic Air 2', 'DJI Mavic 2 Pro', 'DJI Mavic Mini', 'DJI Spark', 'DJI Neo', 'DJI Flip', 'DJI Phantom 4 Pro', 'DJI Matrice 30',
          'Autel EVO Lite+', 'Autel EVO Nano+', 'Autel EVO II Pro', 'Autel EVO Max 4T', 'Parrot Anafi', 'Parrot Anafi Ai', 'Parrot Bebop 2', 'Skydio 2+', 'Skydio X10', 'Potensic Atom 2',
          'FIMI X8 SE', 'Hubsan Zino Mini Pro', 'Holy Stone HS720', 'Xiaomi Mi Drone 4K', 'HoverAir X1', 'Insta360 Antigravity A1', 'Yuneec Typhoon Q500 4K', '3DR Solo', 'GoPro Karma',
          'iFlight Nazgul5 FPV', 'BetaFPV Cetus Pro', 'GEPRC CineLog35', 'Sony Airpeak S1', 'Freefly Astro', 'PowerVision PowerEgg X', 'Ryze Tello', 'Yuneec Mantis Q', 'ZeroTech Dobby']
def search(q, n=12):
    url = 'https://www.bing.com/images/search?q=' + urllib.parse.quote(q) + '&form=HDRSC2'
    t = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read().decode('utf-8', 'replace'); out = []
    for m in re.finditer(r'class="iusc"[^>]*?\sm="([^"]+)"', t):
        try: j = json.loads(html.unescape(m.group(1))); out.append({'murl': j.get('murl'), 'turl': j.get('turl'), 't': (j.get('t') or '')[:70], 'purl': j.get('purl')})
        except Exception: pass
        if len(out) >= n: break
    return out
if __name__ == '__main__':
    suffix = sys.argv[1] if len(sys.argv) > 1 else 'drone top view white background'
    out = {}
    for m in MODELS:
        try: out[m] = search(m + ' ' + suffix)
        except Exception as e: out[m] = []; print('ERR', m, e)
        time.sleep(0.8)
    pathlib.Path('cand.json').write_text(json.dumps({'query_suffix': suffix, 'searched': time.strftime('%Y-%m-%d'), 'results': out}, ensure_ascii=False, indent=1))
    print(sum(len(v) for v in out.values()), 'candidates for', len(out), 'models; empty:', [k for k, v in out.items() if not v])
