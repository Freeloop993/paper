#!/usr/bin/env python3
"""逐步核对同一次操作留下的四种记录：屏幕读数、导出坐标与 JSON、提示词全文、点线图 PNG。

只用 Python 标准库。运行：python3 crosscheck.py（在本目录）。
屏幕读数 screen.json 取自页面 DOM；其余三件是点击“导出三件”时由页面生成的原始字节。
"""
import hashlib, json, math, re, struct, sys, zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
EXPORTS = HERE / "exports"


def read_png(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos, idat, meta = 8, b"", None
    while pos < len(data):
        (length,), kind = struct.unpack(">I", data[pos:pos + 4]), data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        if kind == b"IHDR":
            meta = struct.unpack(">IIBBBBB", chunk)
        elif kind == b"IDAT":
            idat += chunk
        pos += 12 + length
    w, h, depth, ctype, _, _, interlace = meta
    assert depth == 8 and interlace == 0 and ctype in (2, 6), meta
    bpp = 4 if ctype == 6 else 3
    raw = zlib.decompress(idat)
    stride = w * bpp
    rows, prev = [], bytearray(stride)
    for y in range(h):
        f = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + ((a + b) >> 1)) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return w, h, bpp, rows


def red_blobs(path):
    """找出纯红像素的连通块，返回每块的质心和像素数。"""
    w, h, bpp, rows = read_png(path)
    red = set()
    for y, line in enumerate(rows):
        for x in range(w):
            r, g, b = line[x * bpp], line[x * bpp + 1], line[x * bpp + 2]
            if r > 200 and g < 60 and b < 60:
                red.add((x, y))
    blobs = []
    while red:
        stack, blob = [red.pop()], []
        while stack:
            x, y = stack.pop(); blob.append((x, y))
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n in red:
                    red.remove(n); stack.append(n)
        if len(blob) > 30:
            blobs.append((sum(p[0] for p in blob) / len(blob), sum(p[1] for p in blob) / len(blob), len(blob)))
    return w, h, sorted(blobs)


def num(text, pattern):
    m = re.search(pattern, text)
    return float(m.group(1)) if m else None


FORBIDDEN = {
    "护圈": re.compile(r"\b(guards?|guarded|cage|shroud|ducted|duct)\b", re.I),
    "颜色": re.compile(r"#[0-9a-f]{6}\b|\b(black|white|grey|gray|orange|blue|green|purple|pink|yellow|silver|golden?|charcoal)\b|colou?r", re.I),
    "碳纹": re.compile(r"carbon|weave", re.I),
}
GUIDE_LINE = "Match the motor centres and frame links in the attached layout image"

