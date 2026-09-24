"""Build 2026–2027 comet packs with the same held-out checks as dwarf packs.

CAP selects the latest available apparition solution. The returned target header,
complete raw response and query URL are retained; cached rebuilds are offline.
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('monthly_builder', Path(__file__).with_name('prepare-dwarf-data.py'))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.CACHE = builder.ROOT / 'data-sources' / 'comets'
builder.OUT = builder.ROOT / 'public' / 'data' / 'comets'
builder.TARGETS = {'halley': 'DES=1P;CAP;', '67p': 'DES=67P;CAP;', 'hale-bopp':'DES=C/1995 O1;CAP;'}
builder.EXPECTED_NAMES = {'halley': '1P/Halley', '67p': '67P/Churyumov-Gerasimenko', 'hale-bopp':'Hale-Bopp'}
builder.VERSION = 'horizons-comets-2026-2027-v2'

if __name__ == '__main__':
    builder.main()
    # A sampled path subtracts the Sun at each epoch, not the Sun at display time.
    builder.EXPECTED_NAMES['sun'] = 'Sun (10)'
    sun, provenance = builder.query('sun', '10', 'https://github.com/yydshly/0922_codexgpt6_project')
    tracks = []
    import json, math, hashlib
    manifest = json.loads((builder.OUT / 'manifest.json').read_text())
    times = [manifest['startTdb'] + n*86400 for n in range(730)] + [manifest['endTdb']]
    def sample(rows, epoch):
        index = min(len(rows)-2, max(0, math.floor((epoch-rows[0][0])/builder.RAW_STEP)))
        return builder.hermite(rows[index], rows[index+1], epoch)
    for body_id, command in builder.TARGETS.items():
        rows, _ = builder.query(body_id, command, '')
        points = []
        for epoch in times:
            target, parent = sample(rows, epoch), sample(sun, epoch)
            points.append([epoch] + [target[i]-parent[i] for i in range(3)])
        tracks.append(dict(id=body_id, points=points))
    payload = json.dumps(dict(frame='ECLIPJ2000', origin='sun', units='km',
        timeScale='TDB seconds past J2000', tracks=tracks), separators=(',', ':')).encode()
    (builder.OUT / 'tracks.json').write_bytes(payload)
    manifest['tracks'] = dict(file='tracks.json', sha256=hashlib.sha256(payload).hexdigest(),
        bytes=len(payload), sunSource=provenance, sampleSeconds=86400,
        meaning='Daily heliocentric positions over coverage, joined for display; not a complete orbital revolution')
    (builder.OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
