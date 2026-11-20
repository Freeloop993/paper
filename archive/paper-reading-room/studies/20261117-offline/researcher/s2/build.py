"""S2 blind sampling and S3 corpus-level token co-occurrence. Raw inputs and forms stay local."""
import argparse, csv, hashlib, itertools, json, random, re, zipfile
from collections import Counter
from pathlib import Path
import jieba

SEED = 2026111708
TOPICS = ['小巧或紧凑','随身携带','轻重感受','整体美感','折叠收纳','简洁或繁复','颜色与辨识','材质与质感','其他外形或部件']
LEDGER_SHA = '092615cbf424248743cc7f1b674ecfd30842b37012ec285b79f05b570d2b81e7'
def digest(data):
    return hashlib.sha256(data).hexdigest()
def savecsv(path, fields, rows):
    with path.open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.writer(f); w.writerow(fields); w.writerows(rows)
def main():
    ap=argparse.ArgumentParser()
    for key in ['source_zip','old_matrix','public_output','private_output']: ap.add_argument(key,type=Path)
    a=ap.parse_args(); a.public_output.mkdir(exist_ok=True,parents=True); a.private_output.mkdir(exist_ok=True,parents=True)
    with zipfile.ZipFile(a.source_zip) as z:
        names=[n for n in z.namelist() if '/64-' in n and '/06-' in n and n.endswith('.json')]
        assert len(names)==1
        raw=z.read(names[0])
    assert digest(raw)==LEDGER_SHA
    records=sorted([r for r in json.loads(raw)['records'] if 'Q' in r['scopes']],key=lambda r:r['text_id'])
    assert len(records)==len(set(r['text_id'] for r in records))==1318
    rand=random.Random(SEED); selected=[]
    for kept,N,n in [(True,228,50),(False,1090,100)]:
        layer=[r for r in records if (r['decision_code']=='A')==kept]
        assert len(layer)==N
        selected.extend(rand.sample(layer,n))
    rand.shuffle(selected)
    key={f'S{i:03}':{'id':r['text_id'],'layer':'A' if r['decision_code']=='A' else 'U'} for i,r in enumerate(selected,1)}
    assert len(set(row['id'] for row in key.values()))==150
    (a.private_output/'key.json').write_text(json.dumps(key,ensure_ascii=False),encoding='utf-8')
    def redact(t):
        t=re.sub(r'https?://\S+|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}|(?<!\d)1[3-9]\d{9}(?!\d)|(?<!\d)\d{8,}[Xx]?(?!\d)','〔隐去联系方式或编号〕',t)
        return t
    items=[{'id':code,'text':redact(r['text'])} for code,r in zip(key,selected)]
    form=Path(__file__).with_name('form.template.html').read_text('utf8')
    payload=json.dumps({'items':items,'topics':TOPICS},ensure_ascii=False).replace('<','\\u003c')
    (a.private_output/'S2评论核查.html').write_text(form.replace('__DATA__',payload),encoding='utf8')
    with a.old_matrix.open(encoding='utf-8-sig') as f: vocab=next(csv.reader(f))[1:]
    assert len(vocab)==len(set(vocab))==137
    tokenizer=jieba.Tokenizer()
    # Freeze product terminology without using frequencies from the output corpus.
    for word in sorted(vocab):tokenizer.add_word(word, freq=100000)
    freq=Counter(); pairs=Counter(); covered=0
    valid=set(vocab)
    for r in records:
        terms=sorted(set(tokenizer.cut(r['text'],HMM=False)) & valid)
        freq.update(terms);pairs.update(itertools.combinations(terms,2));covered+=bool(terms)
    savecsv(a.public_output/'nodes.csv',['term','documents'],[(t,freq[t]) for t in sorted(vocab,key=lambda t:(-freq[t],t))])
    savecsv(a.public_output/'edges.csv',['term_a','term_b','documents'],[(*p,c) for p,c in sorted(pairs.items(),key=lambda x:(-x[1],x[0]))])
    with Path(jieba.__file__).with_name('dict.txt').open('rb') as f: dict_sha=digest(f.read())
    summary={'unit':'deduplicated text cluster with Q among product title scopes','N':len(records),'covered_by_legacy_vocabulary':covered,'vocabulary':len(vocab),'positive_edges':len(pairs),'jieba':jieba.__version__,'dictionary_sha256':dict_sha,'input_sha256':LEDGER_SHA,'old_matrix_sha256':digest(a.old_matrix.read_bytes()),'sample_seed':SEED,'sample_size':len(selected),'sample_key_sha256':digest((a.private_output/'key.json').read_bytes())}
    (a.public_output/'summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
if __name__=='__main__':main()