rows, details, prev = [], {}, None
for step_dir in sorted(p for p in EXPORTS.iterdir() if p.is_dir()):
    cfg_files = sorted(step_dir.glob("drone-config-*.json"))
    if not cfg_files:
        continue
    cfg_path = cfg_files[-1]
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    stamp = cfg_path.stem.replace("drone-config-", "")
    txt_path, png_path = step_dir / f"drone-prompt-{stamp}.txt", step_dir / f"drone-guide-{stamp}.png"
    txt = txt_path.read_text(encoding="utf-8")
    screen = json.loads((step_dir / "screen.json").read_text(encoding="utf-8"))
    lay, checks = cfg["layout"], []

    def check(name, ok, detail=""):
        checks.append({"项目": name, "结果": "通过" if ok else "不符", "说明": detail})

    # 1 屏幕轴心（SVG，毫米） 对 JSON 轴心
    s_hubs = {h["id"]: h for h in screen["hubs"]}
    dmm = max(math.hypot(s_hubs[h["id"]]["x_mm"] - h["x_mm"], s_hubs[h["id"]]["y_mm"] - h["y_mm"]) for h in lay["hubs"])
    check("屏幕轴心 = JSON 轴心（mm）", len(s_hubs) == len(lay["hubs"]) == 4 and dmm < 0.002, f"{len(s_hubs)} 个，最大差 {dmm:.4f} mm")
    # 2 JSON 的 mm 与 px 互算
    ppm = lay["guide"]["px_per_mm"]
    dpx = max(math.hypot(512 + h["x_mm"] * ppm - h["x_px"], 512 - h["y_mm"] * ppm - h["y_px"]) for h in lay["hubs"])
    check("JSON 内 mm 与 px 可互算", dpx < 0.02, f"px_per_mm {ppm}，最大差 {dpx:.4f} px")
    # 3 PNG 红点 对 JSON px
    w, h_, blobs = red_blobs(png_path)
    dblob = max(min(math.hypot(b[0] - h["x_px"], b[1] - h["y_px"]) for b in blobs) for h in lay["hubs"]) if blobs else 999
    check("PNG 红点 = JSON 轴心（px）", (w, h_) == (1024, 1024) and len(blobs) == 4 and dblob < 1.0, f"{w}×{h_}，红点 {len(blobs)} 个，最大差 {dblob:.3f} px")
    # 4 由坐标复算 W/L、D、夹角
    xs, ys = [h["x_mm"] for h in lay["hubs"]], [h["y_mm"] for h in lay["hubs"]]
    wl = (max(xs) - min(xs)) / (max(ys) - min(ys))
    hubs = lay["hubs"]
    diag = [math.dist((hubs[i]["x_mm"], hubs[i]["y_mm"]), (hubs[i + 2]["x_mm"], hubs[i + 2]["y_mm"])) for i in range(2)]
    bear = [(math.degrees(math.atan2(h["x_mm"], h["y_mm"])) + 360) % 360 for h in hubs]
    ang = [(bear[(i + 1) % 4] - bear[i] + 360) % 360 for i in range(4)]
    s_wl = num(screen["readouts"]["wl"], r"\|\s*([0-9.]+)\s*\|")
    p_wl = num(txt, r"W/L ([0-9.]+)")
    check("W/L：坐标复算 = JSON = 屏幕 = 提示词", abs(wl - lay["W_over_L"]) < 1e-3 and abs(s_wl - round(wl, 2)) < 0.006 and abs(p_wl - round(wl, 2)) < 0.006,
          f"复算 {wl:.4f}，JSON {lay['W_over_L']}，屏幕 {s_wl}，提示词 {p_wl}")
    p_d = num(txt, r"span ([0-9.]+) mm")
    check("D 均值：坐标复算 = JSON = 参数 = 提示词", abs(sum(diag) / 2 - lay["D_mean_mm"]) < 1e-2 and abs(lay["D_mean_mm"] - cfg["parameters"]["frame"]["wheelbase_mm"]) < 1e-6 and p_d == cfg["parameters"]["frame"]["wheelbase_mm"],
          f"复算 {sum(diag) / 2:.3f}，JSON {lay['D_mean_mm']}，提示词 {p_d}；最大两轴距 {lay['max_pair_distance_mm']}")
    p_ang = [float(a) for a in re.search(r"motor: ([0-9.°, ]+)\.", txt).group(1).replace("°", "").split(",")]
    s_ang = [float(a) for a in re.findall(r"(\d+)°", screen["readouts"]["angles"])]
    check("相邻夹角：坐标复算 = JSON = 屏幕 = 提示词", all(abs(a - b) < 0.02 for a, b in zip(ang, lay["adjacent_deg"])) and all(abs(a - b) <= 0.051 for a, b in zip(ang, p_ang)) and all(abs(round(a) - b) < 0.51 for a, b in zip(ang, s_ang)) and abs(sum(ang) - 360) < 1e-6,
          f"复算 {'·'.join(f'{a:.2f}' for a in ang)}，屏幕 {'·'.join(f'{a:.0f}' for a in s_ang)}，提示词 {'·'.join(str(a) for a in p_ang)}")
    # 5 臂宽：屏幕线宽 = JSON = 提示词
    arm = int(cfg["parameters"]["frame"]["arm_width_mm"].replace("mm", ""))
    p_arm = num(txt, r"Each arm is (\d+) mm wide")
    check("臂宽：屏幕机臂线宽 = JSON = 提示词", set(screen["arm_stroke_width_mm"]) == {arm} and p_arm == arm, f"屏幕 {screen['arm_stroke_width_mm'][0]} mm，JSON {arm} mm，提示词 {p_arm:.0f} mm")
    # 6 文本与摘要
    check("提示词文件 = JSON 内全文 = 屏幕逐句", txt == cfg["prompt"]["text"] and [s["text"][-1] for s in screen["sentences"] if s["changed"] != "removed"] == txt.split("\n"),
          f"{len(txt.splitlines())} 句")
    check("摘要一致", hashlib.sha256(txt.encode()).hexdigest() == cfg["prompt"]["text_sha256"] and hashlib.sha256(png_path.read_bytes()).hexdigest() == cfg["reference_image"]["png_sha256"],
          "提示词与 PNG 的 SHA-256 均与 JSON 记录相同")
    # 7 未选项是否被加入：对全文独立检索
    hits = []
    for label, pat in FORBIDDEN.items():
        for line in txt.split("\n"):
            if line.startswith(GUIDE_LINE) or line == "No propeller guards." or line.startswith("Designer's note:"):
                continue
            if pat.search(line):
                hits.append(f"{label}: {line[:50]}")
    p = cfg["parameters"]
    nothing = p["propulsion"]["prop_guard"] == "none" and not p["accessories"]["drone_primary_color"] and not p["frame"]["material_visual"]
    check("未选的护圈、颜色、碳纹没有出现在全文", (not hits) if nothing else True, "全文未检出" if not hits else "；".join(hits))
    check("界面自检与导出自检一致", [a["status"] for a in cfg["prompt"]["template_audit"]] == [a["status"] for a in screen["audit"]], " ".join(f"{a['label']}:{a['status']}" for a in cfg["prompt"]["template_audit"]))
    # 8 意图与证据卡
    cards = [c["id"] for c in cfg["intent"]["adopted_cards"]]
    check("证据卡与目标：屏幕 = JSON", all(c in screen["adopted_summary"] for c in cards) and (bool(cards) or "未采纳" in screen["adopted_summary"]),
          f"来源：{cfg['intent']['origin']}；卡 {cards or '无'}；目标 {[t['pole'] for t in cfg['intent']['targets']] or '无'}；记录 {[(e['action'], e.get('card') or e.get('value')) for e in cfg['intent']['log']]}")
    # 9 与上一步相比
    change = "—"
    if prev:
        a, b = prev["txt"].split("\n"), txt.split("\n")
        changed = [f"第 {i + 1} 句" for i, (x, y) in enumerate(zip(a, b)) if x != y] if len(a) == len(b) else [f"句数 {len(a)}→{len(b)}"]
        pdiff = [k for k in ("frame", "propulsion", "fuselage", "landing_gear", "accessories") if prev["cfg"]["parameters"][k] != p[k]]
        moved = prev["cfg"]["layout"]["hubs"] != lay["hubs"]
        change = f"提示词变化：{'、'.join(changed) or '无'}；参数组变化：{'、'.join(pdiff) or '无'}；轴心坐标{'变化' if moved else '未变'}"
    details[step_dir.name] = {"files": [cfg_path.name, txt_path.name, png_path.name], "checks": checks, "vs_previous": change,
                              "hubs_mm": [(h["id"], h["role_zh"], h["x_mm"], h["y_mm"]) for h in hubs], "hubs_px": [(h["id"], h["x_px"], h["y_px"]) for h in hubs],
                              "png_red_dots": [(round(b[0], 2), round(b[1], 2), b[2]) for b in blobs]}
    rows.append((step_dir.name, checks, change))
    prev = {"txt": txt, "cfg": cfg}

