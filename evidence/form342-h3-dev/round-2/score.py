"""Combine separately randomized reader outputs after both AI files are locked."""
from pathlib import Path
import json,csv,hashlib,math
from collections import Counter
from statistics import mean,stdev
root=Path(__file__).resolve().parent
def j(p):return json.loads(p.read_bytes())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode())
def csvout(name,rows):
    with (root/name).open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0]);writer.writeheader()
        for row in rows:writer.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,list) else v for k,v in row.items()})
def load_reader(kind):
    p=root/(kind+'-ai.jsonl');k=root/(kind+'-key.json')
    lock=j(root/(kind+'-ai-lock.json'))
    assert sha(p)==lock['file_sha'] and sha(k)==lock['key_sha']
    key=j(k)
    return {key[r['id']]:r for l in p.read_bytes().splitlines() if l.strip() for r in [json.loads(l)]}
morph=load_reader('morph')
visible=load_reader('visible')
rows=[];usage=Counter();digests=set();revised=0; times=[];ids=set()
for s in j(root/'manifest.json')['rows']:
    slot=s['id'];a=morph[slot];b=visible[slot]
    d=root/'actual'/slot
    req=j(d/'submission.json');assert all(req[k]==v for k,v in s.items())
    assert sha(root/s['input_source'])==s['input_sha256']
    receipt=j(d/'receipt.json');assert receipt['http']==200
    digest=sha(d/'original.png');assert digest==j(d/'verified.json')['sha256']
    digests.add(digest);revised+=bool(receipt['item'].get('revised_prompt'))
    if receipt.get('request_id'):ids.add(receipt['request_id'])
    times.append((req['start'],receipt['received']))
    usage.update({k:v for k,v in receipt.get('usage',{}).items() if isinstance(v,int)})
    majority=next((k for k in 'BSH' if a['roots'].count(k)>=3),'U')
    D=mean([math.dist(b['hubs'][0],b['hubs'][2]),math.dist(b['hubs'][1],b['hubs'][3])]) if all(b['hubs']) else None
    w=mean(b['widths']) if all(b['widths']) else None
    double=b['blades']==[2,2,2,2]
    joint=double and a['camera']!='wrong' and b['quality']=='product'
    rows.append(dict(slot=slot,condition=s['condition'],rep=s['rep'],morph_id=a['id'],visible_id=b['id'],**{k:v for k,v in a.items() if k!='id'},**{k:v for k,v in b.items() if k!='id'},root=majority,D=D,width_D=w/D if D and w else None,double=double,joint=joint))
rows.sort(key=lambda r:r['slot'])
csvout('by-image.csv',rows)
def group(label):return [r for r in rows if r['condition']==label]
def counts(rs,k):return dict(Counter(r[k] for r in rs))
def hit(label,k,v):return sum(r[k]==v for r in group(label))
s0={k:hit('S0',k,v) for k,v in [('root','B'),('nose','N'),('cover','C')]}
s0socket=hit('S0','root','S')
singles={l:hit(l,k,v) for l,k,v in [('S1','body','box'),('S2','root','S'),('S3','root','H'),('S4','nose','P'),('S5','cover','M')]}
joint=sum(r['joint'] for r in rows)
rs=group('W10')+group('W25')
wstats={}
for label in ['W10','W25']:
    vs=[r['width_D'] for r in group(label) if r['width_D'] is not None]
    wstats[label]=dict(values=vs,n=len(vs),mean=mean(vs) if vs else None,sd=stdev(vs) if len(vs)>1 else None,residue=counts(group(label),'residue'))
full=all(u['n']==3 for u in wstats.values())
delta=wstats['W25']['mean']-wstats['W10']['mean'] if full else None
sd=max(u['sd'] for u in wstats.values()) if full else None
wpass=full and delta>sd and sum(r['residue']=='yes' for r in rs)<=1 and all(r['residue']!='U' for r in rs)
pairs=[];all_regular=[];all_low=[]
for label in ('S0','S2','S4','W25'):
    reg=group(label);low=group('L-'+label)
    all_regular+=reg;all_low+=low
    pairs.append(dict(condition=label,regular=counts(reg,'residue'),low=counts(low,'residue')))
lpass=all(r['residue']!='U' for r in all_regular+all_low) and sum(r['residue']=='yes' for r in all_low)<sum(r['residue']=='yes' for r in all_regular) and hit('L-S2','root','S')>=singles['S2'] and hit('L-S4','nose','P')>=singles['S4']
old={r['slot']:r for r in csv.DictReader((root.parent/'round-1-recheck/by-image.csv').open(encoding='utf-8-sig'))}
cross=[]
for i in range(6):
    label='S'+str(i)
    for r in group(label):
        first=old[r['slot']]
        cross.append(dict(condition=label,rep=r['rep'],r1_root=first['root_new'],r2_root=r['root'],r1_nose=first['nose_new'],r2_nose=r['nose'],r1_cover=first['cover_new'],r2_cover=r['cover'],r1_image='../round-1/actual/'+r['slot']+'/original.png',r2_image='actual/'+r['slot']+'/original.png'))
csvout('two-rounds.csv',cross)
summary=dict(S=dict(S0=s0,S0_socket=s0socket,targets=singles,morph_pass=all(v>=2 for v in list(s0.values())+list(singles.values())) and s0socket<=1,combined_ai_gate=all(v>=2 for v in list(s0.values())+list(singles.values())) and s0socket<=1 and joint>=30),W=dict(levels=wstats,delta=delta,max_sd=sd,ai_pass=wpass),L=dict(pairs=pairs,regular=counts(all_regular,'residue'),low=counts(all_low,'residue'),regularS2=singles['S2'],lowS2=hit('L-S2','root','S'),regularS4=singles['S4'],lowS4=hit('L-S4','nose','P'),ai_pass=lpass),overall=dict(joint=joint,double=sum(r['double'] for r in rows),camera=counts(rows,'camera'),nose=counts(rows,'nose'),guard=counts(rows,'guard'),quality=counts(rows,'quality')),groups={label:{k:counts(group(label),k) for k in ['root','nose','cover','body','camera','quality','residue']} for label in sorted({r['condition'] for r in rows})},human_pending={k:j(root/(k+'-ai-lock.json'))['constant_columns_needing_human_confirmation'] for k in ['morph','visible']})
save(root/'results.json',summary)
save(root/'verification.json',dict(outputs=len(rows),distinct_hashes=len(digests),revised=revised,usage=dict(usage),actual_fee=None,http_request_ids=len(ids),first_start=min(t[0] for t in times),last_received=max(t[1] for t in times)))
print(json.dumps({k:v for k,v in summary.items() if k!='groups'},ensure_ascii=False))
