"""One-shot E2R first. Reuse the live Comfy service on the reserved machine."""
import fcntl
import json
import os
from pathlib import Path

import dispatch_v2 as v

def main(root):
    service='http://127.0.0.1:8189'
    with (root/'dispatch-v2.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        v.check(__debug__ and (root/'STOP').is_file(),'legacy dispatcher must be stopped')
        v.check(not any((root/'running').glob('*.json')),'legacy job still active')
        v.check(v.digest(Path(v.run_one.__code__.co_filename).read_bytes())==v.LEGACY_RUNNER,'legacy transport changed')
        v.verify_model_receipt(root)
        raw=(root/'e2r/manifest.json').read_bytes()
        v.check(v.digest(raw)=='0c90f2d43a5cb0ff8ad1116042fb7ab51cca79abe58e8f8aab4cec5bdb9ee1f4','E2R manifest changed')
        rows=json.loads(raw)
        for r in rows:
            req=root/'e2r/requests'/(r['id']+'.json')
            v.check(v.digest(req.read_bytes())==r['request_sha256'], r['id'])
            v.measured_inputs(root,{r['image']:r['input_sha256']})
        # Existing evidence or stage means stop before POST; never replay a partial batch.
        out=root/'e2r-actual'
        out.mkdir()
        (out/'verified-weights.sha256').write_bytes((root/'posthandoff-weights.sha256').read_bytes())
        for r in rows:
            v.check(not (root/'STOP-V2').exists(),'operator boundary stop')
            v.clear_service(service)
            rid=r['id']; req=root/'e2r/requests'/(rid+'.json'); dest=out/rid
            v.check(v.digest(req.read_bytes())==r['request_sha256'],rid)
            v.measured_inputs(root,{r['image']:r['input_sha256']})
            dest.mkdir()
            try:
                result=v.run_one(service,root/'inputs',req,dest,1200)
                v.check(result['request_sha256']==r['request_sha256'] and result['id']==rid,rid)
            except Exception as e:
                (dest/'halt.json').write_text(json.dumps(dict(id=rid,error=str(e))))
                try:(dest/'queue-at-halt.json').write_bytes(v.call(service+'/queue',timeout=10))
                except OSError:pass
                raise
            with (out/'progress.jsonl').open('a') as f:
                f.write(json.dumps(result)+'\n'); f.flush(); os.fsync(f.fileno())
            print('OK',rid,flush=True)
        (out/'RUN_OK').write_text('6/6\n')
if __name__=='__main__':
    import sys
    main(Path(sys.argv[1]).resolve())
