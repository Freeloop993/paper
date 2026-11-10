import json
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
    human = read(E/'human-summary.json')['cases']
    assert set(human) == set(results)
    counts = {}
    for case, fields in human.items():
        ratings = fields['structure']
        assert set(ratings) == {'silhouette', 'panel_divisions', 'arm_roots'}
        assert all(v in ('保持', '改变', '不可判') for v in ratings.values())
        counts[case] = {label:list(ratings.values()).count(label) for label in ('保持','改变','不可判')}
    ref, text = counts['G3-with-reference'], counts['G3-text-only']
    fully_judged = all(c['不可判']==0 for c in counts.values())
    human_retention = fully_judged and ref['保持']>=2 and ref['保持']>=text['保持']+1
    camera_agreement = {c:human[c]['camera_edit']==results[c]['camera_edit'] for c in human}
    reference_case = 'G3-with-reference'
    visible_to_both = human[reference_case]['camera_edit']==results[reference_case]['camera_edit']=='可辨'
    enable_revision = signal and human_retention and visible_to_both and not yes['rgb_equals_parent']
    res=dict(reader='AI', pair_identical_rgb=same_rgb, cases=results,
             retention_signal_by_this_reader=signal, human_readers=1,
             human_feature_counts=counts, human_all_three_judged_both_cases=fully_judged,
             joint_retention_criterion_met=signal and human_retention,
             readers_agree_on_camera_item=camera_agreement,
             camera_edit_visible_to_both_on_reference=visible_to_both,
             enable_reference_revision_under_G3=enable_revision,
             combined_decision='insufficient evidence under frozen G3 criteria' if not enable_revision else 'criteria met for this pair')
    (E/'result.json').write_bytes((json.dumps(res,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(res,ensure_ascii=False))
if __name__=='__main__':main()
