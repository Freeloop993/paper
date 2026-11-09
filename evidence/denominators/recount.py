"""Recount the three historical batches from retained private ComfyUI receipts and PNGs.
Usage: python recount.py RESEARCH_ARCHIVE_ROOT > recount.json   (Pillow required)
"""
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path

from PIL import Image


def digest(data):
    return hashlib.sha256(data).hexdigest()


def require(test, message):
    if not test:
        raise ValueError(message)


def read_json(path):
    return json.loads(path.read_bytes())


def check_output(history, pid, png, expected):
    rec = history[pid]
    status = rec["status"]
    require(rec["prompt"][1] == pid and status["completed"] and status["status_str"] == "success", "Incomplete history")
    samplers = [i for i, n in rec["prompt"][2].items() if n["class_type"] == "KSampler"]
    require(len(samplers) == 1, "Unexpected sampler count")
    messages = [m for kind, m in status["messages"] if kind == "execution_cached" and m["prompt_id"] == pid]
    require(messages, "Missing cache receipt")
    cached = any(samplers[0] in map(str, m["nodes"]) for m in messages)
    require(digest(png) == expected, "PNG digest mismatch")
    with Image.open(io.BytesIO(png)) as image:
        require(image.size == (1024, 1024) and image.format == "PNG", "Unexpected format")
        pixels = digest(image.convert("RGBA").tobytes())
    return {"record": digest(pid.encode()), "cache": cached, "png_sha256": expected, "rgba_sha256": pixels}


def complete_zip(path, group, main=False):
    rows = []
    with zipfile.ZipFile(path) as archive:
        for name in sorted(archive.namelist()):
            if not name.endswith("-accepted.json") or "checkpoint" in name:
                continue
            prefix = name.removesuffix("-accepted.json")
            case = prefix.rsplit("/", 1)[-1]
            def member(suffix):
                return json.loads(archive.read(prefix + suffix))
            pid = member("-accepted.json")["prompt_id"]
            out = member("-output.json")
            meta = out.get("remote_output", out.get("metadata"))
            hist = member("-history.json")
            images = [i["filename"] for node in hist[pid]["outputs"].values() for i in node.get("images", [])]
            require(meta["filename"] in images, "Filename absent from recorded history")
            name = case + ".png" if main else "output/" + meta["filename"]
            png = archive.read(name)
            require(len(png) == out["bytes"], "Byte count mismatch")
            row = check_output(hist, pid, png, out["sha256"])
            rows.append(dict(row, case=case, group=group))
    return rows


def additional(root):
    ledger = read_json(root/"2026-11-07/junction2/ledger.closed-actual39.json")
    late = root/"2026-11-06/expression4"
    rows = complete_zip(late/"compshare-v6-actual-results-original.zip", "expression-v6")
    rows += complete_zip(root/"2026-11-07/junction2/junction2-actual-results-original.zip", "junction2")
    with zipfile.ZipFile(late/"compshare-v5-actual-results-original.zip") as z:
        pid = json.loads(z.read("evidence/E4-01-accepted.json"))["prompt_id"]
        run = json.loads(z.read("result.json"))
        require(not run["completed"] and run["attempted"][0]["prompt_id"] == pid and len(run["attempted"]) == 1,
                "Unexpected v5 completion")
        require(not [n for n in z.namelist() if n.startswith("output/") and n.endswith(".png")],
                "Unexpected v5 output")
        rows.append({"group":"expression-v5","case":"E4-01","record":digest(pid.encode()),
                     "cache":None,"png_sha256":None,"rgba_sha256":None})
    for folder in ("mechanism6-actual","hexa4-actual","design4-actual","feedback1-actual","feedback2-actual"):
        source = root/"2026-11-05"/folder
        result = read_json(source/"result.json")
        if "records" in result:
            for case, item in result["records"].items():
                if not item.get("opportunity_consumed"):
                    continue
                path = source/"recovered"/Path(item["output_file"]).name
                rows.append(dict(check_output(read_json(path.with_suffix(".history.json")),item["prompt_id"],
                                              path.read_bytes(),item["output_image_sha256"]),case=case,group=folder))
        else:
            for case in result["completed"]:
                pid = read_json(source/(case+"-accepted.json"))["prompt_id"]
                out = read_json(source/(case+"-output.json"))
                hist = read_json(source/(case+"-history.json"))
                rows.append(dict(check_output(hist,pid,(source/(case+".png")).read_bytes(),out["sha256"]),
                                 case=case,group=folder))
    expected = {digest(a["prompt_id"].encode()): (a["status"] == "completed", a["sampler_cached"])
                for a in ledger["attempts"]}
    actual = {r["record"]: (r["png_sha256"] is not None, r["cache"]) for r in rows}
    require(len(expected) == len(ledger["attempts"]) == len(rows) == len(actual) and expected == actual,
            "Register does not reconcile to original records")
    return rows


def counts(rows):
    images = [r for r in rows if r["png_sha256"] is not None]
    return {"opportunities":len(rows),"completed_png_records":len(images),
            "sampler_cached":sum(r["cache"] is True for r in images),
            "sampler_uncached":sum(r["cache"] is False for r in images),
            "accepted_without_recovered_image":len(rows)-len(images),
            "distinct_png_bytes":len({r["png_sha256"] for r in images}),
            "distinct_rgba_rasters":len({r["rgba_sha256"] for r in images})}


def run(root):
    p = root/"2026-11-02/formal-main18/formal-main18-actual-results.zip"
    main = complete_zip(p,"formal-main18",main=True)
    cells = {f"L{l}S{s}C{c}" for l in (1,2,3) for s in (1,2,3) for c in (0,1)}
    require(len(main) == 18 and {r["case"] for r in main} == cells, "Main factorial incomplete")
    later = additional(root)
    s1 = complete_zip(root/"2026-11-07/reading-to-s0/s1-launch-v2-original-results.zip", "S1")
    require(len(s1) == 6 and {r["case"] for r in s1} == {f"S1-B{b}-{t}" for b in (1,2) for t in "TLF"}, "Incomplete S1")
    rows = main + later + s1
    require(len(rows) == len({r["record"] for r in rows}), "Overlapping prompt receipts")
    return {"unit":"accepted prompt receipt, within the named batch", "main18":counts(main),
            "additional39":counts(later),"S1":counts(s1),
            "additional_stages":{stage:counts([r for r in later if r["group"]==stage])
                                 for stage in sorted({r["group"] for r in later})},
            "record_ids_disjoint_across_batches":True,
            "rgba_definition":"SHA256 of decoded 1024 x 1024 RGBA bytes without resizing; no perceptual clustering",
            "rows":rows}


if __name__ == "__main__":
    print(json.dumps(run(Path(sys.argv[1])), indent=2))
