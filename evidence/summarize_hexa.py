import csv
from pathlib import Path
from statistics import mean


def summarize(rows):
    grouped = {}
    for row in rows:
        grouped.setdefault((row["task"], row["mode"]), []).append(row)
    if set(grouped) != {(task, mode) for task in ("H1", "H2") for mode in ("full", "structure")}:
        raise ValueError("Unexpected task or mode")
    results = {}
    for key, group in grouped.items():
        if len(group) != 2 or {row["annotation_role"] for row in group} != {"AI_a", "AI_b"}:
            raise ValueError("Expected exactly two historical annotations per image")
        if len({row["output_sha256"] for row in group}) != 1:
            raise ValueError("Unmatched image within condition")
        results[key] = (mean(float(row["target_iou"]) for row in group),
                        mean(abs(float(row["visible_assembly_ratio"]) - float(row["input_ratio"])) for row in group))
    return results


if __name__ == "__main__":
    with Path(__file__).with_name("hexa4-ai.csv").open(encoding="utf-8", newline="") as source:
        result = summarize(csv.DictReader(source))
    print("task,full_minus_structure_IoU,full_minus_structure_abs_ratio_error")
    for task in ("H1", "H2"):
        delta = [full - structure for full, structure in zip(result[task, "full"], result[task, "structure"])]
        print(f"{task},{delta[0]:.6f},{delta[1]:.6f}")
