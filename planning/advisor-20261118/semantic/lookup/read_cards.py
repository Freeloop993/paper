"""Read the project's public card CSV into the same fields as the PR #75 client."""
import csv
import io
import json
from pathlib import Path
import subprocess
import sys

HEADERS = ["卡号", "匿名来源键", "数据集", "记录编号（公开替代码）", "原文片段", "对象",
           "展开或折叠状态", "类别", "极性", "历史解释与限制", "与候选方向的关系"]
FIELDS = ["id", "source_key", "dataset", "record", "quote", "object", "state", "category",
          "polarity", "limits", "relation"]


def read_cards(filename=None):
    if filename:
        raw = Path(filename).read_bytes()
    else:
        raw = subprocess.check_output(["git", "show", "HEAD:evidence/semantic-cards/cards.csv"],
                                      cwd=Path(__file__).parent)
    with io.StringIO(raw.decode("utf-8-sig"), newline="") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != HEADERS:
            raise ValueError("公开卡表头与当前版本不一致")
        return {"cards": [dict(zip(FIELDS, (row[key] for key in HEADERS))) for row in reader]}


if __name__ == "__main__":
    print(json.dumps(read_cards(*sys.argv[1:]), ensure_ascii=True))
