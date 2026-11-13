from pathlib import Path
import csv,json,html
from collections import Counter
root=Path(__file__).resolve().parent
def read(name):return json.loads((root/name).read_bytes())
def rows(name):return list(csv.DictReader((root/name).open(encoding='utf-8-sig')))
r=read('results.json');v=read('verification.json');s=r['S'];w=r['W'];l=r['L'];common=r['overall'];c=r['human_pending']
allrows=rows('by-image.csv');cross=rows('two-rounds.csv')
cn={'B':'无缝','S':'承座','H':'铰接','U':'待判','P':'前伸','N':'无外突','C':'单盖','M':'多盖'}
def pretty(xs):
    return '、'.join(cn.get(k,k)+str(v) for k,v in Counter(xs).items())
def grade(value):return '达到' if value else '未达到'
def pct(v):return '不可量' if v is None else f'{100*v:.2f}%'
body=['# H3 第二轮 · 生成、盲读及两轮对照','',
f"第二轮新提交 {v['outputs']} 次，回收 {v['distinct_hashes']} 张不同原图及 {v['revised']} 份服务端提示词改写。提交时间 {v['first_start']} 至 {v['last_received']}。第一轮另有 36 次真实生成；旧图复读新增生成 0。第二轮前冻结 fdae71c。量测与可见证据由两位新会话 AI 分工独立记录。实际金额未知，服务端记录 {v['usage']['total_tokens']} tokens。GPU 启动 0 次。",
'','[第二轮全部原图](gallery.md) · [逐图数据](by-image.csv) · [实发/改写并排](prompt-audit.csv) · [冻结口径](freeze.md) · [第一轮同读法复测](../round-1-recheck/README.md) · [两轮每张对照](two-rounds.csv)','',
'## 臂根与相机 · 同条件两轮各三张','',
'| 条件 | 首轮臂根 | 次轮臂根 | 首轮机鼻 | 次轮机鼻 |','|---|---|---|---|---|']
for label in ['S0','S1','S2','S3','S4','S5']:
    cells=[a for a in cross if a['condition']==label]
    body.append('| '+label+' | '+' | '.join(pretty([a[k] for a in cells]) for k in ['r1_root','r2_root','r1_nose','r2_nose'])+' |')
body+=['','![三种臂根](roots-two-rounds.jpg)','','![机鼻与机尾](camera-two-rounds.jpg)','',
'同一行是同一设计条件。样本按生成序号排列，两轮随机种子与盲读者均不同。首轮原图使用后来登记的 v2.1 复测（原冻结读数另存），次轮使用预先登记的 v2.1。固定配色和单盖文字同轮调整，不能从跨轮数据识别单一改动的因果效应。机鼻类别只描述外突与否。相机位置/朝向另记：'+str(common['camera'])+'。','',
'[相机位置例图：第一轮疑似 S2-2 与第二轮实见错位 L-W25-3](camera-direction-review.jpg)。第二轮 S0-1 的横件在两耳之后，S0-2 只见小黑拱，均不强判无外突或朝向。S4-2 两支耳突出但中间模组近乎齐平，仍待判。顶视看不见镜头不计错位，也不证明朝向正确。','',
'## 候选版本和判定','',
f"S0 三个基准项：无缝 {s['S0']['root']}/3，单盖 {s['S0']['cover']}/3，无外突 {s['S0']['nose']}/3；读成承座 {s['S0_socket']}/3。S1 方正、S2 承座、S3 铰接、S4 前伸、S5 多盖分别为 "+'、'.join(str(s['targets'][k])+'/3' for k in ['S1','S2','S3','S4','S5'])+'。',
f"本轮通用三项同时达成 {common['joint']}/36。四轴均双叶 {common['double']}/36。产品感 {common['quality']}，护圈 {common['guard']}。S 及通用项合并按 AI 读数{grade(s['combined_ai_gate'])}阈值。正式签署与人工确认另列。",'',
f"W 的 10 和 25 mm 常规条件各三张，分别有 {w['levels']['W10']['n']}/3、{w['levels']['W25']['n']}/3 可量。仅可量子集的相对臂宽均值为 {pct(w['levels']['W10']['mean'])} / {pct(w['levels']['W25']['mean'])}。未满六张，未进行预定全组六张的均值差与 SD 检验。两张均因蓝条盖住实体臂边无法测量；明确残留分别为 {w['levels']['W10']['residue'].get('yes',0)}、{w['levels']['W25']['residue'].get('yes',0)} 张。W {grade(w['ai_pass'])}预设条件。",'',
f"L 比较本轮常规与低对比各12张。常规残留 {l['regular']}，低对比 {l['low']}。承座命中 {l['regularS2']}/3 → {l['lowS2']}/3；前伸 {l['regularS4']}/3 → {l['lowS4']}/3。L {grade(l['ai_pass'])}预设条件。",'',
'| 同轮参照 | 常规残留 (yes/U) | 低对比残留 (yes/U) |','|---|---|---|']
for pair in l['pairs']:
    body.append('| '+pair['condition']+' | '+' | '.join(f"{pair[k].get('yes',0)} / {pair[k].get('U',0)}" for k in ['regular','low'])+' |')
