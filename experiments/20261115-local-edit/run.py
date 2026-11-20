"""Run one frozen phase and retain both original Qwen output and deterministic composite."""
import argparse, datetime, fcntl, hashlib, json, os, shutil, socket, sys, zipfile
from pathlib import Path
from PIL import Image, ImageChops
root=Path('/root/gpu-day-20261115')
kit=Path(__file__).resolve().parent
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def require(v,reason):
    if not v:raise RuntimeError(reason)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('phase', choices=['dev','confirm']);parser.add_argument('arms',nargs='+',choices=['camera','cover','roots'])
    args=parser.parse_args();freeze=json.loads((kit/'freeze.json').read_text());out=root/'review15-local-edits'
    require('a3b9-52ba851a' in socket.gethostname(),'wrong paid instance')
    sys.path.insert(0,str(root))
    from dispatch_v2 import clear_service,verify_model_receipt
    from queue_runner import run_one
    lock=(root/'dispatch-v2.lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    verify_model_receipt(root)
    url='http://127.0.0.1:8189';clear_service(url)
    out.mkdir(exist_ok=True)
    for arm in args.arms:
        if args.phase=='confirm':
            gate=json.loads((kit/'decisions.json').read_text())[arm]
            require(len(gate)==3 and sum(e['passed'] for e in gate)>=2,'development gate failed')
            for e in gate:require(digest(out/e['id']/'composite.png')==e['composite_sha256'],'unverified decision')
    for row in freeze['rows']:
        arm=row['arm']
        if row['phase']!=args.phase or arm not in args.arms:continue
        rid=row['id'];source=kit/'requests'/(rid+'.json');mask=kit/'masks'/(arm+'.png')
        ref=next(x for x in freeze['inputs'] if x['arm']==arm)
        parent=kit/'inputs'/row['input'];require(digest(parent)==ref['input_sha256'] and digest(mask)==ref['mask_sha256'] and digest(source)==row['request_sha256'],'input changed')
        actual=root/'inputs'/row['input']
        if not actual.exists():shutil.copyfile(parent,actual)
        require(digest(actual)==digest(parent),'conflicting server input')
        require(datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat('2026-11-15T22:20:00+08:00'),'rental window')
        clear_service(url);require(not any((root/'output').glob(rid+'*')),'already executed')
        td=out/rid;td.mkdir()
        rec=run_one(url,root/'inputs',source,td,720)
        im=Image.open(td/(rid+'.png')).convert('RGB');base=Image.open(parent).convert('RGB');alpha=Image.open(mask).convert('L')
        require(im.size==base.size==alpha.size,'geometry changed')
        result=Image.composite(im,base,alpha);result.save(td/'composite.png')
        require(ImageChops.multiply(ImageChops.difference(result,base),alpha.point(lambda v:255 if v==0 else 0).convert('RGB')).getbbox() is None,'outside changed')
        rec.update(composite_sha256=digest(td/'composite.png'),outside_changed_pixels=0)
        (td/'receipt.json').write_text(json.dumps(rec,indent=2));print('completed',rid,flush=True)
    name='localedit-'+args.phase+'-'+'-'.join(args.arms)+'.zip';zpath=Path('/root/s4-camera-277')/name
    with zipfile.ZipFile(zpath,'x',zipfile.ZIP_DEFLATED,compresslevel=1) as z:
        for row in freeze['rows']:
            if row['phase']==args.phase and row['arm'] in args.arms:
                for f in (out/row['id']).iterdir():
                    if f.is_file():z.write(f,row['id']+'/'+f.name)
    print('RUN_OK',name,digest(zpath),flush=True)
if __name__=='__main__':main()
