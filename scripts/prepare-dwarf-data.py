"""Cache JPL Horizons states for the first dynamic dwarf-planet batch.

The published six-hour samples omit every other authoritative three-hour row.
Those omitted rows independently check the position and velocity interpolator.
Only Python's standard library is required. Cached rebuilds are offline.
"""

from datetime import datetime, timezone
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import math
import os
import re
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data-sources' / 'dwarfs'
OUT = ROOT / 'public' / 'data' / 'dwarfs'
TARGETS = {'ceres': '1;', 'pluto': '999', 'charon': '901'}
J2000_UNIX = 946728000
PUBLISHED_STEP = 21600
RAW_STEP = 10800


def tdb(utc):
    tt = datetime.fromisoformat(utc.replace('Z', '+00:00')).timestamp() - J2000_UNIX + 69.184
    value = tt
    for _ in range(3):
        m = 6.239996 + 1.99096871e-7 * value
        value = tt + 1.657e-3 * math.sin(m + 1.671e-2 * math.sin(m))
    return value


def query(body_id, command, contact):
    params = dict(format='text', COMMAND=command, EPHEM_TYPE='VECTORS', CENTER='500@0',
                  START_TIME='2026-01-01', STOP_TIME='2028-01-01 06:00', STEP_SIZE='3h',
                  OUT_UNITS='KM-S', REF_PLANE='ECLIPTIC', REF_SYSTEM='ICRF',
                  VEC_TABLE='2', VEC_CORR='NONE', CSV_FORMAT='YES', TIME_TYPE='TDB')
    url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(
        {key: value if key == 'format' else "'" + value + "'" for key, value in params.items()})
    cache_path = CACHE / f'{body_id}-2026-2027-3h.txt.gz'
    if cache_path.exists():
        raw = gzip.decompress(cache_path.read_bytes())
    else:
        if not contact or ('@' not in contact and not contact.startswith('https://')):
            raise ValueError('Set --contact to the real maintainer email or contact URL for JPL API requests.')
        request = urllib.request.Request(url, headers={
            'User-Agent': f'Solar-System-Observatory/1.0 (contact: {contact})'})
        print(f'Downloading {body_id} ({command})', flush=True)
        for attempt in range(4):
            try:
                raw = urllib.request.urlopen(request, timeout=120).read()
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
        if b'$$SOE' not in raw or b'$$EOE' not in raw:
            raise RuntimeError(raw.decode(errors='replace')[:2000])
        cache_path.write_bytes(gzip.compress(raw, mtime=0))
        time.sleep(1)

    response = raw.decode()
    header, remainder = response.split('$$SOE', 1)
    data_text = remainder.split('$$EOE', 1)[0]
    expected_names = {'ceres': '1 Ceres', 'pluto': 'Pluto (999)', 'charon': 'Charon (901)'}
    if (expected_names[body_id] not in header or
        'Solar System Barycenter (0)' not in header or
        'Ecliptic of J2000.0' not in header or
        'GEOMETRIC cartesian states' not in header or
        'Output units    : KM-S' not in header):
        raise ValueError(f'Unexpected Horizons target/center/frame/units for {body_id}')
    rows = []
    for line in data_text.strip().splitlines():
        parts = line.split(',')
        row = [(float(parts[0]) - 2451545.0) * 86400] + [float(item) for item in parts[2:8]]
        if len(row) != 7 or not all(math.isfinite(value) for value in row):
            raise ValueError(f'Invalid vector row for {body_id}')
        rows.append(row)
    if len(rows) < 5800 or any(abs(rows[i][0] - rows[i-1][0] - RAW_STEP) > .01 for i in range(1, len(rows))):
        raise ValueError(f'Incomplete or nonuniform Horizons sampling for {body_id}')
    target_line = re.search(r'^Target body name:.*$', header, re.M)
    return rows, dict(id=body_id, command=command, targetSource=target_line.group(0).strip(),
                      center='Solar System Barycenter (0)', rawStepSeconds=RAW_STEP,
                      rawFile=str(cache_path.relative_to(ROOT)).replace('\\', '/'),
                      rawSha256=hashlib.sha256(raw).hexdigest(), queryUrl=url)


def hermite(a, b, epoch):
    h = b[0] - a[0]
    s = (epoch - a[0]) / h
    s2, s3 = s*s, s*s*s
    position = [a[i] + (-2*s3+3*s2)*(b[i]-a[i]) + (s3-2*s2+s)*h*a[i+3] + (s3-s2)*h*b[i+3]
                for i in range(1, 4)]
    velocity = [((-6*s2+6*s)*(b[i]-a[i]) + (3*s2-4*s+1)*h*a[i+3] + (3*s2-2*s)*h*b[i+3]) / h
                for i in range(1, 4)]
    return position + velocity


