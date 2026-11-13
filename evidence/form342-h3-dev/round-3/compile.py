"""Export the two guides with the archived E-drive configurator bundle, then compile eight slots."""
from pathlib import Path
import base64, hashlib, json, os, random, re, shutil, subprocess, tempfile
from html import unescape

root = Path(__file__).resolve().parent
previous = root.parent / 'round-2'
cfg = root.parents[1] / 'section421-h3-span/configurator'
dest = root / 'guides'
if (root / 'manifest.json').exists():
    raise SystemExit('Frozen manifest already exists')
dest.mkdir(exist_ok=True)
edge = Path(os.environ['PROGRAMFILES(X86)']) / 'Microsoft/Edge/Application/msedge.exe'
with tempfile.TemporaryDirectory() as tmp:
    work = Path(tmp)
    shutil.copyfile(cfg/'form342.js', work/'form342.js')
    source = (cfg/'form342.html').read_text('utf8')
    capture = """<script>const sel=document.querySelector('#span421');
    sel.add(new Option('320','320')); const out={};
    for(const n of ['250','320']) {sel.value=n;sel.dispatchEvent(new Event('change'));
    out[n]=document.querySelector('#guide').toDataURL('image/png').split(',')[1];}
    document.body.innerHTML='<pre id="export">'+JSON.stringify(out)+'</pre>';</script>"""
    page = work/'export.html'
    page.write_text(source.replace('</html>',capture+'</html>'),'utf8')
    result = subprocess.run([str(edge),'--headless=new','--disable-gpu','--no-first-run','--dump-dom',
        '--user-data-dir='+str(work/'profile'),page.as_uri()],capture_output=True,timeout=55,check=True)
    values = json.loads(unescape(re.search(r'<pre id="export">([^<]+)</pre>',result.stdout.decode()).group(1)))
    for span,b64 in values.items():
        (dest/(span+'.png')).write_bytes(base64.b64decode(b64,validate=True))
assert (dest/'250.png').read_bytes() == (previous/'guides/dots.png').read_bytes()
prior = json.loads((previous/'manifest.json').read_bytes())
s0 = next(row for row in prior['rows'] if row['id']=='S0-1')
rows = []
rng = random.Random(361114)
for rep in range(1,5):
    arms = [('S0',250),('K',320)]
    rng.shuffle(arms)
    for cond,span in arms:
        guide=dest/(str(span)+'.png')
        fields=s0['fields'].copy()
        assert fields['prompt'].count('250 mm')==1
        fields['prompt']=fields['prompt'].replace('250 mm',str(span)+' mm')
        rows.append(dict(id=f'{cond}-{rep}',condition=cond,rep=rep,input_source=guide.relative_to(root).as_posix(),
                         input_sha256=hashlib.sha256(guide.read_bytes()).hexdigest(),fields=fields))
assert len({r['input_sha256'] for r in rows})==2
(root/'manifest.json').write_bytes((json.dumps({'endpoint':prior['endpoint'],'dictionary':'v1.2','seed':None,
    'prior_commit':'0e5d553','rows':rows},indent=2)+'\n').encode())
