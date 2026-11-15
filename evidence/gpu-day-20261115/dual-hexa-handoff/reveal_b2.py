import hashlib,json
from pathlib import Path
from collections import Counter
base=Path(__file__).resolve().parent;work=base/'blind-b2'
sh=lambda b:hashlib.sha256(b).hexdigest()
keybytes=(work/'key.json').read_bytes()
assert sh(keybytes)=='1654618875ba42413b5351fa184b77a1edd2bf80314d851d93d2b42431193888'
key=json.loads(keybytes)
fields=['nose_top_projects','no_visible_optics','non_target_retained','protrusion']
reads={}
for c in ('X','Y'):
    f=work/('packet-'+c)/'reading.json';raw=f.read_bytes()
    result=json.loads(raw)
    assert len(result)==len({r['id'] for r in result})==12 and {r['id'] for r in result}==set(key[c])
    for r in result:
        assert all(r[k] in ('yes','no','uncertain') for k in fields[:3])
        assert r['protrusion'] in ('upper','lower','both','none','uncertain') and r['evidence'].strip()
        orig=key[c][r['id']]['original'];reads.setdefault(orig,{})[c]=r
assert len(reads)==12
agree={k:sum(p['X'][k]==p['Y'][k] for p in reads.values()) for k in fields}
def batch(r):
    if r.startswith('REV1-edit-'):return 'revision1_parent'
    if r.startswith('REV1-regen-'):return 'revision1_from_layout'
    if r.startswith('REV2v2-'):return 'revision2_text_development'
    if r.startswith('REV2B-'):return 'revision2_dual_development'
    raise ValueError(r)
groups={}
for group in sorted({batch(x) for x in reads}):
    subset={k:p for k,p in reads.items() if batch(k)==group};assert len(subset)==3
    groups[group]={c:{k:dict(Counter(p[c][k] for p in subset.values())) for k in fields} for c in ('X','Y')}
obj={'method':'Two isolated AI reading sessions, no inherited conversation; images losslessly stripped of metadata, different order in each packet. Same neutral reference and top-edge-as-nose convention, no condition, prompts or initial conclusions. Not human readers and not independent model families. No measurement of optical axes, physical integration or performance.',
     'mapping_sha256_before_reading':sh(keybytes),
     'reader_response_sha256':{c:sh((work/('packet-'+c)/'reading.json').read_bytes()) for c in ('X','Y')},
     'agreement_out_of_12_images_per_field':agree,'groups_do_not_pool':groups,'records':reads}
(work/'reveal.json').write_text(json.dumps(obj,indent=2,ensure_ascii=False),encoding='utf8')
report="""# B2：两次隔离的 AI 读图及揭盲

共 12 张：修订一父图编辑 3、同档位从布局重出 3、修订二单参考开发 3、双参考开发 3。两位读者各自比较相同的原 B2；匿名图保留相同的 RGB 像素、移除了原名和内嵌请求，每包排列不同。评判只用“画面上方为机头”和参照图，读者不知道批次、提示词、对方读数或此前知条件结论。都实际查看了四页整图和上／下缘局部，另各自调阅部分匿名原图。两个会话属于同一 AI 系统，不能替代独立真人或物理相机朝向测量。

|揭盲后的三张一组|两次读图共同观察|
|---|---|
|修订一：由 B2 编辑|3/3 上缘有外伸组件，也都能辨出镜窗；三张其余部位均判保留。|
|修订一：从布局重新生成|2/3 上缘有明确外伸舱；第 3 张为上下均有突起、上缘舱顶不确定。三张的深色部位是否为镜窗均不确定，机身分区或轮廓均有改变。|
|修订二：单参考开发|3/3 上缘外伸，但三张均可辨镜窗；两位都在第 3 张读到尾缘内收、两侧突出。|
|修订二：双参考开发|3/3 新舱在下方机尾，机鼻没有相应外伸舱顶，镜窗可辨；三张都改变了非目标尾部。按三项同时成立的开发门为 0/3。没有启用正式三张。|

逐图原话和分歧见 [揭盲明细](reveal.json)；[读者 X](packet-X/reading.json) 和 [读者 Y](packet-Y/reading.json) 均保留原文件。四项分类在此次 12 张图上各自为 12/12 相同。这是本次匿名读图的一致情况，不能外推为评分器可靠性或所有局部修改能力。修订一和修订二文字版的失败主要是露窗，双参考开发另有首尾错位；不可把所有失败写成同一种原因，也不可写成“所有非目标部位都保持”。原 B2 保留为作者已选父图，不将失败开发图替代原稿；进入 4.4 的锁稿决定仍由作者作出。
"""
assert all(n==12 for n in agree.values())
(work/'README.md').write_text(report,encoding='utf8')
print(agree)
