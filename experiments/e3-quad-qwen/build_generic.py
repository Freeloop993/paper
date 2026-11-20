"""按指定字典与规格编译 Qwen 原生编辑请求（第三轮起通用）。

用法：python3 -B build_generic.py --dict D.json --specs S.json --prefix E3R3- --out DIR
specs.json 形如 {"cards": {"A": {"params": {...}, "seeds": [..]}, ...}}。模板为本目录 template.request.json；
只替换正向词、种子、保存前缀，并在负向词末尾追加字典的 negative_extra。
"""
import argparse, copy, hashlib, json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
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
    ap = argparse.ArgumentParser()
    ap.add_argument("--dict", required=True); ap.add_argument("--specs", required=True)
    ap.add_argument("--prefix", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    d = json.loads(Path(a.dict).read_text(encoding="utf-8")); specs = json.loads(Path(a.specs).read_text(encoding="utf-8"))
    tpl_raw = (HERE / "template.request.json").read_bytes(); tpl = json.loads(tpl_raw)
    assert sha((ROOT / "evidence/qwen-shape-s4-20261114/layout.png").read_bytes()) == GUIDE_SHA
    neg = tpl["prompt"]["4"]["inputs"]["negative_prompt"] + ", " + d["negative_extra"]
    out = Path(a.out); (out / "requests").mkdir(parents=True, exist_ok=True)
    rows = []
    for direction, card in specs["cards"].items():
        p = card["params"]; assert p["span"] == "250"; text = compile_text(d, p)
        for i, seed in enumerate(card["seeds"], start=1):
            rid = f"{a.prefix}{direction}{i}"
            req = copy.deepcopy(tpl); g = req["prompt"]
            g["4"]["inputs"]["prompt"] = text; g["4"]["inputs"]["negative_prompt"] = neg
            g["10"]["inputs"]["seed"] = seed; g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
            (out / "requests" / f"{rid}.request.json").write_bytes(raw)
            rows.append({"id": rid, "direction": direction, "slot": i, "seed": seed, "params": p, "prompt": text,
                         "prompt_sha256": sha(text.encode()), "request_sha256": sha(raw)})
    (out / "manifest.json").write_text(json.dumps({"dictionary": d["version"], "guide_sha256": GUIDE_SHA,
        "template_sha256": sha(tpl_raw), "negative_prompt": neg, "requests": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for r in rows:
        print(r["id"], r["seed"], r["prompt_sha256"][:12])


if __name__ == "__main__":
    main()
