"""Rebuild or verify the twelve unsigned Qwen shape-pilot API requests, offline."""
import argparse
from copy import deepcopy
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile, ZipInfo

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ROUND2 = Path("evidence/form342-h3-dev/round-2")
L1 = Path("experiments/l1-layout")
ACTUAL = Path("evidence/l1-layout-actual/L1-actual")
MATERIAL = Path("evidence/r0-20261112/environment/verified-material.json")
GUIDE_SHA = "15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338"
INPUT = "qwen-shape-dots-250-" + GUIDE_SHA[:12] + ".png"
ZIP_NAME = "qwen-shape-pilot-offline.zip"
CASES = {"S0": {}, "S1": {"body_plan": "box"}, "S2": {"arm_root": "socket"},
         "S3": {"arm_root": "hinge"}, "S4": {"camera": "projecting"}, "S5": {"cover": "multi"}}
TEMPLATE_SHAS = ("06e8f6aee5e47665b5cbd165490d359e112b9386220d8e31b0115a00f0f4bc9b",
                 "c3170d6c0e6d0ffb0f10d856d9a65ea691a301df2f283291cb49ded70a407324")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return sha256(data).hexdigest()


def encode(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def read(path, expected=None):
    data = (ROOT / path).read_bytes()
    if expected is not None:
        require(digest(data) == expected, f"Source SHA-256 differs: {path}")
    return data


def read_json(path):
    return json.loads(read(path))


def template(rep, registration):
    case = f"L1-F-wl0.70-r{rep}"
    source = ACTUAL / case
    original = read(source / "request.actual.json", TEMPLATE_SHAS[rep - 1])
    require(original == read(L1 / "requests" / (case + ".json")), f"Frozen/actual request: {case}")
    request = json.loads(original)
    row = next(r for r in registration if r["position"] == case)
    ack = read_json(source / "response.original.json")
    pid = ack["prompt_id"]
    hist = read_json(source / "history.original.json")[pid]
    receipt = read_json(source / "receipt.json")
    status = hist["status"]
    require(ack["node_errors"] == {} and hist["prompt"][:2] == [ack["number"], pid]
            and hist["prompt"][2] == request["prompt"] and status["completed"] is True
            and status["status_str"] == "success", f"History mismatch: {case}")
    cached = [p["nodes"] for kind, p in status["messages"] if kind == "execution_cached" and p["prompt_id"] == pid]
    require(len(cached) == 1 and "10" not in cached[0], f"Missing original sampling evidence: {case}")
    require(receipt["position"] == case and receipt["prompt_id"] == pid
            and row["request_sha256"] == receipt["request_sha256"] == digest(original)
            and row["seed"] == request["prompt"]["10"]["inputs"]["seed"]
            and hist["outputs"]["12"]["images"] == [receipt["server_output"]], f"Receipt mismatch: {case}")
    require(len(read(source / "original.png", receipt["original_sha256"])) == receipt["bytes"],
            f"Original PNG size differs: {case}")
    guide = row["input_image"]
    require(guide == request["prompt"]["15"]["inputs"]["image"], f"Input differs: {case}")
    read(L1 / "guides" / guide, row["input_sha256"])
    return request, {"path": source.as_posix(), "prompt_id": pid, "request_sha256": digest(original),
                     "guide": guide, "guide_sha256": row["input_sha256"], "layout_wl": row["wl"],
                     "original_png_sha256": receipt["original_sha256"],
                     "history_sha256": digest(read(source / "history.original.json")),
                     "receipt_sha256": digest(read(source / "receipt.json"))}


def pack_files():
    dictionary = read(ROUND2 / "dictionary.json", "22ca89232e010ae603f34096dd3f5ccfcf62b7faa91161b157fb6007514f06a9")
    d = json.loads(dictionary)
    guide = read(ROUND2 / "guides/dots.png", GUIDE_SHA)
    fields = read_json(ROUND2 / "manifest.json")["rows"]
    h3 = {r["id"]: r for r in fields}
    registration = read_json(L1 / "manifest.json")
    templates, sources = zip(*(template(rep, registration) for rep in (1, 2)))
    graph = templates[0]["prompt"]
    material = json.loads(read(MATERIAL, "078ef310fe086292a0349b568a372a0d2cbcc0ca9826900080318508d316d0e3"))
    historical = {w["path"]: w for w in material["weights"]}
    loaders = [("1", "diffusion_models", "unet_name"), ("2", "text_encoders", "clip_name"), ("3", "vae", "vae_name")]
    used = [historical[category + "/" + graph[node]["inputs"][field]] for node, category, field in loaders]
    weights = {"reference_only": True, "source": MATERIAL.as_posix(), "comfyui_commit": material["commit"],
               "weights": used, "total_bytes": sum(w["bytes"] for w in used)}
    files = {"dictionary.json": dictionary, "input/" + INPUT: guide, "weights.json": encode(weights)}
    rows = []
    for condition, changes in CASES.items():
        target = d["base"] | changes
        lines = [d["fixed_lines"][k] if k in d["fixed_lines"] else d["params"][k][target[k]] for k in d["line_order"]]
        text = "\n".join(lines)
        for rep, original in enumerate(templates, 1):
            h3_id = f"{condition}-{rep}"
            saved = read_json(ROUND2 / "actual" / h3_id / "submission.json")
            require(saved["fields"] == h3[h3_id]["fields"] and saved["fields"]["prompt"] == text
                    and saved["target"] == h3[h3_id]["target"] == target and saved["condition"] == condition
                    and saved["rep"] == rep and saved["input_source"] == "guides/dots.png"
                    and saved["input_sha256"] == h3[h3_id]["input_sha256"] == GUIDE_SHA, f"H3 source differs: {h3_id}")
            name = f"QSP-{condition}-r{rep}"
            req = deepcopy(original)
            nodes = req["prompt"]
            nodes["4"]["inputs"]["prompt"] = text
            nodes["15"]["inputs"]["image"] = INPUT
            nodes["12"]["inputs"]["filename_prefix"] = name
            path = "requests/" + name + ".json"
            raw = files[path] = encode(req)
            seed = nodes["10"]["inputs"]["seed"]
            rows.append(dict(id=name, condition=condition, rep=rep, target=target, seed=seed, request=path,
                             request_sha256=digest(raw), prompt_sha256=digest(text.encode()),
                             input_name=INPUT, input_file="input/" + INPUT, input_sha256=GUIDE_SHA,
                             historical_template=sources[rep-1]["path"], h3_submission=h3_id))
    manifest = {
        "batch": "qwen-shape-pilot", "status": "offline_compiled_unsigned", "planned": 12,
        "source_issue": "https://github.com/Freeloop993/paper/issues/1#issuecomment-6858488547",
        "edit_route_order": "https://github.com/Freeloop993/paper/issues/1#issuecomment-6854091119",
        "method_freeze_pr": 70, "method_freeze_head": "d3290ebbaccb1319ec1ee48365630a6e4cd1427f",
        "method_section_3_signed": False, "dictionary": d["version"], "dictionary_sha256": digest(dictionary),
        "reading_protocol": "v2.2", "guide_source": (ROUND2 / "guides/dots.png").as_posix(),
        "guide": {"span_mm": 250, "layout_wl": 1.0, "hub_span_fraction_approx": 0.41, "palette": "regular"},
        "per_image_reading": {
            "all_positions": True, "order": ["front_left", "front_right", "rear_right", "rear_left"],
            "appearance": ["nose_end", "nose_projection", "body_plan", "four_roots", "cover"],
            "common": ["four_motor_hubs_xy", "blade_count_per_hub", "guard", "marker_residue",
                       "camera_including_tail", "product_appearance"],
            "camera_codes": ["consistent", "invisible", "wrong", "U"],
            "overall": "four distinct motors each with two blades AND no observed camera misplacement AND product appearance; report camera invisible and U separately",
            "descriptive_wl": "(max(hub_x)-min(hub_x))/(max(hub_y)-min(hub_y)); null if any hub unreadable or vertical span zero, no pass threshold",
        },
        "template_sources": sources, "weights_sha256": digest(files["weights.json"]),
        "seed_policy": "L1-F seeds 2026111301/2026111302 paired by repeat across S0-S5. Within each repeat only the positive prompt varies as an experimental input.",
        "historical_comparison": "L1-F ran W/L 0.70 and 1.30, not 1.00; the historical reference PNG and positive prompt both differ. Same-seed side-by-side is descriptive only.",
        "backend_gate": {"nonbaseline_target_hits_min_per_two": 1, "overall_pass_min_per_twelve": 9},
        "platform_observed_for_this_batch": None,
        "pending_on_platform": ["original instance and listener identity", "live node schemas and exact weight bytes/SHA-256",
                                "served input bytes", "per-position acceptance, sampler/cache evidence, PNG and history", "fees"],
        "rows": rows,
    }
    files["manifest.json"] = encode(manifest)
    return files


def archive_bytes(files):
    stream = BytesIO()
    with ZipFile(stream, "w") as archive:
        for name, data in sorted(files.items()):
            entry = ZipInfo(name)  # Fixed timestamp, permissions and storage across machines.
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data, compress_type=ZIP_STORED)
    return stream.getvalue()


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--check", action="store_true", help="read only; compare sources, loose files and ZIP")
    args = cli.parse_args()
    files = pack_files()
    expected = {**files, ZIP_NAME: archive_bytes(files)}
    for name, data in expected.items():
        path = HERE / name
        if not args.check and not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as stream:
                stream.write(data)
        require(path.read_bytes() == data, f"Different existing output: {name}")
    for subdir in ("requests", "input"):
        actual = {p.relative_to(HERE).as_posix() for p in (HERE / subdir).rglob("*") if p.is_file()}
        require(actual == {n for n in files if n.startswith(subdir + "/")}, f"Unexpected files in {subdir}")
    with ZipFile(HERE / ZIP_NAME) as archive:
        require(archive.testzip() is None and sorted(archive.namelist()) == sorted(files), "Archive members differ")
        for name, data in files.items():
            require(archive.read(name) == data, f"Archive contents differ: {name}")
    print(f"{len(CASES)} conditions x 2, {len(files)} archive members, SHA-256 {digest(expected[ZIP_NAME])}")


if __name__ == "__main__":
    main()
