"""把 A8 的两个真人发放包（a8-H1.zip、a8-H2.zip）各做成一个可以直接点的单文件页面。
图是包里的 PNG 原字节，顺序是包里 response.csv 的顺序，一个像素都不改。只用标准库，重做出来的页面逐字节相同。
用法：python3 build_pages.py            # 写到 dist/，并核对 packs.json 里登记的摘要
      python3 build_pages.py --register # 模板改过以后，重新登记摘要"""
import base64, csv, hashlib, io, json, pathlib, sys, zipfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OFF = ROOT / 'archive' / 'paper-reading-room' / 'studies' / '20261117-offline'
TOOL = 'a8-click 1.0'
sha = lambda b: hashlib.sha256(b).hexdigest()


def rows(path_or_bytes):
    data = path_or_bytes if isinstance(path_or_bytes, bytes) else pathlib.Path(path_or_bytes).read_bytes()
    return list(csv.DictReader(io.StringIO(data.decode('utf-8-sig'))))


def build(reader):
    z = zipfile.ZipFile(OFF / 'participants' / ('a8-%s.zip' % reader))
    order = [r['token'] for r in rows(z.read('response.csv'))]
    key = {r['token']: r for r in rows(OFF / 'researcher' / 'a8' / 'PRIVATE-key.csv') if r['reader'] == reader}
    diagrams = {r['file'] for r in rows(OFF / 'researcher' / 'a3' / 'guide-pixels.csv')}
    assert set(order) == set(key) and len(order) == 24, '包里的图号与对应键不一致'
    items, images = [], {}
    for t in order:
        png = z.read(t + '.png')
        assert png[:8] == b'\x89PNG\r\n\x1a\n' and png[16:24] == (1024).to_bytes(4, 'big') * 2, '不是 1024×1024 的 PNG：' + t
        items.append({'id': t, 'kind': 'diagram' if key[t]['file'] in diagrams else 'design'})
        images[t] = 'data:image/png;base64,' + base64.b64encode(png).decode()
    assert sum(i['kind'] == 'diagram' for i in items) == 4, '点线示意图应当是 4 张'
    template = (HERE / 'template.html').read_text(encoding='utf-8')
    pack = sha(('|'.join([TOOL, reader, sha(template.encode())] + [t + ':' + sha(z.read(t + '.png')) for t in order])).encode())[:12]
    data = json.dumps({'schema': 'a8-click-v1', 'tool': TOOL, 'pack': pack, 'reader': reader, 'items': items, 'images': images}, ensure_ascii=False, separators=(',', ':'))
    html = template.replace('__PACK__', data)
    # 页面里不能出现原图文件名或生成条件
    for r in key.values():
        assert r['file'][:-4] not in html, '页面里出现了原图文件名：' + r['file']
    return pack, html.encode('utf-8')


def main():
    out = HERE / 'dist'; out.mkdir(exist_ok=True)
    reg_path = HERE / 'packs.json'; reg = {}
    for reader in ('H1', 'H2'):
        pack, html = build(reader)
        name = '四旋翼取点-%s.html' % reader
        (out / name).write_bytes(html)
        reg[reader] = {'file': name, 'pack': pack, 'bytes': len(html), 'sha256': sha(html), 'source_zip_sha256': sha((OFF / 'participants' / ('a8-%s.zip' % reader)).read_bytes())}
        print(name, len(html), 'bytes', 'pack', pack, 'sha256', sha(html)[:16])
    if '--register' in sys.argv or not reg_path.exists():
        reg_path.write_text(json.dumps({'tool': TOOL, 'template_sha256': sha((HERE / 'template.html').read_bytes()), 'pages': reg}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print('已登记到 packs.json')
    else:
        old = json.loads(reg_path.read_text(encoding='utf-8'))['pages']
        same = all(old[k]['sha256'] == reg[k]['sha256'] for k in reg)
        print('与 packs.json 登记的摘要' + ('一致' if same else '不一致：模板或发放包变了，确认后用 --register 重新登记'))
        if not same: sys.exit(1)


if __name__ == '__main__':
    main()
