"""在临时副本检验补丁。需要 Python、Git 和已保留的 V2 离线包。"""
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.request import urlopen

OUT = Path(__file__).resolve().parent
REG = OUT.parents[1] / "offline-review/gpu-registration"
P = "1ff8011aa5a14da4d0eed137099bafe13a632226"
G = "97b1a724c750032fd61c5ee83c19227bb75cf7dd"
REVIEW = "evidence/semantic-cards/early-crawl/claude-review-20261117/README.md"
SIX = "evidence/20261117-offline-review/README.md"


def original(root, commit, path):
    with urlopen(f"https://raw.githubusercontent.com/Freeloop993/paper/{commit}/{path}", timeout=25) as reply:
        data = reply.read()
    f = root/path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_bytes(data)
    return f


def apply(root, name):
    args = ["git", "apply", "--whitespace=error"]
    patch = str(OUT/name)
    for flags in (["--check"], [], ["--reverse", "--check"]):
        subprocess.run(args+flags+[patch], cwd=root, check=True)


def test(root):
    a = original(root, P, REVIEW)
    b = original(root, P, SIX)
    old = [p.read_bytes() for p in (a,b)]
    apply(root, "01-count-and-figure.patch")
    lines = a.read_text("utf-8").splitlines()
    assert "6,465" in next(l for l in lines if l.startswith("| 规则合并后"))
    assert "2025" not in next(l for l in lines if l.startswith("| 去重的非默认文本"))
    assert "HEXA3-wl1.30-r04（匿名编号 1d760b88）" in b.read_text("utf-8")
    # 在旧基线上这两个勘误均不成立。
    assert b"1d760b88" not in old[1] and b"6,465" not in old[0]
    exe = original(root,G,"experiments/preflight.py")
    assert exe.read_bytes() == (REG/"experiments/preflight.py").read_bytes()
    apply(root, "02-preflight-mask.patch")
    shutil.copyfile(REG/"experiments/approved-inputs.json",root/"experiments/approved-inputs.json")
    e = REG/"experiments/20261117-local-edit-v2"
    manifest = e/"manifest.json"
    masks = root/"masks"
    shutil.copytree(e/"masks",masks)
    reqs = root/"case"
    reqs.mkdir()
    single = reqs/"test.json"
    def check(label, folder, expected, use_registry=True, patched=True):
        cmd=[sys.executable,"-X","utf8","-B",str(exe if patched else REG/"experiments/preflight.py"),str(folder),
             "--inputs",str(e/"inputs"),"--allow-shared-seeds","E2V2"]
        if use_registry:
            cmd += ["--mask-manifest",str(manifest),"--masks",str(masks)]
        res=subprocess.run(cmd,capture_output=True,encoding="utf-8",errors="replace",timeout=35)
        assert res.returncode==(0 if expected is None else 1),(label,res.returncode,res.stdout,res.stderr)
        if expected is not None:
            assert expected in res.stdout,(label,res.stdout)
        return dict(test=label,exit_code=res.returncode,checked=res.stdout.splitlines()[0])
    results=[check("全部冻结请求",e/"requests",None)]
    f=next((e/"requests").rglob("*LE2-CAM-dev-r1.json"))
    raw=f.read_bytes()
    single.write_bytes(raw)
    j=json.loads(raw)
    node=next(n for n,v in j["prompt"].items() if v["class_type"]=="LoadImageMask")
    mask=j["prompt"][node]["inputs"]["image"]
    mf=masks/mask
    good=mf.read_bytes()
    mf.unlink()
    results.extend([check("原检查器漏报遮罩不存在",reqs,None,False,False),
                    check("实物缺失",reqs,"遮罩文件缺失")])
    mf.write_bytes(good+b"x")
    results.append(check("实物摘要不符",reqs,"摘要与登记不符"))
    mf.write_bytes(good)
    for label,field,value,error in [
        ("其他已登记遮罩错配","image","M-COVER-B2.png","节点与本批请求登记不符"),
        ("未登记遮罩","image","unexpected.png","未登记的遮罩"),
        ("通道错误","channel","alpha","遮罩通道")]:
        j=json.loads(raw)
        j["prompt"][node]["inputs"][field]=value
        single.write_text(json.dumps(j),"utf-8")
        results.append(check(label,reqs,error))
    j=json.loads(raw)
    del j["prompt"][node]
    single.write_text(json.dumps(j),"utf-8")
    results.append(check("删去应有节点",reqs,"节点与本批请求登记不符"))
    single.write_bytes(raw)
    results.extend([check("遮罩未附登记",reqs,"未提供 --mask-manifest",False),
                    check("完整登记与文件恢复",reqs,None)])
    for f in (e/"requests").rglob("*.json"):
        if all(n["class_type"]!="LoadImageMask" for n in json.loads(f.read_bytes())["prompt"].values()):
            single.write_bytes(f.read_bytes())
            break
    results.append(check("无掩膜旧调用兼容",reqs,None,False))
    return dict(doc_patch="git apply --check、应用、反向校验和逐行断言通过",snapshot=P,
                preflight_base=G,original_preflight_sha256=hashlib.sha256((REG/"experiments/preflight.py").read_bytes()).hexdigest(),cases=results)


if __name__=="__main__":
    with tempfile.TemporaryDirectory() as tmp:
        data=test(Path(tmp))
    (OUT/"patch-tests.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n","utf-8")
    print(json.dumps(data,ensure_ascii=False,indent=2))

