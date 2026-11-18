"""Restore the reviewed literature on a second computer and verify its identity.

Run with Python 3.10+; PDF restoration needs only the standard library or curl.
Use --figures to recreate figure extracts for personal reading.
"""
import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS = json.loads((ROOT / "assets.json").read_text(encoding="utf-8"))


def file_hash(path):
    checksum = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            checksum.update(block)
    return checksum.hexdigest()


def location(relative):
    path = (ROOT / relative).resolve()
    if ROOT.resolve() not in path.parents:
        raise ValueError("Asset path is outside the literature folder")
    return path


def has_original(path, item):
    return path.is_file() and path.stat().st_size == item["bytes"] and file_hash(path) == item["sha256"]


def fetch_original(item):
    path = location(item["file"])
    if has_original(path, item):
        return
    if path.exists():
        raise ValueError("Existing file differs from reviewed SHA-256; move it aside before restoring")
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=path.parent) as folder:
        candidate = Path(folder) / "source.pdf"
        errors = []
        for url in item.get("download_urls", [item["source_url"]]):
            try:
                accept = "application/vnd.github.raw+json" if url.startswith("https://api.github.com/repos/") else "*/*"
                if shutil.which("curl"):
                    subprocess.run(["curl", "--fail", "--silent", "--show-error", "--location",
                                    "--header", "Accept: " + accept,
                                    "--connect-timeout", "10", "--max-time", "120",
                                    "--output", str(candidate), url], check=True)
                else:
                    request = urllib.request.Request(url, headers={"User-Agent": "research-reading-library/1", "Accept": accept})
                    with urllib.request.urlopen(request, timeout=30) as reply, candidate.open("wb") as out:
                        shutil.copyfileobj(reply, out)
                if not has_original(candidate, item):
                    raise ValueError("Downloaded bytes differ from the reviewed version")
                candidate.replace(path)
                return
            except (OSError, ValueError, subprocess.SubprocessError) as exc:
                errors.append(str(exc))
        raise ValueError(" | ".join(errors))


def image_rgb_digest(image):
    return hashlib.sha256(image.convert("RGB").tobytes()).hexdigest()


def restore_figure(item, papers, verify_only):
    path = location(item["file"])
    if path.is_file() and file_hash(path) == item["original_sha256"]:
        return
    from PIL import Image
    if path.exists():
        with Image.open(path) as image:
            if image.size == (item["width"], item["height"]) and image_rgb_digest(image) == item["rgb_sha256"]:
                return
        raise ValueError("Existing figure has different pixels")
    if verify_only:
        raise ValueError("Missing figure")
    paper = papers[item["paper"]]
    pdf = location(paper["file"])
    if not has_original(pdf, paper):
        raise ValueError("Restore the matching PDF first")
    path.parent.mkdir(parents=True, exist_ok=True)
    render = item["render"]
    pg = item["pdf_page"]
    with tempfile.TemporaryDirectory(dir=path.parent) as folder:
        if render["mode"] == "embedded":
            from pypdf import PdfReader
            image = PdfReader(pdf).pages[pg - 1].images[render["key"]].image.convert("RGB")
        else:
            prefix = Path(folder) / "page"
            subprocess.run(["pdftoppm", "-f", str(pg), "-l", str(pg), "-scale-to", str(render["long_side"]),
                            "-singlefile", "-png", str(pdf), str(prefix)], check=True)
            with Image.open(prefix.with_suffix(".png")) as page:
                rounding = round if render["rounding"] == "round" else math.floor
                rect = tuple(rounding(value * page.size[i % 2]) for i, value in enumerate(render["relative_box"]))
                image = page.crop(rect).convert("RGB")
        if image.size != (item["width"], item["height"]) or image_rgb_digest(image) != item["rgb_sha256"]:
            raise ValueError("Figure differs from the reviewed pixels; use the PDF page/figure number or the personal transfer")
        tmp_image = Path(folder) / "figure.png"
        image.save(tmp_image)
        tmp_image.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-only", action="store_true", help="Verify local files without network access")
    parser.add_argument("--included-only", action="store_true", help="Only check files shipped in Git")
    parser.add_argument("--figures", action="store_true", help="Also reconstruct or verify figure extracts")
    parser.add_argument("--id", action="append", default=[], help="Optional paper ID, can repeat")
    args = parser.parse_args()
    papers = {p["id"]: p for p in ASSETS["papers"]}
    if set(args.id) - papers.keys():
        parser.error("Unknown paper ID")
    failures, passed, figures, pages = 0, 0, 0, 0
    for key, item in papers.items():
        if args.id and key not in args.id:
            continue
        if item["distribution"] == "project-page":
            pages += 1
            print(key, "project reference only", item["source_url"])
            continue
        if args.included_only and item["distribution"] != "included":
            continue
        try:
            if args.verify_only or args.included_only:
                if not has_original(location(item["file"]), item):
                    raise ValueError("Missing PDF or wrong SHA-256")
            else:
                fetch_original(item)
            print(key, "PDF verified")
            passed += 1
        except (OSError, ValueError) as exc:
            print(key, str(exc), file=sys.stderr)
            failures += 1
    if args.figures:
        for item in ASSETS["figures"]:
            if args.id and item["paper"] not in args.id or args.included_only and item["distribution"] != "included":
                continue
            try:
                restore_figure(item, papers, args.verify_only or args.included_only)
                print(item["id"], "figure verified")
                figures += 1
            except (OSError, ValueError, ImportError, subprocess.SubprocessError) as exc:
                print(item["id"], str(exc), file=sys.stderr)
                failures += 1
    print(f"PDFs {passed}; figures {figures}; project pages {pages}; failed {failures}")
    return int(failures > 0)


if __name__ == "__main__":
    sys.exit(main())
