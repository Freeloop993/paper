from pathlib import Path
import fcntl, hashlib, json, os, shutil, socket, sys, time, zipfile
from datetime import datetime
BASE=Path('/root/gpu-day-20261115')
OUT=Path('/root/s4-camera-277')
KIT=Path(__file__).resolve().parent
def sha(path):
 return hashlib.sha256(path.read_bytes()).hexdigest()
def need(ok,reason):
 if not ok:raise RuntimeError(reason)
def save_evidence():
 plan=json.loads((BASE/'manifest-v2.json').read_bytes())['requests']
 ledger=[json.loads(x) for x in (BASE/'takeover-v2/progress.jsonl').read_text().splitlines()]
 legacy=[json.loads(x) for x in (BASE/'progress.jsonl').read_text().splitlines()]
 for name,order in [('shape24',4),('v16-shape24',8),('wlq12',5)]:
  target=OUT/('review15-'+name+'.zip')
  if target.exists():continue
  rows=[r for r in plan if r['order']==order]
  need(len(rows)==(12 if order==5 else 24),name)
  paths=[]
  receipts=[]
  for row in rows:
   rid=row['id']; match=[r for r in ledger if r['id']==rid and r['state']=='completed']
   prior=[r for r in legacy if r['id']==rid and r.get('ok') is True]
   need(len(match)+len(prior)==1,'missing or duplicate receipt '+rid)
   rec=(match or prior)[0];d=BASE/('takeover-v2' if match else 'out')/rid
   need(sha(d/(rid+'.png'))==rec['png_sha256'] and sha(d/'request.json')==row['sha256']==rec['request_sha256'],rid)
   receipts.append(rec)
   for fn in [rid+'.png','request.json','ack.json','history.json']:paths.append((d/fn,rid+'/'+fn))
  with zipfile.ZipFile(str(target)+'.part','x',zipfile.ZIP_DEFLATED,compresslevel=1) as z:
   for path,arc in paths:z.write(path,arc)
   z.writestr('receipts.json',json.dumps(receipts))
  os.rename(str(target)+'.part',target)
  print(name,len(rows),sha(target),flush=True)
def run():
 need('a3b9-52ba851a' in socket.gethostname(),'wrong instance')
 save_evidence()
 sys.path.insert(0,str(BASE))
 from dispatch_v2 import clear_service,verify_model_receipt
 from queue_runner import run_one
 verify_model_receipt(BASE)
 lock=(BASE/'dispatch-v2.lock').open('a')
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 url='http://127.0.0.1:8189'
 clear_service(url)
 spec=json.loads((KIT/'manifest.json').read_bytes()); recs=[]
 need(len(spec['requests'])==9,'wrong batch')
 dest=BASE/'afternoon-dev-codex-1115'
 for row in spec['requests']:
  rid=row['id']
  need(not any((BASE/'output').glob(rid+'*')),'existing image '+rid)
  need(not any(d.exists() for d in [BASE/'out'/rid,BASE/'takeover-v2'/rid,dest/rid]),'possible existing attempt '+rid)
  p=KIT/'requests'/('%02d-%s.json'%(row['order'],rid))
  need(sha(p)==row['request_sha256'],rid)
 for image in spec['inputs']:
  name,h=image['input'],image['sha256']
  p=KIT/'inputs'/name;target=BASE/'inputs'/name
  need(sha(p)==h and (not target.exists() or sha(target)==h),name)
  if not target.exists():shutil.copyfile(p,target)
 dest.mkdir(exist_ok=False)
 for row in spec['requests']:
  need(time.time()<datetime.fromisoformat('2026-11-15T22:20:00+08:00').timestamp(),'end of rental window')
  rid=row['id'];clear_service(url)
  od=dest/rid;od.mkdir();p=KIT/'requests'/('%02d-%s.json'%(row['order'],rid))
  rec=run_one(url,BASE/'inputs',p,od,720)
  need(rec['id']==rid and rec['request_sha256']==row['request_sha256'],rid)
  recs.append(rec);(dest/'receipts.json').write_text(json.dumps(recs,indent=2))
  print('completed',rid,rec['seconds'],flush=True)
 target=OUT/'review15-afternoon9.zip'
 with zipfile.ZipFile(target,'x',zipfile.ZIP_DEFLATED,compresslevel=1) as z:
  for f in dest.rglob('*'):
   if f.is_file():z.write(f,f.relative_to(dest))
 print('RUN_OK',len(recs),sha(target),flush=True)
if __name__=='__main__':run()
