"""研究者一侧：四份独立 AI 回件到齐以后，合成登记的那一张表，并备好评分用的私有目录。
用法：python3 merge_ai.py <判读者目录> <研究者目录> <库外的评分目录> [H1 的 response.csv] [H2 的 response.csv]
做的事：核对每份回件的图号与发出去的一致、没有漏项；按新旧图号对照表换回登记包的图号和顺序；
把合成的表、四份自报和操作日志抄进本目录的 returns/；在评分目录里放好 AI、H1、H2 三张表和对应键。只用标准库。"""
import csv, hashlib, io, json, pathlib, shutil, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OFF = ROOT / 'archive' / 'paper-reading-room' / 'studies' / '20261117-offline'
sha = lambda b: hashlib.sha256(b).hexdigest()


def rows(path):
    return list(csv.DictReader(io.StringIO(pathlib.Path(path).read_bytes().decode('utf-8-sig'))))


def main(reader, researcher, score, h1=None, h2=None):
    reader, researcher, score = [pathlib.Path(p) for p in (reader, researcher, score)]
    assert HERE not in score.resolve().parents and ROOT not in score.resolve().parents, '评分目录要放在库外'
    rekey = rows(researcher / 'PRIVATE-rekey.csv')
    blank = rows(OFF / 'participants' / 'a8-AI' / 'response.csv')
    fields = list(blank[0].keys())
    by_old, info = {}, []
    for b in sorted({r['batch'] for r in rekey}):
        d = reader / ('batch' + b)
        sent = {r['new_token']: r for r in rekey if r['batch'] == b}
        got = rows(d / 'response.csv')
        assert [r['token'] for r in got] == [r['token'] for r in rows(d / 'response-blank.csv')] and set(sent) == {r['token'] for r in got}, '回件的图号与发出去的不一致：batch' + b
        for r in got:  # 发出去的图没有被改动
            assert sha((d / (r['token'] + '.png')).read_bytes()) == sent[r['token']]['png_sha256']
            by_old[sent[r['token']]['old_token']] = {**r, 'token': sent[r['token']]['old_token']}
        meta = json.loads((d / 'reader.json').read_text(encoding='utf-8'))
        assert meta['response_sha256'] == sha((d / 'response.csv').read_bytes()), '回件在写出之后被改过：batch' + b
        log = (d / 'oplog.jsonl').read_bytes()
        (HERE / 'returns' / ('oplog-batch%s.jsonl' % b)).write_bytes(log)
        (HERE / 'returns' / ('reader-batch%s.json' % b)).write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        info.append({'batch': int(b), 'images': len(got), 'commands': len(log.splitlines()), 'first_command_at': meta['first_command_at'],
                     'finished_at': meta['finished_at'], 'oplog_sha256': sha(log), 'response_sha256': meta['response_sha256'], 'self_report': meta['self_report']})
    assert set(by_old) == {r['token'] for r in blank} and len(by_old) == 68
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=fields, lineterminator='\r\n')
    w.writeheader()
    w.writerows({k: by_old[r['token']].get(k, '') for k in fields} for r in blank)
    merged = ('﻿' + out.getvalue()).encode('utf-8')
    (HERE / 'returns' / 'response-AI.csv').write_bytes(merged)
    pack = json.loads((researcher / 'pack.json').read_text(encoding='utf-8'))
    (HERE / 'returns' / 'register.json').write_text(json.dumps({'tool': 'a8-ai-reader 1.0', 'pack': pack, 'batches': info,
        'response_sha256': sha(merged)}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    # 评分目录：三张表加对应键，格式照 a3/calibrate.py score 的要求
    score.mkdir(parents=True, exist_ok=False)
    (score / 'AI').mkdir()
    (score / 'AI' / 'response.csv').write_bytes(merged)
    shutil.copy(OFF / 'researcher' / 'a8' / 'PRIVATE-key.csv', score / 'PRIVATE-key.csv')
    for name, src in (('H1', h1), ('H2', h2)):
        if src:
            (score / name).mkdir()
            shutil.copy(src, score / name / 'response.csv')
    print('合成 68 张；四份回件共 %d 条操作记录。评分目录：%s' % (sum(i['commands'] for i in info), score))


if __name__ == '__main__':
    main(*sys.argv[1:])
