#!/bin/bash
# The reviewed entry point owns all new submissions in a deployed takeover.
if [ -f /root/gpu-day-20261115/manifest-v2.json ]; then
    exec bash /root/gpu-day-20261115/resume-reviewed.sh /root/gpu-day-20261115
fi
# GPU 日程守护：记录权重摘要 → 保持 ComfyUI 在线（退出即重启）→ 运行队列程序
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
R=/root/gpu-day-20261115
C=/root/autodl-tmp/cloud183-20261016/ComfyUI-e8665ca8e4089ab917567cdb491308e1397663d4
PY=/root/autodl-tmp/cloud183-20261016/venv/bin/python
cd $R; mkdir -p output temp user
echo "START $(date -Is) host $(hostname)"
for f in diffusion_models/qwen_image_2.1_bf16.safetensors text_encoders/qwen3vl_8b_bf16.safetensors vae/qwen_image_2.1_vae_bf16.safetensors; do
  echo "WEIGHT $f $(stat -c %s $C/models/$f) $(sha256sum $C/models/$f | cut -c1-64)"
done
$PY -B queue_runner.py --root $R --comfy http://127.0.0.1:8189 >> runner.log 2>&1 &
echo "RUNNER pid $!"
while [ ! -e $R/STOP ]; do
  echo "COMFY_START $(date -Is)"
  $PY -B $C/main.py --listen 127.0.0.1 --port 8189 --disable-auto-launch --disable-all-custom-nodes --disable-partner-nodes --cache-classic \
    --input-directory $R/inputs --output-directory $R/output --temp-directory $R/temp --user-directory $R/user >> comfy.log 2>&1
  echo "COMFY_EXIT $(date -Is) code $?"
  sleep 10
done
echo "END $(date -Is)"
