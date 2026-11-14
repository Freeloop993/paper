"""GPU 日程队列：按文件名顺序逐份提交 queue/ 中的请求到本机 ComfyUI，回收原图与回执。

用法：python3 queue_runner.py --root /root/gpu-day-20261115 --comfy http://127.0.0.1:8189
规则（出图前登记）：每份只提交一次；失败、超时或状态未知即登记到 failed/ 并继续下一份，不重试、不换种子；
执行图须与请求一致，采样节点（10）不得命中缓存；queue/ 为空时每 20 秒检查一次，出现 STOP 文件则退出。
每份输出到 out/<请求号>/：request.json（提交的原字节）、ack.json、history.json、<请求号>.png；progress.jsonl 逐份追加。
"""
import argparse, hashlib, json, shutil, time, traceback, urllib.request
from pathlib import Path


def call(url, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"} if data else {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def run_one(comfy, inp, path, out, timeout):
    raw = path.read_bytes(); req = json.loads(raw)
    for v in req["prompt"].values():
        if v["class_type"] == "LoadImage":
            assert (inp / v["inputs"]["image"]).is_file(), f"缺输入图 {v['inputs']['image']}"
    out.mkdir(parents=True, exist_ok=True); (out / "request.json").write_bytes(raw)
    t0 = time.time(); ack = json.loads(call(comfy + "/prompt", raw)); (out / "ack.json").write_text(json.dumps(ack, indent=2))
    pid = ack["prompt_id"]
    while time.time() - t0 < timeout:
        time.sleep(4)
        h = json.loads(call(f"{comfy}/history/{pid}"))
        if pid in h and (h[pid].get("status", {}).get("completed") or h[pid].get("status", {}).get("status_str") == "error"):
            hist = h[pid]; break
    else:
        raise TimeoutError("超时或状态未知")
    (out / "history.json").write_text(json.dumps(hist, ensure_ascii=False, indent=2))
    assert hist["status"]["status_str"] == "success", f"终态 {hist['status']['status_str']}"
    assert {k: (v["class_type"], v["inputs"]) for k, v in hist["prompt"][2].items()} == \
           {k: (v["class_type"], v["inputs"]) for k, v in req["prompt"].items()}, "执行图与请求不一致"
    cached = [n for kind, d in hist["status"]["messages"] if kind == "execution_cached" for n in d.get("nodes", [])]
    assert "10" not in cached, "采样节点命中缓存"
    imgs = [im for node in hist["outputs"].values() for im in node.get("images", [])]
    assert len(imgs) == 1, f"输出图数量 {len(imgs)}"
    im = imgs[0]
    png = call(f"{comfy}/view?filename={im['filename']}&subfolder={im.get('subfolder', '')}&type={im.get('type', 'output')}", timeout=120)
    rid = req["prompt"]["12"]["inputs"]["filename_prefix"]; (out / f"{rid}.png").write_bytes(png)
    return {"id": rid, "prompt_id": pid, "seconds": round(time.time() - t0, 1), "request_sha256": hashlib.sha256(raw).hexdigest(),
            "png_sha256": hashlib.sha256(png).hexdigest(), "completed_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--root", required=True); ap.add_argument("--comfy", required=True)
    ap.add_argument("--timeout", type=int, default=1200); a = ap.parse_args()
    root = Path(a.root); inp = root / "inputs"
    for d in ("queue", "running", "done", "failed", "out"):
        (root / d).mkdir(exist_ok=True)
    log = (root / "progress.jsonl").open("a", buffering=1)
    while not (root / "STOP").exists():
        items = sorted((root / "queue").glob("*.json"))
        if not items:
            time.sleep(20); continue
        src = items[0]; run = root / "running" / src.name; shutil.move(src, run)
        stem = run.stem.split("-", 1)[1]
        try:
            rec = run_one(a.comfy, inp, run, root / "out" / stem, a.timeout); rec["queue_file"] = run.name
            shutil.move(run, root / "done" / run.name); log.write(json.dumps({"ok": True, **rec}, ensure_ascii=False) + "\n")
        except Exception as e:
            (root / "out" / stem).mkdir(parents=True, exist_ok=True)
            (root / "out" / stem / "error.txt").write_text(traceback.format_exc())
            shutil.move(run, root / "failed" / run.name)
            log.write(json.dumps({"ok": False, "queue_file": run.name, "error": f"{type(e).__name__}: {e}",
                                  "at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
