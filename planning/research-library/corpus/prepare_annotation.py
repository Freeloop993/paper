"""Make a local, unlabelled source-coding packet. The packet contains private text."""
import argparse
from contextlib import closing
import csv
import hashlib
import json
from pathlib import Path
import sqlite3

from private_corpus import APPLICATION_ID, normalized


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True, help="New private directory; keep outside public Git.")
    parser.add_argument("--count", type=int, default=18)
    parser.add_argument("--seed", default="source-coding-20261118-v1")
    args = parser.parse_args()
    with closing(sqlite3.connect(args.db.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        if db.execute("PRAGMA application_id").fetchone()[0] != APPLICATION_ID:
            raise ValueError("Unrecognized corpus.")
        linked = {row[0] for row in db.execute("""
            SELECT DISTINCT p.parent FROM public_card c JOIN edge p ON c.pool_unit=p.child
            WHERE p.kind='pool_exact_ledger'""")}
        published_texts = {normalized(row[0]) for row in db.execute("""
            SELECT DISTINCT u.body FROM unit u JOIN public_card c ON u.id=c.pool_unit""")}
        # Keep original-record groups together even if they span ledger units.
        forbidden_originals = {row[1] for row in db.execute(
            "SELECT child,parent FROM edge WHERE kind='ledger_has_record'") if row[0] in linked}
        rows = db.execute("SELECT id,body FROM unit WHERE collection='cluster' AND stage='A' AND consumer=1 ORDER BY id")
        seen_bodies = set(published_texts)
        seen_originals = set(forbidden_originals)
        available = []
        for cid, body in rows:
            text = normalized(body)
            original = {r[0] for r in db.execute("SELECT parent FROM edge WHERE child=? AND kind='ledger_has_record'", (cid,))}
            if cid in linked or text in seen_bodies or original & seen_originals:
                continue
            seen_bodies.add(text)
            seen_originals.update(original)
            score = hashlib.sha256((args.seed + "|" + cid).encode()).hexdigest()
            available.append((score, cid, body))
        fingerprint = db.execute("SELECT digest FROM input_sha256 WHERE role='final_ledger'").fetchone()[0]
    if not 1 <= args.count <= len(available):
        parser.error(f"Count must be in 1..{len(available)}.")
    args.out.mkdir(parents=True, exist_ok=False)
    ordered = sorted(available)[:args.count]
    with (args.out / "coding.tsv").open("x", encoding="utf-8", newline="") as blind, \
            (args.out / "researcher-key.tsv").open("x", encoding="utf-8", newline="") as keyfile:
        writer = csv.writer(blind, delimiter="\t")
        keywriter = csv.writer(keyfile, delimiter="\t")
        writer.writerow(["blind_id", "source_text", "component", "observed_state", "supported_form_claim", "limit_or_confound", "decision", "rater"])
        keywriter.writerow(["blind_id", "private_cluster"])
        for n, (_, cid, body) in enumerate(ordered, start=1):
            blind_id = f"SC{n:03}"
            writer.writerow([blind_id, body, "", "", "", "", "", ""])
            keywriter.writerow([blind_id, cid])
    print(json.dumps({"ledger_sha256": fingerprint, "seed": args.seed, "eligible_groups": len(available),
                      "sampled_groups": len(ordered), "independent_annotations": 0, "model_calls": 0}))


if __name__ == "__main__":
    main()
