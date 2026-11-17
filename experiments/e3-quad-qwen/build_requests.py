"""E3 四旋设计初稿：从三张规格卡编译 9 份 Qwen 原生编辑请求。

用法（仓库根目录）：python3 -B experiments/e3-quad-qwen/build_requests.py
输入：specs.json（三张规格卡）、dictionary-v14.json（字典 v1.4）、template.request.json（S4 机鼻前缘轮的实际请求）、
      evidence/qwen-shape-s4-20261114/layout.png（固定红点蓝线图）。
输出：requests/E3-<方向><序号>.request.json 与 manifest.json。只替换正向词、种子和保存前缀，其余节点与参数逐字保留。
"""
import copy
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
GUIDE = ROOT / "evidence/qwen-shape-s4-20261114/layout.png"
GUIDE_SHA = "15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338"
GUIDE_NAME = "qwen-shape-dots-250-15c5ad1c924b.png"  # 服务端 input 目录里的文件名，与小测相同


def sha(b):
    return hashlib.sha256(b).hexdigest()


def compile_text(d, p):
    f = d["fixed_lines"]
    layout = f["layout"].replace("250 mm", f"{p['span']} mm")
    cmf = f["cmf_when_exposed_carbon"] if p["arm_finish"] == "exposed_carbon" else f["cmf"]
    lines = [f["head"], layout] + [d["params"][k][p[k]] for k in ["body_plan", "arm_root", "camera", "cover"]]
    lines += [d["params"]["arm_finish"][p["arm_finish"]], cmf, f["tail"]]
    return "\n".join(lines)


def main():
    d = json.loads((HERE / "dictionary-v14.json").read_text(encoding="utf-8"))
    specs = json.loads((HERE / "specs.json").read_text(encoding="utf-8"))
    tpl = json.loads((HERE / "template.request.json").read_text(encoding="utf-8"))
    assert sha(GUIDE.read_bytes()) == GUIDE_SHA, "红点蓝线图摘要不符"
    assert tpl["prompt"]["15"]["inputs"]["image"] == GUIDE_NAME
    out = HERE / "requests"; out.mkdir(exist_ok=True)
    rows = []
    for direction, card in specs["cards"].items():
        p = card["params"]
        assert p["span"] == "250", "固定红点蓝线图只对应 250 mm"
        text = compile_text(d, p)
        for i, seed in enumerate(card["seeds"], start=1):
            rid = f"E3-{direction}{i}"
            req = copy.deepcopy(tpl)
            g = req["prompt"]
            g["4"]["inputs"]["prompt"] = text
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
            (out / f"{rid}.request.json").write_bytes(raw)
            rows.append({"id": rid, "direction": direction, "slot": i, "seed": seed, "params": p,
                         "prompt_sha256": sha(text.encode("utf-8")), "request_sha256": sha(raw)})
    manifest = {"dictionary": d["version"], "guide": str(GUIDE.relative_to(ROOT)), "guide_sha256": GUIDE_SHA,
                "template_sha256": sha((HERE / "template.request.json").read_bytes()),
                "negative_prompt": tpl["prompt"]["4"]["inputs"]["negative_prompt"],
                "sampler": {k: tpl["prompt"]["10"]["inputs"][k] for k in ["steps", "cfg", "sampler_name", "scheduler", "denoise"]},
                "requests": rows}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for r in rows:
        print(r["id"], r["seed"], r["prompt_sha256"][:12])


if __name__ == "__main__":
    main()
