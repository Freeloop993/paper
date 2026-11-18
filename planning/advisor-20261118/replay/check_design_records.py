"""Verify logged quad/hexa case histories offline using Pillow. No model or service is used.
The repository defaults assume an e96d419 checkout; supply the separate 9afe690 independent-reading JSON.
"""
import argparse
import hashlib
import io
import json
import math
import zipfile
from pathlib import Path
from PIL import Image, ImageChops


def check(ok, field):
    if not ok:
        raise ValueError(field)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_bytes())


def pick(rows, key, value):
    hits = [row for row in rows if row[key] == value]
    check(len(hits) == 1, f"expected one record for {key}={value}")
    return hits[0]


def one_node(graph, kind):
    entries = [(k, v) for k, v in graph.items() if v["class_type"] == kind]
    check(len(entries) == 1, "one " + kind)
    return entries[0]


def guide_hubs(image_bytes):
    # The two archived point-line guides use isolated red dots for visible motor centres.
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    red = {(i % img.width, i // img.width) for i, (r, g, b) in enumerate(img.getdata())
           if r > 140 and g < 100 and b < 100}
    groups = []
    while red:
        stack = [red.pop()]
        group = list(stack)
        while stack:
            x, y = stack.pop()
            for near in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if near in red:
                    red.remove(near)
                    stack.append(near)
                    group.append(near)
        groups.append(len(group))
    return sorted(groups)


def verify_case(name, registered, actual, ack, history, png_bytes, entry, guide_dir, count):
    check(actual == registered, name + " frozen vs submitted bytes")
    check(sha(actual) == entry["request_sha256"], name + " registration hash")
    graph = json.loads(actual)["prompt"]
    check(ack["prompt_id"] == history["prompt"][1] and ack.get("node_errors") == {}, name + " receipt")
    check(history["prompt"][2] == graph, name + " executed graph")
    check(history["status"]["completed"] and history["status"]["status_str"] == "success", name + " completed")
    status = history["status"]["messages"]
    sampler, ks = one_node(graph, "KSampler")
    check(any(t == "execution_success" and v["prompt_id"] == ack["prompt_id"] for t,v in status), name + " success ID")
    check(all(sampler not in v["nodes"] for t,v in status if t == "execution_cached"), name + " sampler cached")
    save, _ = one_node(graph, "SaveImage")
    outputs = history["outputs"][save]["images"]
    check(len(outputs) == 1 and outputs[0]["filename"].startswith(name+"_"), name + " output identity")
    check(ks["inputs"]["seed"] == entry["seed"], name + " registered seed")
    img = Image.open(io.BytesIO(png_bytes))
    embedded = json.loads(img.info["prompt"])
    load, node = one_node(graph, "LoadImage")
    guide_name = node["inputs"]["image"]
    guide = (guide_dir / guide_name).read_bytes()
    check(embedded[load].pop("is_changed") == [sha(guide)], name + " guide hash in PNG")
    check(embedded == graph, name + " normalized PNG graph")
    components = guide_hubs(guide)
    check(len(components) == count, name + " visible guide dots")
    _, text_node = one_node(graph, "TextEncodeQwenImage21")
    pos = text_node["inputs"]["prompt"]
    check(text_node["inputs"]["images.image_1"] == [load, 0], name + " guide linked to conditioning")
    check("orthographic top view" in pos.lower(), name + " visual task")
    return {"record": name, "image_sha256": sha(png_bytes), "request_sha256": sha(actual),
            "guide": guide_name, "guide_sha256": sha(guide), "guide_red_components": len(components),
            "prompt_sha256": sha(pos.encode()), "registered_seed": entry["seed"], "size": list(img.size),
            "completed": True, "sampler_uncached": True, "history_and_png_graph_match": True}


def quad_check(root, guides, compare_dir, batch):
    plan = root / "experiments/e3-quad-qwen/round-3"
    actual = root / "evidence/e3-quad-qwen-20261115/round-3"
    name = "E3R3-B2"
    prefix = actual / "originals" / name
    manifest = read(plan / "manifest.json")
    spec = read(plan / "specs.json")["cards"]["B"]
    entry = pick(manifest["requests"], "id", name)
    check(spec["params"] == entry["params"] and spec["seeds"][1] == entry["seed"], "B2 design card")
    png = prefix.with_suffix(".png").read_bytes()
    result = verify_case(name, (plan/"requests"/(name+".request.json")).read_bytes(),
                         prefix.with_suffix(".request.json").read_bytes(), read(prefix.with_suffix(".ack.json")),
                         read(prefix.with_suffix(".history.json")), png, entry, guides, 4)
    check(result["guide_sha256"] == manifest["guide_sha256"] and result["prompt_sha256"] == entry["prompt_sha256"], "B2 input lookup")
    _, label = one_node(read(prefix.with_suffix(".request.json"))["prompt"], "TextEncodeQwenImage21")
    check(label["inputs"]["prompt"] == entry["prompt"] and "quadcopter" in entry["prompt"].lower()
          and label["inputs"]["negative_prompt"] == manifest["negative_prompt"], "B2 task text")
    review_file = actual / "author-review/E3R3-author-review.json"
    review = read(review_file)
    decision = read(actual / "author-review/parent-selection.json")
    review_row = pick(review["reviews"], "id", name)
    check({r["id"] for r in review["reviews"]} == {r["id"] for r in manifest["requests"]}, "candidate list")
    check(review["role"] == "author" and review["decision"]["parent"] is None, "original ballot")
    check(decision["parent_id"] == name and decision["image_sha256"] == result["image_sha256"] == review_row["image_sha256"], "later selection")
    check(decision["original_author_review_sha256"] == sha(review_file.read_bytes()), "ballot hash")
    result["candidate_ids_reviewed"] = len(review["reviews"])
    result["first_ballot_parent"] = None
    result["later_author_selected"] = name
    comparison = read(root / "experiments/e3-deepening/end-comparison/comparison.json")
    check(comparison["parent_sha256"] == result["image_sha256"], "manual composition parent")
    parent_img = Image.open(io.BytesIO(png)).convert("RGB")
    no_window = Image.open(compare_dir / "B2-no-window.png").convert("RGB")
    result["manual_composition_changed_pixels"] = {}
    for target, expected in comparison["files"].items():
        b = (compare_dir / target).read_bytes()
        check(sha(b) == expected["sha256"], "composition " + target)
        image = Image.open(io.BytesIO(b)).convert("RGB")
        diff = ImageChops.difference(parent_img if target == "B2-no-window.png" else no_window, image)
        count = sum(px != (0,0,0) for px in diff.getdata())
        check(count == expected["rgb_delta"]["pixels"] and list(diff.getbbox()) == [
            expected["rgb_delta"]["xy_bounds_inclusive"][0], expected["rgb_delta"]["xy_bounds_inclusive"][1],
            expected["rgb_delta"]["xy_bounds_inclusive"][2]+1, expected["rgb_delta"]["xy_bounds_inclusive"][3]+1], "composition delta")
        result["manual_composition_changed_pixels"][target] = count
    with zipfile.ZipFile(batch) as z:
        slot = "dev/REV2B-dev-B2-r1/"
        req = json.loads(z.read(slot+"request.json"))["prompt"]
        history = json.loads(z.read(slot+"history.json"))
        ack = json.loads(z.read(slot+"ack.json"))
        check(history["status"]["completed"] and history["status"]["status_str"] == "success" and history["prompt"][1] == ack["prompt_id"] and history["prompt"][2] == req, "follow-up executed")
        pic = Image.open(io.BytesIO(z.read(slot+"REV2B-dev-B2-r1.png")))
        graph = json.loads(pic.info["prompt"])
        loaded = {}
        for k,n in graph.items():
            if n["class_type"] != "LoadImage":
                continue
            fname=n["inputs"]["image"]
            h=sha((guides/fname).read_bytes())
            check(n.pop("is_changed") == [h], "follow-up loaded input")
            loaded[fname] = h
        check(graph == req and loaded.get(name+".png") == result["image_sha256"], "return to B2")
        result["follow_up_actual_inputs"] = loaded
    return result


def hexa_check(archive, freeze, guides, paired, independent):
    name = "HEXA3-wl1.00-r01"
    manifest = read(freeze / "manifest.json")
    entry = pick(manifest["requests"], "id", name)
    path = "requests/07-" + name + ".json"
    registered = (freeze/path).read_bytes()
    with zipfile.ZipFile(archive) as z:
        slot = f"hexa/{name}/"
        actual = z.read(slot+"request.json")
        check(json.loads(z.read("manifest.json")) == manifest, "hex archive manifest")
        check(z.read("experiments/gpu-day-20261115/hexa-fix/"+path) == registered, "frozen duplicate")
        check(len({p.split("/")[1] for p in z.namelist() if p.startswith("hexa/") and p.endswith("/request.json")}) == 39, "corrected run set")
        corrected_png = z.read(slot+name+".png")
        result = verify_case(name, registered, actual, json.loads(z.read(slot+"ack.json")),
                             json.loads(z.read(slot+"history.json")), corrected_png, entry, guides, 6)
    _,n = one_node(json.loads(actual)["prompt"],"TextEncodeQwenImage21")
    positive = n["inputs"]["prompt"].lower()
    check("six-rotor" in positive and "agricultural" in positive and "quadcopter" not in positive and "four motor" not in positive, "hex scope in positive")
    check(n["inputs"]["negative_prompt"] == manifest["negative"] and entry["inputs"] == [result["guide"]], "corrected task matches manifest")
    pair = pick(read(paired)["pairs"],"corrected",name)
    check(pair["corrected_png_sha256"] == result["image_sha256"] and not pair["decoded_rgb_identical"] and pair["old"] == entry["replaces"], "correction pair")
    old = pair["old"]
    with zipfile.ZipFile(archive.with_name("pairs-originals.zip")) as z:
        old_png = z.read(f"historical/{old}/{old}.png")
        old_graph = json.loads(z.read(f"historical/{old}/request.json"))["prompt"]
    check(sha(old_png) == pair["old_png_sha256"], "prior PNG")
    decode = lambda data: Image.open(io.BytesIO(data)).convert("RGB")
    check(ImageChops.difference(decode(old_png), decode(corrected_png)).getbbox() is not None, "new pixels")
    corrected_graph = json.loads(actual)["prompt"]
    changes = sorted(f"{i}/{key}" for i,node in old_graph.items() for key in node["inputs"]
                     if corrected_graph[i]["inputs"][key] != node["inputs"][key])
    check(changes == ["12/filename_prefix","4/negative_prompt"], "only negative text and output name changed")
    for change in changes:
        node_id, field = change.split("/")
        old_graph[node_id]["inputs"][field] = corrected_graph[node_id]["inputs"][field]
    check(old_graph == corrected_graph, "remaining prior graph equals corrected graph")
    row = pick(read(independent),"run",name)
    pts = row["axes"]
    w = max(x for x,y in pts)-min(x for x,y in pts)
    h = max(y for x,y in pts)-min(y for x,y in pts)
    q = (w/h)/(2/math.sqrt(3))
    check(len(pts) == 6 and abs(q-row["q"]) < 1e-9, "independent normalized span")
    result.update({"replaces": pair["old"],"previous_run_is_separate": True,"corrected_fields": changes,
                   "independent_ai_q": round(q,6),
                   "independent_label": row["id"],
                   "human_selection": None, "paired_user_session": None})
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("repo",type=Path)
    p.add_argument("--guides",type=Path)
    p.add_argument("--hexa-freeze",type=Path)
    p.add_argument("--archives",type=Path)
    p.add_argument("--manual-images",type=Path)
    p.add_argument("--independent-read",type=Path, required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    gpu=a.repo/"experiments/gpu-day-20261115"
    guides=a.guides or gpu/"inputs"
    archives=a.archives or a.repo/"evidence/gpu-day-20261115/dual-hexa-handoff"
    freeze=a.hexa_freeze or gpu/"hexa-fix"
    manual=a.manual_images or a.repo/"experiments/e3-deepening/end-comparison"
    results={"source_commit":"e96d41946ea84237da506bb76c2f713a3f3b9275",
             "reader_commit":"9afe6903b0368cd86ced367c3675bb4a7adc98e2",
             "quad": quad_check(a.repo,guides,manual,archives/"dev-originals.zip"),
             "hex": hexa_check(archives/"hexa-originals.zip",freeze,guides,archives/"paired-check.json",a.independent_read),
             "new_generation":0, "new_human_sessions":0}
    a.out.write_text(json.dumps(results,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


if __name__=="__main__":
    main()
