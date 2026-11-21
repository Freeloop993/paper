// 此表是本轮研究者给已有公开卡建立的检索标注，原始类别和限制随卡另存。
export const version = "study-semantics/1";
export const task = "consumer_camera";
export const layouts = ["general", "quad", "tri", "flat_hex", "flat_octo", "coax_hex", "coax_octo"];
export const states = ["unspecified", "carrying", "folded", "unfolded_top", "with_accessory"];

// 每行规定设计者已选的对象、话题和状态，以及可展示的原卡和需要同时交代的限制。
export const topics = {
  compactness: {
    label: "看起来紧凑或小巧", component: "airframe",
    byState: {
      unspecified: { status: "clarify", cards: ["E001"], reason: "原句未交代展开还是折叠。请选择展开外观、折叠收纳或仅讨论携带。", options: ["unfolded_top", "folded", "carrying"] },
      unfolded_top: { status: "abstain", cards: [], reason: "公开卡没有明确展开顶视条件的直接外观证据。可将紧凑保存为设计者自定意图。" },
      folded: { component: "whole_product", cards: ["E009"], cautions: ["E008"], reason: "E009 的短引明确整机折叠后装包。E008 另有型号语境冲突。" },
      carrying: { component: "whole_product", status: "clarify", cards: ["E001"], reason: "便携自述可以指包、口袋或轻便。请确认是收纳适配，还是泛指感受。", choiceField: "topic", options: ["bag_fit", "pocket_fit", "general_size"] }
    }
  },
  general_size: {
    label: "整机或机身大小感受", component: "airframe",
    byState: { unspecified: {cards: ["E001", "E002", "E010", "E019"], reason: "这些来源对大小的评价有不同方向，个别原句同时谈稳定、噪声或保护罩。"} }
  },
  bag_fit: {
    label: "包内收纳适配", component: "whole_product",
    byState: {
      carrying: {cards: ["E003", "E004", "E005"], reason: "同一来源区分小包和口袋；另一来源说先前的包偏紧。卡片未指明折叠状态。"},
      folded: {cards: ["E009"], cautions: ["E008"], reason: "E009 明确折叠后放入日用背包。具体包的尺寸未知。"}
    }
  },
  pocket_fit: {
    label: "口袋与小包的差别", component: "whole_product",
    byState: {carrying: {cards: ["E003", "E004"], reason: "同一来源同时给出小包可装和个人口袋可能装不下的陈述。"}}
  },
  accessory_outline: {
    label: "加装防护件后的整套外廓", component: "accessory",
    byState: {with_accessory: {cards: ["E007"], cautions: ["E006"], reason: "E007 明说保护罩，E006 评价加装后的外观但原厂配件未指名。"}}
  },
  simplicity: {
    label: "整机外观简洁", component: "airframe",
    byState: {unspecified: {cards: ["E011", "E012", "E013", "E014", "E015"], reason: "五处短引描述简洁，未测量可对应的曲率或部件数量。"}}
  },
  accessory_integration: {
    label: "让外挂件融入机身", component: "accessory",
    byState: {unspecified: {cards: ["E016"], reason: "作者希望内置未命名配件，工程可行性仍待另查。"}}
  },
  protection_impression: {
    label: "保护外形带来的感受", component: "guard",
    byState: {unspecified: {cards: ["E017", "E018"], cautions: ["E019"], reason: "新手与儿童语境的保护感受可以分别参考。E019 只说有保护罩，具体类型未知。"}}
  },
  blade_guard: {
    label: "桨叶防护的可见形式", component: "blade_guard",
    byState: {unspecified: {cards: ["E020", "E021", "E022", "E023"], reason: "原句提到叶片保护、全包桨保或保护笼；辨识度属作者评价。"}}
  },
  guard_thickness: {
    label: "桨保厚度与整机体量印象", component: "blade_guard",
    byState: {unspecified: {cards: ["E024", "E025"], reason: "两处短引对厚度和整机大小表达不同印象，可能共享讨论情境，未取得实测厚度。"}}
  },
  gimbal_cover: {
    label: "云台保护罩", component: "gimbal",
    byState: {unspecified: {cards: ["E026"], reason: "原句指受损后另购云台罩。"}}
  },
  accent_color: {
    label: "云台局部点色", component: "gimbal",
    byState: {unspecified: {cards: ["E027"], reason: "正向评价指云台处橙色。"}}
  },
  assembly_mark: {
    label: "装配识别色标", component: "assembly_mark",
    byState: {unspecified: {cards: ["E028"], reason: "负评指 AB 标记难以辨认，适用于装配标志。"}}
  },
  color_recognition: {
    label: "整机配色辨识与醒目感", component: "finish",
    byState: {unspecified: {cards: ["E029", "E030"], cautions: ["E034"], reason: "原话同时包括视觉辨识和审美取舍。E034 是对默认配色的愿望。"}}
  },
  color_preference: {
    label: "配色偏好", component: "finish",
    byState: {unspecified: {cards: ["E030", "E031", "E034"], reason: "亮橙、灰色与高饱和色的选择各有上下文，逐来源展示。"}}
  },
  wrap: {
    label: "贴皮或贴膜", component: "finish",
    byState: {unspecified: {cards: ["E032", "E033", "E035"], reason: "前两条是反光贴膜愿望，后一条记录作者已装饰的特定机型。"}}
  },
  color_material: {
    label: "颜色与材料共同形成的质感", component: "finish",
    byState: {unspecified: {cards: ["E036"], reason: "原句描述材料和颜色共同带来的观感，未量测材料等级。"}}
  }
};

// CW-1.0 的操纵定义来自研究设计。索引不保存任何推荐值。
export const widthHypothesis = {
  id: "CW-1.0",
  origin: "research_protocol",
  // 2026-11-21：真实产品评议（S5 第一步）给出了相关性的支持；只差一个比例的配对评议还没做，所以仍是待检验的假设。
  status: "correlational_support_untested_cause",
  description: "在同一展开顶视图上只改壳体相对宽度，再让独立读者比较紧凑感。",
  evidence: "现有依据：32 款真实四旋翼产品、10 名评议者，机身宽与对角电机距之比越大，越被评为紧凑（等级相关 −0.59 和 −0.65，两位判读者各量一遍）。这是相关，不是检验。",
  evidenceSource: "experiments/s5-compactness-pilot/responses/README.md",
  source: "planning/advisor-20261118/semantic/README.md#2-一条评论怎样走到设计和实验"
};
