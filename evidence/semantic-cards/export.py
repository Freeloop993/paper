"""Build a public card table and a separate, anonymous second-coder delivery."""
import argparse
import csv
from hashlib import sha256
import json
from pathlib import Path

SEED = "2026111229"
HERE = Path(__file__).resolve().parent

# Reading of the *quoted excerpt*. Full-context annotations are included separately.
CATEGORIES = [
    "视觉目标/使用情境", "视觉目标/事实自述", "使用情境", "使用情境", "使用情境",
    "视觉目标/使用情境", "视觉目标/使用情境", "功能/使用情境", "使用情境", "视觉目标/功能",
    "视觉目标", "视觉目标", "视觉目标/功能", "视觉目标", "视觉目标",
    "愿望", "功能/使用情境", "功能/使用情境", "视觉目标/功能", "功能/事实自述",
    "功能/事实自述", "功能/事实自述", "视觉目标/事实自述", "视觉目标", "视觉目标",
    "事实自述", "视觉目标", "功能", "视觉目标", "视觉目标/使用情境",
    "愿望/视觉目标", "愿望", "愿望", "愿望", "事实自述", "视觉目标",
]
# State is specified only when folding/unfolding is explicit.
STATES = {"E008": "讨论折叠；型号存在语境冲突", "E009": "折叠"}
COUNTER = {"E002","E004","E005","E006","E007","E010","E025","E030"}
CONDITIONAL = {"E003","E008","E009","E014","E015","E016","E018","E024","E026","E028","E031","E035"}
POLARITY = [
    "正","正","正","限制","混合","混合","混合","正","正","负",
    "正","正","正","正","正","愿望","正","正","正","正","陈述","陈述",
    "辨识性评价","陈述","异向评价","负/应对","正","负","正","混合",
    "偏好","愿望","愿望","愿望","陈述","正",
]
FIELDS = ["卡号","匿名来源键","数据集","记录编号（公开替代码）","原文片段","对象","展开或折叠状态","类别","极性","历史解释与限制","与候选方向的关系"]
CODING = ["外观/功能/使用情境/混合/不可判","紧凑—舒展","简洁—繁复","整体—拼凑","可见部位","反例或条件","文字依据"]


def digest(value):
    return sha256(value.encode("utf-8")).hexdigest()


def ranked(domain, key):
    return digest(f"{SEED}/{domain}/{key}")


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as out:
        csv.writer(out).writerows(rows)


def build(args):
    cards = json.loads(args.cards.read_text(encoding="utf-8-sig"))["cards"]
    reviewed = {r["evidence_id"]: r for r in
                (json.loads(s) for s in args.contexts.read_text(encoding="utf-8-sig").splitlines())}
    assert [c["evidence_id"] for c in cards] == [f"E{i:03d}" for i in range(1,37)]
    assert len(CATEGORIES) == len(POLARITY) == len(cards) == len(reviewed)
    sources = {}
    used_bodies = set()
    public_rows = [FIELDS]
    for i, card in enumerate(cards):
        key, cid, quote = card["source_key"], card["evidence_id"], card["quote_original"]
        context = reviewed[cid]
        assert key == context["source_key"] and quote in context["source_body"]
        assert digest(context["source_body"]) == card["source_body_sha256"] == context["source_body_sha"]
        used_bodies.add(card["source_body_sha256"])
        item = sources.setdefault(key, {"quotes": [], "cards": [], "record": card["record_id"]})
        item["cards"].append(cid)
        item["quotes"].append(quote)
        relation = "反例/异向或取舍" if cid in COUNTER else "有条件/对象限制" if cid in CONDITIONAL else "未登记反例"
        public_rows.append([cid, "S-"+digest(key)[:12], card["dataset"], "R-"+digest(card["record_id"])[:12],
                            quote, context["context_target"]["object"], STATES.get(cid,"未明确"),
                            CATEGORIES[i], POLARITY[i], card["main_interpretation_and_limit"], relation])
    assert len(sources)==35 and [v["cards"] for v in sources.values() if len(v["cards"])>1]==[["E003","E004"]]
    clusters = [json.loads(s) for s in args.clusters.read_text(encoding="utf-8-sig").splitlines()]
    assert len(clusters)==len({r["text_id"] for r in clusters})==7443
    used_ids={x["record"] for x in sources.values()}
    population=[r for r in clusters if r["text_id"] not in used_ids and digest(r["text"]) not in used_bodies]
    population.sort(key=lambda r:ranked("distractor",r["text_id"]))
    # Exact clauses, selected to avoid reproducing entire long reviews.
    for row in population[:5]:
        import re
        text=row["text"].strip()
        fragment=re.split(r"(?<=[。！!?？])",text,maxsplit=1)[0][:95]
        assert fragment and fragment in row["text"]
        sources["legacy:"+row["text_id"]]={"quotes":[fragment],"cards":[],"record":row["text_id"]}
    assert len(sources)==40
    write_csv(HERE/"cards.csv",public_rows)
    blind=[["编号","原文片段",*CODING]]
    codebook=[["编号","匿名来源键","原来源键（私用）","原记录号（私用）","卡号（空为干扰）"]]
    for n,key in enumerate(sorted(sources,key=lambda k:ranked("order",k)),1):
        item=sources[key]
        label=f"B{n:02d}"
        blind.append([label," […] ".join(item["quotes"]),*([""]*len(CODING))])
        codebook.append([label,"S-"+digest(key)[:12],key,item["record"],",".join(item["cards"])])
    if args.delivery.resolve().is_relative_to(HERE.parents[1]) or args.key.resolve().is_relative_to(args.delivery.resolve()):
        raise ValueError("Keep the coder delivery private and its answer key in a different folder.")
    write_csv(args.delivery/"第二编码-40条.csv",blind)
    write_csv(args.key,codebook)


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ("cards","contexts","clusters","delivery","key"):
        parser.add_argument("--"+name,type=Path,required=True)
    build(parser.parse_args())
