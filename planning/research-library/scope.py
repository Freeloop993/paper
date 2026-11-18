"""Detect explicit conflicts in the public semantic lookup; ambiguous free text stays with the designer."""

import re

LAYOUTS = {
    "三旋": "tri",
    "四旋": "quad",
    "平面六旋": "flat_hex",
    "平面八旋": "flat_octo",
    "共轴六旋": "coax_hex",
    "共轴八旋": "coax_octo",
    "coax_y6": "coax_hex",
    "coax_x8": "coax_octo",
}
TOPIC_TERMS = {
    "compactness": r"紧凑|小巧|便携|收纳|compact|portable",
    "general_size": r"大小|尺寸|体量|小巧|大不大|size",
    "bag_fit": r"背包|书包|小包|放[进入].*包|装.*包|收纳|backpack|bag|pack",
    "pocket_fit": r"口袋|兜|pocket",
    "accessory_outline": r"配件|轮廓|附件|outline|accessor",
    "simplicity": r"简洁|简约|简单|复杂|繁琐|simplic",
    "accessory_integration": r"配件|附件|整合|一体|integrat",
    "protection_impression": r"保护|防护|安全感|protect",
    "blade_guard": r"护桨|桨叶|保护罩|桨罩|guard",
    "guard_thickness": r"护罩|保护圈|保护罩|桨罩|厚|thick",
    "gimbal_cover": r"云台|镜头盖|gimbal",
    "accent_color": r"点缀|强调色|装饰色|配色|accent",
    "assembly_mark": r"标记|标识|装配|安装|mark",
    "color_recognition": r"颜色|识别|辨认|可见|醒目|color",
    "color_preference": r"颜色|配色|色彩|喜欢|偏好|color",
    "wrap": r"贴膜|贴纸|机身贴|贴皮|wrap",
    "color_material": r"色|材质|材料|质感|material|colour|color",
}


def layouts_for(item):
    if item.id == "D-P-TASK":
        return ("quad", "flat_hex")
    if item.id == "D-P-BLIND":
        return ("quad", "flat_hex", "tri", "flat_octo", "coax_hex", "coax_octo")
    if item.id == "D-C-Y6":
        return ("coax_hex", "flat_hex")
    return tuple(
        LAYOUTS.get(value, value) for value in item.layout.split("、") if value
    )


def semantic_conflict(question, task, layout, topic, state):
    if task == "consumer_camera" and re.search(
        r"农业|植保|药箱|喷洒|农田|agricultur", question, re.I
    ):
        return "问题提到农业使用情境，与选定的消费航拍任务不一致。请确认实际任务。"
    if layout in ("quad", "general") and re.search(
        r"三旋|六旋|八旋|十旋|共轴|六轴|八轴|hexacopter|octocopter|coaxial",
        question,
        re.I,
    ):
        return "问题提到其他构型，请确认目标构型并查询相应构型的来源。"
    if (
        state == "folded"
        and re.search(r"展开|顶视|unfolded", question, re.I)
        or state == "unfolded_top"
        and re.search(
            r"折叠|收纳|folded(?![a-z])", question.replace("unfolded", ""), re.I
        )
    ):
        return "问题中的观察状态与已选状态不同。请确认是在谈折叠收纳还是展开外观。"
    if re.search(
        r"毫米|\bmm\b|应[该取设]*多少|壁厚|机身宽度|精确尺寸|省时百分比|提升百分比",
        question,
        re.I,
    ):
        return "该问题涉及量测或定量效果，需相应工程资料或对照试验；用户短引不能给出该数值。"
    if topic == "bag_fit" and re.search(
        r"噪声|续航|抗风|转速|色彩|配色|噪音|评分", question
    ):
        return "问题的关注点与所选的收纳话题不同，请确认要查的设计问题。"
    if topic in TOPIC_TERMS and not re.search(TOPIC_TERMS[topic], question, re.I):
        return "当前问题未明确提及所选的话题，请补充设计对象和想查的现象。"
    return ""
