import json,shutil
from pathlib import Path
D=Path(__file__).resolve().parent
R=D.parents[1];E=R/'evidence/g3-actual'
read=lambda p:json.loads(p.read_bytes())
def main():
    key={x['blind']:x['case'] for x in read(E/'blind-key.json')}
    f=E/'reader-A.json';assess=read(f)['cases'];assert set(assess)==set(key)
    results={}
    for b,c in key.items():
        v=assess[b];form=[v[k] for k in ('silhouette','panel_divisions','arm_roots')]
        assert all(x in ['保持','改变','不可判'] for x in form)
        assert v['camera_edit'] in ['可辨','不可辨','不可判']
        results[c]={'features_kept':form.count('保持'),'all_three_judged':'不可判' not in form,'camera_edit':v['camera_edit'],'possible_copy':v['possible_copy']}
    yes,no=results['G3-with-reference'],results['G3-text-only']
    from PIL import Image
    base=R/'evidence/s1-axis-repeat/originals/S1-B1-T.png'
    with Image.open(base) as p:parent=p.convert('RGB').tobytes()
    for c in results:
        with Image.open(E/'originals'/(c+'.png')) as p:results[c]['rgb_equals_parent']=p.convert('RGB').tobytes()==parent
    signal=all(r['all_three_judged'] for r in results.values()) and yes['features_kept']>=2 and yes['features_kept']>=no['features_kept']+1
    pair=read(E/'receipts.json')['cases'];same_rgb=len({r['rgb_sha256'] for r in pair})==1
    res=dict(reader='AI',pair_identical_rgb=same_rgb,cases=results,retention_signal_by_this_reader=signal,human_readers=0,combined_decision='awaiting independent human return')
    (E/'result.json').write_bytes((json.dumps(res,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(res,ensure_ascii=False))
if __name__=='__main__':main()
