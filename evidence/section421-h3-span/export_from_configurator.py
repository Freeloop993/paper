import shutil
import sys
import asyncio,base64,hashlib,json,os,subprocess,tempfile,time,urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import websockets
import http.server,threading,functools
E=Path('E:/RULERS/Memory_bank/product/uavdesign/drone_configurator_ui')
out=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
if (out/'manifest.json').exists() or (out/'exports').exists():
 raise SystemExit('Frozen exports exist. Supply a fresh destination for an offline export.')
out.mkdir(parents=True,exist_ok=True)
sha=lambda a:hashlib.sha256(a).hexdigest()
def write(p,obj): p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
browser=Path(os.environ['PROGRAMFILES(X86)'])/'Microsoft/Edge/Application/msedge.exe'
directory=Path(tempfile.mkdtemp(prefix='form342-browser-'))
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(E/'public'/'research-guides'))
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
process=subprocess.Popen([str(browser),'--headless=new','--disable-gpu','--disable-extensions','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+str(directory),'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
async def main():
 for i in range(120):
  try:
   port=(directory/'DevToolsActivePort').read_text().splitlines()[0]
   tabs=json.load(urllib.request.urlopen('http://127.0.0.1:'+port+'/json/list',timeout=1))
   ws=next(t['webSocketDebuggerUrl'] for t in tabs if t['type']=='page');break
  except (OSError,StopIteration,ValueError):await asyncio.sleep(.2)
 else:raise ValueError('browser unavailable')
 async with websockets.connect(ws,max_size=6_000_000,proxy=None) as sock:
  serial=0
  async def call(method,params):
   nonlocal serial
   serial+=1; idx=serial
   await sock.send(json.dumps(dict(id=idx,method=method,params=params)))
   while True:
    msg=json.loads(await sock.recv())
    if msg.get('id')==idx:return msg['result']
  async def js(source):
   r=await call('Runtime.evaluate',dict(expression=source,awaitPromise=True,returnByValue=True))
   if 'exceptionDetails' in r:raise ValueError(r['exceptionDetails'])
   return r['result'].get('value')
  await call('Page.navigate',{'url':f'http://127.0.0.1:{server.server_port}/form342.html'})
  for i in range(60):
   if await js("Boolean(document.querySelector('#prompt')?.value)"):break
   await asyncio.sleep(.2)
  # Click the normal export buttons and capture the Blob these buttons actually download.
  await js("""window.saved=[]; URL.createObjectURL=(b)=>{window.saved.push(b);return 'data:,'}; HTMLAnchorElement.prototype.click=function(){};true""")
  rows=[];specs={}
  for id in ['B250','B421','A421','C421']:
   res=await js("""(async()=>{ const s=document.querySelector('#preset');s.value='ID';s.dispatchEvent(new Event('change')); window.saved=[];
    document.querySelector('#save-spec').click();document.querySelector('#save-text').click();document.querySelector('#save-guide').click();
    for(let i=0;window.saved.length<3 && i<100;i++)await new Promise(r=>setTimeout(r,25));
    const [spec,txt,png]=window.saved;let src=await new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(png)});
    return [await spec.text(),await txt.text(),src,document.querySelector('#prompt').value]})()""".replace("'ID'",repr(id)))
   spec=json.loads(res[0]);prompt=res[1]; guide=base64.b64decode(res[2].split(',')[1]);assert prompt==spec['prompt']==res[3]
   specs[id]=spec
   dest=out/'exports'/id;dest.mkdir(parents=True,exist_ok=True)
   (dest/'prompt.txt').write_bytes(prompt.encode());(dest/'spec.json').write_bytes(res[0].encode())
   guide_path=dest/'guide.png'
   guide_path.write_bytes(guide)
   rows.append(dict(id=id,input_source=str(guide_path.relative_to(out).as_posix()),input_sha256=sha(guide),prompt_sha256=sha(prompt.encode()),fields=dict(model='MiniMax-H3-Image',size='1024x1024',n=1,output_format='png',response_format='b64_json',prompt=prompt)))
  old,new=specs['B250'],specs['B421']
  assert old['prompt'].replace('250 mm opposite-motor','300 mm opposite-motor')==new['prompt']
  assert old['shape']==new['shape'] and old['layout']['pxPerMm']==new['layout']['pxPerMm']
  assert {r['input_sha256'] for r in rows if r['id']!='B421'}=={rows[0]['input_sha256']}
  assert rows[1]['input_sha256']!=rows[0]['input_sha256']
  assert all(v['designDimensionsMm']=={'length':90,'width':50,'height':40} and v['armWidthMm']==15 and v['bladeCount']==2 for v in specs.values())
  assert old['layout']['max_motor_distance_mm']==250 and new['layout']['max_motor_distance_mm']==300
  write(out/'manifest.json',dict(stage='4.2.1 H3 development; no E2 or E3 positions',rows=rows,repeat=1,submitted_seed=None,sequence=['B250','B421','A421','C421'],comparisons={'wheelbase':['B250','B421'],'directions':['A421','B421','C421']},readouts=['motor spacing in canvas; mean prop diameter / diagonal spacing as scale-free visual check','body-to-arm transitions; camera at nose and tail ambiguity; four two-blade props; source guide marks; unintended differences incl tone and framing'],failure='preserve all slots; stop on transport or invalid image; no automatic retry',decision='authors have retained B continuous root; no parent selection or semantic rating'))
  print('Verified: 4 candidate prompts, 2 distinct guides; paired prompts differ only in span.',flush=True)
try:asyncio.run(main())
finally:
 process.terminate();process.wait(timeout=10);server.shutdown();shutil.rmtree(directory,ignore_errors=True)
