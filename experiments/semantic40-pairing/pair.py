"""按 README 登记的规则，把第一编码换算为第二编码口径并逐条配对。用法：python3 pair.py key.json"""
import csv, json, sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[1]
CAT = {"视觉目标": "外观", "功能": "功能", "使用情境": "使用情境"}
PAIRS = {
    "紧凑—舒展": {"支持左极": ["E001", "E010", "E003", "E009"], "支持右极": ["E002", "E006", "E007"], "看不出": ["E004", "E005"]},
    "简洁—繁复": {"支持左极": ["E011", "E012", "E013", "E014", "E015", "E016"], "支持右极": [], "看不出": []},
    "整体—拼凑": {"支持左极": ["E016", "E023"], "支持右极": ["E006", "E007"], "看不出": ["E024", "E025"]},
}


def first_category(raw):
    kept = [CAT[c] for c in raw.split("/") if c in CAT]
    return "不可判" if not kept else kept[0] if len(set(kept)) == 1 else "混合"


def first_pole(pair, card):
    for value, cards in PAIRS[pair].items():
        if card in cards:
            return value
    return "无关"


def merge(values):
    return values[0] if len(set(values)) == 1 else "看不出"


def kappa(a, b):
    n = len(a); po = sum(x == y for x, y in zip(a, b)) / n
    ca, cb = Counter(a), Counter(b); pe = sum(ca[k] * cb[k] for k in set(a) | set(b)) / n / n
    return None if pe == 1 else round((po - pe) / (1 - pe), 3)


def main():
    key = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    cards = {r["卡号"]: r for r in csv.DictReader(open(ROOT / "evidence/semantic-cards/cards.csv", encoding="utf-8-sig"))}
    second = {r["编号"]: r for r in csv.DictReader(open(ROOT / "evidence/semantic40-second-coding-20261115/semantic40-text-v2.csv", encoding="utf-8-sig"))}
    assert set(key) == set(second) and len(key) == 40
    fields = ["外观/功能/使用情境/混合/不可判", "紧凑—舒展", "简洁—繁复", "整体—拼凑"]
    rows, pairs, distractors = [], {f: ([], []) for f in fields}, []
    for bid in sorted(key):
        s = second[bid]
        if key[bid] == "distractor":
            distractors.append({"编号": bid, **{f: s[f] for f in fields}, "文字依据": s["文字依据"]}); continue
        ids = key[bid].split("+")
        first = {fields[0]: merge([first_category(cards[i]["类别"]) for i in ids])}
        for p in fields[1:]:
            first[p] = merge([first_pole(p, i) for i in ids])
        row = {"编号": bid, "卡号": key[bid]}
        for f in fields:
            row[f"一·{f}"] = first[f]; row[f"二·{f}"] = s[f]; row[f"{f}·一致"] = first[f] == s[f]
            pairs[f][0].append(first[f]); pairs[f][1].append(s[f])
        row["二·文字依据"] = s["文字依据"]; rows.append(row)
    with open(HERE / "pairing.csv", "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    summary = {"n_source_rows": len(rows), "n_distractors": len(distractors),
               "agreement": {f: {"agree": sum(x == y for x, y in zip(*pairs[f])), "n": len(rows), "kappa": kappa(*pairs[f])} for f in fields},
               "second_visible_part": Counter(second[b]["可见部位"] for b in key if key[b] != "distractor"),
               "distractors": distractors}
    (HERE / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary["agreement"], ensure_ascii=False))


if __name__ == "__main__":
    main()
