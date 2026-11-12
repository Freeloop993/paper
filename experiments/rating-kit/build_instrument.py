"""Package the R1 instrument or the E5 semantic supplement using verified inputs."""
import hashlib
import json
from pathlib import Path
import secrets
import shutil

from PIL import Image
from eligibility import read_registry

HERE = Path(__file__).resolve().parent
R1_QUESTIONS = [
    ("product", "这张图像一件产品的效果图，还是像示意图或线稿？", ["像示意图", "介于两者之间", "像产品图"]),
    ("camera", "能否指出相机在哪里？", ["不能", "大概能", "能，位置明确"]),
    ("junction", "臂与机身相接的地方是有过渡的造型，还是直杆插入？", ["直杆", "不明显", "有过渡"]),
]


def load_terms(path):
    terms = json.loads(path.read_text(encoding="utf-8-sig"))
    pairs = terms["pairs"]
    if not terms.get("freezeReference") or not terms.get("version") or len(pairs) not in (3, 4):
        raise ValueError("Supply the frozen terms, version and author's freeze reference")
    ids = [p["id"] for p in pairs]
    if len(set(ids)) != len(ids) or any(not all(isinstance(p.get(k), str) and p[k].strip()
                                               for k in ("id", "left", "right")) or p["left"] == p["right"] for p in pairs):
        raise ValueError("Invalid semantic poles")
    return terms


def build_instrument(plan_path, destination, plan):
    mode = plan["mode"]
    items = plan["images"]
    if not plan.get("freezeReference") or not items or len({r["key"] for r in items}) != len(items):
        raise ValueError("Supply the frozen sample and distinct research keys")
    terms = None
    if mode == "r1":
        if len(items) != 16 or any(r["block"] != "render" for r in items):
            raise ValueError("R1 has 16 registered positions including two references to E1")
    elif mode == "e5-semantic":
        terms = load_terms(plan_path.parent / plan["terms_file"])
        products = [r for r in items if r["block"] == "product"]
        final = [r for r in items if r["block"] == "final"]
        if len(products)+len(final) != len(items) or not final or len(products)>10:
            raise ValueError("Supply at most ten real product photos and the locked final designs")
        if len(products)<8 and not plan.get("product_shortfall"):
            raise ValueError("Record the actual product-photo shortfall")
    else:
        raise ValueError("Unknown instrument")
    retired = read_registry()["excluded_images"]
    verified = []
    for row in items:
        src = plan_path.parent / row["path"]
        file_sha = hashlib.sha256(src.read_bytes()).hexdigest()
        if row.get("sha256") != file_sha or not row.get("evidence"):
            raise ValueError(f"Digest or receipt/source missing: {row['key']}")
        if row["block"] == "product" and not row.get("permission"):
            raise ValueError(f"Missing image permission: {row['key']}")
        with Image.open(src) as im:
            if im.size != (1024, 1024):
                raise ValueError(f"Expected a prepared 1024-square image: {row['key']}")
            rgb = im.convert("RGB")
            clean = Image.frombytes("RGB", im.size, rgb.tobytes())
        rgb_sha = hashlib.sha256(clean.tobytes()).hexdigest()
        if any(x["sha256"]==file_sha or x["rgb_sha256"]==rgb_sha for x in retired):
            raise ValueError(f"Retired image: {row['key']}")
        verified.append((row, clean, file_sha, rgb_sha))
    destination.mkdir(parents=True, exist_ok=False)
    share = destination / "participant"
    (share / "images").mkdir(parents=True)
    public_rows, private_rows = [], []
    for row, clean, file_sha, rgb_sha in verified:
        code = secrets.token_hex(8)
        path = share / "images" / (code + ".png")
        with path.open("xb") as output:
            clean.save(output, format="PNG")
        public_rows.append({"id":code,"block":row["block"]})
        private_rows.append({**row,"id":code,"original_sha256":file_sha,"rgb_sha256":rgb_sha})
    public_terms = [{k:p[k] for k in ("id","left","right")} for p in terms["pairs"]] if terms else []
    manifest = {"schema":"topview-rating-v1","mode":mode,"pack":secrets.token_hex(12),"images":public_rows,
                "terms":public_terms,"termsVersion":terms["version"] if terms else None,
                "questions":R1_QUESTIONS if mode=="r1" else []}
    # Do not disclose the source/order key, freeze URLs or any direction-specific target.
    secrets.SystemRandom().shuffle(manifest["images"])
    (share/"pack.js").write_text("const PACK = "+json.dumps(manifest)+";\n", encoding="utf-8")
    for name in ("index.html","instrument.js"):
        shutil.copyfile(HERE/"instrument"/name, share/name)
    key = {**manifest,"images":private_rows,"freezeReference":plan["freezeReference"],
           "plan_sha256":hashlib.sha256(plan_path.read_bytes()).hexdigest(),"termsFreeze":terms and terms["freezeReference"],
           "productShortfall":plan.get("product_shortfall")}
    (destination/"researcher-key.json").write_text(json.dumps(key,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
