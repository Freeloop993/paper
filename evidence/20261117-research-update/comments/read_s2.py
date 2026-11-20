"""把一份 S2 完整答卷读成可以核对的结果页。用法（要装 scipy）：
python3 read_s2.py <key.json> <答卷.json> > s2-result.md
分层计数、区间和加权估计由 score.py 算；这里多做四件事：逐层的区间、两条事先写下的读法是否触发、
其余层被判“涉及”的各条原话、“小巧或紧凑”与携带、折叠、轻重的同现。"""
import json, pathlib, re, statistics, sys
import score as SC

HERE = pathlib.Path(__file__).resolve().parent
N_A, N_U = 228, 1090          # 保留层、其余层的总条数
CLAIMED = {'小巧或紧凑': '小巧 43%', '随身携带': '便携 29%', '轻重感受': '轻 21%', '简洁或繁复': '直接说“简洁”的 5 条（2%）'}   # 登记任务表“用户侧”一行


def pct(x): return '%.1f%%' % (100 * x)


def main(key_path, ans_path):
    key = json.loads(pathlib.Path(key_path).read_text(encoding='utf-8'))
    ans = json.loads(pathlib.Path(ans_path).read_text(encoding='utf-8'))
    out = SC.score(key, ans)
    payload = re.search(r'<script type="application/json" id="payload">(.*?)</script>', (HERE / 'S2-评论核查.html').read_text(encoding='utf-8'), re.S).group(1)
    text = {i['id']: i['text'] for i in json.loads(payload)['items']}
    rows = [dict(sid=s, layer=key[s]['layer'], n=len(text[s]), text=text[s], **a) for s, a in ans['answers'].items()]
    A = [r for r in rows if r['layer'] == 'A']; U = [r for r in rows if r['layer'] == 'U']
    a = sum(r['scope'] == '涉及' for r in A); u = sum(r['scope'] == '涉及' for r in U)
    la, ha = SC.interval(a, 50, N_A); lu, hu = SC.interval(u, 100, N_U)
    recall = out['confirmed_appearance']['estimated_recall']
    r_lo, r_hi = la / (la + hu), ha / (ha + lu)
    P = print
    P('# S2 评论抽样核查：结果\n')
    P('本页由 `read_s2.py` 从答卷生成，不要手改。读法和它对论文的含义写在 [README](README.md) 的“S2 结果”一节。\n')
    P('## 作答情况\n')
    resp = ans.get('respondent', {})
    P('| 项目 | 答卷里的记录 |\n| --- | --- |')
    P('| 题面版本 | %s，150 条全部作答 |' % ans['version'])
    P('| 作答者自报 | %s；专业方向：%s；看过分类结果或论文稿：%s；打开过资料库：%s |' % (resp.get('role'), resp.get('field'), resp.get('seen'), resp.get('repo')))
    P('| 开始到完成（UTC） | %s 至 %s |' % (ans['started_at'][:16].replace('T', ' '), ans['finished_at'][11:16]))
    secs = [r['ms'] / 1000 for r in rows]
    P('| 各条用时相加 | %.1f 分钟；每条中位数 %.1f 秒 |' % (sum(secs) / 60, statistics.median(secs)))
    fast = [r for r in rows if r['ms'] < 3000]
    P('| 3 秒以内的条数 | %d 条：其中 %d 条判“未涉及”，这些评论的长度中位数是 %d 个字（全部 150 条是 %d 个字） |' % (
        len(fast), sum(r['scope'] == '未涉及' for r in fast), statistics.median(r['n'] for r in fast), statistics.median(r['n'] for r in rows)))
    yes = [r for r in rows if r['scope'] == '涉及']
    P('| 判“涉及”的各条 | %d 条，每条中位数 %.1f 秒；其中 %d 条在备注里抄了所依据的原话 |' % (len(yes), statistics.median(r['ms'] / 1000 for r in yes), sum(bool(r.get('note')) for r in yes)))
    P('| 判“信息不足” | %d 条 |' % sum(r['scope'] == '信息不足' for r in rows))
    P('\n## 两层的结果\n')
    P('区间是按有限总体的超几何分布反推的，每层取 97.5%，两层合起来不低于 95%。\n')
    P('| 层 | 抽样 | 判“涉及” | 比例 | 推到整层的条数 |\n| --- | ---: | ---: | ---: | --- |')
    P('| 原先保留的（%d 条） | 50 | %d | %s | %d 到 %d 条（%s 到 %s） |' % (N_A, a, pct(a / 50), la, ha, pct(la / N_A), pct(ha / N_A)))
    P('| 原先没保留的（%d 条） | 100 | %d | %s | %d 到 %d 条（%s 到 %s） |' % (N_U, u, pct(u / 100), lu, hu, pct(lu / N_U), pct(hu / N_U)))
    w = out['涉及']
    P('\n- 按两层的条数加权，1,318 条里谈到机体外形的估计占 **%s**（%s 到 %s），约 %d 条（%d 到 %d 条）。原先保留的是 228 条，占 17.3%%。' % (
        pct(w['weighted_proportion']), pct(w['conservative_95_bounds'][0]), pct(w['conservative_95_bounds'][1]),
        round(1318 * w['weighted_proportion']), round(1318 * w['conservative_95_bounds'][0]), round(1318 * w['conservative_95_bounds'][1])))
    P('- 原先的筛选找回了其中的 **%s**（两层区间的两端组合：%s 到 %s）。' % (pct(recall), pct(r_lo), pct(r_hi)))
    P('\n## 事先写下的两条读法\n')
    P('两条读法写在 README 里，提交于 2026-11-20 17:17（北京时间），答卷开始于 18:59。\n')
    P('| 读法 | 界线 | 结果 | 是否触发 |\n| --- | --- | --- | --- |')
    P('| 一、保留层里混有不谈外形的评论 | 50 条里判“涉及”的不到 40 条 | %d 条 | %s |' % (a, '触发' if a < 40 else '不触发'))
    P('| 二、保留的 228 条少算了 | 加权召回率低于 70%% | %s | %s |' % (pct(recall), '**触发**' if recall < .7 else '不触发'))
    P('\n## 各主题\n')
    P('一条评论可以勾多个主题。后两栏按 1,318 条加权。最后一栏是登记任务表里按 228 条写的数字，只有四个主题有。\n')
    P('| 主题 | 保留层 50 条里 | 其余层 100 条里 | 占 1,318 条的估计 | 区间 | 228 条里原先的数字 |\n| --- | ---: | ---: | ---: | --- | --- |')
    for t in SC.TOPICS:
        m = out['themes'][t]
        P('| %s | %d（%s） | %d | %s | %s 到 %s | %s |' % (t, m['retained_x_of_50'], pct(m['retained_x_of_50'] / 50), m['excluded_x_of_100'], pct(m['weighted_proportion']),
                                                    pct(m['conservative_95_bounds'][0]), pct(m['conservative_95_bounds'][1]), CLAIMED.get(t, '—')))
    P('\n## 其余层里被判“涉及”的 %d 条\n' % u)
    P('这些是原先没有保留、核查者认为谈到了机体外形的评论。备注是核查者抄下的依据。\n')
    P('| 编号 | 勾的主题 | 核查者抄的依据 | 评论原话（截到 80 字） |\n| --- | --- | --- | --- |')
    for r in U:
        if r['scope'] == '涉及':
            P('| %s | %s | %s | %s |' % (r['sid'], '、'.join(r['topics']), r.get('note') or '（没有写）', r['text'].replace('\n', ' ').replace('|', '／')[:80]))
    only = lambda t: sum(1 for r in U if r['scope'] == '涉及' and r['topics'] == [t])
    P('\n其中只勾了“材质与质感”的有 %d 条，依据都是“做工”“质量”一类的话。' % only('材质与质感'))
    P('\n## 保留层里被判“未涉及”的 %d 条\n' % (50 - a))
    P('| 编号 | 评论原话 |\n| --- | --- |')
    for r in A:
        if r['scope'] != '涉及': P('| %s | %s |' % (r['sid'], r['text'].replace('\n', ' ').replace('|', '／')[:120]))
    P('\n## “小巧或紧凑”和哪些主题一起出现\n')
    small = [r for r in rows if '小巧或紧凑' in r['topics']]
    P('150 条里勾了“小巧或紧凑”的有 %d 条（保留层 %d，其余层 %d）。\n' % (len(small), sum(r['layer'] == 'A' for r in small), sum(r['layer'] == 'U' for r in small)))
    P('| 同时勾了 | 条数 |\n| --- | ---: |')
    for t in ('随身携带', '折叠收纳', '轻重感受'):
        P('| %s | %d |' % (t, sum(t in r['topics'] for r in small)))
    carry = lambda r: any(t in r['topics'] for t in ('随身携带', '折叠收纳', '轻重感受'))
    P('| 以上三项至少一项 | %d |' % sum(carry(r) for r in small))
    P('| 以上三项都没有（只谈小巧，或另加美感、材质等） | %d |' % sum(not carry(r) for r in small))


if __name__ == '__main__':
    main(*sys.argv[1:3])
