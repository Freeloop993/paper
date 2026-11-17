"""核对早期语料、回收原图、盲读回件及 GPU 登记。只读本地输入，标准输出为汇总 JSON。"""
import argparse
from collections import Counter
import csv
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from zipfile import ZipFile


def sha(data):
    return hashlib.sha256(data).hexdigest()


def check(ok, message):
    if not ok:
        raise ValueError(message)


def corpus_counts(root):
    files = {n: next(next(root.glob(group)).glob(name)) for n, group, name in [
        ("ledger", "64-*", "06-*.json"), ("themes", "62-*", "11-*.json"), ("translation", "63-*", "05-*.json")]}
    records, themes, directions = (json.loads(f.read_bytes()) for f in files.values())
    ledger = records["records"]
    check(len({r["text_id"] for r in ledger}) == len(ledger), "语料键不唯一")
    kept = {r["text_id"] for r in ledger if r["decision_code"] == "A"}
    by_id = {r["text_id"]: set(r["group_ids"]) for r in themes["records"] if r["text_id"] in kept}
    check(set(by_id) == kept, "主题映射未覆盖 A 档")
    subsets = {g: {i for i, groups in by_id.items() if g in groups} for g in ["G01","G02","G03","G10"]}
    q = [r for r in ledger if "Q" in r["scopes"]]
    return {"files_sha256": {k: sha(f.read_bytes()) for k,f in files.items()},
            "unique_texts": len(ledger), "product_title_includes_Q": len(q),
            "product_title_only_Q": sum(set(r["scopes"]) == {"Q"} for r in q),
            "kept_A": len(kept), "kept_A_including_Q": sum(r["text_id"] in kept for r in q),
            "theme_counts": {key: len(ids) for key,ids in subsets.items()},
            "small_and_carry": len(subsets["G01"] & subsets["G03"]),
            "small_or_carry": len(subsets["G01"] | subsets["G03"]),
            "translation_vintage": {v["variable_id"]: v["related_direction"] for v in directions["variables"]}}


def image_counts(archive, receipts, day_csv, readings):
    recovery = json.loads(receipts.read_bytes())
    with day_csv.open(encoding="utf-8-sig", newline="") as f:
        ledger = {row["对应实际编号"]: row["原图SHA256"] for row in csv.DictReader(f)}
    with ZipFile(archive) as z:
        pngs = [n for n in z.namelist() if n.lower().endswith(".png")]
        check(len(pngs) == len(recovery) == len({Path(n).stem for n in pngs}), "回收清单数量或重复图号异常")
        for file in pngs:
            run = Path(file).stem
            check(sha(z.read(file)) == recovery[run] == ledger[run], "图片摘要不符 "+run)
    result = {}
    source = json.loads(readings.read_bytes())
    expected = {r for r in recovery if not r.startswith("E2-")}
    for reader in sorted({r["reader"] for r in source}):
        rows = [r for r in source if r["reader"] == reader]
        check(len(rows) == len(expected) and {r["run"] for r in rows} == expected, "读数覆盖错误 "+reader)
        combo = [r for r in rows if r["group"] == "COMBO"]
        def cameras(prefix):
            return dict(Counter(r["camera"] for r in rows if r["run"].startswith(prefix)))
        result[reader] = {"unique_images": len(rows), "combo_all_three": sum(r["all_targets_hit"] for r in combo),
                          "combo_body_nose_cover": {p: sum(r["hits"][p] for r in combo) for p in ["body","nose","cover"]},
                          "S12_S4_end": cameras("S12-S4-"), "S16_S4_end": cameras("S16-S4-")}
    return {"png_hashes_matched_to_both_ledgers": len(pngs), "groups": dict(Counter(r.split("-")[0] for r in recovery)),
            "archive_sha256": sha(archive.read_bytes()), "readers": result}


