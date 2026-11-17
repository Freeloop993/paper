#!/bin/bash
set -euo pipefail
R=${1:-/root/gpu-day-20261115}
cd "$R"
exec 9>"$R/resume-reviewed.lock"
flock -n 9 || { echo "Reviewed launcher already active"; exit 2; }
test -f STOP
test ! -e STOP-V2
PY=/root/autodl-tmp/cloud183-20261016/venv/bin/python
export PYTHONUNBUFFERED=1
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy
sha256sum -c reviewed-files.sha256
"$PY" -B dispatch_v2.py freeze --root "$R" | cmp - manifest-v2.json
if [ ! -f e2r-actual/RUN_OK ]; then
    "$PY" -B run_e2r.py "$R"
fi
"$PY" -B dispatch_v2.py run --root "$R"
