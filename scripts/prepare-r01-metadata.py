"""Archive and extract JPL SBDB metadata for the R01 representatives.
No runtime API calls. Existing raw snapshots are reused unless removed explicitly.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib,json,urllib.request
ROOT=Path(__file__).resolve().parents[1]
TARGETS={'eros':('433','AMO'),'achilles':('588','TJN'),'aneas':('1172','TJN'),'chariklo':('10199','CEN')}
def main():
    records=[]
    for id,(number,classification) in TARGETS.items():
        url=f'https://ssd-api.jpl.nasa.gov/sbdb.api?sstr={number}&phys-par=1&full-prec=1'
        path=ROOT/'data-sources'/'small-bodies'/f'{id}-sbdb.json'
        if not path.exists():path.write_bytes(urllib.request.urlopen(url,timeout=60).read())
        raw=path.read_bytes(); data=json.loads(raw)
        assert data['signature']['version']=='1.3'
        assert data['object']['des']==number and data['object']['orbit_class']['code']==classification
        physical={p['name']:p for p in data['phys_par']}
        elements={p['name']:p for p in data['orbit']['elements']}
        records.append(dict(id=id,number=number,name=data['object']['fullname'],orbitClass=classification,
            sourceUrl=url,lookupUrl=f'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr={number}',
            snapshotFile=str(path.relative_to(ROOT)).replace('\\','/'),rawSha256=hashlib.sha256(raw).hexdigest(),
            snapshotSavedAt=datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(),
            apiVersion=data['signature']['version'],orbitSolution=data['orbit']['orbit_id'],solutionDate=data['orbit']['soln_date'],epochJdTdb=float(data['orbit']['epoch']),
            diameter=physical['diameter'],rotation=physical.get('rot_per'),gm=physical.get('GM'),
            elements=[elements[k] for k in ['a','e','i','q','ad','per']]))
    out=ROOT/'public/data/small-bodies/physical-parameters.json'
    out.write_text(json.dumps(dict(version='sbdb-r01-v1',records=records),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__':main()
