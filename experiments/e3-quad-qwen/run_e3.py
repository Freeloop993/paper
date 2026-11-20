"""在 GPU 服务器上逐份提交 E3 请求到本机 ComfyUI，并回收原图与回执。

用法：python3 run_e3.py --comfy http://127.0.0.1:8188 --input-dir /path/ComfyUI/input --out ./e3-out requests/E3-*.request.json
规则：按给定顺序逐份提交；任一份失败、超时或状态未知即停止，不自动重试、不换种子。
每份保存：<id>.request.json（实际提交的字节）、<id>.ack.json、<id>.history.json、<id>.png，以及 run-log.json。
只用标准库。
"""
import argparse
import hashlib
import json
import time
import urllib.request
from pathlib import Path

GUIDE_NAME = "qwen-shape-dots-250-15c5ad1c924b.png"
GUIDE_SHA = "15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338"


def call(url, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"} if data else {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--comfy", required=True)
    ap.add_argument("--input-dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--timeout", type=int, default=900)
    ap.add_argument("requests", nargs="+")
    a = ap.parse_args()
    guide = Path(a.input_dir) / GUIDE_NAME
    assert hashlib.sha256(guide.read_bytes()).hexdigest() == GUIDE_SHA, "服务端参考图摘要不符，停止"
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    log = []
    for path in a.requests:
        raw = Path(path).read_bytes(); req = json.loads(raw)
        rid = req["prompt"]["12"]["inputs"]["filename_prefix"]
        (out / f"{rid}.request.json").write_bytes(raw)
        t0 = time.time()
        ack = json.loads(call(a.comfy + "/prompt", raw))  # 原样提交请求字节
        (out / f"{rid}.ack.json").write_text(json.dumps(ack, ensure_ascii=False, indent=2))
        pid = ack["prompt_id"]
        hist = None
        while time.time() - t0 < a.timeout:
            time.sleep(5)
            h = json.loads(call(f"{a.comfy}/history/{pid}"))
            if pid in h and h[pid].get("status", {}).get("completed"):
                hist = h[pid]; break
            if pid in h and h[pid].get("status", {}).get("status_str") == "error":
                (out / f"{rid}.history.json").write_text(json.dumps(h[pid], ensure_ascii=False, indent=2))
                raise SystemExit(f"{rid} 执行出错，停止")
        if hist is None:
            raise SystemExit(f"{rid} 超时或状态未知，停止")
        (out / f"{rid}.history.json").write_text(json.dumps(hist, ensure_ascii=False, indent=2))
        assert hist["status"]["status_str"] == "success", f"{rid} 终态 {hist['status']['status_str']}"
        actual = {k: (v["class_type"], v["inputs"]) for k, v in hist["prompt"][2].items()}
        assert actual == {k: (v["class_type"], v["inputs"]) for k, v in req["prompt"].items()}, f"{rid} 执行图与请求不一致"
        cached = [n for kind, d in hist["status"]["messages"] if kind == "execution_cached" for n in d.get("nodes", [])]
        assert "10" not in cached, f"{rid} 采样节点命中缓存"
        imgs = [im for node in hist["outputs"].values() for im in node.get("images", [])]
        assert len(imgs) == 1, f"{rid} 输出图数量为 {len(imgs)}"
        im = imgs[0]
        q = f"filename={im['filename']}&subfolder={im.get('subfolder','')}&type={im.get('type','output')}"
        png = call(f"{a.comfy}/view?{q}", timeout=120)
        (out / f"{rid}.png").write_bytes(png)
        log.append({"id": rid, "prompt_id": pid, "seconds": round(time.time() - t0, 1),
                    "request_sha256": hashlib.sha256(raw).hexdigest(), "png_sha256": hashlib.sha256(png).hexdigest(),
                    "server_filename": im["filename"], "completed_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")})
        (out / "run-log.json").write_text(json.dumps(log, ensure_ascii=False, indent=2))
        print(rid, "ok", log[-1]["seconds"], "s")


if __name__ == "__main__":
    main()