body+=['','[全表和档内三次数值](results.json) · [结构 AI 原记录](morph-ai.jsonl) · [量测及外观 AI 原记录](visible-ai.jsonl) · [结构封存摘要](morph-ai-lock.json) · [量测封存摘要](visible-ai-lock.json)','',
'全同列检测以分类的实际原记录为准，详细见[人工核查页](human-check.md)。字典 v1.2、读法 v2.1、常规/低对比点线图分别报告；每字段有效读者一名，尚无真人确认。本批不自动升格为正式数据。']
(root/'README.md').write_text('\n'.join(body)+'\n',encoding='utf8')
# List per-image observations for actual constant columns, leaving signed confirmation empty.
same={}
for k in ['root','body','nose','cover','camera','quality','guard','residue','blades','double','joint']:
    vals={a[k] for a in allrows}
    if len(vals)==1:same[k]=next(iter(vals))
for i in range(4):
    vals={json.loads(a['blades'])[i] for a in allrows}
    if len(vals)==1:same['blades_'+str(i+1)]=next(iter(vals))
check=['# 需作者人工确认的全同读数','',f'分类和逐轴叶数全同项：{same}。当前状态：待人工确认。请点开原图按证据追踪相应部位；全同只触发复核，不能代替人工回执。已封存 AI 原记录；作者更正另加行，留存原值。','',
'| 原图 | 质量 / 护圈 / 逐轴叶数 | 逐图证据（质量；护圈；叶片） |','|---|---|---|']
for a in allrows:
    sid=a['slot']
    check.append(f"| [{sid}](actual/{sid}/original.png) | {a['quality']} / {a['guard']} / {a['blades']} | {a['quality_note']}；{a['guard_note']}；{a['blade_note']} |")
(root/'human-check.md').write_text('\n'.join(check)+'\n',encoding='utf8')
page=['<!doctype html><html lang="zh"><meta charset="utf-8"><title>两轮臂根和相机</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px/1.55 system-ui;max-width:1500px;margin:auto;padding:16px;color:#192d31}figure{margin:22px 0}figure img{width:100%;display:block}table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{padding:5px;border-bottom:1px solid #bec9c6}td img{width:100%}a{color:#145753}</style><h1>两轮臂根与相机</h1><p>按条件并排，左三张为第一轮，右三张为第二轮。点图查看 1024 像素原件。重复序号不代表同一种子。</p>']
for asset in ['roots-two-rounds.jpg','camera-two-rounds.jpg','camera-direction-review.jpg']:
    page.append(f'<figure><a href="{asset}"><img src="{asset}" alt="两轮部件局部对照"></a></figure>')
page.append('<table><tr><th>条件</th><th colspan="3">第一轮</th><th colspan="3">第二轮</th></tr>')
for label in ['S0','S1','S2','S3','S4','S5']:
    cells=[a for a in cross if a['condition']==label]; page.append('<tr><th>'+label+'</th>')
    for n in (1,2):
        for a in cells:
            src=a[f'r{n}_image']
            page.append(f'<td><a href="{src}"><img loading="lazy" src="{src}"></a>'+cn[a[f'r{n}_root']]+' / '+cn[a[f'r{n}_nose']]+'</td>')
    page.append('</tr>')
page.append('</table></html>')
(root/'compare.html').write_text(''.join(page),encoding='utf8')
