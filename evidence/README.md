# 可复算证据与保留边界

当前共享表为[六旋四图的8条历史AI技术标注](hexa4-ai.csv)。每行是一位AI标注对**同一图**的可见中央组件测量；每个任务/条件只有一张输出，非8次独立抽样。图像SHA可供本地核原件；不含参与者答卷或云实例标识。由原协议、历史请求和恢复检查交叉对账。

每一条件：IoU＝两条中央组件 `target_iou` 算术平均；高宽比误差＝各标注 `abs(visible_assembly_ratio-input_ratio)` 的平均值，**不是**先平均比例再取绝对差。只在相同任务内以 full 减 structure。标准库复算命令：`python evidence/summarize_hexa.py`。差异和不可归因为参数/拓扑的原因见[第5章段落](../manuscript/ch05-hexa-results.md)。

| 核查对象 | 保留标识／出处 | 能说什么 |
|---|---|---|
| 开题原PDF | SHA256 `ec94a83e669615fe028f9e1fa77f25f12a89473b699ed85d6310b8c663695171`，PDF第6–7页 | 五项开题承诺，不等于全部完成 |
| S1协议／原件ZIP | `d9ab939241c5310b2ef3fe0251b76ae1d51e84443d77bc8f64ec350f6ca4b53f`／`67a03cf39c7732bbbf9ee22a55afd10f01fb67abf457230d738d8f65537c4604` | 6次路线诊断，不是正式方法优效 |
| 六旋原协议／技术记录 | `120dedb33efd5f7a320da8d4ec1991abfcc223b8d097cb3c5810fb355818af62`／`909d8bfa1c952ba0f431e3088533c35ba131d2c5f39b91f6947dbec64d1a9b7f` | 可核4原件和逐标注记录；不可直接说明风格稳定 |
| 官方构型和载荷语境 | [IF1200A 六臂方位](https://docs.inspiredflight.com/inspired-documentation/products/aircraft/if1200/about-the-if1200/overview)、[相机/云台组合](https://docs.inspiredflight.com/inspired-documentation/products/payloads)、[Acecore Noa](https://acecoretechnologies.com/noa/) | 支持设计“载荷与机体怎样连接”的任务背景；不是新增访谈、性能验证或外形参数真值 |

更多原件、缓存、费用和受限来源只按授权由本地证据保管端核对；用具体工单请求最小必要材料，不把整个设备目录镜像到 GitHub。
