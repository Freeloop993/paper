"""Create comparable full frames, centered crops, and integrity checks from the actual outputs."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "evidence/minimax-junction-pilot"
ROWS = [
    ("bar", "", "bar"), ("ray", "", "ray"),
    ("finish", "finish-reference", "ray"),
    ("nose", "nose-language", "ray"),
    ("pod", "pod-reference", "ray"), ("mount", "mount", "ray"),
]
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 21)
all_rows = Image.new("RGB", (1080, 394 * len(ROWS)), "white")
detail = Image.new("RGB", (1080, 329 * len(ROWS)), "white")
picks = Image.new("RGB", (1200, 434), "white")
verified = []
for index, (label, subdir, guide) in enumerate(ROWS):
    for col, card in enumerate("ABC"):
        cell = OUT / subdir / (card + "-" + guide)
        f = cell / "original.png"
        request = json.loads((cell / "request.json").read_text(encoding="utf-8"))["body"]
        receipt = json.loads((cell / "response.json").read_text(encoding="utf-8"))
        check = json.loads((cell / "verified.json").read_text(encoding="utf-8"))
        assert receipt["http_status"] == 200 and receipt["usage"]["generated_images"] == 1
        assert check["file_sha256"] == hashlib.sha256(f.read_bytes()).hexdigest()
        for ref in request["images"]:
            assert hashlib.sha256((ROOT / ref["file"]).read_bytes()).hexdigest() == ref["sha256"]
        with Image.open(f) as source:
            im = source.convert("RGB")
        assert im.size == (1024,1024) and hashlib.sha256(im.tobytes()).hexdigest() == check["rgb_sha256"]
        verified.append({"id":card+"-"+label, "file":f.relative_to(OUT).as_posix(), **check,
                         "input_words":len(request["prompt"].split()),"rewritten_words":len(receipt["revised_prompt"].split()),
                         "total_tokens":receipt["usage"]["total_tokens"]})
        for board,row_height,crop in [(all_rows,394,im.copy()),(detail,329,im.crop((243,244,781,699)))]:
            x,y=col*360,index*row_height
            crop.thumbnail((360,row_height-32),Image.Resampling.LANCZOS)
            board.paste(crop,(x+(360-crop.width)//2,y+30))
            ImageDraw.Draw(board).text((x+6,y),card+" / "+label,font=font,fill="black")
        if label == "pod":
            x=400*col
            picks.paste(im.resize((400,400),Image.Resampling.LANCZOS),(x,30))
            ImageDraw.Draw(picks).text((x+8,2),card+" / pod",font=font,fill="black")
assert len(set(x["rgb_sha256"] for x in verified)) == len(verified)
all_rows.save(OUT / "all-18.jpg",quality=93)
detail.save(OUT / "junctions-18.jpg",quality=95)
picks.save(OUT / "pod-three.jpg",quality=95)
(OUT/"checks.json").write_text(json.dumps(verified,indent=2)+"\n",encoding="utf-8")
