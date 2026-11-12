"""L1 step 0, run beside the supplied guides on the existing ComfyUI server."""
import hashlib
import json
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zipfile import ZipFile, ZIP_DEFLATED

BASE = "http://127.0.0.1:8188"
HERE = Path(__file__).resolve().parent
OUT = HERE / "step0"
OUT.mkdir(exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()


def get(path):
    with urlopen(BASE + path, timeout=20) as response:
        return response.read()


def record(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf8")


def main():
    # Input PNGs are registered in the active server's own input directory via upload/image.
    import requests
    guide_rows = json.loads((HERE / "guides.json").read_bytes())
    classes = json.loads(get("/object_info"))
    edit = json.loads((HERE / "L1-F-wl0.70-r1.json").read_bytes())["prompt"]
    keys = {v["class_type"]: sorted(v["inputs"]) for v in edit.values()}
    schema = {k: classes[k] for k in ["TextEncodeQwenImage21", "Canny", "QwenImageDiffsynthControlnet"]}
    record("node-schemas.json", schema)
    record("edit-graph-keys.json", keys)
    records = []
    for kind in ("line", "blades"):
        name = f"{kind}-wl0.70.png"
        data = (HERE / name).read_bytes()
        assert sha(data) == next(r["sha256"] for r in guide_rows if r["file"] == name)
        upl = requests.post(BASE + "/upload/image", files={"image": (name, data, "image/png")},
                            data={"subfolder": "l1-step0", "type":"input"}, timeout=20)
        upl.raise_for_status()
        img = upl.json()
        remote = img["subfolder"] + "/" + img["name"]
        recovered = get("/view?" + urlencode(dict(filename=img["name"], subfolder=img["subfolder"], type="input")))
        assert sha(recovered) == sha(data)
        graph = {"5":{"class_type":"LoadImage","inputs":{"image":remote}},
                 "6":{"class_type":"ImageScale","inputs":{"image":["5",0],"upscale_method":"nearest-exact","width":1024,"height":1024,"crop":"disabled"}},
                 "7":{"class_type":"Canny","inputs":{"image":["6",0],"low_threshold":0.4,"high_threshold":0.8}},
                 "8":{"class_type":"SaveImage","inputs":{"images":["7",0],"filename_prefix":"L1_step0_" + kind}}}
        response = requests.post(BASE + "/prompt",json={"prompt":graph},timeout=20)
        response.raise_for_status()
        pid = response.json()["prompt_id"]
        for _ in range(90):
            hist = json.loads(get("/history/" + pid)).get(pid)
            if hist:
                break
            time.sleep(1)
        assert hist and hist["status"]["status_str"] == "success", pid
        output = hist["outputs"]["8"]["images"][0]
        edge = get("/view?" + urlencode(output))
        (OUT / ("actual-canny-" + name)).write_bytes(edge)
        records.append(dict(kind=kind, input_sha256=sha(data), node_graph=graph,
                            prompt_id=pid, server_output=output, output_sha256=sha(edge)))
        record("edge-receipts.json", records)
    pins = json.loads((HERE.parent / "verified-material.json").read_bytes())
    record("material.json", {"source_commit":pins["commit"],"patch":pins["weights"][-1],"source":pins["union_source"]})
    # File list is explicit so that unrelated server data cannot enter the archive.
    with ZipFile(HERE.parent / "L1-step0-originals.zip", "w", ZIP_DEFLATED) as archive:
        for p in sorted(OUT.iterdir()):
            archive.write(p,p.name)
    print("L1_STEP0", len(records), sha((HERE.parent / "L1-step0-originals.zip").read_bytes()))


if __name__ == "__main__":
    main()