out = ["# 屏幕、导出坐标、JSON、提示词与 PNG 的逐步核对", "",
       "由 `crosscheck.py` 生成。每一步的三件导出取自点击“导出三件”时页面生成的原始字节，`screen.json` 取自同一时刻的页面 DOM。", ""]
total = bad = 0
for name, checks, change in rows:
    out += [f"## {name}", "", f"与上一步相比：{change}", "", "| 核对项 | 结果 | 数值 |", "|---|---|---|"]
    for c in checks:
        total += 1; bad += c["结果"] != "通过"
        out.append(f"| {c['项目']} | {c['结果']} | {c['说明']} |")
    d = details[name]
    out += ["", "轴心（mm，x 向右、y 向机头）：" + "；".join(f"{i} {r}（{x}, {y}）" for i, r, x, y in d["hubs_mm"]),
            "", "轴心（1024 px 条件图）：" + "；".join(f"{i}（{x}, {y}）" for i, x, y in d["hubs_px"]),
            "", "PNG 中检出的红点质心：" + "；".join(f"（{x}, {y}）" for x, y, _ in d["png_red_dots"]), ""]
out.insert(4, f"**合计 {total} 项，通过 {total - bad}，不符 {bad}。**\n")
(HERE / "crosscheck.md").write_text("\n".join(out) + "\n", encoding="utf-8")
(HERE / "crosscheck.json").write_text(json.dumps(details, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"合计 {total} 项，通过 {total - bad}，不符 {bad}")
for name, checks, change in rows:
    fails = [c for c in checks if c["结果"] != "通过"]
    print(name, "全部通过" if not fails else fails, "|", change)
sys.exit(1 if bad else 0)
