"""走查的后半段：把页面导出的文件转成 response.csv，再配上模拟的 AI、H2 两份表，交给原评分程序 a3/calibrate.py score。
只检查软件能不能接上，这里的数不是判读数据。用法：python3 qa_score.py <导出的.json> <粘贴内容.txt> <临时输出目录>"""
import csv, io, pathlib, random, shutil, subprocess, sys, tempfile, zipfile
import to_csv

HERE = pathlib.Path(__file__).resolve().parent
OFF = HERE.parents[2] / 'archive' / 'paper-reading-room' / 'studies' / '20261117-offline'
A3 = HERE.parent / 'a3'
P = to_csv.POINTS


def synthetic(reader, order_csv, rng):
    """用 a3 已有的点表加一两个像素的抖动，造一份格式正确的表。"""
    key = {r['token']: r['file'] for r in csv.DictReader(io.StringIO((OFF / 'researcher/a8/PRIVATE-key.csv').read_text(encoding='utf-8-sig'))) if r['reader'] == reader}
    known = {r['image_id'] + '.png': r for r in csv.DictReader(io.StringIO((A3 / 'points.csv').read_text(encoding='utf-8-sig')))}
    guide = {}
    for r in csv.DictReader(io.StringIO((A3 / 'guide-pixels.csv').read_text(encoding='utf-8-sig'))):
        guide.setdefault(r['file'], {})[r['hub']] = (round(int(r['sum_x']) / int(r['red_pixels'])), round(int(r['sum_y']) / int(r['red_pixels'])))
    fields = next(csv.reader(io.StringIO(order_csv))); out = []
    for row in csv.DictReader(io.StringIO(order_csv)):
        f = key[row['token']]; new = {k: '' for k in fields}; new['token'] = row['token']; miss = []
        for p in (P[:4] if f in guide else P):
            if f in guide: x, y = guide[f][p]
            elif known[f][p + '_x'] == '': miss.append(p); continue
            else: x, y = int(known[f][p + '_x']), int(known[f][p + '_y'])
            dx = rng.randint(-1, 1); new[p + '_x'], new[p + '_y'] = x + dx, y + (0 if p in ('left', 'right') else rng.randint(-1, 1))
        if 'left' not in miss and 'right' not in miss and f not in guide and new['left_y'] != '': new['right_y'] = new['left_y']
        new['reason'] = '模拟：原表缺 ' + '、'.join(miss) if miss else ''
        out.append(new)
    return fields, out


def main(json_path, pasted_path, dest):
    dest = pathlib.Path(dest)
    if dest.exists(): shutil.rmtree(dest)
    to_csv.main(json_path, dest / 'from-file'); to_csv.main(pasted_path, dest / 'from-paste')
    a = (dest / 'from-file/H1/response.csv').read_bytes(); b = (dest / 'from-paste/H1/response.csv').read_bytes()
    assert a == b, '文件和粘贴两条路转出来的表不一样'
    blank = zipfile.ZipFile(OFF / 'participants/a8-H1.zip').read('response.csv').decode('utf-8-sig')
    mine = a.decode('utf-8-sig')
    assert mine.splitlines()[0] == blank.splitlines()[0], '表头与发放包不同'
    assert [l.split(',')[0] for l in mine.splitlines()] == [l.split(',')[0] for l in blank.splitlines()], '图号顺序与发放包不同'
    # 评分程序不许把结果写在公开目录里，所以放到系统临时目录
    work = pathlib.Path(tempfile.mkdtemp(prefix='a8-qa-')); rng = random.Random(7)
    try:
        shutil.copy(OFF / 'researcher/a8/PRIVATE-key.csv', work / 'PRIVATE-key.csv')
        (work / 'H1').mkdir(); (work / 'H1/response.csv').write_bytes(a)
        for reader, src in (('AI', OFF / 'participants/a8-AI/response.csv'), ('H2', None)):
            text = src.read_text(encoding='utf-8-sig') if src else zipfile.ZipFile(OFF / 'participants/a8-H2.zip').read('response.csv').decode('utf-8-sig')
            fields, rows = synthetic(reader, text, rng); (work / reader).mkdir()
            with (work / reader / 'response.csv').open('w', encoding='utf-8-sig', newline='') as f:
                w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)
        r = subprocess.run([sys.executable, '-B', str(A3 / 'calibrate.py'), 'score', str(work)], capture_output=True, text=True)
        print(r.stdout.strip()); print(r.stderr.strip()[-600:])
        assert r.returncode == 0, '评分程序没有接受'
        res = list(csv.DictReader((work / 'private-calibration-results.csv').open(encoding='utf-8-sig')))
        for row in res:
            if row['comparison'] in ('H1-guide', 'AI-H1', 'H1-H2') and row['metric'] in ('hub_error_px', 'hub_difference_px', 'abs_pv02_section_difference'):
                print('  %s %s：有效 %s/%s，中位数 %s' % (row['comparison'], row['metric'], row['n_valid'], row['n_expected'], row['median'][:6]))
        assert {'AI-H1', 'AI-H2', 'H1-H2'} <= {row['comparison'] for row in res}
        print('SCORED')
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main(*sys.argv[1:4])
