"""Build the collaborator's summary after complete recovery; no assumed runs."""
import hashlib,json,statistics
from pathlib import Path
from zipfile import ZipFile
base=Path(__file__).resolve().parent
def read(n):return json.loads((base/n).read_bytes())
a=read('hexa-accounting.json');v=read('hexa-verified.json');pairs=read('paired-check.json');primary=read('hexa-primary-axes.json')
assert a['corrected_batch_completed']=={'6':3,'7':12,'14':24}
assert a['corrected_images']==v['count']==39 and len(pairs['pairs'])==15
allids={r['id']:r for r in v['records']}
for r in primary['records']:
    assert r['png_sha256']==allids[r['id']]['png_sha256']
med=list(primary['target_groups_median_descriptive'].values());ordered=primary['strictly_ordered_paired_seeds']
text=f"""# 277 更正后六旋实验：实际回收与初读

沿用同一台 277。39 份请求、39 个不同 prompt ID、39 张 1024×1024 原图与执行历史已逐项核对；执行节点和图内请求吻合，采样节点未命中缓存。正式的独立设计判读尚未完成。[逐张核验](hexa-verified.json) · [完整原始记录 ZIP](hexa-originals.zip) · [39 张总览](hexa-overview.jpg)

|用途|实际样本|可回答的问题|
|---|---:|---|
|第 5.5 节植保首案|3|同一设计任务下，药箱、加注口、机架与喷杆从顶视能辨认多少。|
|六旋布局主比较|12（3 档 × 4 个共享种子）|相同种子三档的输出轴心比例是否按预期变化。|
|另列的扩展重复|24（3 档 × 8 个其他共享种子）|检验上述趋势能否在额外种子重现；不事后扩大主比较分母。|

更正和历史记录：15 张原六旋请求已执行，因误用了四旋机鼻/镜头负向词单列；24 份尚未执行的旧请求撤出。更正后 39 份保持各自原定正向词、输入图、种子及采样设置，只有负向词和输出标识变化。之前执行的 15 对 RGB 均不相同。这是实际重出的检查，不是设计优劣的指标。[旧 15 张原件及回执](pairs-originals.zip) · [逐对对应](paired-check.json) · [三张首案新旧并排](paired-drafts.jpg)

**原图可见结果与限制（知条件 AI 初读）**

- 三张新首案都能指出中央白色箱顶和圆形加注口。横向构件与两侧机臂重叠，不同图中能看到的杆端、支撑并不相同；不能把一个横杆自动认作喷杆，也不能从顶视测出药箱的嵌入深度。未验证真实喷洒性能。[首案全图及箱体局部](hexa-drafts.jpg)
- 六旋输入点线图的三档经像素复核分别约 0.70、1.00、1.30。q 定义为“六轴心横向跨度 / 纵向跨度”，再除以六旋正六边形基准 2/√3，尺寸不含叶尖。[输入图坐标](six-guide-geometry.json)
- 主比较 12 张逐图读取可见轴端，与输入分开：三档 q 中位数分别约 {med[0]:.2f}、{med[1]:.2f}、{med[2]:.2f}；{ordered}/4 组种子严格递增。第 4 个种子不是严格递增；其宽档右后方桨毂与圆柱机座有可见偏移，保留并注明。中位数走势不能支持“逐张准确命中”或物理几何准确。数值为知条件 AI 影像初读，非正式盲读，扩展组未并入。[所有点位与原图摘要](hexa-primary-axes.json) · [12 张带位置标注](hexa-primary-axes.jpg)
- 至少两张主比较违反双叶要求：0.70-r02 的左中轴可见单叶，1.30-r03 的左右中轴可见三叶。两张继续计入原分母；轴心可见时可以测布局，两叶规格要另记。[全图与同部位放大](hexa-blade-exceptions.jpg)

下一步由独立读者复测布局和桨叶，不把轴心可测等同于案例可用于第四章。首案的药箱/机架、喷杆/支撑、铰接件分别判“可见、部分可见、不可判”。由作者决定是否对其中一个部位做局部修订，原图永久保留。

相关但独立的四旋材料：[B2 修订 12 图双 AI 盲读与揭盲](blind-b2/README.md)。双参考三张均出现机尾错位，没有进入正式生成，不与本页的六旋分母合并。
"""
(base/'hexa-handoff.md').write_text(text,encoding='utf8')
