# -*- coding: utf-8 -*-
"""研究者一侧：把登记的 A8 独立 AI 包（68 张）重新匿名、分成 4 份，放到库外。
归档说明里写明：已经入库的匿名包若继续用于盲测，要重新封装、分配和封存。所以这里换一套新的随机图号、新的随机顺序，
去掉元数据并核对像素不变。新旧图号的对照只写在研究者目录里，判读者目录里没有。
用法：python pack_ai.py <库根目录> <判读者目录> <研究者目录>"""
import csv, hashlib, io, json, pathlib, random, secrets, shutil, sys
from PIL import Image

ROOT, READER, RESEARCHER = [pathlib.Path(p) for p in sys.argv[1:4]]
OFF = ROOT / 'archive' / 'paper-reading-room' / 'studies' / '20261117-offline'
SRC = OFF / 'participants' / 'a8-AI'
HERE = pathlib.Path(__file__).resolve().parent
LANDMARKS = ('tl', 'tr', 'br', 'bl', 'upper', 'lower', 'left', 'right')
BATCHES = 4
sha = lambda b: hashlib.sha256(b).hexdigest()


def rows(path):
    return list(csv.DictReader(io.StringIO(pathlib.Path(path).read_bytes().decode('utf-8-sig'))))


old = [r['token'] for r in rows(SRC / 'response.csv')]
key = {r['token']: r for r in rows(OFF / 'researcher' / 'a8' / 'PRIVATE-key.csv') if r['reader'] == 'AI'}
guides = {r['file'] for r in rows(OFF / 'researcher' / 'a3' / 'guide-pixels.csv')}
assert set(old) == set(key) and len(old) == 68, '登记的 AI 包应当是 68 张'
READER.mkdir(parents=True, exist_ok=False)
RESEARCHER.mkdir(parents=True, exist_ok=False)

rng = random.SystemRandom()
diagrams = [t for t in old if key[t]['file'] in guides]
designs = [t for t in old if key[t]['file'] not in guides]
assert len(diagrams) == 4 and len(designs) == 64
rng.shuffle(diagrams)
rng.shuffle(designs)
# 每份 16 张设计图加 1 张点线示意图：每个实例都有一张能对真值的图
batches = [designs[i * 16:(i + 1) * 16] + [diagrams[i]] for i in range(BATCHES)]
rekey = []
for b, group in enumerate(batches, 1):
    rng.shuffle(group)
    d = READER / ('batch%d' % b)
    d.mkdir()
    blank = []
    for t in group:
        new = secrets.token_hex(8)
        with Image.open(SRC / (t + '.png')) as original:
            im = original.convert('RGB')
            im.info.clear()
            im.save(d / (new + '.png'))
        with Image.open(d / (new + '.png')) as clean:
            assert clean.size == (1024, 1024) and not clean.info and clean.tobytes() == im.tobytes(), '重存后像素或元数据不对'
        rekey.append({'batch': b, 'new_token': new, 'old_token': t, 'file': key[t]['file'], 'sha256': key[t]['sha256'],
                      'png_sha256': sha((d / (new + '.png')).read_bytes())})
        blank.append({'token': new, **{'%s_%s' % (p, a): '' for p in LANDMARKS for a in 'xy'}, 'reason': ''})
    with (d / 'response-blank.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(blank[0]))
        w.writeheader()
        w.writerows(blank)
    shutil.copy(HERE / 'tool.py', d / 'tool.py')
    shutil.copy(HERE / 'rules.txt', d / 'rules.txt')
    # 判读者目录里不能出现旧图号或原图文件名
    text = ''.join(p.read_text(encoding='utf-8', errors='ignore') for p in d.iterdir() if p.suffix in ('.csv', '.txt', '.py'))
    names = ' '.join(p.name for p in d.iterdir())
    for r in rekey:
        if r['batch'] == b:
            assert r['old_token'] not in text + names and r['file'][:-4] not in text + names

with (RESEARCHER / 'PRIVATE-rekey.csv').open('w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rekey[0]))
    w.writeheader()
    w.writerows(rekey)
(RESEARCHER / 'pack.json').write_text(json.dumps({
    'source_pack': 'archive/paper-reading-room/studies/20261117-offline/participants/a8-AI',
    'source_response_sha256': sha((SRC / 'response.csv').read_bytes()),
    'tool_sha256': sha((HERE / 'tool.py').read_bytes()), 'rules_sha256': sha((HERE / 'rules.txt').read_bytes()),
    'batches': BATCHES, 'per_batch': [len(g) for g in batches],
    'rekey_sha256': sha((RESEARCHER / 'PRIVATE-rekey.csv').read_bytes())}, ensure_ascii=False, indent=1), encoding='utf-8')
print('已制包：', [len(g) for g in batches], '张；判读者目录', READER)
