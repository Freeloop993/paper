"""Inspect an E4 C1 pair export without emitting prompts, answers, images or participant IDs."""
import argparse
import base64
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path


def digest(data):
    return hashlib.sha256(data).hexdigest()


def audit_pair(data):
    if not isinstance(data, dict) or data.get("schema") != "e4-author-pilot/2":
        raise ValueError("Expected an e4-author-pilot/2 pair export")
    issues = []
    missing = []
    samples = []
    settings = data["settings"]
    sessions = data["sessions"]
    if sorted(s["condition"] for s in sessions) != ["D", "S"]:
        issues.append("The export must contain one S and one D session")
    if [s["task"] + s["condition"] for s in sessions] != settings["order"]:
        issues.append("Sessions do not match assigned order")
    if settings.get("maxAttempts") != 9 or settings.get("minutes") != 15:
        issues.append("Check opportunity and active-time limits against the registered version")
    for session in sessions:
        name = session["task"] + session["condition"]
        versions = session["versions"]
        successful = set()
        if session.get("phase") != "done" or len(versions) > settings["maxAttempts"]:
            issues.append(f"{name}: unfinished session or opportunity cap exceeded")
        for i, v in enumerate(versions, start=1):
            loc = f"{name}/{i}"
            inp = v["input"]
            if v["number"] != i or digest(inp["prompt"].encode("utf-8")) != inp["promptSha256"]:
                issues.append(f"{loc}: input hash or version number mismatch")
            if session["condition"] == "D" and inp["references"]:
                issues.append(f"{loc}: D submitted an image")
            if session["condition"] == "S" and not inp["references"]:
                issues.append(f"{loc}: S missing study guide")
            receipt = v.get("receipt")
            if not receipt:
                missing.append(f"{loc}: no receipt")
                continue
            available = [v["sealed"]] + [receipt[k] for k in ("submitted", "started", "ended", "recorded") if receipt.get(k)]
            times = [datetime.fromisoformat(t.replace("Z", "+00:00")) for t in available]
            if times != sorted(times):
                issues.append(f"{loc}: timestamp order")
            if receipt.get("routeMatches") is False or receipt.get("backendMatches") is False:
                issues.append(f"{loc}: protocol deviation in actual route or backend")
            if receipt["status"] == "success":
                successful.add(str(i))
                image = receipt.get("image") or {}
                try:
                    raw = base64.b64decode(image["data"].split(",", 1)[1], validate=True)
                except (KeyError, IndexError, ValueError):
                    raw = b""
                if not raw.startswith(b"\x89PNG\r\n\x1a\n") or digest(raw) != image.get("sha256"):
                    issues.append(f"{loc}: output PNG or hash invalid")
                if not receipt.get("id") or receipt.get("calls") != 1:
                    issues.append(f"{loc}: legacy success receipt must have one call and an ID")
                for key in ("actualRequest", "actualBackend", "submitted", "started", "ended"):
                    if not receipt.get(key):
                        missing.append(f"{loc}: {key}")
            if receipt["status"] == "unknown":
                missing.append(f"{loc}: unresolved status or call count")
        decision = session.get("decision") or {}
        if decision.get("choice") not in successful.union({"none", "timeout"}) or not decision.get("reason"):
            issues.append(f"{name}: choice unlinked or missing reason")
        summary = session.get("summary", {})
        if all(isinstance(summary.get(k),(int,float)) for k in ("activeMs","externalWaitMs","technicalPauseMs","wallMs")):
            if summary["activeMs"] + summary["externalWaitMs"] + summary["technicalPauseMs"] != summary["wallMs"]:
                issues.append(f"{name}: time partition mismatch")
        else:
            missing.append(f"{name}: incomplete timing")
        samples.append({"session": name, "attempts": len(versions), "successes": len(successful),
                        "failed": sum((v.get("receipt") or {}).get("status") == "failed" for v in versions),
                        "total_calls_as_reported": summary.get("totalCalls")})
    return {"schema":data["schema"], "sessions":samples,"integrity_issues":issues, "missing_evidence":missing,
            "external_evidence_review":"Required independently: actual requests, backend receipts, displayed candidate inventory, participant provenance. A browser export alone cannot establish a real model run or human session."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pair",help="Local pair-export JSON path, or - for standard input")
    args = parser.parse_args()
    raw = sys.stdin.buffer.read() if args.pair == "-" else Path(args.pair).read_bytes()
    try:
        result = audit_pair(json.loads(raw))
    except (KeyError, ValueError, TypeError, IndexError) as error:
        print(f"Invalid pair export: {error}", file=sys.stderr)
        return 2
    print(json.dumps(result,ensure_ascii=True,indent=2))
    return 1 if result["integrity_issues"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
