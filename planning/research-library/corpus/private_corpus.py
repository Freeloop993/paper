"""Local research corpus. Python 3.10+, SQLite FTS5; no network or model calls."""
from __future__ import annotations

import argparse
from collections import defaultdict
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
from tempfile import NamedTemporaryFile
import unicodedata


APPLICATION_ID = 0x44524350
COLLECTIONS = ("cluster", "merged", "pool", "legacy")


def tokens(text):
    """CJK bigrams for search; whitespace tokens for Latin terms and numbers."""
    result = []
    for block in re.findall(r"[\u3400-\u9fff]+|[^\W_\u3400-\u9fff]+", unicodedata.normalize("NFKC", text).casefold()):
        if "\u3400" <= block[0] <= "\u9fff" and len(block) > 1:
            result.extend(block[i:i + 2] for i in range(len(block) - 1))
        else:
            result.append(block)
    return result


def digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def key(prefix, value):
    return prefix + "-" + digest(str(value))[:24]


def normalized(value):
    return "".join(unicodedata.normalize("NFKC", value).split())


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def only(directory, pattern):
    matches = list(directory.glob(pattern))
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one input for {pattern}, found {len(matches)}.")
    return matches[0]


def add_unit(db, unit_id, collection, group_id, body, stage="", consumer=None):
    cursor = db.execute("INSERT INTO unit VALUES (?,?,?,?,?,?)",
                        (unit_id, collection, group_id, body, stage, consumer))
    db.execute("INSERT INTO search_index(rowid, words) VALUES (?,?)",
               (cursor.lastrowid, " ".join(tokens(body))))


