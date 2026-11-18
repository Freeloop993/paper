"""Build and query the public thesis library. CLI outputs UTF-8 JSON for the design tool."""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
import unicodedata
from dataclasses import astuple
from pathlib import Path

from sources import CARDS, HERE, ROOT, STUDY, Registers
from scope import layouts_for, semantic_conflict, LAYOUTS

DB = HERE / "public.sqlite3"
ROUTES = {
    "all": None,
    "catalog": ("catalog", "literature"),
    "method": ("literature",),
    "form": ("configuration",),
    "case": ("design_record",),
    "protocol": ("protocol",),
}
ELIGIBLE = {"direct_support", "reviewed", "documented", "run_record"}


def encode_tokens(text):
    chunks = re.findall(
        r"[a-z0-9]+|[\u3400-\u9fff]+", unicodedata.normalize("NFKC", text).lower()
    )
    tokens = []
    for chunk in chunks:
        if chunk.isascii() or len(chunk) == 1:
            tokens.append(chunk)
        else:
            tokens.extend(chunk[i : i + 2] for i in range(len(chunk) - 1))
    return tokens


def as_json(data):
    return json.dumps(data, ensure_ascii=False, sort_keys=True)


def make_database(path, dense=False):
    reg = Registers().load()
    with tempfile.NamedTemporaryFile(
        dir=path.parent, prefix=".build-", delete=False
    ) as stream:
        temp = Path(stream.name)
    try:
        conn = sqlite3.connect(temp)
        try:
            conn.executescript("""
            PRAGMA foreign_keys=ON;
            CREATE TABLE files(path TEXT PRIMARY KEY,sha256_lf TEXT NOT NULL);
            CREATE TABLE items(id TEXT PRIMARY KEY,kind TEXT,title TEXT,claim TEXT,limitation TEXT,source TEXT,
                 locator TEXT,status TEXT,origin TEXT REFERENCES files(path),resource TEXT,layout TEXT,scope TEXT);
            CREATE TABLE memberships(evidence TEXT REFERENCES items(id),catalog_id TEXT REFERENCES items(id),
                 PRIMARY KEY(evidence,catalog_id));
            CREATE TABLE source_rows(catalog_id TEXT REFERENCES items(id), register_name TEXT, row_number TEXT,
                 title TEXT,doi TEXT,file_sha256 TEXT);
            CREATE TABLE crosswalk(source_key TEXT, source_row TEXT, title TEXT, catalog_ids TEXT, note TEXT, evidence_id TEXT);
            CREATE TABLE manuscripts(catalog_id TEXT REFERENCES items(id), advisor_no TEXT, revised_no TEXT,
                 advisor_reference TEXT, revised_reference TEXT, research_use TEXT);
            CREATE TABLE reading_routes(catalog_id TEXT PRIMARY KEY REFERENCES items(id),routes TEXT,basis TEXT,disposition TEXT);
            CREATE TABLE layouts(id TEXT REFERENCES items(id),layout TEXT,PRIMARY KEY(id,layout));
            CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT);
            CREATE TABLE vectors(id TEXT PRIMARY KEY REFERENCES items(id),data BLOB NOT NULL);
            CREATE VIRTUAL TABLE search_index USING fts5(title,body,tokenize='unicode61');
            """)
            conn.executemany(
                "INSERT INTO files VALUES (?,?)", sorted(reg.files.items())
            )
            items = sorted(reg.items, key=lambda item: item.id)
            conn.executemany(
                "INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                map(astuple, items),
            )
            conn.executemany(
                "INSERT INTO memberships VALUES (?,?)", sorted(set(reg.memberships))
            )
            conn.executemany(
                "INSERT INTO source_rows VALUES (?,?,?,?,?,?)", reg.origins
            )
            conn.executemany(
                "INSERT INTO crosswalk VALUES (?,?,?,?,?,?)", reg.crosswalk
            )
            conn.executemany(
                "INSERT INTO manuscripts VALUES (?,?,?,?,?,?)", reg.manuscripts
            )
            conn.executemany("INSERT INTO reading_routes VALUES (?,?,?,?)", reg.routes)
            conn.executemany(
                "INSERT INTO layouts VALUES (?,?)",
                [(i.id, v) for i in items for v in layouts_for(i)],
            )
            for rowid, item in enumerate(items, 1):
                title = " ".join(encode_tokens(item.id + " " + item.title))
                body = " ".join(
                    encode_tokens(
                        " ".join((item.claim, item.scope, item.layout, item.locator))
                    )
                )
                conn.execute(
                    "INSERT INTO search_index(rowid,title,body) VALUES (?,?,?)",
                    (rowid, title, body),
                )
            version = hashlib.sha256(
                as_json(sorted(reg.files.items())).encode()
            ).hexdigest()
            conn.executemany(
                "INSERT INTO meta VALUES (?,?)",
                [("schema", "1"), ("source_digest", version)],
            )
            if dense:
                from dense_model import Encoder, REVISION

                encoder = Encoder()
                vectors = encoder.encode(
                    [
                        i.title + "。" + i.claim + "。" + i.scope + " " + i.layout
                        for i in items
                    ]
                )
                conn.executemany(
                    "INSERT INTO vectors VALUES (?,?)",
                    [(i.id, v.tobytes()) for i, v in zip(items, vectors)],
                )
                conn.execute("INSERT INTO meta VALUES ('encoder',?)", (REVISION,))
            conn.commit()
            if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("SQLite 完整性检查失败")
        finally:
            conn.close()
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def connect(path):
    conn = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def description(conn):
    return {
        "meta": dict(conn.execute("SELECT key,value FROM meta")),
        "items": dict(conn.execute("SELECT kind,count(*) FROM items GROUP BY kind")),
        "origin_rows": conn.execute("SELECT count(*) FROM source_rows").fetchone()[0],
        "crosswalk_rows": conn.execute("SELECT count(*) FROM crosswalk").fetchone()[0],
        "vectors": conn.execute("SELECT count(*) FROM vectors").fetchone()[0],
    }


