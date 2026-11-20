"""揭盲统计：读取 packet-X/Y 的 reading.json 与 key.json，按 3.4.4 节判据计算造型响应，并报告 E2 的目标与保持。"""
import json, sys
from collections import Counter, defaultdict
from pathlib import Path
B = Path(sys.argv[1]); key = json.loads((B / "key.json").read_text(encoding="utf-8"))
TARGET = {"S1": ("body", "方正机壳"), "S2": ("roots", "承座"), "S3": ("roots", "铰接"), "S4": ("nose", "前伸"), "S5": ("cover", "多块")}
BASE = {"body": "流线舱", "roots": "无缝", "nose": "无外突", "cover": "单盖"}
def norm(v): return (v or "").strip()
def roots_class(rs):
    c = Counter(norm(r) for r in rs)
    for lab in ("无缝", "承座", "铰接"):
        if c[lab] >= 3: return lab
    return "混合或不可判"
def classify(r):
    return {"body": norm(r["body"]), "roots": roots_class(r["roots"]), "nose": norm(r["nose"]), "cover": norm(r["cover"])}
out = {"shape": {}, "edit": {}}; per_img = defaultdict(dict)
for pk in ("X", "Y"):
    rd = json.loads((B / f"packet-{pk}" / "reading.json").read_text(encoding="utf-8"))
    for r in rd["shape"]:
        sid = key[f"{pk}/shape/{r['file']}"]; c = classify(r); lvl = sid.split("-")[1]
        blades = r.get("blades", []); ok2 = isinstance(blades, list) and len(blades) == 4 and all(b == 2 for b in blades)
        per_img[sid][pk] = dict(c, camera=norm(r["camera"]), two_blades=ok2, guard=norm(r.get("guard")), residue=norm(r.get("residue")), product=norm(r.get("product")), note=r.get("note", ""))
    for r in rd["edit"]:
        eid = key[f"{pk}/edit/{r['pair']}"]; out["edit"].setdefault(eid, {})[pk] = {k: r.get(k) for k in ("changes", "nose_narrowed", "roots_broadened", "axes_kept", "two_blades", "outline_kept", "other")}
lines = []
for pk in ("X", "Y"):
    lines.append(f"## 判读者 {pk}")
    for lvl, (param, val) in TARGET.items():
        hits = sum(1 for r in range(1, 5) if per_img[f"S12-{lvl}-r{r:02d}"][pk][param] == val)
        fp = sum(1 for r in range(1, 5) if per_img[f"S12-S0-r{r:02d}"][pk][param] == val)
        drift = sum(1 for r in range(1, 5) for p, b in BASE.items() if p != param and per_img[f"S12-{lvl}-r{r:02d}"][pk][p] not in (b, "不可判", "混合或不可判"))
        lines.append(f"{lvl} {param}={val}: 命中 {hits}/4，基准误判为该档 {fp}/4，判定 {'有响应' if hits >= 3 and fp <= 1 else '无响应'}；非目标漂移 {drift} 处")
    base_ok = sum(1 for r in range(1, 5) if all(per_img[f'S12-S0-r{r:02d}'][pk][p] == b for p, b in BASE.items()))
    two = sum(1 for v in per_img.values() if v[pk]["two_blades"]); cam = Counter(v[pk]["camera"] for v in per_img.values())
    lines.append(f"基准四项全部读回 {base_ok}/4；四轴双叶 {two}/24；相机 {dict(cam)}")
agree = Counter()
for sid, v in per_img.items():
    for p in ("body", "roots", "nose", "cover", "camera", "two_blades"):
        agree[p] += v["X"][p] == v["Y"][p]
lines.append("## 两位判读者逐项一致（/24）：" + "，".join(f"{p} {n}" for p, n in agree.items()))
lines.append("## E2（目标改动与三项保持）")
for eid, v in sorted(out["edit"].items()):
    tgt = "nose_narrowed" if "-A-" in eid else "roots_broadened"
    for pk in ("X", "Y"):
        r = v.get(pk, {}); keep = sum(1 for k in ("axes_kept", "two_blades", "outline_kept") if norm(r.get(k)) == "是")
        lines.append(f"{eid} [{pk}] 目标 {tgt}={r.get(tgt)}，保持 {keep}/3（轴心 {r.get('axes_kept')}、双叶 {r.get('two_blades')}、轮廓 {r.get('outline_kept')}），判定 {'通过' if norm(r.get(tgt)) == '是' and keep >= 2 else '未通过'}")
(B / "unblinded.json").write_text(json.dumps({"shape": per_img, "edit": out["edit"]}, ensure_ascii=False, indent=1), encoding="utf-8")
(B / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8"); print("\n".join(lines))
