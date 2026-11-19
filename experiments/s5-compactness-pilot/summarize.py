"""汇总评议结果。用法：python3 summarize.py 答卷1.json 答卷2.txt …
答卷可以是下载的 JSON，也可以是存成文本的“复制结果”（以 S5P1: 开头）。只输出计数和匿名的逐人数值；
答卷原件含自由文字，留在研究者本机，不要提交到仓库。"""
import base64, collections, json, pathlib, statistics, sys

HERE = pathlib.Path(__file__).resolve().parent
KEY = json.loads((HERE / 'researcher-key.json').read_text(encoding='utf-8'))

def load(path):
    t = pathlib.Path(path).read_text(encoding='utf-8-sig').strip()
    if t.startswith('S5P1:'): t = base64.b64decode(t[5:]).decode('utf-8')
    return json.loads(t)

def main(paths):
    seen, problems = {}, []
    for p in paths:
        try: r = load(p)
        except Exception as e: problems.append('%s：读不出（%s）' % (p, e)); continue
        if r.get('pack') != KEY['pack']: problems.append('%s：不是这一版的包（%s）' % (p, r.get('pack'))); continue
        if not r.get('finished_at') or not r.get('consent'): problems.append('%s：没有完成或没有同意' % p); continue
        if any(x.get('choice') is None for x in r['pairs']) or any(len(x.get('ratings', {})) != len(KEY['terms']) for x in r['singles']):
            problems.append('%s：有漏答' % p); continue
        old = seen.get(r['response_id'])
        if old: problems.append('%s：与另一份编号相同，保留完成时间较晚的一份' % p)
        if not old or r['finished_at'] > old['finished_at']: seen[r['response_id']] = r
    rs = sorted(seen.values(), key=lambda r: r['started_at'])
    out = ['# 评议汇总（%s，包 %s）' % (KEY['version'], KEY['pack']), '', '有效答卷 %d 份。' % len(rs)]
    if problems: out += [''] + ['- ' + x for x in problems]
    if not rs: print('\n'.join(out)); return
    out += ['', '## 评议者', '', '| 项目 | 分布 |', '| --- | --- |']
    for k, name in [('design', '设计背景'), ('years', '年限'), ('drone', '无人机熟悉程度'), ('relation', '与研究者'), ('exposure', '此前接触')]:
        c = collections.Counter(r['background'].get(k) for r in rs); out.append('| %s | %s |' % (name, '；'.join('%s %d' % kv for kv in c.most_common())))
    out.append('| 独自完成 | %s |' % '；'.join('%s %d' % kv for kv in collections.Counter(r['closing'].get('alone') for r in rs).most_common()))
    mins = [sum(x['ms'] for x in r['singles'] + r['pairs']) / 60000 for r in rs]
    out.append('| 作答用时（分钟，各页相加） | 中位数 %.1f，范围 %.1f–%.1f |' % (statistics.median(mins), min(mins), max(mins)))

    pk, img = KEY['pairs'], KEY['images']
    def verdict(resp, pid):
        x = next(x for x in resp['pairs'] if x['pair'] == pid)
        if x['choice'] in ('same', 'na'): return x['choice']
        chosen = x['left'] if x['choice'] == 'left' else x['right']
        return 'higher' if chosen == pk[pid]['higher'] else 'lower'
    out += ['', '## 核对题', '']
    c = collections.Counter(verdict(r, pid) for r in rs for pid, v in pk.items() if v['kind'] == 'identical')
    out.append('两张完全相同的图：选“差不多” %d 人，选了某一边 %d 人，无法判断 %d 人。' % (c['same'], c['higher'] + c['lower'], c['na']))
    FACT = KEY['factors']
    for f in FACT:
        rep = [(pid, v['repeat_of']) for pid, v in pk.items() if v['kind'] == 'repeat' and v['factor'] == f]
        same = sum(all(verdict(r, a) == verdict(r, b) for a, b in rep) for r in rs)
        out.append('%s 的重复题（左右对调后再问一次）：前后一致 %d / %d 人。' % (f, same, len(rs)))
    for f in FACT:
        hi = FACT[f]['higher']
        out += ['', '## %s 与紧凑感' % f, '', '成对比较：同一个设计的两张图只差%s，问哪一张更紧凑。' % f, '',
                '| 比较 | 设计 | 选%s | 选另一张 | 差不多 | 无法判断 |' % hi, '| --- | --- | ---: | ---: | ---: | ---: |']
        tot = collections.Counter()
        for kind, label in [('low-high', '低档对高档'), ('low-mid', '低档对中档'), ('mid-high', '中档对高档')]:
            for pid, v in pk.items():
                if v['kind'] != kind or v['factor'] != f: continue
                c = collections.Counter(verdict(r, pid) for r in rs)
                if kind == 'low-high': tot.update(c)
                out.append('| %s | %s | %d | %d | %d | %d |' % (label, v['family'], c['higher'], c['lower'], c['same'], c['na']))
        n = sum(tot.values())
        out += ['', '低档对高档合计 %d 次判断：选%s %d，选另一张 %d，差不多 %d，无法判断 %d。' % (n, hi, tot['higher'], tot['lower'], tot['same'], tot['na'])]
        lh = [pid for pid, v in pk.items() if v['kind'] == 'low-high' and v['factor'] == f]
        per = [sum(verdict(r, pid) == 'higher' for pid in lh) - sum(verdict(r, pid) == 'lower' for pid in lh) for r in rs]
        out.append('逐人（4 个设计里选“%s”的次数减选另一张的次数）：%s。' % (hi, '、'.join('%+d' % x for x in per)))
        why = [x['reason'].strip() for r in rs for x in r['pairs'] if pk[x['pair']]['factor'] == f and x.get('reason', '').strip()]
        if why: out += ['', '评议者写下的依据：' + '；'.join(sorted(set(why))) + '。']
        out += ['', '单图评分（1 = 左极，7 = 右极；“看不出”不计入中位数）：', '', '| 词对 | 档位 | 逐人逐图读数 | 中位数 | 看不出 |', '| --- | --- | --- | ---: | ---: |']
        for t in KEY['terms']:
            for variant, lv in FACT[f]['levels'].items():
                vals, na = [], 0
                for r in rs:
                    for x in r['singles']:
                        if img[x['image']]['variant'] != variant: continue
                        k = x['ratings'][t['id']]
                        if k == 'na': na += 1
                        else: vals.append(8 - k if x['flip'][t['id']] else k)
                out.append('| %s—%s | %s | %s | %s | %d |' % (t['left'], t['right'], lv, ' '.join(map(str, vals)), ('%.1f' % statistics.median(vals)) if vals else '—', na))
    print('\n'.join(out))

if __name__ == '__main__':
    main(sys.argv[1:])
