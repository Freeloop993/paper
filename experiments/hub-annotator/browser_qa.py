"""Optional UI QA using a private, headless Edge/Chromium profile. Synthetic clicks only."""
import json,sys,tempfile,subprocess,time,urllib.request
from pathlib import Path
from websockets.sync.client import connect
from compare_human import score,P,E
def main(exe):
    packet=E/'human-pack'; url=(packet/'index.html').as_uri()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp:
        tmp=Path(temp);profile=tmp/'profile';dl=tmp/'download';dl.mkdir()
        args=[exe,'--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+str(profile),url]
        proc=subprocess.Popen(args,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        try:
            for _ in range(120):
                if (profile/'DevToolsActivePort').exists():break
                time.sleep(.1)
            port=(profile/'DevToolsActivePort').read_text().splitlines()[0]
            opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
            for _ in range(100):
                tabs=json.load(opener.open(f'http://127.0.0.1:{port}/json/list',timeout=4))
                pages=[i for i in tabs if i.get('type')=='page' and i['url']==url]
                if pages:break
                time.sleep(.1)
            with connect(pages[0]['webSocketDebuggerUrl'],proxy=None,open_timeout=5) as ws:
                idx=0
                def c(method,params={}):
                    nonlocal idx
                    idx+=1;ws.send(json.dumps(dict(id=idx,method=method,params=params)))
                    while True:
                        m=json.loads(ws.recv(timeout=5))
                        if m.get('id')==idx:
                            if 'error' in m:raise RuntimeError(m['error'])
                            return m['result']
                def js(expr):
                    d=c('Runtime.evaluate',dict(expression=expr,returnByValue=True))
                    assert 'exceptionDetails' not in d,d
                    return d['result'].get('value')
                def click_px(x,y):
                    b=js("(()=>{let b=cv.getBoundingClientRect();return [b.x,b.y,b.width,b.height]})()")
                    for name in ('mousePressed','mouseReleased'):c('Input.dispatchMouseEvent',dict(type=name,x=b[0]+b[2]*x,y=b[1]+b[3]*y,button='left',clickCount=1))
                c('Emulation.setDeviceMetricsOverride',dict(width=1200,height=1200,deviceScaleFactor=1,mobile=False))
                c('Browser.setDownloadBehavior',dict(behavior='allow',downloadPath=str(dl)))
                for _ in range(100):
                    if js("typeof el")=="function":break
                    time.sleep(.05)
                assert js("typeof el")=="function",(js("document.title"),js("location.href"))
                js("el('code').value='QA_ONLY';el('start').click()")
                for i in range(6):
                    for _ in range(100):
                        if js('ready'):break
                        time.sleep(.05)
                    assert js('ready')
                    if i==0:
                        js("cv.style.transform='translateY('+ (Math.ceil(cv.getBoundingClientRect().top)-cv.getBoundingClientRect().top)+'px)'")
                        js("el('zoom').click()");click_px(.5,.5);click_px(.75,.25)
                        assert js('points[0]')==[576,448],(js('points'),js('frame'),js('cv.getBoundingClientRect().toJSON()'))
                        js("el('undo').click()")
                    js("el('next').click()");assert js('idx')==i
                    for _ in range(4):js("el('skip').click()")
                    js("el('front').value='unknown';el('next').click()")
                js("el('download').click()")
                f=dl/'s1-hubs-QA_ONLY.json'
                for _ in range(50):
                    if f.exists():break
                    time.sleep(.1)
                packet=json.loads(f.read_bytes());v=score(packet);assert v['assessable']==0 and v['zero_of_six_confirmed_by_this_reader'] is None
                print('Edge file://: 6 screens; zoom offset (576,448); undo; validation; actual JSON export; 6/6 missing correctly preserved. QA only.')
        finally:proc.terminate();proc.wait(timeout=10)
if __name__=='__main__':main(sys.argv[1])
