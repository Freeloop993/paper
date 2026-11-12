"""Create randomized blind packets and the labelled contact sheet from verified L1 originals."""
import argparse
import hashlib
import json
from pathlib import Path
import random
from zipfile import ZipFile, ZIP_DEFLATED

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent


def save_json(path, value):
    path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode())


def read_json(path):
    return json.loads(path.read_bytes())


def make(evidence, private):
    rows = read_json(evidence / "verification.json")["results"]
    assert len(rows) == 28
    grid = Image.new("RGB", (1120, 7*288+66), "#edf1f0")
    draw = ImageDraw.Draw(grid)
    font = ImageFont.truetype("arial.ttf", 19)
    draw.text((18, 6), "L1  /  A-G    |    4 outputs per condition", fill="#173332", font=font)
    for col, title in enumerate(["W/L 0.70   r1","W/L 0.70   r2","W/L 1.30   r1","W/L 1.30   r2"]):
        draw.text((280*col+18, 38), title, fill="#173332", font=font)
    for index, row in enumerate(rows):
        with Image.open(evidence / "L1-actual" / row["position"] / "original.png") as im:
            pic = im.convert("RGB").resize((258,258),Image.Resampling.LANCZOS)
        x,y = (index%4)*280+10, (index//4)*288+66
        grid.paste(pic,(x,y))
        draw.text((x+4,y+260), row["position"], fill="#173332", font=font)
    grid.save(evidence/"L1-contact-sheet.jpg",quality=90,subsampling=0)
    private.mkdir(parents=True, exist_ok=True)
    for reader in ("A","B","H"):
        delivery = private / reader
        delivery.mkdir(exist_ok=True)
        # Persist one secret shuffle per reader so rerunning does not change an issued assignment.
        key = private / ("mapping-"+reader+".json")
        if key.exists():
            mapping = read_json(key)
        else:
            positions = [r["position"] for r in rows]
            random.SystemRandom().shuffle(positions)
            mapping = {f"L{i:02d}":c for i,c in enumerate(positions,1)}
            save_json(key,mapping)
        assert set(mapping.values()) == {r["position"] for r in rows}
        lookup = {r["position"]: r for r in rows}
        for code, case in mapping.items():
            with Image.open(evidence/"L1-actual"/case/"original.png") as im:
                pixels = im.convert("RGB").tobytes()
            assert hashlib.sha256(pixels).hexdigest() == lookup[case]["rgb_sha256"]
            target = delivery/(code+".png")
            Image.frombytes("RGB",(1024,1024),pixels).save(target)
            with Image.open(target) as im:
                assert not im.info and im.tobytes() == pixels
        if reader == "H":
            survey = (HERE/"human-review.html").read_text(encoding="utf8")
            pack_id = hashlib.sha256(json.dumps(mapping,sort_keys=True).encode()).hexdigest()[:24]
            (delivery/"index.html").write_bytes(survey.replace("L1_PACK_ID",pack_id).encode())
            with ZipFile(private/"L1-真人盲评.zip","w",ZIP_DEFLATED) as out:
                for f in sorted(delivery.iterdir()):
                    if f.suffix in (".png",".html"):
                        out.write(f,f.name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("evidence",type=Path)
    parser.add_argument("private",type=Path)
    args = parser.parse_args()
    make(args.evidence,args.private)
