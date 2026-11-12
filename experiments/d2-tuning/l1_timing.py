"""Join the final L1 server-log records to their ordered real execution histories."""
import json
from pathlib import Path
import re

import l1_core as core


def read_l1(root, positions):
    logfile = root/"comfy-server.log"
    with logfile.open("rb") as f:
        f.seek(max(0,logfile.stat().st_size-2_000_000))
        text = f.read().decode(errors="replace")
    records = []
    start = 0
    for m in re.finditer(r"Prompt executed in (?:([0-9.]+) seconds|(\d+):(\d+):([\d.]+))",text):
        segment = text[start:m.start()]
        start = m.end()
        loops = re.findall(r"40/40\s*\[(\d+):(\d+)(?::(\d+))?<",segment)
        loop = None
        if loops:
            times = [int(s) for s in loops[-1] if s]
            loop = sum(v*60**i for i,v in enumerate(reversed(times)))
        loads = re.findall(r"Requested to load ([\w.-]+)",segment)
        total = float(m[1]) if m[1] else int(m[2])*3600 + int(m[3])*60 + float(m[4])
        records.append(dict(server_seconds=total,sampler_loop_seconds=loop,requested_to_load=loads))
    records=records[-len(positions):]
    comparisons=[]
    for name,log in zip(positions,records) if len(records)==len(positions) else []:
        folder = root/"L1-actual"/name
        history=next(iter(json.loads((folder/"history.original.json").read_bytes()).values()))
        messages=history["status"]["messages"]
        ts={k:v["timestamp"] for k,v in messages if "timestamp" in v}
        seconds=(ts["execution_success"]-ts["execution_start"])/1000
        close=abs(seconds-log["server_seconds"])<5
        comparisons.append(dict(position=name,history_seconds=seconds,log_time_matches=close,**log))
    samples={}
    path=root/"L1-cache-io-samples.txt"
    if path.exists():
        for line in path.read_text().splitlines():
            parts=line.split()
            if len(parts)!=3 or not parts[2].isdigit(): continue
            stamp,name,value=parts
            sample=samples.setdefault(name,dict(first_utc=stamp,first_bytes=int(value),samples=0))
            sample.update(last_utc=stamp,last_bytes=int(value),samples=sample["samples"]+1)
        for s in samples.values():
            s["observed_process_disk_read_delta_bytes"]=s["last_bytes"]-s["first_bytes"]
    stage_log=root/"L1-cache-stages.txt"
    stages=stage_log.read_text().splitlines() if stage_log.exists() else []
    return dict(records=comparisons, stage_events_late_L1=stages, log_order_independently_matched=bool(comparisons) and all(r["log_time_matches"] for r in comparisons),
                disk_read_samples=samples, note="Kernel process read_bytes reflects storage reads, not page-cache hits. Samples may omit the beginning/end of a request.")
