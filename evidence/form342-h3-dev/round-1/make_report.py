"""Render a reproducible Chinese handoff from the sealed, joined data."""
from pathlib import Path
import json,csv
from collections import Counter

root=Path(__file__).resolve().parent
read=lambda name:json.loads((root/name).read_bytes())
score,verification,lock=map(read,['results.json','verification.json','blind-lock.json'])
with (root/'by-image.csv').open(encoding='utf-8-sig') as f:
    rows=list(csv.DictReader(f))
cn={'S0':'共同基准，全四项','S1':'方正机壳','S2':'外露承座','S3':'折叠铰接','S4':'前伸云台','S5':'多块顶盖'}
cat={'body_plan':'机壳','arm_root':'臂根','camera':'相机舱','cover':'顶盖'}
common=score['common']
md=['# H3 开发第一轮 · 文字档位和条件图尺寸',
f"日常航拍四旋翼，同一顶视任务。36 次实际调用、{verification['distinct_original_sha256']} 份不同原图、{verification['returned_revised_prompts']} 份模型改写回执。每格三次独立服务调用；模型无可提交种子。",
f"独立 AI 先在新会话读取随机 RGB 图、逐图填写；锁定 {lock['rows']} 行原表后才对应条件。通用三项同时满足 **{common['joint']}/36**，本轮门槛为 30/36。可辨四轴均双叶 {common['double']}/36，按冻结定义没有实见相机错位 {common['camera_not_observed_wrong']}/36，像产品图 {common['product']}/36。相机不可见 {common['invisible']}、可见性或方向不可判 {common['ambiguous']}、实见错位 {common['wrong']}；“未实见错位”范围大于“已证实相符”。",
'[逐张读数](by-image.csv) · [匿名原表](blind-readings.jsonl) · [封存摘要](blind-lock.json) · [揭盲键](unblind.json) · [实发词和服务端改写并排](prompt-audit.csv) · [两组逐张原图索引](gallery.md) · [量测与判定预案](freeze.md)',
'## S 组 · 同一 E 盘点线图，一次改一项',
'| 条件 | 目标 | 命中 / 3 | 预设判定 | 非目标明确异档 / 不可判（字段次数） |','|---|---|---:|---|---:|']
for s in score['S']:
    lbl=s['condition']
    md.append(f"| {lbl} | {cn[lbl]} | {s['correct']}/3 | {'通过' if s['pass_gate'] else '未过'} | {s['offtarget_known']} / {s['offtarget_unknown']} |")
md+=['S0 同时核四项，后一列列出四个基准项的偏离或不可判。S1–S5 各有三个保持项，每格三图共九项。对前伸云台、顶盖等目标的正确判读不能抵消其他参数漂移。',
'![S 组](S-comparison.jpg)','## G 组 · 同一基准文字，分别改变线宽和占位框长度',
'| 输入档 | 读取量 | 有效 n / 3 | 均值 | 样本标准差 | 残留 / 残留不可判 |','|---|---|---:|---:|---:|---:|']
fmt=lambda x:'—' if x is None else f'{x:.4f}'
for g in score['G']:
    md.append(f"| {g['condition']} | {'四臂均宽 / 对角毂距' if g['metric']=='width_D' else '机身投影长 / 宽'} | {g['n']}/3 | {fmt(g['mean'])} | {fmt(g['sd'])} | {g['residue_yes']} / {g['residue_U']} |")
for k,axis in score['axes'].items():
    evidence='，'.join(f"相邻差 {fmt(q['diff'])} 对档内 SD {fmt(q['max_sd'])}" for q in axis['pairs'])
    md.append(f"**{'机臂宽度' if k=='w' else '机身长宽比'}{'通过' if axis['pass_gate'] else '未过'}**。{evidence}。{'九图量测完整' if axis['complete'] else '存在量测缺失'}，{'九图均无可见标记残留' if axis['no_marks'] else '有标记残留或不可判'}。")
md+=['![G 组](G-comparison.jpg)','## 解释边界',
'各档三张、一个后端。结构和量测由一名独立 AI 读取，产品感与护圈由另一名盲态 AI 专项复核；各字段均无真人复测。形体读数是图上像素估计，隐藏的相机装配无法由俯视图确认。几何层只用于诊断，不据此确定正式方案外壳。相同原始提示词可能被服务端不同地改写；这轮不能把失败单独归因于原句、改写器或生成器。',
f"封存读数 SHA-256 `{lock['readings_sha256']}`。[入场请求](manifest.json)、[服务端回执与原件](actual)、[软件核验](verification.json)、[逐档统计](results.json)。服务端回执用量合计 {verification['provider_usage']['total_tokens']:,} tokens。实际计费金额未知，未收到可用的 HTTP request ID。正式与真人分母均未增加。"]
guard_no=sum(r['guard']=='no' for r in rows)
guard_yes=sum(r['guard']=='yes' for r in rows)
md.insert(4,f'**产品感与护圈已盲态补读。** 首位读者导出时把这两列写成常量，已确认作废。另一独立 AI 会话对重新编号的 36 张逐图记录两项及依据，封存后并入最终表。以上产品感与通用三项均取该复核；护圈有 {guard_yes} 张，无 {guard_no} 张。保留[首读方法](reader-method)、[补读原因](audit-two.md)、[逐图证据](audit-readings.jsonl)、[第二把揭盲键](audit-key.json)、[补读封存](audit-lock.json)。')
md.extend(['[需要 Claude 裁定的档位与修改建议](review.md) · [可见性与模型改写的解释边界](reading-limitations.md)'])
(root/'README.md').write_text('\n\n'.join(md).replace('|\n\n|','|\n|')+'\n',encoding='utf8')
gallery=['# 两组原图、参考图和逐图记录','同一行的三张为同档全部重复，每个编号链接到原始 PNG。','| 条件与参考图 | 重复 1 | 重复 2 | 重复 3 |','|---|---|---|---|']
plan=read('manifest.json')['rows']
for label in list(cn)+[r['condition'] for r in score['G']]:
    ref=next(s['input_source'] for s in plan if s['condition']==label)
    cells=[f'[{label} 输入]({ref})']+[f'[![{label}-{i}](actual/{label}-{i}/original.png)](actual/{label}-{i}/original.png)' for i in (1,2,3)]
    gallery.append('| '+' | '.join(cells)+' |')
(root/'gallery.md').write_text('\n'.join(gallery)+'\n',encoding='utf8')
