"""Apply frozen G2 geometry to one unblinded G2d reading."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/"g2-control"))
from measure import report

def score(points):
    result = report(points, manifest_path=HERE/"manifest.json")
    blocks = list(result["strict_monotonic_by_seed"].values())
    if result["all_six_within_and_both_strict"]:
        verdict = "通过"
    elif result["unreadable"] >= 2 or all(value is False for value in blocks):
        verdict = "失败"
    elif result["unreadable"]:
        verdict = "证据不足"
    elif any(blocks):
        verdict = "部分"
    else:
        verdict = "失败"
    return {**result, "verdict_for_this_reader":verdict}

if __name__=="__main__":
    print(json.dumps(score(json.loads(Path(sys.argv[1]).read_bytes())),ensure_ascii=False,indent=2))
