"""Build an attributed, filtered Hipparcos-2 teaching subset. Python stdlib only.
Run from repo root. Cached original download is not shipped with the application.
"""
from pathlib import Path
import gzip, hashlib, json, urllib.request
ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/hip2'
OUT = ROOT / 'public/data/stars'
ARCHIVE = ROOT / 'data-sources/stars'
URL = 'https://cdsarc.cds.unistra.fr/ftp/I/311/'
for p in [CACHE, OUT, ARCHIVE]: p.mkdir(parents=True, exist_ok=True)
for name in ['ReadMe', 'hip2.dat.gz']:
    p = CACHE / name
    if not p.exists(): p.write_bytes(urllib.request.urlopen(URL + name, timeout=90).read())
raw = gzip.decompress((CACHE/'hip2.dat.gz').read_bytes())
lines = raw.decode('ascii').splitlines()
def value(line, start, end): return float(line[start-1:end])
def row(l):
    return dict(hip=int(value(l,1,6)), ra=value(l,16,28), dec=value(l,30,42),
      parallax=value(l,44,50), parallaxError=value(l,84,89), hp=value(l,130,136),
      hpError=value(l,138,143), raError=value(l,70,75), decError=value(l,77,82),
      fit=value(l,109,113), solution=int(value(l,8,10)))
# Conservative teaching subset; excludes double/variable/photocentre flags.
good=[row(l) for l in lines if value(l,8,10)==5 and value(l,109,113)<3
      and 0<=value(l,70,75)<2 and 0<=value(l,77,82)<2]
sky=[r for r in good if r['hp']<=6 and 0<=r['hpError']<=.02]
near=sorted([r for r in good if r['parallax']>1000/15
             and 0<r['parallaxError']/r['parallax']<=.05],key=lambda r:-r['parallax'])[:32]
assert len(lines)==117955 and len(near)>=20
ids={r['hip'] for r in sky+near}
selected='\n'.join(l for l in lines if int(l[:6]) in ids)+'\n'
(ARCHIVE/'hip2-selected.dat').write_bytes(selected.encode('ascii'))
(ARCHIVE/'ReadMe').write_bytes((CACHE/'ReadMe').read_bytes())
meta=dict(catalogue='I/311 Hipparcos-2', author='Floor van Leeuwen (2007)',
 release='CDS corrected files 2008-09-16', retrieved='2026-09-25',
 source=URL+'hip2.dat.gz', schema=URL+'ReadMe', epoch='J1991.25', frame='ICRS',
 units=dict(ra='rad',dec='rad',parallax='mas',parallaxError='mas',hp='Hipparcos Hp mag'),
 originalRecords=len(lines), originalSha256=hashlib.sha256(raw).hexdigest(),
 selectedSha256=hashlib.sha256(selected.encode('ascii')).hexdigest(),
 filter='Sn=5, F2<3, RA/Dec formal errors <2 mas; sky: Hp<=6 and Hp error<=0.02; nearby: parallax>1000/15 mas, 0<relative formal error<=0.05, nearest 32 passing rows',
 warning='Filtered samples, not a complete sky or nearest-star census. Fixed catalogue epoch; no proper-motion propagation, apparent-place or horizon corrections. Distances only supplied for nearby selection. Markers not stellar radii.')
(OUT/'hip2-subset.json').write_text(json.dumps(dict(meta=meta,sky=sky,nearby=near),ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(OUT/'provenance.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Sky directions: {len(sky)}; nearby records: {len(near)}; full catalogue SHA256: {meta["originalSha256"]}')
