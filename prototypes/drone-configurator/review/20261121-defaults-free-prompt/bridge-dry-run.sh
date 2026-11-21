#!/bin/sh
# 把两种方式走查留下的文件交给主持人的登记工具试收一遍：结构化一场、自由提示一场，再配对。
# 用法：先运行  node scripts/methods-walkthrough.mjs <截图目录> <留档目录>
#       再运行  sh review/20261121-defaults-free-prompt/bridge-dry-run.sh <留档目录> <带 Pillow 的 python>
# 图像由软件夹具应答，不是模型回图；这里只检查文件的格式和对应关系，场次类别记为 software_control。
set -e
B="$1"; PY="${2:-python3}"
CAP="$(cd "$(dirname "$0")/../../../../planning/advisor-20261118/pilot-bridge" && pwd)/capture.py"
cd "$B"; rm -f S.db D.db
id() { "$PY" -c "import json,sys;r=json.load(open('rounds.json'));print([x for x in r if x['condition']==sys.argv[1] and x['parent']==(sys.argv[2]=='1')][0]['id'])" "$1" "$2"; }
img() { "$PY" -c "import json,sys;g=json.load(open('jobs/'+sys.argv[1]+'.comfy-request.json'))['prompt'];print(g['15']['inputs']['image'])" "$1"; }
ST=$(id structured 0); F1=$(id free 0); F2=$(id free 1)
CFG=exports/$(ls exports | grep config); TXT=exports/$(ls exports | grep prompt); GUIDE=exports/$(ls exports | grep guide)
printf '软件走查用的简报 A' > brief-A.txt; printf '软件走查用的简报 B' > brief-B.txt; cp "$GUIDE" common-guide.png
run() { echo "\$ capture.py $*"; "$PY" -B "$CAP" "$@"; }

echo "== 结构化一场"
run S.db start --stage software_control --subject P00 --pair DRY-01 --order 1 --task A --condition S --policy structured-guide --model qwen-fixture --protocol C2-dry --guide common-guide.png --brief brief-A.txt
run S.db seal --id a1 --slots 1 --config "$CFG" --approved "jobs/$ST.prompt.txt" --request "jobs/$ST.comfy-request.json" --image "$(img "$ST")=$GUIDE" --goal "软件走查" --keep "软件走查"
run S.db receive --id a1 --status success --ack "jobs/$ST.comfy-ack.json" --history "jobs/$ST.comfy-history.json" --output "jobs/studio-${ST}_00001_.png"
run S.db review-origin --id a1 --evidence "jobs/$ST.json" --reason "工作台在设计者点生成时自行派发；作业记录里有派发时间、后端作业号和请求摘要"
run S.db present --candidate a1/1 --status shown --now --reason "软件走查"
run S.db decide keep --candidate a1/1 --reason "软件走查"
run S.db close --reason "软件走查结束"

echo "== 自由提示一场"
run D.db start --stage software_control --subject P00 --pair DRY-01 --order 2 --task B --condition D --policy structured-guide --model qwen-fixture --protocol C2-dry --guide common-guide.png --brief brief-B.txt
run D.db seal --id a1 --slots 1 --approved "jobs/$F1.prompt.txt" --request "jobs/$F1.comfy-request.json" --goal "软件走查" --keep "软件走查"
run D.db receive --id a1 --status success --ack "jobs/$F1.comfy-ack.json" --history "jobs/$F1.comfy-history.json" --output "jobs/studio-${F1}_00001_.png"
run D.db review-origin --id a1 --evidence "jobs/$F1.json" --reason "工作台在设计者点生成时自行派发；作业记录里有派发时间、后端作业号和请求摘要"
run D.db present --candidate a1/1 --status shown --now --reason "软件走查"
run D.db decide keep --candidate a1/1 --reason "软件走查"
run D.db seal --id a2 --slots 1 --parent a1/1 --approved "jobs/$F2.prompt.txt" --request "jobs/$F2.comfy-request.json" --image "$(img "$F2")=jobs/studio-${F1}_00001_.png" --goal "软件走查" --keep "软件走查"
run D.db receive --id a2 --status success --ack "jobs/$F2.comfy-ack.json" --history "jobs/$F2.comfy-history.json" --output "jobs/studio-${F2}_00001_.png"
run D.db review-origin --id a2 --evidence "jobs/$F2.json" --reason "同上"
run D.db present --candidate a2/1 --status shown --now --reason "软件走查"
run D.db decide keep --candidate a2/1 --reason "软件走查"
run D.db close --reason "软件走查结束"

echo "== 配对"
run S.db pair D.db
