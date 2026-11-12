"""Validate returned questionnaires, preserve raw marks, report per-image medians."""
from collections import defaultdict
from statistics import median


def summarize_instrument(key, responses):
    items = {row["id"]:row for row in key["images"]}
    mode = key["mode"]
    term_ids = {t["id"] for t in key["terms"]}
    r1_ids = {q[0] for q in key["questions"]}
    response_ids = set()
    groups = defaultdict(lambda:defaultdict(list))
    observations = []
    for response in responses:
        rid = response["responseId"]
        if (not rid or rid in response_ids or not response.get("ended")
                or any(key[k]!=response[k] for k in ("pack","mode","schema","termsVersion"))):
            raise ValueError("Incomplete, duplicate or mismatched return")
        response_ids.add(rid)
        rows = response["images"]
        ids = [r["id"] for r in rows]
        if sorted(ids)!=sorted(items) or ids!=response["presentation"]:
            raise ValueError("Image order or coverage mismatch")
        if mode == "e5-semantic" and [items[i]["block"] for i in ids] != sorted(
                (items[i]["block"] for i in ids), key={"product":0,"final":1}.get):
            raise ValueError("Product photos must precede the final designs")
        for row in rows:
            code = row["id"]
            if row["block"] != items[code]["block"]:
                raise ValueError("Mismatched image block")
            if mode == "r1":
                vals = row["ratings"]
                if set(vals)!=r1_ids or any(type(x) is not int or x not in (0,1,2) for x in vals.values()):
                    raise ValueError("Invalid R1 mark")
            else:
                if set(row["terms"])!=term_ids:
                    raise ValueError("Word-pair set differs from frozen version")
                vals = {}
                for tid,t in row["terms"].items():
                    v=t["displayValue"]
                    if t["displayOrder"] not in ("canonical","reversed") or (v is not None and (type(v) is not int or not 1<=v<=7)):
                        raise ValueError("Invalid semantic marks")
                    value = None if v is None else (8-v if t["displayOrder"]=="reversed" else v)
                    if value!=t["canonicalValue"] or t["unreadable"] is not (v is None):
                        raise ValueError("Display/recode mismatch")
                    vals[tid]=value
            for k,v in vals.items():
                groups[code][k].append(v)
            observations.append({"responseId":rid,"image":code,"exposure":response.get("exposure"),"scores":vals})
    summary = {}
    for code in items:
        summary[code] = {}
        for k in sorted(r1_ids if mode=="r1" else term_ids):
            values = groups[code][k]
            known = [v for v in values if v is not None]
            summary[code][k] = {"median":median(known) if known else None,
                                 "rated":len(known),"unreadable":len(values)-len(known)}
    return {"pack":key["pack"],"mode":mode,"wording":key["termsVersion"],"returnedForms":len(response_ids),
            "perReader":observations,"images":summary}
