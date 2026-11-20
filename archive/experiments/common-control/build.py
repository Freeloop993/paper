"""Provisional compile; no trial is submitted. Rerun after an actual G2 route decision."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
P=Path(__file__).resolve().parent
sys.path.insert(0,str(P.parent/'g2-control'))
from importlib.util import spec_from_file_location,module_from_spec
s=spec_from_file_location('g2',P.parent/'g2-control/build.py');g=module_from_spec(s);s.loader.exec_module(g)
def main(strength):
    if not 0<strength<=1:raise ValueError('invalid strength')
    rows=g.compile_set(P,'COMMON',{4,6},strength)
    pairs={}
    for r in rows:pairs.setdefault((r['level'],r['seed']),[]).append(r)
    assert len(rows)==12 and len(pairs)==6
    for a,b in pairs.values():
        assert {a['n'],b['n']}=={4,6}
        def neutral(r):
            z=g.load(P/'requests'/(r['case']+'.json'))['prompt']
            z['4']['inputs']['prompt']=z['4']['inputs']['prompt'].replace(f"Exactly {r['n']} rotors.",'Exactly N rotors.')
            del z['5']['inputs']['image'],z['12']['inputs']['filename_prefix']
            return z
        assert neutral(a)==neutral(b)
    print('12 offline requests; 6 paired graph checks')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--strength',type=float,default=1.0);main(p.parse_args().strength)