def index_inputs(db, files):
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript(f"""
        PRAGMA application_id={APPLICATION_ID};
        PRAGMA user_version=1;
        CREATE TABLE unit(id TEXT NOT NULL UNIQUE, collection TEXT NOT NULL,
            group_id TEXT NOT NULL, body TEXT NOT NULL, stage TEXT NOT NULL, consumer INTEGER);
        CREATE VIRTUAL TABLE search_index USING fts5(words, content='');
        CREATE TABLE edge(child TEXT REFERENCES unit(id), parent TEXT REFERENCES unit(id),
            kind TEXT, PRIMARY KEY(child,parent,kind)) WITHOUT ROWID;
        CREATE TABLE public_card(card_id TEXT PRIMARY KEY, source_key TEXT NOT NULL,
            pool_unit TEXT REFERENCES unit(id)) WITHOUT ROWID;
        CREATE TABLE legacy_match(source_group TEXT, cluster TEXT REFERENCES unit(id),
            form TEXT, PRIMARY KEY(source_group, cluster, form)) WITHOUT ROWID;
        CREATE TABLE input_sha256(role TEXT PRIMARY KEY, digest TEXT NOT NULL) WITHOUT ROWID;
    """)
    fingerprints = {role: hashlib.sha256(path.read_bytes()).hexdigest() for role, path in files.items()}
    db.executemany("INSERT INTO input_sha256 VALUES (?,?)", fingerprints.items())
    old_raw_ids, cluster_ids, original_ids = set(), set(), set()
    with files["merged"].open(encoding="utf-8-sig") as source:
        for line in source:
            if line.strip():
                row = json.loads(line)
                mid = key("M", row["record_id"])
                add_unit(db, mid, "merged", mid, row["text"])

    exact, compact = defaultdict(set), defaultdict(set)
    clusters = {}
    for row in load_json(files["final_ledger"])["records"]:
        rid = row["text_id"]
        cid = key("T", rid)
        clusters[rid] = row["text"]
        cluster_ids.add(rid)
        exact[row["text"].strip()].add(cid)
        compact[normalized(row["text"])].add(cid)
        add_unit(db, cid, "cluster", cid, row["text"], row["decision_code"], int("Q" in row["scopes"]))
        original_ids.update(row["original_record_ids"])
        for original in set(row["original_record_ids"]):
            db.execute("INSERT INTO edge VALUES (?,?,?)", (cid, key("M", original), "ledger_has_record"))

    pool = {}
    for row in load_json(files["evidence_pool"])["records"]:
        raw_key = row["source_key"]
        pid = key("P", raw_key)
        pool[raw_key] = row
        add_unit(db, pid, "pool", pid, row["body"], row["dataset"])
        if row["dataset"] == "legacy":
            rid = row["record_id"]
            if clusters.get(rid) != row["body"]:
                raise ValueError("Pool-to-ledger body verification failed.")
            db.execute("INSERT INTO edge VALUES (?,?,?)", (pid, key("T", rid), "pool_exact_ledger"))

    public = {row["id"]: row for row in load_json(files["public_cards"])["cards"]}
    for card in load_json(files["private_card_map"])["cards"]:
        public_row = public[card["evidence_id"]]
        raw_key = card["source_key"]
        body = pool[raw_key]["body"]
        if (card["source_body_sha256"] != digest(body) or not public_row["quote"]
                or public_row["quote"] != card["quote_original"] or public_row["quote"] not in body
                or public_row["source_key"] != "S-" + digest(raw_key)[:12]):
            raise ValueError("Public-to-private card verification failed.")
        db.execute("INSERT INTO public_card VALUES (?,?,?)",
                   (card["evidence_id"], public_row["source_key"], key("P", raw_key)))
    if db.execute("SELECT count(*) FROM public_card").fetchone()[0] != len(public):
        raise ValueError("Public and private card sets differ.")

    if "historical_chunks" in files:
        for index, row in enumerate(load_json(files["historical_chunks"]), start=1):
            meta = row["metadata"]
            body = meta["source_comment_part"]
            raw_id = meta["comment_id"]
            if not raw_id:
                raise ValueError("Historical source grouping requires a nonempty comment_id.")
            old_raw_ids.add(raw_id)
            sg = key("G", raw_id)
            add_unit(db, f"L-{index:06}", "legacy", sg, body)
            for form, found in (("trim", exact.get(body.strip())), ("nfkc_compact", compact.get(normalized(body)))):
                if found and len(found) == 1:
                    db.execute("INSERT OR IGNORE INTO legacy_match VALUES (?,?,?)", (sg, next(iter(found)), form))

    db.executescript("CREATE INDEX units_by_collection ON unit(collection,stage); CREATE INDEX parent_lookup ON edge(parent);")
    if db.execute("PRAGMA foreign_key_check").fetchall():
        raise ValueError("Unresolved provenance link in corpus.")
    db.commit()
    if db.execute("PRAGMA quick_check").fetchone() != ("ok",):
        raise ValueError("SQLite integrity check failed.")
    def count(sql):
        return db.execute(sql).fetchone()[0]
    summary = {
        "schema_version": 1,
        "input_sha256": fingerprints,
        "units": dict(db.execute("SELECT collection,count(*) FROM unit GROUP BY collection")),
        "ledger_decisions": dict(db.execute("SELECT stage,count(*) FROM unit WHERE collection='cluster' GROUP BY stage")),
        "consumer_title_clusters": count("SELECT count(*) FROM unit WHERE collection='cluster' AND consumer=1"),
        "consumer_retained_clusters": count("SELECT count(*) FROM unit WHERE collection='cluster' AND stage='A' AND consumer=1"),
        "merged_rows_linked_to_clusters": len(original_ids),
        "pool_by_dataset": dict(db.execute("SELECT stage,count(*) FROM unit WHERE collection='pool' GROUP BY stage")),
        "pool_exact_ledger_links": count("SELECT count(*) FROM edge WHERE kind='pool_exact_ledger'"),
        "verified_public_cards": count("SELECT count(*) FROM public_card"),
        "unique_public_sources": count("SELECT count(DISTINCT source_key) FROM public_card"),
        "cards_by_pool_dataset": dict(db.execute("SELECT u.stage,count(*) FROM public_card c JOIN unit u ON u.id=c.pool_unit GROUP BY u.stage")),
    }
    if "historical_chunks" in files:
        summary["historical"] = {
            "distinct_comment_ids": len(old_raw_ids),
            "direct_id_overlap_with_text_ids": len(old_raw_ids & cluster_ids),
            "direct_id_overlap_with_original_ids": len(old_raw_ids & original_ids),
            "matches_are_textual_candidates": True,
            "match_counts": {
                form: {"matched_source_groups": groups, "matched_clusters": clusters_count, "retained_clusters": retained}
                for form, groups, clusters_count, retained in db.execute("""
                    SELECT m.form,count(DISTINCT m.source_group),count(DISTINCT m.cluster),
                    count(DISTINCT CASE WHEN u.stage='A' THEN m.cluster END)
                    FROM legacy_match m JOIN unit u ON m.cluster=u.id GROUP BY m.form""")
            }
        }
    return summary


