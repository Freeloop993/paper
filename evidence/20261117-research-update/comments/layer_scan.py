"""S2 之后的补充核对：原先没保留的 1,090 条里，谈大小、携带的有多少，谈做工、质量的有多少。
按词面数整层，不抽样。词表写在下面，是看 S2 答卷之后定的，所以只作说明，不替换 S2 的估计。
用法：python3 layer_scan.py ../../../archive/paper-reading-room/datasets/early-crawl/08-semantic-analysis.zip > layer-scan.md"""
import hashlib, json, sys, zipfile

LEDGER_SHA = '092615cbf424248743cc7f1b674ecfd30842b37012ec285b79f05b570d2b81e7'
GROUPS = [
    ('大小与紧凑', ['小巧', '紧凑', '迷你', '体积', '巴掌', '掌上', '口袋', '袖珍', '个头', '尺寸', '大小']),
    ('携带与收纳', ['便携', '携带', '随身', '折叠', '收纳', '背包', '出门带', '带着']),
    ('轻重', ['轻巧', '轻便', '很轻', '重量', '分量', '克重', '249']),
    ('外观与造型', ['外观', '颜值', '好看', '漂亮', '帅', '造型', '外形', '设计感', '美观', '样子']),
    ('做工与质量', ['做工', '质量', '品质', '质感', '材质', '手感', '用料', '精致', '扎实', '结实']),
]
LABEL = {'A': '保留', 'X': '非造型或低信息', 'U': '对象或语义待核', 'S': '辅助语义候选'}


def main(path):
    z = zipfile.ZipFile(path)
    name = [n for n in z.namelist() if '/64-' in n and '/06-' in n and n.endswith('.json')][0]
    raw = z.read(name); assert hashlib.sha256(raw).hexdigest() == LEDGER_SHA
    recs = [r for r in json.loads(raw)['records'] if 'Q' in r['scopes']]
    assert len(recs) == 1318
    kept = [r for r in recs if r['decision_code'] == 'A']; rest = [r for r in recs if r['decision_code'] != 'A']
    assert (len(kept), len(rest)) == (228, 1090)
    hit = lambda r, words: any(w in r['text'] for w in words)
    P = print
    P('# 整层词面核对：没保留的 1,090 条里有什么\n')
    P('本页由 `layer_scan.py` 从结案台账生成。按词面数，一条评论含某组里任何一个词就算一次；词面数会多算（“质量很好”未必在说机体），也会漏算（换了说法的）。词表是看过 S2 答卷之后定的，只作说明。\n')
    P('| 词组 | 用到的词 | 保留的 228 条里 | 没保留的 1,090 条里 | 含这组词的评论里保留了多少 |\n| --- | --- | ---: | ---: | ---: |')
    for g, words in GROUPS:
        a = sum(hit(r, words) for r in kept); u = sum(hit(r, words) for r in rest)
        P('| %s | %s | %d（%.0f%%） | %d（%.1f%%） | %.0f%% |' % (g, '、'.join(words), a, 100 * a / 228, u, 100 * u / 1090, 100 * a / (a + u) if a + u else 0))
    P('\n## 没保留的 1,090 条按原先的处理结果分\n')
    P('| 原先的处理 | 条数 | ' + ' | '.join(g for g, _ in GROUPS) + ' |\n| --- | ---: | ' + ' | '.join('---:' for _ in GROUPS) + ' |')
    for code in ('X', 'U', 'S'):
        rs = [r for r in rest if r['decision_code'] == code]
        P('| %s | %d | %s |' % (LABEL[code], len(rs), ' | '.join(str(sum(hit(r, w) for r in rs)) for _, w in GROUPS)))
    P('\n## 没保留、但含“大小与紧凑”或“携带与收纳”词面的评论\n')
    size = [r for r in rest if hit(r, GROUPS[0][1]) or hit(r, GROUPS[1][1])]
    P('共 %d 条。逐条列出原先不保留的理由（截到 60 字）和评论原话（截到 70 字）。\n' % len(size))
    P('| 原先的处理 | 理由 | 评论原话 |\n| --- | --- | --- |')
    for r in sorted(size, key=lambda r: (r['decision_code'], r['text_id'])):
        P('| %s | %s | %s |' % (LABEL[r['decision_code']], (r.get('reason') or '').replace('|', '／').replace('\n', ' ')[:60], r['text'].replace('|', '／').replace('\n', ' ')[:70]))


if __name__ == '__main__':
    main(sys.argv[1])
