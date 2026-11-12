"""Build the complete same-condition, same-seed E1 comparison from verified original files."""
from hashlib import sha256
from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
TILE = 336
WIDTH = 1536
ROWS = [("wl", 0.70), ("wl", 1.00), ("wl", 1.30), ("dd", 0.40), ("dd", 0.50), ("dd", 0.60)]
X = [118, 460, 822, 1164]
TOP = 155
STRIDE = TILE + 12


def load(path):
    return json.loads(path.read_bytes())


def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.truetype("arialbd.ttf" if bold else "arial.ttf", size)


def make():
    index = load(HERE / "index.json")
    frozen = {r["case"]: r for r in load(ROOT / "experiments/r0-e0-e1/manifest.json")["cases"]}
    bg, dark = "#e9eeee", "#14322e"
    sheet = Image.new("RGB", (WIDTH, TOP + 6 * STRIDE + 38), bg)
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 15), "E1   |   Matched top-view instructions", font=font(34, True), fill=dark)
    for i in range(2):
        draw.text((X[2*i], 69), f"Seed {2026111211+i}", font=font(22, True), fill=dark)
        for j, label in enumerate(("Guide + ControlNet", "Text only")):
            draw.text((X[2*i+j], 111), label, font=font(20), fill=dark)
    shown = set()
    for n, (factor, level) in enumerate(ROWS):
        y = TOP + n * STRIDE
        label = "W/L" if factor == "wl" else "d/D"
        draw.text((20, y+TILE//2-30), label, font=font(24, True), fill=dark)
        draw.text((20, y+TILE//2+5), f"{level:.2f}", font=font(23), fill=dark)
        for rep in (1, 2):
            common_graphs = []
            for j, arm in enumerate(("control", "text")):
                case = f"E1-{arm}-{factor}{level:.2f}-r{rep}"
                row = index[case]
                source = HERE / row["path"]
                assert sha256(source.read_bytes()).hexdigest() == row["sha256"]
                raw = source.with_name("request.json").read_bytes()
                assert sha256(raw).hexdigest() == frozen[case]["sha256"]
                graph = json.loads(raw)["prompt"]
                assert graph["10"]["inputs"]["seed"] == 2026111210 + rep
                assert graph["10"]["inputs"]["model"] == (["9",0] if arm == "control" else ["1",0])
                if arm == "control":
                    assert graph["7"]["class_type"] == "Canny"
                    assert graph["9"]["inputs"]["image"] == ["7",0]
                    assert [graph["9"]["inputs"][k] for k in ("strength","start_percent","end_percent")] == [0.7,0,1]
                else:
                    assert all(str(k) not in graph for k in range(5,10))
                sampler = dict(graph["10"]["inputs"])
                sampler.pop("model")
                common_graphs.append(({k: graph[k] for k in ("1","2","3","4","11")}, sampler))
                with Image.open(source) as im:
                    assert im.size == (1024,1024)
                    tile = im.convert("RGB").resize((TILE,TILE), Image.Resampling.LANCZOS)
                sheet.paste(tile, (X[2*(rep-1)+j], y))
                shown.add(case)
            assert common_graphs[0] == common_graphs[1], (factor, level, rep)
    assert len(shown) == 24
    assert set(index) - shown == {f"E1-control-{f}{v:.2f}-r{i}" for f,v in ROWS for i in (3,4)}
    draw.text((22,TOP+6*STRIDE+3), "12 matched pairs. Complete frames at the same scale. Full run: 24 guided + 12 text-only images.", font=font(18), fill=dark)
    sheet.save(HERE / "matched-pairs.png", optimize=True)


if __name__ == "__main__":
    make()
