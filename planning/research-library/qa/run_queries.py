"""Run frozen, author-authored probes on actual ranked candidates and evidence packets."""
import argparse
from collections import Counter
from contextlib import closing
import csv
import hashlib
import json
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import patch

HERE = Path(__file__).resolve().parent


def text_digest(path):
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def selection_checks(library, generate, db, fields):
    """Exercise the same available card on two questions with very different claims."""
    checks = []
    for qid, card, purpose in (("Q04", "D-A1-015", "accepted_scope"),
                               ("Q04", "D-A1-003", "outside_candidates"),
                               ("N04", "D-A1-015", "returned_card_wrong_measure")):
        request = SimpleNamespace(**vars(fields[qid]), select=[card])
        if purpose == "outside_candidates":
            try:
                library.packet(db, request)
            except ValueError as exc:
                if "不在本次查询" not in str(exc):
                    raise
                checks.append({"qid": qid, "card": card, "condition": purpose, "result": "rejected"})
                continue
            raise AssertionError("Unreturned evidence was selectable.")
        payload = library.packet(db, request)
        if (payload["status"], [r["id"] for r in payload["evidence"]]) != ("retrieve", [card]):
            raise AssertionError("Selected eligible card missing from packet.")
        generate.check_packet(db, payload)
        checks.append({"qid": qid, "card": card, "condition": purpose, "result": payload["status"]})
    return checks


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--library", type=Path, default=HERE.parent)
    p.add_argument("--db", type=Path)
    p.add_argument("--out", type=Path, required=True, help="Directory for CSV and JSON result.")
    args = p.parse_args()
    lib = args.library.resolve()
    sys.path.insert(0, str(lib))
    import dense_model
    import generate
    import library

    question_file = HERE / "questions.jsonl"
    questions = [json.loads(x) for x in question_file.read_text(encoding="utf-8").splitlines() if x.strip()]
    if len({q["id"] for q in questions}) != len(questions):
        raise ValueError("Duplicate question ID.")
    rows = []
    programmatic_selections = {}
    encoder = dense_model.Encoder()
    input_db = args.db or lib / "public.sqlite3"
    with closing(library.connect(input_db)) as db:
        desc = library.description(db)
        metadata = {
            "questions_sha256_lf": text_digest(question_file),
            "retriever_sha256_lf": text_digest(lib / "library.py"),
            "encoder_sha256_lf": text_digest(lib / "dense_model.py"),
            "generation_gate_sha256_lf": text_digest(lib / "generate.py"),
            "database_inputs_digest": desc["meta"]["source_digest"], "encoder_revision": desc["meta"]["encoder"],
            "vector_count": desc["vectors"], "per_question_limit": 3, "human_judgments": 0,
        }
        for q in questions:
            for eid in q["accept"]:
                row = db.execute("SELECT id FROM items WHERE id=?", (eid,)).fetchone()
                if not row:
                    raise ValueError(f"Missing expected evidence {eid}")
            for ranker in ("lexical", "hybrid"):
                hits = library.search(db, q["question"], q["route"], ranker, limit=3, evidence=True, encoder=encoder)
                fields = SimpleNamespace(route=q["route"], ranker=ranker, limit=3, question=q["question"],
                                         task=None, layout=None, topic=None, state=None, component=None)
                # The normal packet entry point constructs the same frozen encoder. Share its instance.
                with patch.object(dense_model, "Encoder", return_value=encoder):
                    result = library.packet(db, fields)
                if ranker == "lexical":
                    programmatic_selections[q["id"]] = fields
                if result["status"] != "retrieve":
                    generated = generate.draft(result, lib / ".unused-model")
                    if generated["model_calls"] != 0 or generated["status"] != result["status"]:
                        raise AssertionError("A non-retrieve packet reached generation.")
                ids = [h["id"] for h in hits]
                evidence_ids = [h["id"] for h in result["evidence"]]
                gold = set(q["accept"])
                rows.append({
                    "qid": q["id"], "route": q["route"], "wording": q["wording"], "ranker": ranker,
                    "expected_ids": "|".join(q["accept"]), "candidates": "|".join(ids),
                    "hit1": int(bool(ids[:1] and ids[0] in gold)) if gold else "",
                    "hit3": int(bool(set(ids) & gold)) if gold else "",
                    "packet_status": result["status"], "packet_ids": "|".join(evidence_ids),
                    "supported_packet": int(result["status"] == "retrieve" and bool(set(evidence_ids) & gold)) if gold else "",
                    "abstained": int(result["status"] == "abstain" and not evidence_ids) if not gold else "",
                })
        choices = selection_checks(library, generate, db, programmatic_selections)
    scores = {}
    for ranker in ("lexical", "hybrid"):
        runs = [r for r in rows if r["ranker"] == ranker]
        positive = [r for r in runs if r["expected_ids"]]
        negative = [r for r in runs if not r["expected_ids"]]
        scores[ranker] = {
            "answerable": len(positive), "hit_at_1": sum(r["hit1"] for r in positive),
            "hit_at_3": sum(r["hit3"] for r in positive), "supported_packets": sum(r["supported_packet"] for r in positive),
            "unanswerable": len(negative), "abstentions": sum(r["abstained"] for r in negative),
            "action_on_answerable": dict(Counter(r["packet_status"] for r in positive)),
            "action_on_unanswerable": dict(Counter(r["packet_status"] for r in negative)),
            "automatic_retrieve_packets": sum(r["packet_status"] == "retrieve" for r in runs),
            "default_nonretrieve_draft_gates_checked": sum(r["packet_status"] != "retrieve" for r in runs),
        }
    args.out.mkdir(parents=True, exist_ok=True)
    with (args.out / "results.csv").open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    report = {"snapshot": metadata, "scores": scores, "selection_controls": choices,
              "selection_control_rater": "software fixture", "generative_model_calls_in_this_run": 0}
    (args.out / "scores.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
