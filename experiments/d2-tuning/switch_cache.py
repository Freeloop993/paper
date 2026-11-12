"""Switch the identified idle L1 service to classic node caching after archival."""
import json
import os
from pathlib import Path
import signal
import subprocess
import time

import l1_core as core
from l1_timing import read_l1

ROOT = Path(__file__).resolve().parent.parent
PERF = ROOT/"D2-cache-change"
LOG = ROOT/"comfy-d2-server.log"


def main():
    env = json.loads((ROOT/"environment-ready.json").read_bytes())
    cmd, pid = env["cmd"], env["pid"]
    state = json.loads((ROOT/"L1-actual/progress.json").read_bytes())
    assert state["state"]=="completed" and len(set(state["completed"]))==28
    archive_sha = (ROOT/"L1-final-sha256.txt").read_text().split()[0]
    assert core.digest((ROOT/"L1-originals.zip").read_bytes()) == archive_sha
    assert not any(core.checked_get("/queue").json().get(k) for k in ("queue_running","queue_pending"))
    proc = Path("/proc")/str(pid)
    live = proc.joinpath("cmdline").read_bytes().rstrip(b"\0").decode().split("\0")
    assert live == cmd and cmd.count("--cache-none")==1 and cmd[:2] == [
        str(ROOT/"venv/bin/python"), str(ROOT/"ComfyUI-e8665ca8e4089ab917567cdb491308e1397663d4/main.py")]
    cwd = (proc/"cwd").resolve()
    assert cwd == Path(cmd[1]).parent
    assert '"--cache-classic"' in (cwd/"comfy/cli_args.py").read_text()
    # Retain this process environment in memory for its identical replacement.
    # The receipt records command-line options and performance metadata only.
    envbytes = (proc/"environ").read_bytes().split(b"\0")
    launch_env = dict(item.split(b"=",1) for item in envbytes if b"=" in item)
    args = ["--cache-classic" if a=="--cache-none" else a for a in cmd]
    stats = core.checked_get("/system_stats").json()
    assert "--cache-none" in stats["system"]["argv"]
    PERF.mkdir(exist_ok=False)
    core.record(PERF/"l1-timings.json",read_l1(ROOT,state["completed"]))
    core.record(PERF/"before.json",dict(utc=core.now(),pid=pid,cmd=cmd,stats=stats,archive=archive_sha))
    with LOG.open("xb") as output:
        os.kill(pid,signal.SIGTERM)
        for _ in range(120):
            if not (proc/"cmdline").exists() or not (proc/"cmdline").read_bytes(): break
            time.sleep(0.5)
        else: raise RuntimeError("Original ComfyUI did not stop")
        child = subprocess.Popen(args,cwd=cwd,stdin=subprocess.DEVNULL,stdout=output,
                                 stderr=subprocess.STDOUT,env=launch_env,start_new_session=True)
        core.record(PERF/"launch.json",dict(utc=core.now(),pid=child.pid,cmd=args))
    for _ in range(100):
        if child.poll() is not None: raise RuntimeError("Replacement service exited; inspect service log")
        try:
            stats = core.checked_get("/system_stats").json()
            assert "--cache-classic" in stats["system"]["argv"] and "--cache-none" not in stats["system"]["argv"]
            break
        except core.requests.ConnectionError:
            time.sleep(2)
    else: raise TimeoutError("New ComfyUI service not ready")
    nodes = core.checked_get("/object_info/VAEEncode").json()
    core.record(PERF/"after.json",dict(utc=core.now(),pid=child.pid,cmd=args,stats=stats,vae_encode=nodes.get("VAEEncode")))
    print("READY",child.pid,"--cache-classic", "VAEEncode" in nodes,flush=True)


if __name__=="__main__":
    main()
