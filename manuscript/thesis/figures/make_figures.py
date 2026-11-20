"""生成论文中由文字构成的示意图与条件图拼版。

用法（在仓库根目录）：python3 manuscript/thesis/figures/make_figures.py
依赖：Pillow；中文字体默认取 macOS 的 STHeiti，可用环境变量 THESIS_CJK_FONT 指定其他字体文件。
输出：本目录下 fig1-1.png、fig3-1.png、fig3-3.png。
"""
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CJK = os.environ.get("THESIS_CJK_FONT", "/System/Library/Fonts/STHeiti Light.ttc")
LATIN = "/System/Library/Fonts/Times.ttc"
INK, LINE, FILL, FILL2 = (20, 20, 20), (60, 60, 60), (232, 238, 245), (247, 247, 247)


def font(size, path=CJK):
    return ImageFont.truetype(path, size)


def text_block(draw, box, lines, f, fill=INK, spacing=10):
    x0, y0, x1, y1 = box
    heights = [draw.textbbox((0, 0), ln, font=f)[3] for ln in lines]
    total = sum(heights) + spacing * (len(lines) - 1)
    y = (y0 + y1 - total) / 2
    for ln, h in zip(lines, heights):
        w = draw.textlength(ln, font=f)
        draw.text(((x0 + x1 - w) / 2, y), ln, font=f, fill=fill)
        y += h + spacing


def rect(draw, box, lines, f, fill=(255, 255, 255), width=3, radius=10):
    draw.rounded_rectangle(box, radius=radius, outline=LINE, width=width, fill=fill)
    text_block(draw, box, lines, f)


def arrow(draw, p0, p1, width=4, head=16):
    draw.line([p0, p1], fill=LINE, width=width)
    (x0, y0), (x1, y1) = p0, p1
    if x0 == x1:  # 竖直
        s = 1 if y1 > y0 else -1
        draw.polygon([(x1, y1), (x1 - head / 2, y1 - s * head), (x1 + head / 2, y1 - s * head)], fill=LINE)
    else:  # 水平
        s = 1 if x1 > x0 else -1
        draw.polygon([(x1, y1), (x1 - s * head, y1 - head / 2), (x1 - s * head, y1 + head / 2)], fill=LINE)


