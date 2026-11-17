"""出图前检查：任何一批请求上传或入队之前必须通过。

用法（仓库根目录）：
  python3 -B experiments/preflight.py <请求目录> --inputs <输入图目录> [--allow-shared-seeds 前缀1,前缀2]

检查项（对应 docs/protocols/run-checklist.md 的错误编号）：
  [1] 目录里不得有隐藏文件或 macOS 的 ._ 元数据；每份必须是可解析的 JSON。
  [2] 每张 LoadImage 输入必须在 experiments/approved-inputs.json 里登记（父图须写明作者决定与日期），
      且本地文件的 SHA-256 与登记一致。未登记的输入一律拒绝——旧父图就是这样混进来的。
      遮罩请求另传 --mask-manifest <登记清单>，按请求号核对文件名、红色通道和 SHA-256。
      遮罩与普通输入分开存放时另传 --masks <遮罩目录>。
  [3] 种子不得重复，除非请求号以 --allow-shared-seeds 给出的前缀开头（事先登记的同种子配对）。
  [4] 保存前缀（节点 12）不得重复。
  [5] 负向词不得包含与任务不符的词：六旋／植保请求不能带四旋专用的机尾、相机句。
  [6] 输入图的机头若登记为画面下端（approved-inputs 的 nose_at），负向词不得出现任何“tail”类词，
      否则模型可能把画面下端的相机当成机尾部件抹掉。
退出码 0 为通过；否则列出全部问题并以 1 退出。
"""
import argparse, hashlib, json, sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUAD_ONLY_NEGATIVES = ["camera at the tail", "dark module at the tail", "upward-facing lens", "camera on a neck", "camera on a post"]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("requests"); ap.add_argument("--inputs", required=True)
    ap.add_argument("--mask-manifest", type=Path, help="本批红通道遮罩与请求对应关系的冻结清单")
    ap.add_argument("--masks", type=Path, help="实际待提交的遮罩目录，默认与 --inputs 相同")
    ap.add_argument("--allow-shared-seeds", default=""); a = ap.parse_args()
    approved = json.loads((ROOT / "experiments/approved-inputs.json").read_text(encoding="utf-8"))
    allowed = {**approved["guides"], **approved["parents"]}
    mask_dir = a.masks or Path(a.inputs)
    mask_hashes, planned_masks = {}, {}
    if a.mask_manifest:
        try:
            manifest = json.loads(a.mask_manifest.read_bytes())
            mask_hashes = {m["mask"]: m["sha256"] for m in manifest["masks"]}
            planned_masks = {r["id"]: r["mask"] for r in manifest["requests"]}
            if len(mask_hashes) != len(manifest["masks"]) or len(planned_masks) != len(manifest["requests"]):
                ap.error("遮罩清单有重复文件名或请求号")
        except (OSError, ValueError, KeyError, TypeError) as exc:
            ap.error(f"无法读取遮罩清单：{exc}")
    shared = [p for p in a.allow_shared_seeds.split(",") if p]
    problems, seeds, prefixes = [], defaultdict(list), defaultdict(list)
    files = sorted(Path(a.requests).rglob("*"))
    for f in files:
        if f.name.startswith("."):
            problems.append(f"[1] 隐藏或元数据文件：{f}")
    reqs = [f for f in files if f.suffix == ".json" and not f.name.startswith(".") and f.name not in ("manifest.json",)]
    for f in reqs:
        try:
            g = json.loads(f.read_bytes())["prompt"]
        except Exception as e:
            problems.append(f"[1] 不是可解析的请求：{f.name}（{e}）"); continue
        rid = g["12"]["inputs"]["filename_prefix"]; prefixes[rid].append(f.name)
        seeds[g["10"]["inputs"]["seed"]].append(rid)
        masks = [v["inputs"] for v in g.values() if v["class_type"] == "LoadImageMask"]
        if masks and not a.mask_manifest:
            problems.append(f"[2] {rid} 含遮罩但未提供 --mask-manifest")
        if a.mask_manifest:
            expected = planned_masks.get(rid)
            names = [v.get("image") for v in masks]
            if rid not in planned_masks or names != ([expected] if expected else []):
                problems.append(f"[2] {rid} 的遮罩节点与本批请求登记不符")
            for v in masks:
                name = v.get("image")
                if v.get("channel") != "red":
                    problems.append(f"[2] {rid} 的遮罩通道与红色通道登记不符")
                if not isinstance(name, str) or name not in mask_hashes:
                    problems.append(f"[2] {rid} 用了未登记的遮罩 {name}")
                    continue
                path = mask_dir / name
                if not path.is_file():
                    problems.append(f"[2] {rid} 的遮罩文件缺失：{name}")
                elif hashlib.sha256(path.read_bytes()).hexdigest() != mask_hashes[name]:
                    problems.append(f"[2] {rid} 的遮罩 {name} 摘要与登记不符")
        for v in g.values():
            if v["class_type"] != "LoadImage":
                continue
            name = v["inputs"]["image"]
            if name not in allowed:
                problems.append(f"[2] {rid} 用了未登记的输入图 {name}")
                continue
            p = Path(a.inputs) / name
            if not p.is_file():
                problems.append(f"[2] {rid} 的输入图 {name} 不在 {a.inputs}")
            elif hashlib.sha256(p.read_bytes()).hexdigest() != allowed[name]["sha256"]:
                problems.append(f"[2] {rid} 的输入图 {name} 摘要与登记不符")
        text = g["4"]["inputs"].get("prompt", "").lower(); neg = g["4"]["inputs"].get("negative_prompt", "").lower()
        lower_nose = [v["inputs"]["image"] for v in g.values() if v["class_type"] == "LoadImage"
                      and allowed.get(v["inputs"]["image"], {}).get("nose_at") == "lower edge"]
        if lower_nose and "tail" in neg:
            problems.append(f"[6] {rid} 的输入 {lower_nose} 机头在画面下端，负向词却含“tail”类词")
        if "six-rotor" in text or "plant-protection" in text:
            bad = [t for t in QUAD_ONLY_NEGATIVES if t in neg]
            if bad:
                problems.append(f"[5] {rid} 是六旋植保请求，负向词含四旋专用词：{bad}")
    for s, ids in seeds.items():
        if len(ids) > 1 and not all(any(i.startswith(p) for p in shared) for i in ids):
            problems.append(f"[3] 种子 {s} 被多份请求共用：{ids}")
    for rid, fs in prefixes.items():
        if len(fs) > 1:
            problems.append(f"[4] 保存前缀 {rid} 重复：{fs}")
    print(f"检查 {len(reqs)} 份请求、{len(files)} 个文件")
    for p in problems:
        print("  " + p)
    print("通过" if not problems else f"未通过：{len(problems)} 个问题")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
