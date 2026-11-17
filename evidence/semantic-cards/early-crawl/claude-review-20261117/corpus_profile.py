"""早期评论语料的构成与主题计数（只输出汇总，不输出原文）。

用法：python3 -I corpus_profile.py <解压后的 early-crawl 目录> > corpus-profile.json
输入来自私有阅读库 datasets/early-crawl 的 06、08 两个压缩包。
"""
import collections
import glob
import json
import os
import sys

C = collections.Counter
root = sys.argv[1]


def one(pattern):
    hits = glob.glob(os.path.join(root, pattern))
    assert len(hits) == 1, (pattern, hits)
    return hits[0]


def jl(path):
    return [json.loads(line) for line in open(path, encoding="utf-8") if line.strip()]


records = jl(one("06-*/*/02-*.jsonl"))
ledger = json.load(open(one("08-*/*/64-*/06-*.json"), encoding="utf-8"))["records"]
usage = json.load(open(one("08-*/*/62-*/11-*.json"), encoding="utf-8"))["records"]
groups = json.load(open(one("08-*/*/62-*/10-*.json"), encoding="utf-8"))["groups"]
scope_dict = json.load(open(one("08-*/*/62-*/03-*.json"), encoding="utf-8"))["scope_dictionary"]

dates = sorted(r["review_date"] for r in records if r.get("review_date"))
out = {
    "records_after_merge": len(records),
    "platform": dict(C(r["platform"] for r in records)),
    "review_year": dict(sorted(C(d[:4] for d in dates).items())),
    "distinct_product_listings": len({r["product_listing_id"] for r in records}),
    "unique_texts": len(ledger),
    "scope_dictionary": scope_dict,
    "unique_texts_by_scope": {"+".join(k): v for k, v in C(tuple(r["scopes"]) for r in ledger).most_common()},
    "unique_texts_with_scope_Q": sum(1 for r in ledger if "Q" in r["scopes"]),
    "decision_counts": {f"{k[0]} {k[1]}": v for k, v in C((r["decision_code"], r["decision_label"]) for r in ledger).most_common()},
    "review_status": dict(C(r["review_status"] for r in ledger)),
    "A_by_scope": {"+".join(k): v for k, v in C(tuple(r["scopes"]) for r in ledger if r["decision_code"] == "A").items()},
}
label = {g["group_id"]: g["label"] for g in groups}
by_id = {u["text_id"]: u for u in usage}
count = C()
n_a = 0
for r in ledger:
    if r["decision_code"] != "A":
        continue
    n_a += 1
    for gid in set(by_id[r["text_id"]]["group_ids"]):
        count[gid] += 1
out["A_texts"] = n_a
out["A_texts_per_theme"] = [
    {"group": gid, "label": label.get(gid, ""), "texts": n, "share_of_A": round(n / n_a, 3)}
    for gid, n in count.most_common()
]
out["note"] = "A 档由主助手逐正文审读得出，不是全量人工编码；一条文本可属于多个主题；文本簇不等于人数。"
print(json.dumps(out, ensure_ascii=False, indent=2))
