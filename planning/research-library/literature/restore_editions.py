"""Download checked editions for local reading, and verify their SHA-256 before installing."""

import argparse
import csv
import hashlib
import os
import tempfile
from pathlib import Path
from urllib.request import Request, urlopen

BASE = Path(__file__).resolve().parent


def restore(row, folder):
    target = folder / (row["id"] + ".pdf")
    if target.is_file():
        if hashlib.sha256(target.read_bytes()).hexdigest() == row["sha256"]:
            return
        raise ValueError("现有文件与登记版本不同，请先另存")
    folder.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=folder, delete=False) as temp:
        tmp = Path(temp.name)
    try:
        req = Request(
            row["fulltext_url"],
            headers={"User-Agent": "Research-edition-verification/1"},
        )
        digest = hashlib.sha256()
        with urlopen(req, timeout=90) as response, tmp.open("wb") as stream:
            for block in iter(lambda: response.read(1024 * 1024), b""):
                digest.update(block)
                stream.write(block)
        if digest.hexdigest() != row["sha256"]:
            raise ValueError("下载内容与核读版不同")
        os.replace(tmp, target)
    finally:
        tmp.unlink(missing_ok=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--id", action="append", help="可重复指定；省略时核对所有登记版本")
    args = p.parse_args()
    with (BASE / "edition-checks.csv").open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if set(args.id or ()) - {r["id"] for r in rows}:
        p.error("未知版本编号")
    failures = 0
    for row in rows:
        if args.id and row["id"] not in args.id:
            continue
        try:
            restore(row, BASE.parent / ".cache" / "editions")
            print(row["id"], "OK")
        except (OSError, ValueError) as error:
            print(row["id"], type(error).__name__, str(error))
            failures += 1
    raise SystemExit(bool(failures))
