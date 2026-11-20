"""把取点页面的回件（下载的 JSON，或聊天里粘贴的 A8C1: 开头的一段）转成评分程序要的 response.csv。
列名、图号顺序、编码与发放包里的空表完全一样，所以 a3/calibrate.py score 不用改。
用法：python3 to_csv.py <回件.json 或存了粘贴内容的 .txt> <输出目录>
      写出 <输出目录>/<H1 或 H2>/response.csv 和 reader.json（作答者自报、用时、工具版本，供判读者档案表用）。"""
import base64, csv, io, json, pathlib, statistics, sys, zipfile

HERE = pathlib.Path(__file__).resolve().parent
OFF = HERE.parents[2] / 'archive' / 'paper-reading-room' / 'studies' / '20261117-offline'
POINTS = ('tl', 'tr', 'br', 'bl', 'upper', 'lower', 'left', 'right')
NAME = {'tl': '左上电机', 'tr': '右上电机', 'br': '右下电机', 'bl': '左下电机', 'upper': '机壳上端', 'lower': '机壳下端', 'left': '机壳左缘', 'right': '机壳右缘'}


def load(path):
    t = pathlib.Path(path).read_text(encoding='utf-8-sig').strip()
    if t.startswith('A8C1:'): t = base64.b64decode(t[5:]).decode('utf-8')
    return json.loads(t)


def convert(d):
    reg = json.loads((HERE / 'packs.json').read_text(encoding='utf-8'))['pages']
    reader = d.get('reader')
    if reader not in reg or d.get('pack') != reg[reader]['pack']: raise ValueError('回件不是出自登记的页面：reader=%s pack=%s' % (reader, d.get('pack')))
    z = zipfile.ZipFile(OFF / 'participants' / ('a8-%s.zip' % reader))
    blank = z.read('response.csv').decode('utf-8-sig')
    fields = next(csv.reader(io.StringIO(blank))); order = [r['token'] for r in csv.DictReader(io.StringIO(blank))]
    key = {r['token']: r['file'] for r in csv.DictReader(io.StringIO((OFF / 'researcher' / 'a8' / 'PRIVATE-key.csv').read_text(encoding='utf-8-sig'))) if r['reader'] == reader}
    diagrams = {r['file'] for r in csv.DictReader(io.StringIO((OFF / 'researcher' / 'a3' / 'guide-pixels.csv').read_text(encoding='utf-8-sig')))}
    if set(d['images']) - set(order): raise ValueError('回件里有发放包没有的图号')
    out, unfinished = [], []
    for t in order:
        r = d['images'].get(t, {'pts': {}, 'why': {}}); need = POINTS[:4] if key[t] in diagrams else POINTS
        row = {f: '' for f in fields}; row['token'] = t; why = []
        for p in need:
            if p not in r['pts']: unfinished.append(t); break
            v = r['pts'][p]
            if v is None:
                if not r['why'].get(p, '').strip(): raise ValueError('留空的点没有写原因：%s %s' % (t, p))
                why.append('%s：%s' % (NAME[p], r['why'][p].strip()))
            else:
                x, y = v
                if not (isinstance(x, int) and isinstance(y, int) and 0 <= x < 1024 and 0 <= y < 1024): raise ValueError('坐标不是 1024 画幅内的整数：%s %s %s' % (t, p, v))
                row[p + '_x'], row[p + '_y'] = x, y
        row['reason'] = '；'.join(why)
        out.append(row)
    if unfinished: raise ValueError('还有 %d 张没点完，请对方接着点完再导出：%s' % (len(set(unfinished)), '、'.join(sorted(set(unfinished)))))
    ms = [d['images'][t].get('ms', 0) for t in order]
    note = {'reader': reader, 'reader_id': d.get('reader_id'), 'tool': d.get('tool'), 'pack': d.get('pack'), 'started_at': d.get('started_at'), 'finished_at': d.get('finished_at'),
            'background': d.get('background'), 'notes': d.get('notes', ''), 'device': d.get('device'), 'images': len(order),
            'points_left_blank': sum(1 for r in out for p in POINTS if r['reason'] and NAME[p] in r['reason']),
            'minutes_total': round(sum(ms) / 60000, 1), 'seconds_per_image_median': round(statistics.median(ms) / 1000, 1)}
    return reader, fields, out, note


def main(src, dest):
    reader, fields, out, note = convert(load(src))
    folder = pathlib.Path(dest) / reader; folder.mkdir(parents=True, exist_ok=True)
    with (folder / 'response.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(out)
    (folder / 'reader.json').write_text(json.dumps(note, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('%s：%d 张，留空 %d 个点，共 %.1f 分钟，每张中位数 %.1f 秒 → %s' % (reader, len(out), note['points_left_blank'], note['minutes_total'], note['seconds_per_image_median'], folder / 'response.csv'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
