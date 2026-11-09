"""Local rehearsal server for the B02 visual task. Run with Python 3.10+ and Pillow."""
import argparse
import base64
import binascii
import io
import json
import secrets
import sqlite3
import zipfile
from contextlib import closing
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image, UnidentifiedImageError
from compiler import TASKS, TEMPLATE_SHA, compile_input, sha

ROOT = Path(__file__).resolve().parent
MAX_PNG = 12 * 1024 * 1024
MAX_BODY = 17 * 1024 * 1024
SEED = 2026110901  # shared software fixture, not a formal assignment


def now():
    return datetime.now(timezone.utc).isoformat()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def check(condition, message):
    if not condition:
        raise ValueError(message)


def read_png(encoded):
    check(isinstance(encoded, str), "请选择 PNG 文件")
    try:
        raw = base64.b64decode(encoded, validate=True)
        check(len(raw) <= MAX_PNG, "图片超过 12 MiB")
        with Image.open(io.BytesIO(raw)) as img:
            check(img.format == "PNG" and img.size == (1024, 1024) and not img.is_animated,
                  "请选择 1024 × 1024 的单帧 PNG 原图")
            img.verify()
        with Image.open(io.BytesIO(raw)) as img:
            img.load()
    except (OSError, binascii.Error, UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise ValueError("无法读取 PNG 原图") from exc
    return raw


def create(db, data):
    task, method = data.get("task"), data.get("method")
    check(task in TASKS and method in ("D", "S"), "请选择任务和操作方式")
    session = {"id": secrets.token_hex(12), "revision": 0, "task": task, "method": method,
               "seed": SEED, "phase": "active", "scope": "offline_rehearsal",
               "template_sha256": TEMPLATE_SHA, "model_calls": 0, "versions": [], "final": None,
               "events": [{"time": now(), "action": "start"}]}
    db.execute("INSERT INTO sessions VALUES (?,?)", (session["id"], encode(session)))
    return session


def get_session(db, key):
    row = db.execute("SELECT body FROM sessions WHERE id=?", (key,)).fetchone()
    if row is None:
        raise KeyError("未找到此场次")
    return json.loads(row[0])


def change(db, session, data):
    check(data.get("revision") == session["revision"], "页面版本已过期，请刷新后查看当前操作")
    check(session["phase"] != "locked", "终稿已锁定")
    versions = session["versions"]
    action = data.get("action")
    event = {"time": now(), "action": action}
    if action == "compile":
        check(session["phase"] == "active" and len(versions) < 2, "本场没有可用的修订机会")
        parent = versions[0] if versions else None
        check(not parent or parent["status"] == "example_attached", "先为初稿登记演练结果")
        reference = data.get("reference")
        check(type(reference) is bool and (not reference or parent), "初稿不使用父图")
        digest = parent["image_sha256"] if reference else None
        graph = compile_input(session["task"], session["method"], data.get("edit"), SEED, digest)
        version = {"number": len(versions) + 1, "parent_version": 1 if parent else None,
                   "stage": ("initial" if not parent else "revise_with_parent" if reference else "revise_text"),
                   "parent_image_sha256": digest, "shape_control_image": None, "edit": data["edit"],
                   "request": graph, "request_sha256": sha(encode(graph)),
                   "status": "awaiting_example", "image_sha256": None}
        versions.append(version)
        event["version"] = version["number"]
    elif action in ("attach", "failed", "unknown"):
        check(session["phase"] == "active" and versions and versions[-1]["status"] == "awaiting_example",
              "当前没有待登记的输入")
        version = versions[-1]
        event["version"] = version["number"]
        if action == "attach":
            raw = read_png(data.get("png"))
            digest = sha(raw)
            db.execute("INSERT OR IGNORE INTO images VALUES (?,?)", (digest, raw))
            version.update(status="example_attached", image_sha256=digest)
            event["image_sha256"] = digest
        else:
            event["reason"] = reason(data)
            version["status"] = action
            session["phase"] = "stopped"
    elif action == "stop":
        check(session["phase"] == "active", "本场已停止修订")
        session["phase"] = "stopped"
        if versions and versions[-1]["status"] == "awaiting_example":
            versions[-1]["status"] = "stopped_without_image"
    elif action == "lock":
        choice = data.get("choice")
        check("choice" in data and (choice is None or
              (type(choice) is int and 1 <= choice <= len(versions)
               and versions[choice-1]["status"] == "example_attached")), "所选版本没有可用图片")
        why = reason(data)
        if versions and versions[-1]["status"] == "awaiting_example":
            versions[-1]["status"] = "stopped_without_image"
        session["phase"] = "locked"
        session["final"] = {"version": choice, "reason": why, "time": event["time"],
                            "image_sha256": versions[choice-1]["image_sha256"] if choice else None}
        event["version"] = choice
    else:
        raise ValueError("未知操作")
    session["events"].append(event)
    session["revision"] += 1
    db.execute("UPDATE sessions SET body=? WHERE id=?", (encode(session), session["id"]))


def reason(data):
    value = data.get("reason")
    check(isinstance(value, str) and 0 < len(value.strip()) <= 2000, "请简述原因（1—2000 字）")
    return value.strip()


def image_bytes(db, digest):
    row = db.execute("SELECT png FROM images WHERE digest=?", (digest,)).fetchone()
    if not row:
        raise KeyError("图片不存在")
    return row[0]


def to_zip(db, session):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("session.json", encode(session))
        hashes = set()
        for version in session["versions"]:
            archive.writestr(f"v{version['number']}/request.json", encode(version["request"]))
            digest = version["image_sha256"]
            if digest and digest not in hashes:
                archive.writestr(f"examples/{digest}.png", image_bytes(db, digest))
                hashes.add(digest)
            parent = version["parent_image_sha256"]
            if parent:
                archive.writestr(f"v{version['number']}/input/parent-{parent}.png", image_bytes(db, parent))
    return buf.getvalue()


class Handler(BaseHTTPRequestHandler):
    def respond(self, code, raw, mime):
        self.send_response(code)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(raw)

    def route(self, post=False):
        check(self.headers.get("Host") == self.server.authority, "请从启动地址打开")
        parts = urlsplit(self.path).path.strip("/").split("/")
        if not post and parts in ([""], ["ui.js"], ["style.css"]):
            name, mime = {"": ("index.html", "text/html"), "ui.js": ("ui.js", "text/javascript"),
                          "style.css": ("style.css", "text/css")}[parts[0]]
            return self.respond(200, (ROOT / name).read_bytes(), mime + "; charset=utf-8")
        with closing(sqlite3.connect(self.server.db, timeout=5)) as db, db:
            if post:
                check(self.headers.get("Origin") == "http://" + self.server.authority and
                      self.headers.get("Content-Type") == "application/json", "仅接受本机页面的操作")
                length = int(self.headers.get("Content-Length", 0))
                check(0 < length <= MAX_BODY, "请求大小超出范围")
                data = json.loads(self.rfile.read(length))
                check(isinstance(data, dict), "操作格式不正确")
                db.execute("BEGIN IMMEDIATE")
                if parts == ["sessions"]:
                    session = create(db, data)
                elif len(parts) == 2 and parts[0] == "sessions":
                    session = get_session(db, parts[1])
                    change(db, session, data)
                else:
                    raise KeyError("路径不存在")
                db.commit()
                return self.respond(200, encode(session), "application/json")
            if len(parts) == 2 and parts[0] == "image":
                return self.respond(200, image_bytes(db, parts[1]), "image/png")
            if len(parts) in (2, 3) and parts[0] == "sessions":
                session = get_session(db, parts[1])
                if len(parts) == 2:
                    return self.respond(200, encode(session), "application/json")
                if parts[2] == "receipt.zip":
                    return self.respond(200, to_zip(db, session), "application/zip")
            raise KeyError("路径不存在")

    def dispatch(self):
        try:
            self.route(self.command == "POST")
        except (ValueError, TypeError, KeyError, sqlite3.Error) as exc:
            code = 404 if isinstance(exc, KeyError) else 409 if isinstance(exc, sqlite3.Error) else 400
            self.respond(code, encode({"error": str(exc)}), "application/json")

    do_GET = do_POST = dispatch


def serve(path, port):
    with closing(sqlite3.connect(path)) as db:
        db.executescript("CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,body BLOB NOT NULL);"
                         "CREATE TABLE IF NOT EXISTS images(digest TEXT PRIMARY KEY,png BLOB NOT NULL);")
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.db = path
    server.authority = f"127.0.0.1:{server.server_port}"
    print("http://" + server.authority, flush=True)
    server.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=ROOT / "local-rehearsal.sqlite")
    parser.add_argument("--port", type=int, default=8726)
    args = parser.parse_args()
    serve(args.db, args.port)

