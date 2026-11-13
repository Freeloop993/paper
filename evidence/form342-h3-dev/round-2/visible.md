从1024原像素逐图读取。顶端是指定机头，数组顺序左上、右上、右下、左下，各自读。findings.jsonl 每行 id（无扩展名）和下列字段。不可确认留 null 或 U；严禁用默认常量回填。
hubs：4 个 [x,y] 原图毂心。widths：4 个自由臂段中点（从壳侧出口到毂心的半程）处实体宽度 px，沿垂直于臂的方向，避开影子、桨和制图标记；不可量填 null。记录 width_note；可使用像素剖面、网格、边缘辅助，须看各图实际实体边。blades：逐轴真实可追踪叶数或 null；blade_note。guard：yes/no/U，guard_note 逐图写外围是否有实体环。residue：yes/no/U，residue_note 写是否留有独立点、沿臂线、跨壳叉、字等输入制图标记。产品表面深灰结构非残留；不能确认记 U，浅点同样观察。quality：product/middle/diagram，quality_note 记录立体结构、部件连接、表面材质的可见证据。实体可读即可为 product，勿因配色或个人审美加分。
请逐图填写，若某列全相同仍留下逐图独立理由，并在回执中标明须作者人工确认。
