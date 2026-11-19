"""评分与规格比例的等级相关。用法：python3 geometry/relate.py responses/2026-11-19/*.json
只算看过同一组图、且不少于 3 份的答卷；按各款“紧凑—舒展”的中位数，也逐人列出。正值表示比例越大越被评为舒展。"""
import collections, csv, pathlib, statistics, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import summarize as S

HERE = pathlib.Path(__file__).resolve().parent
MEASURES = [('W_over_L', '电机布局宽长比 W/L'), ('PV01_body_length_over_width', '机壳长宽比'), ('PV02_body_width_over_D', '机壳宽 / 对角电机距'), ('PV03_d_over_D', '桨径 / 对角电机距 d/D')]

def main(paths):
    M = {r['image_id']: r for r in csv.DictReader(open(HERE / 'metrics.csv', encoding='utf-8-sig'))}
    pid = {c: S.IMG[c]['name'].split()[0] for c in S.KEY['singles']}
    blocks = collections.defaultdict(list)
    for p in paths:
        r, _ = S.load(p); blocks[frozenset(x['image'] for x in r['singles'])].append(r)
    out = ['# 评分与规格比例的等级相关', '', '斯皮尔曼等级相关；正值表示比例越大越被评为舒展。“中位数”一列按各款的中位数算，后面逐人列出（按开始时间）。只用来挑下一步要检验的比例。']
    for b, rs in sorted(blocks.items(), key=lambda kv: -len(kv[0])):
        if len(rs) < 3: continue
        rs.sort(key=lambda r: r['started_at']); images = [c for c in S.KEY['singles'] if c in b]
        cfg = collections.Counter(S.IMG[c]['config'] for c in images)
        out += ['', '## %d 款（%s），%d 份答卷' % (len(images), '、'.join('%s %d' % kv for kv in cfg.most_common()), len(rs)), '', '| 比例 | 可用款数 | 中位数 | 逐人 | 这批图里的取值范围 |', '| --- | ---: | ---: | --- | --- |']
        sc = {c: [S.score(r, c, 'span') for r in rs] for c in images}
        med = {c: S.med([v for v in sc[c] if v is not None]) for c in images}
        extra = [('fill_of_bbox', '（对照）整机占外接框面积')]
        for key, label in MEASURES + extra:
            val = {c: (float(M[pid[c]][key]) if key in M[pid[c]] and M[pid[c]][key] != '' else S.IMG[c].get(key)) for c in images}
            use = [c for c in images if val[c] is not None and med[c] is not None]
            rho = S.spearman([val[c] for c in use], [med[c] for c in use])
            per = []
            for i in range(len(rs)):
                u = [c for c in use if sc[c][i] is not None]; per.append('%+.2f' % S.spearman([val[c] for c in u], [sc[c][i] for c in u]))
            out.append('| %s | %d | %+.2f | %s | %.2f–%.2f |' % (label, len(use), rho, '、'.join(per), min(val[c] for c in use), max(val[c] for c in use)))
        # 规格比例彼此之间、以及与占框面积的关系
        out += ['', '比例之间的等级相关（同一批图）：']
        keys = MEASURES + extra
        for i in range(len(keys)):
            for j in range(i + 1, len(keys)):
                va = {c: (float(M[pid[c]][keys[i][0]]) if keys[i][0] in M[pid[c]] and M[pid[c]][keys[i][0]] != '' else S.IMG[c].get(keys[i][0])) for c in images}
                vb = {c: (float(M[pid[c]][keys[j][0]]) if keys[j][0] in M[pid[c]] and M[pid[c]][keys[j][0]] != '' else S.IMG[c].get(keys[j][0])) for c in images}
                u = [c for c in images if va[c] is not None and vb[c] is not None]
                r = S.spearman([va[c] for c in u], [vb[c] for c in u])
                if abs(r) >= 0.4: out.append('- %s 与 %s：%+.2f（%d 款）' % (keys[i][1], keys[j][1], r, len(u)))
        # 去掉护圈和涵道机型
        guard = [c for c in images if S.IMG[c].get('type') in ('全包护圈', '涵道穿越机')]
        if guard and len(images) - len(guard) >= 8:
            out += ['', '去掉带护圈和涵道的 %d 款后（%d 款），按中位数：' % (len(guard), len(images) - len(guard))]
            for key, label in MEASURES + extra:
                val = {c: (float(M[pid[c]][key]) if key in M[pid[c]] and M[pid[c]][key] != '' else S.IMG[c].get(key)) for c in images}
                use = [c for c in images if c not in guard and val[c] is not None and med[c] is not None]
                out.append('- %s：%+.2f（%d 款）' % (label, S.spearman([val[c] for c in use], [med[c] for c in use]), len(use)))
    print('\n'.join(out))

if __name__ == '__main__':
    main(sys.argv[1:])