def verify(rows, body_id):
    maximum_position = maximum_velocity = sum_squared = 0.0
    count = 0
    for index in range(1, len(rows)-1, 2):
        truth = rows[index]
        predicted = hermite(rows[index-1], rows[index+1], truth[0])
        position_error = math.dist(predicted[:3], truth[1:4])
        velocity_error = math.dist(predicted[3:], truth[4:7])
        maximum_position = max(maximum_position, position_error)
        maximum_velocity = max(maximum_velocity, velocity_error)
        sum_squared += position_error ** 2
        count += 1
    result = dict(id=body_id, heldOutCheckpoints=count,
                  maxPositionErrorKm=maximum_position,
                  rmsPositionErrorKm=math.sqrt(sum_squared/count),
                  maxVelocityErrorKmS=maximum_velocity,
                  passed=maximum_position <= 1 and maximum_velocity <= 1e-4)
    print(json.dumps(result), flush=True)
    if not result['passed']:
        raise ValueError(f'{body_id} exceeds interpolation threshold; shorten sample interval')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--contact', default=os.environ.get('SOLAR_DATA_CONTACT', ''))
    contact = parser.parse_args().contact.strip()
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    records = {}
    targets = []
    checks = []
    for body_id, command in TARGETS.items():
        rows, provenance = query(body_id, command, contact)
        records[body_id] = rows
        targets.append(provenance)
        checks.append(verify(rows, body_id))
    start = records['ceres'][0][0]
    if any(len(rows) != len(records['ceres']) or any(abs(row[0]-records['ceres'][i][0]) > .01 for i, row in enumerate(rows))
           for rows in records.values()):
        raise ValueError('Target samples do not share the same TDB epochs')

    chunks = []
    for year in (2026, 2027):
        for month in range(1, 13):
            next_year, next_month = (year+1, 1) if month == 12 else (year, month+1)
            utc_start = f'{year}-{month:02}-01T00:00:00Z'
            utc_end = f'{next_year}-{next_month:02}-01T00:00:00Z'
            first = max(0, math.floor((tdb(utc_start)-start)/PUBLISHED_STEP)-1)
            last = min((len(records['ceres'])-1)//2, math.ceil((tdb(utc_end)-start)/PUBLISHED_STEP)+1)
            series = [dict(id=body_id, startTdb=records[body_id][first*2][0],
                           stepSeconds=PUBLISHED_STEP,
                           samples=[row[1:] for row in records[body_id][first*2:(last+1)*2:2]])
                      for body_id in TARGETS]
            filename = f'{year}-{month:02}.json'
            payload = json.dumps(dict(series=series), separators=(',', ':')).encode()
            (OUT / filename).write_bytes(payload)
            chunks.append(dict(file=filename, startTdb=tdb(utc_start), endTdb=tdb(utc_end),
                               bytes=len(payload), sha256=hashlib.sha256(payload).hexdigest()))

    manifest = dict(version='horizons-dwarfs-2026-2027-v1',
                    source='NASA/JPL Horizons', sourceUrl='https://ssd.jpl.nasa.gov/horizons/manual.html',
                    generatedAt=datetime.now(timezone.utc).isoformat(),
                    startUtc='2026-01-01T00:00:00Z', endUtc='2028-01-01T00:00:00Z',
                    startTdb=tdb('2026-01-01T00:00:00Z'), endTdb=tdb('2028-01-01T00:00:00Z'),
                    frame='ECLIPJ2000 (ICRF, ecliptic of J2000.0)', origin='Solar System Barycenter (NAIF 0)',
                    units='km, km/s', timeScale='TDB seconds past J2000',
                    aberration='NONE: geometric states; no light-time correction',
                    bodyIds=list(TARGETS), stepSeconds=PUBLISHED_STEP,
                    interpolation='Cubic Hermite with analytic velocity derivative',
                    targets=targets, chunks=chunks,
                    validation=dict(checks=checks, maxPositionErrorKm=max(c['maxPositionErrorKm'] for c in checks),
                                    maxVelocityErrorKmS=max(c['maxVelocityErrorKmS'] for c in checks),
                                    positionThresholdKm=1, velocityThresholdKmS=1e-4,
                                    meaning='Held-out source-sample difference, not absolute orbit uncertainty'))
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Generated {len(chunks)} monthly packs')


if __name__ == '__main__':
    main()
