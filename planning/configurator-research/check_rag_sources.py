"""Compare private local inputs. Output only counts and source digests."""
import argparse
from collections import defaultdict
from hashlib import sha256
import json
from pathlib import Path
from unicodedata import normalize
from zipfile import ZipFile


def compare(chunks, ledger, text_key):
    by_text = defaultdict(set)
    accepted = set()
    raw_ids = set()
    for record in ledger:
        if record["text"].strip():
            by_text[text_key(record["text"])].add(record["text_id"])
        raw_ids.update(record["original_record_ids"])
        if record["decision_code"] == "A":
            accepted.add(record["text_id"])
    all_ids = set()
    matched = set()
    candidates = defaultdict(set)
    ambiguous = 0
    for chunk in chunks:
        meta = chunk["metadata"]
        cid = meta["comment_id"]
        all_ids.add(cid)
        # Compare the original comment part, not embedding text which may include SKU.
        ids = by_text.get(text_key(meta["source_comment_part"]), set())
        if len(ids) == 1:
            matched.update(ids)
            candidates[cid].update(ids)
        elif len(ids) > 1:
            ambiguous += 1
    return {
        "old_chunk_rows": len(chunks),
        "old_distinct_nonempty_comment_id": len(all_ids - {""}),
        "ledger_texts": len(ledger),
        "ledger_A": len(accepted),
        "direct_id_overlap_with_text_id": len(all_ids & {row["text_id"] for row in ledger}),
        "direct_id_overlap_with_original_record_ids": len(all_ids & raw_ids),
        "old_ids_with_at_least_one_unique_full_text_match": len(candidates),
        "old_ids_matching_multiple_different_ledger_texts": sum(len(v)>1 for v in candidates.values()),
        "ledger_texts_with_exact_source_part_candidate": len(matched),
        "A_with_exact_source_part_candidate": len(matched & accepted),
        "A_without_exact_source_part_candidate": len(accepted-matched),
        "chunk_rows_matching_ambiguous_ledger_text": ambiguous,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("chunks", type=Path)
    parser.add_argument("semantic_zip", type=Path)
    args = parser.parse_args()
    chunk_bytes = args.chunks.read_bytes()
    with ZipFile(args.semantic_zip) as z:
        entries = [n for n in z.namelist() if "/64-" in n and "/06-" in n and n.endswith(".json")]
        if len(entries) != 1:
            raise ValueError("Expected exactly one final ledger")
        ledger_bytes = z.read(entries[0])
    chunks = json.loads(chunk_bytes)
    records = json.loads(ledger_bytes)["records"]
    def compact(value):
        return "".join(normalize("NFKC", value).split())
    print(json.dumps({
        "full_string_strip_only": compare(chunks, records, str.strip),
        "full_string_NFKC_remove_whitespace": compare(chunks, records, compact),
        "scope": "Text-match candidates only. No SKU or state linkage was established.",
        "sha256": {"old_chunks": sha256(chunk_bytes).hexdigest(),
                   "final_ledger": sha256(ledger_bytes).hexdigest()}
    }, indent=2))


if __name__ == "__main__":
    main()
