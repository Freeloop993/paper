"""Score the locked blind file against the preregistered slot manifest."""
import csv
import hashlib
import json
import math
from pathlib import Path
from statistics import mean, stdev

ROOT=Path(__file__).resolve().parent
def read(name):
    return json.loads((ROOT/name).read_bytes())
def write_csv(name,rows):
    with (ROOT/name).open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=rows[0])
        writer.writeheader()
        for row in rows:
            writer.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,list) else v for k,v in row.items()})
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

lock=read('blind-lock.json')
assert sha(ROOT/'blind-readings.jsonl')==lock['readings_sha256']
assert sha(ROOT/'unblind.json')==lock['key_sha256']
readings={r['id']:r for line in (ROOT/'blind-readings.jsonl').read_bytes().splitlines() if line.strip() for r in [json.loads(line)]}
slots=read('manifest.json')['rows']
key={e['slot']:(anon,e) for anon,e in read('unblind.json').items()}
audit_lock=read('audit-lock.json')
assert sha(ROOT/'audit-readings.jsonl')==audit_lock['sha256']
assert sha(ROOT/'audit-key.json')==audit_lock['key_sha256']
audit_key=read('audit-key.json')
audit_by_slot={audit_key[r['id']]:r for line in (ROOT/'audit-readings.jsonl').read_bytes().splitlines() for r in [json.loads(line)]}
baseline=read('dictionary.json')['base']
cats=list(baseline)
result=[]
for slot in sorted(slots,key=lambda s:(s['condition'],s['rep'])):
    blind,source=key[slot['id']]
    if source['original']:
        assert sha(ROOT/'actual'/slot['id']/'original.png')==source['original']
    r=readings.get(blind,dict.fromkeys(cats+['camera_v2','guard','residue','quality'],'U') | dict(shell_L=None,shell_B=None,widths=[None]*4,hubs=[None]*4,blades=[None]*4,note='output missing'))
    audit=audit_by_slot[slot['id']]
    r = dict(r,quality=audit['quality'],guard=audit['guard'])
    widths,hubs=r['widths'],r['hubs']
    diag=mean([math.dist(hubs[0],hubs[2]),math.dist(hubs[1],hubs[3])]) if all(hubs) else None
    width=mean(widths) if all(widths) else None
    moves=[k for k in cats if slot['target'][k]!=baseline[k]]
    valid=blind in readings
    row=dict(slot=slot['id'],condition=slot['condition'],rep=slot['rep'],blind=blind,available=valid,**{k:r[k] for k in cats},**{k:r[k] for k in ('camera_v2','guard','residue','quality','shell_L','shell_B','widths','hubs','blades','note')},width_px=width,D_px=diag,width_D=width/diag if width and diag else None,L_B=r['shell_L']/r['shell_B'] if r['shell_L'] and r['shell_B'] else None)
    row.update(target=moves[0] if moves else '',hit=all(r[k]==slot['target'][k] for k in (moves or cats)),drift=[k for k in cats if k not in moves and r[k] not in ('U',baseline[k])],unknown=[k for k in cats if k not in moves and r[k]=='U'],double=r['blades']==[2,2,2,2],camera_not_observed_wrong=valid and r['camera_v2']!='wrong',product=r['quality']=='product')
    row['joint']=row['double'] and row['camera_not_observed_wrong'] and row['product']
    row.update(audit_blind=audit['id'],quality_note=audit['quality_note'],guard_note=audit['guard_note'])
    result.append(row)
write_csv('by-image.csv',result)
S=[]
for label in ['S0','S1','S2','S3','S4','S5']:
    cells=[r for r in result if r['condition']==label]
    hit=sum(r['hit'] for r in cells)
    S.append(dict(condition=label,correct=hit,planned=3,pass_gate=hit>=(3 if label=='S0' else 2),offtarget_known=sum(map(lambda r:len(r['drift']),cells)),offtarget_unknown=sum(len(r['unknown']) for r in cells),known_drift_images=sum(bool(r['drift']) for r in cells),unknown_images=sum(bool(r['unknown']) for r in cells)))
for entry in S:
    condition=entry['condition']
    target_slot=next(slot for slot in slots if slot['condition']==condition)
    changed=[k for k in cats if target_slot['target'][k]!=baseline[k]]
    if changed:
        field=changed[0]
        target_value=target_slot['target'][field]
        entry.update(baseline_also_reads_target=sum(r[field]==target_value for r in result if r['condition']=='S0'),baseline_unreadable=sum(r[field]=='U' for r in result if r['condition']=='S0'))
    else:
        entry.update(baseline_also_reads_target=None,baseline_unreadable=None)
write_csv('S-score.csv',S)
G=[]
axes={}
for kind,levels,metric in [('w',['10','15','20'],'width_D'),('r',['1.4','1.8','2.4'],'L_B')]:
    summary=[]
    for level in levels:
        label='G-'+kind+level
        cells=[r for r in result if r['condition']==label]
        values=[r[metric] for r in cells if r[metric] is not None]
        entry=dict(condition=label,metric=metric,n=len(values),values=values,mean=mean(values) if values else None,sd=stdev(values) if len(values)>=2 else None,residue_yes=sum(r['residue']=='yes' for r in cells),residue_U=sum(r['residue']=='U' for r in cells))
        summary.append(entry)
    G+=summary
    complete=all(c['n']==3 for c in summary)
    pairs=[]
    for a,b in zip(summary,summary[1:]):
        diff=b['mean']-a['mean'] if a['n'] and b['n'] else None
        limit=max(a['sd'],b['sd']) if a['sd'] is not None and b['sd'] is not None else None
        pairs.append(dict(diff=diff,max_sd=limit,clears=diff>limit if diff is not None and limit is not None else None))
    no_marks=all(c['residue_yes']==c['residue_U']==0 for c in summary)
    axes[kind]=dict(complete=complete,no_marks=no_marks,pairs=pairs,pass_gate=complete and no_marks and all(pair['clears'] for pair in pairs))
write_csv('G-score.csv',G)
common={k:sum(bool(r[k]) for r in result) for k in ['available','double','camera_not_observed_wrong','product','joint']}
common.update(invisible=sum(r['camera_v2']=='invisible' for r in result),ambiguous=sum(r['camera_v2']=='U' for r in result),wrong=sum(r['camera_v2']=='wrong' for r in result),planned=len(slots),pass_gate=common['joint']>=30)
(ROOT/'results.json').write_text(json.dumps(dict(S=S,G=G,axes=axes,common=common,confirmed_CNY=None),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