def build(args):
    source = args.source.expanduser().resolve()
    root = source / "补充调研_2026-10-09"
    files = {"merged": only(root, "02-*.jsonl"), "final_ledger": only(root, "64-*/06-*.json"),
             "evidence_pool": only(root, "63-*/01-*.json"), "private_card_map": only(root, "63-*/04-*.json"),
             "public_cards": args.cards.resolve()}
    if args.legacy:
        files["historical_chunks"] = args.legacy.resolve()
    target = args.db.resolve()
    if target.exists():
        with closing(sqlite3.connect(target.as_uri() + "?mode=ro", uri=True)) as db:
            if db.execute("PRAGMA application_id").fetchone()[0] != APPLICATION_ID:
                raise ValueError("Existing file belongs to a different database.")
    target.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=target.parent, prefix="corpus-build-", suffix=".sqlite", delete=False) as f:
        temp = Path(f.name)
    try:
        with closing(sqlite3.connect(temp)) as db:
            report = index_inputs(db, files)
        os.replace(temp, target)
    finally:
        temp.unlink(missing_ok=True)
    print(json.dumps(report, ensure_ascii=False, indent=2))


def query(args):
    unique = list(dict.fromkeys(tokens(args.text)))
    if not unique:
        raise ValueError("Provide a word or a Chinese phrase.")
    if not 1 <= args.limit <= 100:
        raise ValueError("Limit must be between 1 and 100.")
    params = [args.collection]
    where = "u.collection=?"
    if args.collection == "cluster" and not args.all_stages:
        where += " AND u.stage='A'"
    # A one-character Chinese term is shorter than the index unit.
    if len(unique) == 1 and re.fullmatch("[\u3400-\u9fff]", unique[0]):
        sql = f"SELECT u.id,u.group_id,u.stage,u.body,0 FROM unit u WHERE {where} AND instr(u.body,?)>0 ORDER BY u.id LIMIT ?"
        params.extend([unique[0], args.limit])
    else:
        match = " OR ".join('"' + term + '"' for term in unique)
        sql = f"""SELECT u.id,u.group_id,u.stage,u.body,bm25(search_index)
                  FROM search_index JOIN unit u ON u.rowid=search_index.rowid
                  WHERE {where} AND search_index MATCH ? ORDER BY 5,u.id LIMIT ?"""
        params.extend([match, args.limit])
    with closing(sqlite3.connect(args.db.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        if db.execute("PRAGMA application_id").fetchone()[0] != APPLICATION_ID:
            raise ValueError("Unrecognized corpus.")
        hits = []
        for ident, group_id, stage, body, score in db.execute(sql, params):
            hit = {"unit": ident, "source_group": group_id, "stage": stage}
            if args.show_text:
                hit["text"] = body
            hits.append(hit)
    print(json.dumps({"collection": args.collection, "candidate_rows": hits}, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_subparsers(dest="mode", required=True)
    b = modes.add_parser("build", help="Build a private local SQLite companion atomically.")
    b.add_argument("--source", required=True, type=Path, help="Directory containing 补充调研_2026-10-09.")
    b.add_argument("--cards", required=True, type=Path, help="Public evidenceCards.json envelope.")
    b.add_argument("--legacy", type=Path, help="Optional design_filtered_comments.json.")
    b.add_argument("--db", required=True, type=Path)
    q = modes.add_parser("query", help="Rank private textual candidates within one population.")
    q.add_argument("--db", required=True, type=Path)
    q.add_argument("--text", required=True)
    q.add_argument("--collection", choices=COLLECTIONS, default="cluster")
    q.add_argument("--all-stages", action="store_true", help="Include ledger decisions other than A.")
    q.add_argument("--show-text", action="store_true", help="Print private source text on the local machine.")
    q.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    try:
        (build if args.mode == "build" else query)(args)
    except (OSError, ValueError, KeyError, sqlite3.Error) as e:
        parser.exit(1, f"Corpus operation failed: {e}\n")


if __name__ == "__main__":
    main()
