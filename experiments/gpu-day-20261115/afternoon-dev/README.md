# 11 月 15 日下午开发批：E6 喷杆两种改法与 4.4 碳纤维臂（出图前登记）

**授权。** 作者 2026-11-15 在 #3 回复“可以，登记后跑”（[记录](https://github.com/Freeloop993/paper/issues/3#issuecomment-6888765550)）。共 9 张开发图，排在现有队列之后，由 Codex 的调度器执行。开发图不作候选，也不进入任何正式分母。

**编译与检查。** 请求由 [build.py](build.py) 编译，清单见 [manifest.json](manifest.json)。`python3 -B experiments/preflight.py experiments/gpu-day-20261115/afternoon-dev/requests --inputs experiments/gpu-day-20261115/afternoon-dev/inputs --allow-shared-seeds E6B-R,E6B-N` 已通过，第 1—6 项全部检查。

## 一、E6 喷杆的两种改法（各 3 张）

**为什么改。** 首案规格让喷杆横穿机身、伸出两侧，而这个六轴布局的中间一对机臂也是横向的，顶视时两者重合，喷杆无法辨认（5.5.2 节）。作者的原则是“应该都有”，所以两种改法都跑，结果都交给读图，不按喜好二选一。

**怎么改。** 取 HEXA3 首案的实际请求，只替换喷杆这一句。点线图（hexa-points-1.00）、种子（2026112301—03）、负向词、采样设置全部不变，与 HEXA3-draft-r1—r3 一一同种子配对。

| 请求号 | 改法 | 替换后的喷杆句 |
|---|---|---|
| E6B-R-dev-r1—r3 | R：喷杆移到机尾 | A straight transverse spray boom with four small nozzles is mounted at the rear of the frame, behind the tank and between the two rear arms; it is clearly offset toward the tail from the two lateral arms, never overlapping them, and its ends stop short of the rear propellers. |
| E6B-N-dev-r1—r3 | N：取消喷杆，改为电机下方喷头 | There is no spray boom. Instead, one small round spray nozzle is mounted directly below each of the six motors, its dark nozzle tip just visible beside the motor from above. |

**判据（事先写定，逐张判）。**
- **通用项**：六臂六电机；每个电机为双叶桨；药箱顶与加注口可见；折叠铰接可见。
- **目标项**：
  - R：后半部能认出一根横向喷杆，并与横向中臂分开，按“可辨／部分可辨／不可辨”记。
  - N：电机下方的喷头可辨，且没有横向喷杆，按“可辨／不可辨”记。
- **开发门**：目标项“可辨”至少 2/3，且药箱与加注口保持至少 2/3，才说明这句写法可用。
- **预期**：N 的喷头在顶视下多被桨叶和电机遮住，按冻结口径会记“不可判”，这本身就是结果。
- 两种改法无论过不过开发门，都交给设计者。正式修订另行登记。

## 二、4.4 碳纤维臂，材质档 M（3 张）

**为什么做。** 作者第三轮说碳纤维“可能过早”，在深化阶段可以引入。纹理无法靠换色得到，只能用生成编辑。

**怎么做。** 以[低调配色稿](../../e3-deepening/cmf-recolour/B2-L-lowkey.png)（SHA-256 `46936781f061ecb014a2d9442ae15e5c5c3be47b189ca708b1de20cf5de32ef4`，已登记进白名单）为底图，指令只改机臂材质，种子用 2026112401—03（此前未用过）。这张底图的相机在画面下端，所以负向词不带任何“tail”类词，由 preflight 第 6 项检查。

**判据（事先写定，逐张判）。**
1. 机臂能读成碳纤维：可见编织纹理，或明显的深色复合材料质感。
2. 非目标保持：相机仍在画面下端；机身轮廓与分型线、机臂形状与臂根、电机、桨叶都不变。
3. 机身仍为浅灰。

三项都成立的图至少 2/3，才算通过。通过后另行登记正式批，把 M 分别加到低调、醒目两种配色上；不通过，则碳纤维只在 4.4.2 中作文字说明，不出图。

## 三、读图

先由 Codex 做知条件初读，我按原图复核，两者都标“知条件”。开发门按此判定。之后与其他批次一起做隔离盲读，结果仍分开报告。