def fig_route():
    """图1.1 技术路线：左列阶段，中列内容与方法，右列章节与研究问题。"""
    rows = [
        ("问题提出", ["研究背景与问题提出；相关研究梳理", "提出 RQ1—RQ4：表示、控制、协同、迁移"], ["第一章", "第二章"]),
        ("方法构建", ["评论证据卡 → 双极词对 → 造型规格卡", "构型参数→条件图；造型参数→逐档短语", "协同生成与修订机制；三类评价维度"], ["第三章", "RQ1"]),
        ("条件选择", ["只给轴心的诊断；后端对照（E0）", "布局响应（E1）；造型字典开发彩排", "开源后端造型小测"], ["4.1.3", "5.2"]),
        ("方法应用", ["日常随行航拍四旋翼（E3）", "三方向初稿 → 筛选父图 → 改档修订 ≤2 次", "→ 锁稿 → 配色与表达深化"], ["第四章", "RQ1、RQ3"]),
        ("方法验证", ["造型响应批与父图修订（E2）", "自由/结构化方式配对（E4）；独立评议（E5）", "农业植保六旋翼迁移（E6）"], ["第五章", "RQ2—RQ4"]),
        ("结论", ["研究结论、方法贡献与设计启示", "研究不足与后续展望"], ["第六章"]),
    ]
    W, row_h, gap, top = 1500, 170, 46, 30
    H = top * 2 + len(rows) * row_h + (len(rows) - 1) * gap
    img = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(img)
    f_stage, f_body, f_side = font(38), font(31), font(31)
    xs = [(20, 250), (300, 1240), (1290, 1480)]
    for i, (stage, body, side) in enumerate(rows):
        y0 = top + i * (row_h + gap); y1 = y0 + row_h
        rect(d, (xs[0][0], y0, xs[0][1], y1), [stage], f_stage, fill=FILL)
        rect(d, (xs[1][0], y0, xs[1][1], y1), body, f_body)
        rect(d, (xs[2][0], y0, xs[2][1], y1), side, f_side, fill=FILL2)
        arrow(d, (xs[0][1], (y0 + y1) // 2), (xs[1][0], (y0 + y1) // 2), width=3, head=14)
        if i < len(rows) - 1:
            cx = (xs[1][0] + xs[1][1]) // 2
            arrow(d, (cx, y1), (cx, y1 + gap))
    img.save(HERE / "fig1-1.png")


def fig_framework():
    """图3.1 方法框架：上排五个环节，中排各环节产出，下排四类主体。"""
    stages = [("需求资料与", "产品样本分析"), ("设计意图转译与", "造型规格构建"), ("造型参数与", "条件图表达"), ("协同生成", "与反馈"), ("独立", "评价")]
    outs = [["评论证据卡", "四组双极词对", "构型边界"], ["规格卡：目标部位", "可变项、保持项", "自由项、依据"], ["条件图（构型）", "逐档短语（造型）", "编译与快照"], ["初稿 → 父图", "改档修订 ≤2 次", "停止、回退、锁稿"], ["参数响应", "意图符合度", "协同代价"]]
    secs = ["3.2", "3.3", "3.4", "3.5", "3.6"]
    W, H = 1600, 900
    img = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(img)
    f_h, f_b, f_s = font(32), font(28), font(26, LATIN)
    bw, gap, x0 = 270, 52, 25
    for i, (s, o, sec) in enumerate(zip(stages, outs, secs)):
        x = x0 + i * (bw + gap)
        rect(d, (x, 40, x + bw, 190), list(s), f_h, fill=FILL)
        d.text((x + bw / 2 - d.textlength(sec, font=f_s) / 2, 200), sec, font=f_s, fill=INK)
        rect(d, (x, 250, x + bw, 470), o, f_b)
        arrow(d, (x + bw // 2, 190 + 46), (x + bw // 2, 250), width=3, head=12)
        if i < len(stages) - 1:
            arrow(d, (x + bw, 115), (x + bw + gap, 115))
    # 修订回路：协同生成 → 造型参数
    xr = x0 + 3 * (bw + gap) + bw // 2; xl = x0 + 2 * (bw + gap) + bw // 2
    d.line([(xr, 470), (xr, 520), (xl, 520), (xl, 470)], fill=LINE, width=3)
    d.polygon([(xl, 470), (xl - 8, 486), (xl + 8, 486)], fill=LINE)
    lab = "修订 = 改变档位"; fl = font(26)
    d.text(((xl + xr) / 2 - d.textlength(lab, font=fl) / 2, 528), lab, font=fl, fill=INK)
    # 主体
    roles = [("设计者", "确认规格、选择档位、选父图、修订、停止与锁稿"), ("原型配置器", "绘制条件图、编译文字、保存规格快照与版本链"),
             ("生成模型", "按条件图、文字与父图返回候选"), ("独立读者与评议者", "不知条件地点选几何、判读档位、评价终稿")]
    d.rounded_rectangle((25, 600, W - 25, 880), radius=10, outline=LINE, width=3, fill=FILL2)
    fr, fd = font(30), font(28)
    for k, (r, desc) in enumerate(roles):
        y = 622 + k * 64
        d.text((60, y), r, font=fr, fill=INK)
        d.text((360, y + 2), desc, font=fd, fill=INK)
    img.save(HERE / "fig3-1.png")


def fig_guides():
    """图3.3 两种条件图：(a) 点线图（造型与设计任务）；(b) 双叶部件图（几何响应批）。"""
    a = Image.open(ROOT / "evidence/qwen-shape-s4-20261114/layout.png").convert("RGB")
    b = Image.open(ROOT / "prototypes/drone-configurator/public/research-guides/wl-1.00-dd-0.50.png").convert("RGB")
    s = 700; a = a.resize((s, s)); b = b.resize((s, s))
    W, H = 2 * s + 60, s + 90
    img = Image.new("RGB", (W, H), "white"); img.paste(a, (0, 0)); img.paste(b, (s + 60, 0))
    d = ImageDraw.Draw(img); f = font(40, LATIN)
    for x, t in [(s / 2, "(a)"), (s + 60 + s / 2, "(b)")]:
        d.text((x - d.textlength(t, font=f) / 2, s + 25), t, font=f, fill=INK)
    img.save(HERE / "fig3-3.png")


if __name__ == "__main__":
    fig_route(); fig_framework(); fig_guides()
    print("fig1-1.png fig3-1.png fig3-3.png")
