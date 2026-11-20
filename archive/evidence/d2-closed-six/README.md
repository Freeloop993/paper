# 六张闭源生成图的输入与输出

按图号查看当次提交的完整英文提示词、参考 PNG 和返回的原始 PNG。点击缩略图可打开对应文件。03 和 04 共用同一张父图，04 的两张参考图按实际传入顺序排列。05 和 06 只输入文字。

| 图号与提示词 | 参考图（输入顺序） | 实际生成图 |
|---|---|---|
| **01 · 轴心布局偏窄（W/L 0.70）**<br>[完整提示词](prompts/01-D2-KD-s0.7-e0.5-wl0.70.txt)<br><code>D2-KD-s0.7-e0.5-wl0.70</code> | <a href="references/depth-wl0.70.png"><img src="references/depth-wl0.70.png" alt="窄布局灰度图" width="105"></a><br>1. 窄布局灰度图 | <a href="outputs/01-D2-KD-s0.7-e0.5-wl0.70.png"><img src="outputs/01-D2-KD-s0.7-e0.5-wl0.70.png" alt="轴心布局偏窄（W/L 0.70）" width="185"></a> |
| **02 · 轴心布局偏宽（W/L 1.30）**<br>[完整提示词](prompts/02-D2-KD-s0.7-e0.5-wl1.30.txt)<br><code>D2-KD-s0.7-e0.5-wl1.30</code> | <a href="references/depth-wl1.30.png"><img src="references/depth-wl1.30.png" alt="宽布局灰度图" width="105"></a><br>1. 宽布局灰度图 | <a href="outputs/02-D2-KD-s0.7-e0.5-wl1.30.png"><img src="outputs/02-D2-KD-s0.7-e0.5-wl1.30.png" alt="轴心布局偏宽（W/L 1.30）" width="185"></a> |
| **03 · 从父图重绘（G2）**<br>[完整提示词](prompts/03-D2-G2-wl1.30-r1.txt)<br><code>D2-G2-wl1.30-r1</code> | <a href="references/E1-control-wl1.30-r1.png"><img src="references/E1-control-wl1.30-r1.png" alt="E1 父图" width="105"></a><br>1. E1 父图 | <a href="outputs/03-D2-G2-wl1.30-r1.png"><img src="outputs/03-D2-G2-wl1.30-r1.png" alt="从父图重绘（G2）" width="185"></a> |
| **04 · 父图加桨臂定位图（G3）**<br>[完整提示词](prompts/04-D2-G3-e0.3-wl1.30.txt)<br><code>D2-G3-e0.3-wl1.30</code> | <a href="references/E1-control-wl1.30-r1.png"><img src="references/E1-control-wl1.30-r1.png" alt="E1 父图" width="105"></a><br>1. E1 父图<br><a href="references/wl-1.30-dd-0.50.png"><img src="references/wl-1.30-dd-0.50.png" alt="桨臂定位图" width="105"></a><br>2. 桨臂定位图 | <a href="outputs/04-D2-G3-e0.3-wl1.30.png"><img src="outputs/04-D2-G3-e0.3-wl1.30.png" alt="父图加桨臂定位图（G3）" width="185"></a> |
| **05 · 连续卵石形机身（P6）**<br>[完整提示词](prompts/05-D2-P6-s1.txt)<br><code>D2-P6-s1</code> | 纯文字 | <a href="outputs/05-D2-P6-s1.png"><img src="outputs/05-D2-P6-s1.png" alt="连续卵石形机身（P6）" width="185"></a> |
| **06 · 切面机身与外接支架（P7）**<br>[完整提示词](prompts/06-D2-P7-s1.txt)<br><code>D2-P7-s1</code> | 纯文字 | <a href="outputs/06-D2-P7-s1.png"><img src="outputs/06-D2-P7-s1.png" alt="切面机身与外接支架（P7）" width="185"></a> |

[可复核的逐图记录](manifest.json)包含参考图顺序、原始尺寸、提示词全文和各文件 SHA-256。文本末尾的 `Avoid:` 段随正文一起发送。

六张图由 Codex 内置图像工具生成，作者指定 GPT Image 2.6，接口没有返回可核验的具体版本。图号沿用对应的 [Qwen 开源试验设计](../../experiments/d2-tuning/addendum.py)，其中的种子、ControlNet 强度和作用区间只描述开源设置。六张图用于讨论造型、相机位置和提示词，单独记录为开发样本。
