"""Export verified candidate images for independent readings of closed C2 sessions."""
import argparse
from contextlib import closing
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import secrets
import sqlite3
import tempfile
from zipfile import ZipFile

from PIL import Image, ImageCms
from PIL.PngImagePlugin import PngInfo

from capture import asset_bytes, latest_receipts, log, summary


def digest(data):
    return sha256(data).hexdigest()


def reader_image(original):
    """Remove provenance while preserving the image's colour and alpha rendering."""
    with Image.open(BytesIO(original)) as image:
        if image.format != "PNG" or getattr(image, "is_animated", False):
            raise ValueError("expected a static candidate PNG")
        rgba = image.convert("RGBA")
        if image.info.get("icc_profile"):
            # Embedded profiles may name a device or its owner. Convert to a standard space.
            profile = ImageCms.ImageCmsProfile(BytesIO(image.info["icc_profile"]))
            color = ImageCms.profileToProfile(image.convert("RGB"), profile,
                                              ImageCms.createProfile("sRGB"), outputMode="RGB")
            color.putalpha(rgba.getchannel("A"))
            rgba = color
        pixels = rgba.tobytes()
        clean = Image.frombytes("RGBA", rgba.size, pixels)
        out = BytesIO()
        rendering = PngInfo()
        if image.info.get("icc_profile"):
            rendering.add(b"sRGB", b"\x00")
        else:
            # Only numeric colour-space chunks travel with the pixels.
            for name, data in png_chunks(original):
                if name in (b"sRGB", b"gAMA", b"cHRM", b"cICP", b"mDCV", b"cLLI"):
                    rendering.add(name, data)
        clean.save(out, format="PNG", pnginfo=rendering)
    data = out.getvalue()
    with Image.open(BytesIO(data)) as check:
        if check.size != clean.size or check.convert("RGBA").tobytes() != pixels:
            raise ValueError("reader pixels differ from the prepared image")
    if {k for k, _ in png_chunks(data)} - {
        b"IHDR", b"IDAT", b"IEND", b"sRGB", b"gAMA", b"cHRM", b"cICP", b"mDCV", b"cLLI"
    }:
        raise ValueError("unexpected metadata in reader image")
    return data


def png_chunks(data):
    offset = 8
    while offset < len(data):
        length = int.from_bytes(data[offset:offset + 4], "big")
        name = data[offset + 4:offset + 8]
        yield name, data[offset + 8:offset + 8 + length]
        offset += length + 12
        if name == b"IEND":
            return


def read_session(path, images):
    with closing(sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        db.execute("BEGIN")
        session = json.loads(db.execute("SELECT data FROM session").fetchone()[0])
        if session["schema"] not in {"design-study/c2-capture-v1", "design-study/c2-capture-v2"}:
            raise ValueError("unrecognized session format")
        events = log(db)
        result = summary(db, session, events)
        if not result["closed"]:
            raise ValueError("session in progress")
        receipts = latest_receipts(events)
        count = 0
        for attempt, receipt in receipts.items():
            if receipt["status"] != "success":
                continue
            for n, source in enumerate(receipt["outputs"], 1):
                png = reader_image(asset_bytes(db, source))
                image = images.setdefault(digest(png), {"png": png, "sources": []})
                image["sources"].append({
                    "participant": session["participant"], "pair": session["pair"],
                    "condition": session["condition"], "task": session["task"],
                    "candidate": f"{attempt}/{n}", "run_id": receipt["run_id"],
                    "original_sha256": source["sha256"],
                })
                count += 1
        return {"participant": session["participant"], "pair": session["pair"],
                "condition": session["condition"], "evidence_class": session["evidence_class"],
                "verified_candidates": count, "opportunities": result["recorded_opportunities"],
                "failed_calls": [k for k, r in receipts.items() if r["status"] == "failed"],
                "unknown_calls": result["unknown_attempts"], "pending_receipts": result["unresolved"],
                "partial_files": result["partial_receipt_files"],
                "unverified_additional_calls": result["supplemental_calls_pending"],
                "live_origin_pending": result["live_origin_pending"]}


def prepare(paths, destination):
    if destination.exists():
        raise ValueError("choose a new output directory to preserve any issued packet")
    images = {}
    sessions = [read_session(path, images) for path in paths]
    ids = {(s["participant"], s["pair"], s["condition"]) for s in sessions}
    if len(ids) != len(sessions) or len({s["evidence_class"] for s in sessions}) != 1:
        raise ValueError("duplicate sessions or mixed evidence classes")
    items = list(images.items())
    secrets.SystemRandom().shuffle(items)
    key = {}
    # Publish the packet and private key together only after all inputs have been verified.
    with tempfile.TemporaryDirectory(dir=destination.parent) as tmp:
        staging = Path(tmp) / "packet"
        staging.mkdir()
        if items:
            with ZipFile(staging / "reader.zip", "x") as archive:
                for index, (hash_value, item) in enumerate(items, 1):
                    code = f"C{index:03d}"
                    archive.writestr(code + ".png", item["png"])
                    key[code] = {"reader_sha256": hash_value, "sources": item["sources"]}
        audit = {"scope": "all verified returned candidates", "sessions": sessions, "images": key}
        (staging / "researcher-only.json").write_text(
            json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        staging.rename(destination)
    return len(items), sum(s["verified_candidates"] for s in sessions)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sessions", type=Path, nargs="+")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    try:
        distinct, total = prepare(args.sessions, args.out)
        print(f"{total} verified candidate occurrences, {distinct} unique reader images")
    except (ValueError, OSError, sqlite3.Error) as exc:
        parser.exit(1, str(exc) + "\n")