def workflow_check(repo):
    exp = repo / "experiments/20261117-local-edit-v2"
    manifest = json.loads((exp / "manifest.json").read_bytes())
    for group, label in [("inputs","input"), ("masks","mask")]:
        for entry in manifest[group]:
            check(sha((exp/group/entry[label]).read_bytes()) == entry["sha256"], label+"摘要错误")
    reqs = list((exp/"requests").glob("*.json"))
    check(len(reqs) == len(manifest["requests"]), "请求数量错误")
    num_masked = 0
    for r in manifest["requests"]:
        f = exp/"requests"/("{:02d}-{}.json".format(r["order"], r["id"]))
        b = f.read_bytes()
        check(sha(b) == r["request_sha256"], f.name+" 摘要错误")
        g = json.loads(b)["prompt"]
        sampler = g["10"]["inputs"]
        check(sampler["seed"] == r["seed"], f.name+" 种子错误")
        if r["mask"]:
            latent = g[sampler["latent_image"][0]]
            mask = g[latent["inputs"]["mask"][0]]
            check(latent["class_type"] == "SetLatentNoiseMask" and mask["class_type"] == "LoadImageMask", f.name+" 缺少遮罩采样")
            check(mask["inputs"] == {"image":r["mask"],"channel":"red"}, f.name+" 遮罩通道错误")
            num_masked += 1
    cmd = [sys.executable, "-X", "utf8", "-B", "experiments/preflight.py", str(exp/"requests"),
           "--inputs", str(exp/"inputs"), "--allow-shared-seeds", "E2V2"]
    preflight = subprocess.run(cmd, cwd=repo, capture_output=True, encoding="utf-8", check=True)
    return {"manifest_sha256": sha((exp/"manifest.json").read_bytes()), "request_files": len(reqs),
            "registered_by_stage": dict(Counter(str(r["order"]) for r in manifest["requests"])),
            "input_images": len(manifest["inputs"]), "mask_files": len(manifest["masks"]), "masked_graphs": num_masked,
            "preflight": preflight.stdout.strip().splitlines(), "scope": "离线检查；本次实际提交 0"}



def product_crosswalk(root, ratings):
    from statistics import median
    profiles = json.loads((root/"19-官方机型参数核验.json").read_bytes())["models"]
    candidates = json.loads((root/"20-检索候选与机型覆盖审计.json").read_bytes())["model_candidate_records"]
    normalize = lambda s: " ".join(s.lower().split())
    def key_map(rows, field):
        return {normalize(r["manufacturer"]+" "+r["model"]): r[field] for r in rows}
    verified = key_map(profiles, "profile_id")
    catalog = key_map(candidates, "candidate_id")
    section = ratings.read_text(encoding="utf-8-sig").split("## 实拍逐人原分",1)[1]
    rows = []
    for line in section.splitlines():
        cols = [s.strip() for s in line.strip().strip("|").split("|")]
        if len(cols) != 4 or "/" not in cols[1]:
            continue
        model = cols[0]
        scores = [int(col.split("/")[0].strip()) for col in cols[1:]]
        key = normalize(model)
        rows.append({"rated_product":model, "rating_n":len(scores), "compact_to_spread_1_to_7":scores,
                     "median":median(scores), "exact_profile":verified.get(key), "exact_candidate":catalog.get(key)})
    check(len(rows) == 8 and len({row["rated_product"] for row in rows}) == 8, "评分表解析未覆盖八款")
    return {"rated_table_sha256": sha(ratings.read_bytes()), "profile_count":len(profiles), "candidate_count":len(candidates),
            "exact_profile_links":sum(r["exact_profile"] is not None for r in rows),
            "exact_candidate_links":sum(r["exact_candidate"] is not None for r in rows), "rows":rows}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    for name in ["corpus","archive","receipt","day-csv","readings","gpu-repo","ratings"]:
        ap.add_argument("--"+name, required=True, type=Path)
    a = ap.parse_args()
    print(json.dumps({"corpus": corpus_counts(a.corpus), "recovery": image_counts(a.archive,a.receipt,a.day_csv,a.readings),
                      "rated_products": product_crosswalk(a.corpus,a.ratings), "gpu": workflow_check(a.gpu_repo.resolve())}, ensure_ascii=False, indent=2))