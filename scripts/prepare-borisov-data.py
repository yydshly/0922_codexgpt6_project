"""Independent historical window; never merged into current solar-system state."""
import importlib.util, json, hashlib
from datetime import datetime, timezone
from pathlib import Path
spec=importlib.util.spec_from_file_location('builder',Path(__file__).with_name('prepare-dwarf-data.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
b.CACHE=b.ROOT/'data-sources'/'borisov';b.CACHE.mkdir(parents=True,exist_ok=True)
b.EXPECTED_NAMES={'sun':'Sun (10)','earth':'Earth (399)','borisov':'Borisov'}
out=b.ROOT/'public'/'data'/'borisov';out.mkdir(parents=True,exist_ok=True)
records={};sources=[];checks=[]
for id,command in {'sun':'10','earth':'399','borisov':'DES=2I;CAP;'}.items():
 rows,source=b.query(id,command,'https://github.com/yydshly/0922_codexgpt6_project',start='2019-09-01',stop='2020-06-01 06:00',cache_label='2019-2020',minimum_rows=2000)
 records[id]=rows;sources.append(source);checks.append(b.verify(rows,id))
assert all([r[0] for r in rows]==[r[0] for r in records['sun']] for rows in records.values())
payload=json.dumps({'series':[dict(id=id,startTdb=rows[0][0],stepSeconds=b.PUBLISHED_STEP,samples=[r[1:] for r in rows[::2]]) for id,rows in records.items()]},separators=(',',':')).encode()
(out/'states.json').write_bytes(payload)
start=b.tdb('2019-09-01T00:00:00Z');end=b.tdb('2020-06-01T00:00:00Z')
manifest=dict(version='horizons-borisov-2019-2020-v1',source='NASA/JPL Horizons',sourceUrl='https://ssd.jpl.nasa.gov/horizons/manual.html',generatedAt=datetime.now(timezone.utc).isoformat(),startUtc='2019-09-01T00:00:00Z',endUtc='2020-06-01T00:00:00Z',startTdb=start,endTdb=end,bodyIds=list(records),frame='ECLIPJ2000 (ICRF, ecliptic of J2000.0)',origin='Solar System Barycenter (NAIF 0)',units='km, km/s',timeScale='TDB seconds past J2000',aberration='NONE: geometric states; no light-time correction',targets=sources,stepSeconds=b.PUBLISHED_STEP,chunks=[dict(file='states.json',startTdb=start,endTdb=end,bytes=len(payload),sha256=hashlib.sha256(payload).hexdigest())],validation=dict(checks=checks,meaning='Held-out interpolation difference, not absolute orbit uncertainty'),historical=True)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