def search(
    conn,
    question,
    route="all",
    ranker="lexical",
    limit=5,
    evidence=False,
    encoder=None,
    layout=None,
):
    predicates, args = [], []
    kinds = ROUTES[route]
    if kinds:
        predicates.append("i.kind IN (" + ",".join("?" for _ in kinds) + ")")
        args.extend(kinds)
    if layout:
        predicates.append(
            "EXISTS (SELECT 1 FROM layouts l WHERE l.id=i.id AND l.layout=?)"
        )
        args.append(LAYOUTS.get(layout, layout))
    if evidence:
        predicates.append("i.status IN (" + ",".join("?" for _ in ELIGIBLE) + ")")
        args.extend(sorted(ELIGIBLE))
    allowed = " AND ".join(predicates) or "1"
    exact = conn.execute(
        "SELECT i.* FROM items i WHERE i.id=? COLLATE NOCASE AND " + allowed,
        [question.strip(), *args],
    ).fetchone()
    if exact:
        return [dict(exact, match="id")]
    tokens = list(dict.fromkeys(encode_tokens(question)))[:80]
    if not tokens:
        return []
    query = " OR ".join('"' + t + '"' for t in tokens)
    depth = max(32, limit * 4)
    lexical = [
        r[0]
        for r in conn.execute(
            "SELECT i.id FROM search_index JOIN items i ON i.rowid=search_index.rowid "
            "WHERE search_index MATCH ? AND "
            + allowed
            + " ORDER BY bm25(search_index,4,1), i.id LIMIT ?",
            [query, *args, depth],
        )
    ]
    ordered = lexical
    if ranker == "hybrid":
        import numpy as np
        from dense_model import Encoder, REVISION

        version = conn.execute("SELECT value FROM meta WHERE key='encoder'").fetchone()
        if not version or version[0] != REVISION:
            raise ValueError("此库缺少相符的向量索引，请运行 build --dense")
        vector = (encoder or Encoder()).encode([question], query=True)[0]
        rows = conn.execute(
            "SELECT i.id,v.data FROM vectors v JOIN items i ON i.id=v.id WHERE "
            + allowed,
            args,
        ).fetchall()
        dense = sorted(
            (
                (float(np.frombuffer(r["data"], dtype="<f4") @ vector), r["id"])
                for r in rows
            ),
            key=lambda t: (-t[0], t[1]),
        )
        dense_ids = [item for _, item in dense[:depth]]
        scores = {}
        for ranked in [lexical, dense_ids]:
            for pos, key in enumerate(ranked, 1):
                scores[key] = scores.get(key, 0) + 1 / (60 + pos)
        ordered = sorted(scores, key=lambda k: (-scores[k], k))
    hits = []
    for key in ordered[:limit]:
        row = conn.execute("SELECT * FROM items WHERE id=?", (key,)).fetchone()
        hits.append(dict(row, match="lexical" if key in lexical else "dense_only"))
    return hits


def semantic(conn, args):
    if not args.task or not args.layout or not args.topic or not args.state:
        return "clarify", "请先说明使用任务、目标构型、话题和观察状态。", []
    conflict = semantic_conflict(
        args.question, args.task, args.layout, args.topic, args.state
    )
    if conflict:
        return "clarify", conflict, []
    cli = ROOT / STUDY / "semantic/lookup/cli.mjs"
    cmd = ["node", str(cli), "--cards", str(ROOT / CARDS)]
    for key in ("task", "layout", "topic", "state", "component"):
        if getattr(args, key):
            cmd.extend(["--" + key, getattr(args, key)])
    env = dict(os.environ, PYTHON=sys.executable, PYTHONUTF8="1")
    result = json.loads(
        subprocess.check_output(cmd, cwd=ROOT, env=env, encoding="utf-8")
    )
    rows = []
    for group in result["groups"]:
        for card in group["cards"]:
            rec = conn.execute(
                "SELECT * FROM items WHERE id=?", (card["id"],)
            ).fetchone()
            if (
                not rec
                or rec["claim"] != card["quote"]
                or rec["resource"] != group["source"]
                or rec["limitation"] != card["limits"]
            ):
                raise ValueError("公开卡变更，请重建并重新复核路由")
            rows.append(dict(rec, role=card["role"]))
    return result["status"], result["reason"], rows


