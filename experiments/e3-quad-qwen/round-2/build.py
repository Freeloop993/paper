"""E3 第二轮初稿：按字典 v1.5 与 specs.json 编译 9 份请求。

用法（仓库根目录）：python3 -B experiments/e3-quad-qwen/round-2/build.py
模板与第一轮相同（../template.request.json）；替换正向词、种子、保存前缀，并在负向词末尾追加字典给出的 negative_extra。
输出 requests/E3R2-<方向><序号>.request.json 与 manifest.json。
"""
import copy
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
GUIDE = ROOT / "evidence/qwen-shape-s4-20261114/layout.png"
GUIDE_SHA = "15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338"


def sha(b):
    return hashlib.sha256(b).hexdigest()


def compile_text(d, p):
    f, lines = d["fixed_lines"], []
    for key in d["line_order"]:
        if key == "cmf":
            line = f["cmf_when_exposed_carbon"] if p["arm_finish"] == "exposed_carbon" else f["cmf"]
        elif key == "layout":
            line = f["layout"].replace("250 mm", f"{p['span']} mm")
        elif key in f:
            line = f[key]
        else:
            line = d["params"][key][p[key]]
        if line:
            lines.append(line)
    return "\n".join(lines)


def main():
    d = json.loads((HERE / "dictionary-v15.json").read_text(encoding="utf-8"))
    specs = json.loads((HERE / "specs.json").read_text(encoding="utf-8"))
    tpl_raw = (HERE.parent / "template.request.json").read_bytes()
    tpl = json.loads(tpl_raw)
    assert sha(GUIDE.read_bytes()) == GUIDE_SHA
    neg = tpl["prompt"]["4"]["inputs"]["negative_prompt"] + ", " + d["negative_extra"]
    out = HERE / "requests"; out.mkdir(exist_ok=True)
    rows = []
    for direction, card in specs["cards"].items():
        p = card["params"]; assert p["span"] == "250"
        text = compile_text(d, p)
        for i, seed in enumerate(card["seeds"], start=1):
            rid = f"E3R2-{direction}{i}"
            req = copy.deepcopy(tpl); g = req["prompt"]
            g["4"]["inputs"]["prompt"] = text
            g["4"]["inputs"]["negative_prompt"] = neg
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
            (out / f"{rid}.request.json").write_bytes(raw)
            rows.append({"id": rid, "direction": direction, "slot": i, "seed": seed, "params": p, "prompt": text,
                         "prompt_sha256": sha(text.encode("utf-8")), "request_sha256": sha(raw)})
    manifest = {"dictionary": d["version"], "guide_sha256": GUIDE_SHA, "template_sha256": sha(tpl_raw),
                "negative_prompt": neg, "requests": rows}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for r in rows:
        print(r["id"], r["seed"], r["prompt_sha256"][:12])


if __name__ == "__main__":
    main()
