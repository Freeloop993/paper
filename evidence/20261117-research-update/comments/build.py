"""Recompute aggregate word counts and co-occurrences from the authorized corpus."""
import argparse
import csv
import hashlib
import itertools
import json
import zipfile
from collections import Counter
from pathlib import Path

TOPICS = ["小巧或紧凑", "随身携带", "轻重感受", "整体美感", "折叠收纳", "简洁或繁复", "颜色与辨识", "材质与质感", "其他外形或部件"]
LEDGER_SHA = "092615cbf424248743cc7f1b674ecfd30842b37012ec285b79f05b570d2b81e7"
MATRIX_SHA = "7dc517d1445efce14a12feda57410116ceed98527a7024e5c36c4d28940b119c"

def digest(data):
    return hashlib.sha256(data).hexdigest()

def save_csv(path, fields, rows):
    with path.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.writer(stream)
        writer.writerow(fields)
        writer.writerows(rows)

def main():
    import jieba

    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("source_zip", "old_matrix", "public_output"):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    with zipfile.ZipFile(args.source_zip) as archive:
        matches = [n for n in archive.namelist() if "/64-" in n and "/06-" in n and n.endswith(".json")]
        if len(matches) != 1:
            raise ValueError("Expected a unique corpus ledger")
        raw = archive.read(matches[0])
    if digest(raw) != LEDGER_SHA or digest(args.old_matrix.read_bytes()) != MATRIX_SHA:
        raise ValueError("Source checksum mismatch")
    records = [r for r in json.loads(raw)["records"] if "Q" in r["scopes"]]
    if len(records) != 1318 or len({r["text_id"] for r in records}) != 1318:
        raise ValueError("Unexpected corpus scope")
    with args.old_matrix.open(encoding="utf-8-sig") as stream:
        vocab = next(csv.reader(stream))[1:]
    if len(vocab) != 137 or len(set(vocab)) != len(vocab):
        raise ValueError("Unexpected vocabulary")
    tokenizer = jieba.Tokenizer()
    for term in sorted(vocab):
        tokenizer.add_word(term, freq=100000)
    valid = set(vocab)
    freq, pairs = Counter(), Counter()
    covered = 0
    for row in records:
        terms = sorted(set(tokenizer.cut(row["text"], HMM=False)) & valid)
        freq.update(terms)
        pairs.update(itertools.combinations(terms, 2))
        covered += bool(terms)
    dest = args.public_output
    dest.mkdir(parents=True, exist_ok=True)
    save_csv(dest / "nodes.csv", ["term", "documents"],
             [(term, freq[term]) for term in sorted(vocab, key=lambda t: (-freq[t], t))])
    save_csv(dest / "edges.csv", ["term_a", "term_b", "documents"],
             [(*pair, n) for pair, n in sorted(pairs.items(), key=lambda item: (-item[1], item[0]))])
    summary = {"unit": "deduplicated text cluster with Q among product title scopes",
               "N": len(records), "covered_by_legacy_vocabulary": covered, "vocabulary": len(vocab),
               "positive_edges": len(pairs), "jieba": jieba.__version__,
               "dictionary_sha256": digest(Path(jieba.__file__).with_name("dict.txt").read_bytes()),
               "input_sha256": LEDGER_SHA, "old_matrix_sha256": MATRIX_SHA}
    (dest / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

if __name__ == "__main__":
    main()
