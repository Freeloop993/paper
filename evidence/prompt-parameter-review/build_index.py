"""Index actual graph/PNG/history triples for the current Qwen study. Run from any directory."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SETS = {
    "R0": "evidence/r0-20261112/actual",
    "E0-open": "evidence/e0-open-20261112/E0-actual",
    "E1-open": "evidence/e1-open-20261112/E1-actual",
    "L1": "evidence/l1-layout-actual/L1-actual",
    "D2": "evidence/d2-tuning/D2-actual",
}
sha = lambda raw: hashlib.sha256(raw).hexdigest()


def gather():
    prompts, results, counts = {}, [], {}
    old={r["case"]:r for r in json.loads((ROOT/"experiments/r0-e0-e1/manifest.json").read_bytes())["cases"]}
    for batch, source in SETS.items():
        images = sorted((ROOT/source).glob("*/original.png"))
        counts[batch] = len(images)
        for image in images:
            folder=image.parent
            legacy=(folder/"request.json").is_file()
            req=folder/("request.json" if legacy else "request.actual.json")
            history=folder/("history.json" if legacy else "history.original.json")
            ack=folder/("ack.json" if legacy else "response.original.json")
            raw=req.read_bytes()
            graph=json.loads(raw)["prompt"]
            pid=json.loads(ack.read_bytes())["prompt_id"]
            actual=json.loads(history.read_bytes())[pid]
            assert actual["prompt"][2]==graph and actual["status"]["status_str"]=="success"
            by_class={n["class_type"]:n["inputs"] for n in graph.values()}
            text=by_class["TextEncodeQwenImage21"]
            pair={k:text[k] for k in ("prompt","negative_prompt")}
            key=sha(json.dumps(pair,sort_keys=True).encode())[:16]
            assert prompts.setdefault(key,pair)==pair
            cell=folder.name
            files={tag:p.relative_to(ROOT).as_posix() for tag,p in
                   [("image",image),("request",req),("history",history),("ack",ack)]}
            result=dict(batch=batch,position=cell,prompt_pair=key,prompt_id=pid,files=files,
                        raw_request_sha256=sha(raw),original_png_sha256=sha(image.read_bytes()),
                        text_node_other_inputs={k:v for k,v in text.items() if k not in pair},
                        sampler=by_class["KSampler"],control=by_class.get("QwenImageDiffsynthControlnet"),
                        canny=by_class.get("Canny"),image_scale=by_class.get("ImageScale"),
                        load_images=[n["inputs"]["image"] for n in graph.values() if n["class_type"]=="LoadImage"],
                        vae_encode=by_class.get("VAEEncode"),models={k:v for k,v in by_class.items() if k.endswith("Loader")},
                        cached_nodes=[n for event,payload in actual["status"]["messages"] if event=="execution_cached" for n in payload["nodes"]])
            receipt=folder/"receipt.json"
            if receipt.is_file():
                rec=json.loads(receipt.read_bytes())
                assert rec["original_sha256"]==result["original_png_sha256"] and rec["request_sha256"]==result["raw_request_sha256"]
                result["input_sha256"]=rec["input_sha256"]
            if result["load_images"]:
                name,=result["load_images"]
                if batch in ("R0","E0-open","E1-open"):
                    guide=ROOT/old[cell]["guide"]
                    expected=old[cell]["guide_sha256"]
                elif batch=="D2":
                    source=json.loads((ROOT/"experiments/d2-tuning/input-bindings.json").read_bytes())[name]
                    guide=ROOT/source["source"]
                    expected=source["sha256"]
                elif name.startswith("E1-control-"):
                    guide=ROOT/SETS["E1-open"]/Path(name).stem/"original.png"
                    expected=result["input_sha256"]
                else:
                    guide=ROOT/"experiments/l1-layout/guides"/name
                    expected=result["input_sha256"]
                assert sha(guide.read_bytes())==expected
                result.update(input_file=guide.relative_to(ROOT).as_posix(),input_sha256=expected)
            results.append(result)
    assert len(set(r["prompt_id"] for r in results))==len(results)
    return counts,prompts,results


def write():
    counts,prompts,rows=gather()
    data=dict(scope="Actual Qwen runs in R0, E0, E1, L1 and D2. Each batch retains its own denominator.",
              counts=counts,prompt_pairs=prompts,images=rows)
    (HERE/"actual-parameters.json").write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+"\n").encode())
    lines=["# 逐图核验索引","","每行对应一张已归档的原始 PNG。请求链接可查看完整节点图、正负提示词及模型文件名。缓存与节点执行状态见运行历史。",""]
    for batch in SETS:
        group=[r for r in rows if r["batch"]==batch]
        if not group: continue
        lines.extend([f"## {batch} · {len(group)} 张","","| 位置 | 原件与实际记录 | 种子 | CFG | Union 强度 / 起止 | 输入 |",
                      "|---|---|---:|---:|---|---|"])
        for r in group:
            files=r["files"]
            links=" · ".join("["+name+"](../../"+files[tag]+")" for tag,name in [("image","PNG"),("request","请求"),("history","历史"),("ack","受理")])
            s,c=r["sampler"],r["control"]
            controls="—" if not c else f"{c['strength']} / {c.get('start_percent',0)}–{c.get('end_percent',1)}"
            image=", ".join(r["load_images"]) or "纯文字"
            if r.get("input_file"):
                image=f"[{image}](../../{r['input_file']})"
            lines.append(f"| {r['position']} | {links} | {s['seed']} | {s['cfg']} | {controls} | {image} |")
        lines.append("")
    (HERE/"by-image.md").write_bytes(("\n".join(lines)+"\n").encode())
    print(counts,"prompt pairs",len(prompts))


if __name__=="__main__":
    write()

