"""Patroclus primary and Menoetius, from the SAME TNO satellite solution: JPL geometric SSB states, six-hour packs / held-out three-hour checks."""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('monthly_builder',Path(__file__).with_name('prepare-dwarf-data.py'))
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.CACHE=builder.ROOT/'data-sources'/'patroclus-system'
builder.OUT=builder.ROOT/'public'/'data'/'patroclus-system'
builder.TARGETS={'patroclus':'920000617','menoetius':'120000617'}
builder.EXPECTED_NAMES={'patroclus':'Patroclus (primary body) (920000617)','menoetius':'Menoetius (120000617)'}
builder.VERSION='horizons-patroclus-menoetius-2026-2027-v1'
if __name__=='__main__':
    builder.main()
    import json,math
    a,_=builder.query('patroclus','920000617','')
    b,_=builder.query('menoetius','120000617','')
    errors=[];speeds=[]
    for i in range(1,len(a)-1,2):
        pa=builder.hermite(a[i-1],a[i+1],a[i][0]);pb=builder.hermite(b[i-1],b[i+1],b[i][0])
        diff=[pb[k]-pa[k]-(b[i][k+1]-a[i][k+1]) for k in range(6)]
        errors.append(math.hypot(*diff[:3]));speeds.append(math.hypot(*diff[3:]))
    relative=dict(heldOutCheckpoints=len(errors),maxPositionErrorKm=max(errors),maxVelocityErrorKmS=max(speeds),positionThresholdKm=.1,velocityThresholdKmS=1e-5)
    relative['passed']=max(errors)<.1 and max(speeds)<1e-5
    if not relative['passed']:raise ValueError(relative)
    path=builder.OUT/'manifest.json';manifest=json.loads(path.read_text(encoding='utf-8'))
    if any('as_20000617_jpl082_v001_' not in t['targetSource'] for t in manifest['targets']):raise ValueError('Mixed solutions')
    manifest['validation']['relative']=relative
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print(relative)
