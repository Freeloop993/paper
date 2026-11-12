"""Execute the frozen L1 requests once on the existing ComfyUI instance."""
from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
import json
import os
from pathlib import Path
import time
import zipfile

from PIL import Image
import requests

BASE = "http://127.0.0.1:8188"
KIT = Path(__file__).resolve().parent
ROOT = KIT.parent
OUT = ROOT / "L1-actual"
DIGEST = "47ac288b2994edb80d2d766329f9044932320a3dc902d99887cb18d6b97791d6"
session = requests.Session()
session.trust_env = False


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(data):
    return sha256(data).hexdigest()


def record(path, value):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    os.replace(tmp, path)


def checked_get(path, **params):
    result = session.get(BASE + path, params=params, timeout=30)
    result.raise_for_status()
    return result


def bind_inputs(rows):
    unique = {}
    for row in rows:
        name = row["position"]
        raw = (KIT / "requests" / (name + ".json")).read_bytes()
        assert digest(raw) == row["request_sha256"], name
        image = row["input_image"]
        assert unique.setdefault(image, row["input_sha256"]) == row["input_sha256"]
    assert len(rows) == len({r["position"] for r in rows}) == 28
    assert digest("".join(r["request_sha256"] for r in rows).encode()) == DIGEST
    receipts = []
    for name, expected in unique.items():
        data = (KIT / "inputs" / name).read_bytes()
        assert digest(data) == expected
        params = {"type": "input", "filename": name}
        result = session.get(BASE + "/view", params=params, timeout=20)
        if result.status_code == 404:
            upload = session.post(BASE + "/upload/image", data={"type": "input"},
                                  files={"image": (name, data, "image/png")}, timeout=30)
            upload.raise_for_status()
            details = upload.json()
            assert details["name"] == name and not details["subfolder"], details
            result = checked_get("/view", **params)
        result.raise_for_status()
        assert digest(result.content) == expected, name
        receipts.append({"input_image": name, "input_sha256": expected})
    record(OUT / "bound-inputs.json", receipts)


def run_one(row):
    name = row["position"]
    folder = OUT / name
    folder.mkdir()
    raw = (KIT / "requests" / (name + ".json")).read_bytes()
    (folder / "request.actual.json").write_bytes(raw)
    record(folder / "attempt.json", {"position": name, "submitted_at": now(), "sha256": digest(raw)})
    response = session.post(BASE + "/prompt", data=raw, headers={"Content-Type": "application/json"}, timeout=45)
    (folder / "response.original.json").write_bytes(response.content)
    response.raise_for_status()
    pid = response.json()["prompt_id"]
    print("ACCEPTED", name, pid, now(), flush=True)
    deadline = time.monotonic() + 1800
    while time.monotonic() < deadline:
        answer = checked_get("/history/" + pid)
        history = answer.json().get(pid)
        if history:
            break
        time.sleep(3)
    else:
        raise TimeoutError(f"No terminal history for {pid}")
    (folder / "history.original.json").write_bytes(answer.content)
    # ComfyUI may add internal metadata outside the node graph.
    graph = json.loads(raw)["prompt"]
    actual_graph = history["prompt"][2]
    if {k:(v["class_type"],v["inputs"]) for k,v in actual_graph.items()} != {k:(v["class_type"],v["inputs"]) for k,v in graph.items()}:
        raise ValueError(f"History graph differs at {name}")
    if history["status"]["status_str"] != "success":
        raise RuntimeError(f"ComfyUI terminal status {history['status']['status_str']} at {name}")
    images = history["outputs"]["12"]["images"]
    assert len(images) == 1, images
    image = checked_get("/view", **images[0]).content
    (folder / "original.png").write_bytes(image)
    with Image.open(BytesIO(image)) as picture:
        assert picture.format == "PNG" and picture.size == (1024, 1024)
        picture.verify()
    receipt = {"position": name, "prompt_id": pid, "completed_at": now(), "request_sha256": digest(raw),
               "input_sha256": row["input_sha256"], "original_sha256": digest(image), "bytes": len(image),
               "server_output": images[0]}
    record(folder / "receipt.json", receipt)
    return receipt


def archive():
    path = ROOT / "L1-originals.zip"
    tmp = path.with_suffix(".partial")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as out:
        for p in sorted(OUT.rglob("*")):
            if p.is_file() and p.suffix != ".tmp":
                out.write(p, p.relative_to(ROOT))
    tmp.replace(path)
    print("ARCHIVE", path.name, digest(path.read_bytes()), flush=True)


def main():
    rows = json.loads((KIT / "manifest.json").read_bytes())
    queue = checked_get("/queue").json()
    if queue["queue_running"] or queue["queue_pending"]:
        raise RuntimeError("ComfyUI queue occupied")
    OUT.mkdir(exist_ok=False)
    progress = {"started_at": now(), "digest": DIGEST, "manifest_positions": len(rows), "completed": []}
    record(OUT / "progress.json", progress)
    try:
        bind_inputs(rows)
        for row in rows:
            progress["current"] = row["position"]
            record(OUT / "progress.json", progress)
            receipt = run_one(row)
            progress["completed"].append(receipt["position"])
            record(OUT / "progress.json", progress)
            print("SAVED", len(progress["completed"]), receipt["position"], receipt["original_sha256"], flush=True)
            if len(progress["completed"]) % 4 == 0:
                archive()
        progress["state"] = "completed"
    except Exception as error:
        progress.update(state="stopped", error=f"{type(error).__name__}: {error}")
        raise
    finally:
        progress["ended_at"] = now()
        record(OUT / "progress.json", progress)
        archive()


if __name__ == "__main__":
    main()
