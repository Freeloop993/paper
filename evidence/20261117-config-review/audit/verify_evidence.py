"""从保留的原图、回件和冻结账本复算。默认使用作者电脑的只读档案。"""
import csv
import io
import json
import re
from collections import Counter, defaultdict
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile
from urllib.request import urlopen

from PIL import Image

OUT = Path(__file__).resolve().parent
NOV17 = OUT.parents[1]
NOV15 = NOV17.parent / "2026-11-15"
OFF = NOV17 / "offline-review"
PLAN = "1ff8011aa5a14da4d0eed137099bafe13a632226"


def read(path):
    return json.loads(path.read_bytes())


def digest(data):
    return sha256(data).hexdigest()


def write_csv(name, rows):
    with (OUT / name).open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def seed_pairs():
    ledger_path = NOV15 / "codex-full-handoff/analysis/day247/247个排程位置.csv"
    with ledger_path.open(encoding="utf-8-sig") as f:
        ledger = {r["对应实际编号"]: r for r in csv.DictReader(f)}
    frozen = {r["id"]: r for r in read(NOV15 / "gpu-day-takeover/manifest-v2.json")["requests"]}
    banks = {"S12": {}, "S16": {}}
    images = []
    for path in [Path("D:/下载/review15-shape24.zip"), Path("D:/下载/review15-v16-shape24.zip"),
                 Path("D:/huanshijie/Mods/recovery-day102-1117.zip")]:
        with ZipFile(path) as archive:
            for member in archive.namelist():
                rid = Path(member).stem
                match = re.fullmatch(r"(S12|S16)-(S[0-5])-r(\d+)", rid)
                if not match or not member.endswith(".png"):
                    continue
                version, cell, rep = match.groups()
                raw = archive.read(member)
                record = ledger[rid]
                req = frozen[rid]
                with Image.open(io.BytesIO(raw)) as im:
                    graph = json.loads(im.info["prompt"])
                    seed = graph["10"]["inputs"]["seed"]
                    assert im.size == (1024, 1024)
                    rgb = digest(im.convert("RGB").tobytes())
                assert graph["12"]["inputs"]["filename_prefix"] == rid
                assert seed == req["seed"] and record["实际请求SHA256"] == req["sha256"]
                assert digest(raw) == record["原图SHA256"]
                if member.rsplit("/", 1)[0] + "/request.json" in archive.NameToInfo:
                    request = archive.read(member.rsplit("/", 1)[0] + "/request.json")
                    assert graph["15"].pop("is_changed") == ["15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338"]
                    assert digest(request) == req["sha256"] and json.loads(request)["prompt"] == graph
                row = dict(id=rid, cell=cell, seed=seed, rep=int(rep), batch=record["批序"],
                           prompt_id=record["prompt_id"], png_sha256=digest(raw), rgb_sha256=rgb)
                key = (cell, seed)
                assert key not in banks[version]
                banks[version][key] = row
                images.append(row)
    assert len(images) == 120
    for col in ("id", "prompt_id", "rgb_sha256", "png_sha256"):
        assert len({r[col] for r in images}) == len(images)
    rows = []
    for cell, seed in sorted(banks["S12"].keys() | banks["S16"].keys()):
        rec = {"cell": cell, "seed": seed}
        for v in banks:
            r = banks[v].get((cell, seed), {})
            for k in ("id","batch","rep","prompt_id","png_sha256","rgb_sha256"):
                rec[v+"_"+k] = r.get(k,"")
        rows.append(rec)
    write_csv("seed-pairs.csv",rows)
    matched = [r for r in rows if r["S12_id"] and r["S16_id"]]
    return dict(images=len(images), within_version_unique_seeds={v:len({s for c,s in d}) for v,d in banks.items()},
                pairs=len(matched), matched_unique_seeds=len({r["seed"] for r in matched}),
                pairs_by_cell=dict(Counter(r["cell"] for r in matched)),
                pairs_by_source_order=dict(Counter(f"{r['S12_batch']}/{r['S16_batch']}" for r in matched)),
                unmatched_12=sum(not r["S16_id"] for r in rows), unmatched_16=sum(not r["S12_id"] for r in rows))


def human():
    keys = {v:k.split("-")[1] for k,v in read(OFF/"human-12/研究者对照键.json").items()}
    result=[]
    for f in sorted((OFF/"human-12/收件原件").glob("*.json")):
        j=read(f)
        assert j["consent"] and len(j["answers"])==12 and {a["id"] for a in j["answers"]}==set(keys)
        ct=Counter()
        for a in j["answers"]:
            cell=keys[a["id"]]
            if sum(a[p]=="socket" for p in ("tl","tr","br","bl"))>=3: ct[cell+"_socket"]+=1
            if a["cover"]=="multi": ct[cell+"_multi"]+=1
        result.append(dict(exposure=j["prior_exposure"],target_socket=ct["S2_socket"],base_socket=ct["S0_socket"],
                           target_multi=ct["S5_multi"],base_multi=ct["S0_multi"]))
    return result


def main():
    six = read(OFF/"results/six-unblinded.json")
    key = read(OFF/"layout-reader-mapping.json")
    assert len(six)==len(key)==36 and all(key[r["id"]]==r["run"] for r in six)
    missing=[(r["id"],r["run"],i+1) for r in six for i,pt in enumerate(r["axes"]) if pt is None]
    assert missing==[("1d760b88","HEXA3-wl1.30-r04",4)]
    sensitivity={}
    url=f"https://raw.githubusercontent.com/Freeloop993/paper/{PLAN}/evidence/e1-open-20261112/geometry-readout.json"
    geo=json.loads(urlopen(url,timeout=25).read())["per_image"]
    for arm in ("control","text"):
        runs=[r for r in geo if r["stage"]=="E1" and r["factor"]=="dd" and r["arm"]==arm]
        sensitivity[arm]=[len(runs)]+[sum(abs(r["paired"]["dd"]-r["level"])<=t for r in runs) for t in (0.10,0.05)]
    raw=NOV17/"early-crawl-github"
    with ZipFile(raw/"06-cleaning-and-source-audit.zip") as a:
        names=[n for n in a.namelist() if n.split("/")[-1].startswith("02-") and n.endswith(".jsonl")]
        assert len(names)==1
        recs=[json.loads(line) for line in a.read(names[0]).splitlines() if line.strip()]
        years=Counter(r["review_date"][:4] for r in recs if r.get("review_date"))
    with ZipFile(raw/"08-semantic-analysis.zip") as a:
        names=[n for n in a.namelist() if any(seg.startswith("64-") for seg in n.split("/")) and n.split("/")[-1].startswith("06-") and n.endswith(".json")]
        assert len(names)==1
        text=json.loads(a.read(names[0]))["records"]
        assert len(text)==len({r["text_id"] for r in text})
        q=[r for r in text if "Q" in r["scopes"]]
        n=sum(r["decision_code"]=="A" for r in q)
        corpus=dict(merged=len(recs),dated=sum(years.values()),year=dict(sorted(years.items())),unique=len(text),Q=len(q),retained=n,excluded=len(q)-n)
    results=dict(seed_check=seed_pairs(),human=human(),six_missing=missing,dd_denominator_hits_010_005=sensitivity,corpus=corpus)
    (OUT/"checks.json").write_text(json.dumps(results,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(results,ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()