def packet(conn, args):
    selected = getattr(args, "select", None)
    if args.route == "semantic":
        if selected:
            raise ValueError("语义卡按来源、任务和观察状态共同返回，不能手动删减其反例")
        status, reason, rows = semantic(conn, args)
    else:
        rows = search(
            conn,
            args.question,
            args.route,
            args.ranker,
            args.limit,
            evidence=True,
            layout=args.layout,
        )
        status = "review_candidates" if rows else "abstain"
        reason = (
            "请核对候选原页的对象、指标和证据类型，确认可回答该问题的条目。"
            if rows
            else "所选证据类别下没有可定位的匹配。"
        )
        if selected:
            choices = set(selected)
            if not choices.issubset({r["id"] for r in rows}):
                raise ValueError("选定条目不在本次查询的可用候选中")
            rows = [r for r in rows if r["id"] in choices]
            status, reason = (
                "retrieve",
                "研究者选定了可用于起草的材料，仍须复核每句归因。",
            )
    context = [
        {
            k: r[k]
            for k in (
                "id",
                "kind",
                "title",
                "claim",
                "source",
                "locator",
                "limitation",
                "origin",
                "status",
                "scope",
                "resource",
                "layout",
                "role",
            )
            if k in r
        }
        for r in rows
    ]
    payload = {
        "schema": 1,
        "source_digest": description(conn)["meta"]["source_digest"],
        "question": args.question,
        "route": args.route,
        "task": args.task,
        "layout": args.layout,
        "state": args.state,
        "topic": args.topic,
        "component": args.component,
        "limit": args.limit,
        "selected": selected or [],
        "ranker": "reviewed_routes" if args.route == "semantic" else args.ranker,
        "status": status,
        "reason": reason,
        "evidence": context,
        "parameter_changes": [],
    }
    payload["packet_sha256"] = hashlib.sha256(as_json(payload).encode()).hexdigest()
    return payload


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DB)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("build").add_argument("--dense", action="store_true")
    commands.add_parser("stats")
    origin = commands.add_parser("trace")
    origin.add_argument("id")
    for name in ("search", "packet"):
        p = commands.add_parser(name)
        p.add_argument("question")
        p.add_argument(
            "--route",
            choices=list(ROUTES)
            if name == "search"
            else ["method", "form", "case", "protocol", "semantic"],
            default="all" if name == "search" else "method",
        )
        p.add_argument(
            "--limit", default=5, type=int, choices=range(1, 21), metavar="1..20"
        )
        p.add_argument("--ranker", choices=["lexical", "hybrid"], default="lexical")
        p.add_argument("--layout")
        if name == "packet":
            for field in ("task", "topic", "state", "component"):
                p.add_argument("--" + field)
            p.add_argument(
                "--select", action="append", help="研究者已核对并选中的候选ID，可重复"
            )
            p.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.command == "build":
        make_database(args.db, args.dense)
    conn = connect(args.db)
    try:
        if args.command in ("build", "stats"):
            obj = description(conn)
        elif args.command == "trace":
            item = conn.execute("SELECT * FROM items WHERE id=?", (args.id,)).fetchone()
            if not item:
                parser.error("未知条目标识")
            groups = [
                r[0]
                for r in conn.execute(
                    "SELECT catalog_id FROM memberships WHERE evidence=?", (args.id,)
                )
            ]
            if item["kind"] == "catalog":
                groups.append(args.id)
            obj = {
                "item": dict(item),
                "catalog_groups": groups,
                "sources": [],
                "related_evidence": [],
                "edition_numbers": [],
                "crosswalk": [],
            }
            for group in groups:
                obj["sources"].extend(
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM source_rows WHERE catalog_id=?", (group,)
                    )
                )
                obj["related_evidence"].extend(
                    r[0]
                    for r in conn.execute(
                        "SELECT evidence FROM memberships WHERE catalog_id=?", (group,)
                    )
                )
                obj["edition_numbers"].extend(
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM manuscripts WHERE catalog_id=?", (group,)
                    )
                )
            obj["crosswalk"] = [
                dict(r)
                for r in conn.execute("SELECT * FROM crosswalk")
                if set(r["catalog_ids"].split("|")) & set(groups)
            ]
            obj["related_evidence"] = list(dict.fromkeys(obj["related_evidence"]))
            obj["reading_routes"] = [
                dict(r)
                for g in groups
                for r in conn.execute(
                    "SELECT * FROM reading_routes WHERE catalog_id=?", (g,)
                )
            ]
        elif args.command == "search":
            obj = search(
                conn,
                args.question,
                args.route,
                args.ranker,
                args.limit,
                layout=args.layout,
            )
        else:
            obj = packet(conn, args)
            if args.out:
                args.out.write_text(as_json(obj) + "\n", encoding="utf-8")
        print(json.dumps(obj, ensure_ascii=False, indent=2))
    finally:
        conn.close()


if __name__ == "__main__":
    if sys.stdout.isatty() is False and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
