"""Import NASA/JPL Horizons geometric states and verify held-out midpoint samples.

Python standard library only. Requests are serialized and raw authoritative responses
are cached for reproducibility. Runtime files never need a third-party network call.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse, gzip, hashlib, json, math, os, re, time, urllib.parse, urllib.request

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data-sources' / 'horizons'
OUT = ROOT / 'public' / 'data'
BODY_IDS = ['sun','mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune']
DISPLAY = [10,199,299,399,301,499,599,699,799,899]
SIMULATION = [10,1,2,399,301,4,5,6,7,8]
J2000_UNIX = 946728000
STEP = 21600
CONTACT = ''

def tdb(utc):
    tt = datetime.fromisoformat(utc.replace('Z','+00:00')).timestamp() - J2000_UNIX + 69.184
    t = tt
    for _ in range(3):
        m = 6.239996 + 1.99096871e-7*t
        t = tt + 1.657e-3 * math.sin(m + 1.671e-2*math.sin(m))
    return t

def fetch(url):
    contact = CONTACT.strip()
    if (not contact or '\r' in contact or '\n' in contact or len(contact)>200
        or not ('@' in contact or contact.startswith('https://'))):
        raise ValueError('A real maintainer contact is required for JPL API network requests. Set --contact to your email/contact URL or set SOLAR_DATA_CONTACT. Cached rebuilds need no contact or network.')
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':f'Solar-System-Observatory/1.0 (contact: {contact})'})
            return urllib.request.urlopen(req, timeout=120).read()
        except Exception:
            if attempt == 3: raise
            time.sleep(2**attempt)

def query(target):
    params = dict(format='text', COMMAND=str(target), EPHEM_TYPE='VECTORS', CENTER='500@0',
                  START_TIME='2026-01-01', STOP_TIME='2028-01-01 06:00', STEP_SIZE='3h',
                  OUT_UNITS='KM-S', REF_PLANE='ECLIPTIC', REF_SYSTEM='ICRF',
                  VEC_TABLE='2', VEC_CORR='NONE', CSV_FORMAT='YES', TIME_TYPE='TDB')
    url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode({k: v if k=='format' else "'"+v+"'" for k,v in params.items()})
    path = CACHE / f'{target}-2026-2027-3h.txt.gz'
    if path.exists():
        raw = gzip.decompress(path.read_bytes())
    else:
        print(f'Downloading NAIF {target} ...', flush=True)
        raw = fetch(url)
        if b'$$SOE' not in raw: raise RuntimeError(raw.decode()[:5000])
        path.write_bytes(gzip.compress(raw, mtime=0))
        time.sleep(1)
    text = raw.decode()
    if 'Ecliptic of J2000.0' not in text or 'GEOMETRIC cartesian states' not in text or 'Solar System Barycenter (0)' not in text:
        raise ValueError(f'Unexpected coordinate definition for {target}')
    rows = []
    for line in text.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
        parts = line.split(',')
        rows.append([(float(parts[0])-2451545.0)*86400] + [float(x) for x in parts[2:8]])
    header = text.split('$$SOE')[0]
    sources = re.findall(r'Target body name:.*', header)
    return rows, dict(naifId=target,url=url,rawFile=str(path.relative_to(ROOT)).replace('\\','/'),
                     sha256=hashlib.sha256(raw).hexdigest(),targetSource=sources[0].strip(),
                     sampleCount=len(rows),rawStepSeconds=10800)

def hermite(a,b,t):
    h = b[0]-a[0]; s = (t-a[0])/h
    p = [(2*s**3-3*s*s+1)*a[i]+(s**3-2*s*s+s)*h*a[i+3]+(-2*s**3+3*s*s)*b[i]+(s**3-s*s)*h*b[i+3] for i in range(1,4)]
    v = [((6*s*s-6*s)*a[i]+(3*s*s-4*s+1)*h*a[i+3]+(-6*s*s+6*s)*b[i]+(3*s*s-2*s)*h*b[i+3])/h for i in range(1,4)]
    return p+v

def main():
    global CONTACT
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--contact',default=os.environ.get('SOLAR_DATA_CONTACT',''),help='Actual maintainer email or contact URL, required only for uncached JPL API requests.')
    CONTACT=parser.parse_args().contact
    CACHE.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
    data = {}; sources = []; checks = []
    for target in dict.fromkeys(DISPLAY+SIMULATION):
        rows, source = query(target); data[target]=rows; sources.append(source)
        max_p=0.; max_v=0.; sum_p=0.; worst=0.; count=0
        for i in range(1,len(rows)-1,2):
            truth=rows[i]; pred=hermite(rows[i-1],rows[i+1],truth[0])
            pe=math.sqrt(sum((pred[k]-truth[k+1])**2 for k in range(3)))
            ve=math.sqrt(sum((pred[k+3]-truth[k+4])**2 for k in range(3)))
            if pe>max_p: max_p=pe; worst=truth[0]
            max_v=max(max_v,ve);sum_p+=pe*pe;count+=1
        check=dict(naifId=target,checkpoints=count,maxPositionErrorKm=max_p,rmsPositionErrorKm=math.sqrt(sum_p/count),maxVelocityErrorKmS=max_v,worstTimeTdb=worst,passed=max_p<=1)
        print(json.dumps(check),flush=True);checks.append(check)
        if max_p>1: raise ValueError(f'NAIF {target} requires denser samples: {max_p} km')
    times=[r[0] for r in data[10][::2]]
    assert all(len(rows)==len(data[10]) for rows in data.values())
    chunks=[]
    for year in [2026,2027]:
        for month in range(1,13):
            start=datetime(year,month,1,tzinfo=timezone.utc).timestamp()-J2000_UNIX
            next_month=datetime(year+(month==12),1 if month==12 else month+1,1,tzinfo=timezone.utc).timestamp()-J2000_UNIX
            first=round((start-times[0])/STEP); last=round((next_month-times[0])/STEP)+1
            indices=list(range(first,min(last+1,len(times))))
            chunk=dict(startTdb=times[first],stepSeconds=STEP,count=len(indices),
                       display=[[value for target in DISPLAY for value in data[target][i*2][1:]] for i in indices],
                       simulation=[[value for target in SIMULATION for value in data[target][i*2][1:]] for i in indices])
            file=f'{year}-{month:02}.json'
            payload=json.dumps(chunk,separators=(',',':')).encode()
            (OUT/file).write_bytes(payload)
            chunks.append(dict(file=file,startTdb=start,endTdb=next_month,coverageEndTdb=times[indices[-1]],bytes=len(payload),sha256=hashlib.sha256(payload).hexdigest()))
    generated=datetime.now(timezone.utc).isoformat()
    manifest=dict(version='horizons-2026-2027-v1',source='NASA/JPL Horizons API 1.2',sourceUrl='https://ssd.jpl.nasa.gov/horizons/manual.html',generatedAt=generated,
                  startUtc='2026-01-01T00:00:00.000Z',endUtc='2028-01-01T00:00:00.000Z',startTdb=tdb('2026-01-01T00:00:00Z'),endTdb=tdb('2028-01-01T00:00:00Z'),
                  frame='ECLIPJ2000 (ICRF, ecliptic of J2000.0)',origin='Solar System Barycenter (NAIF 0)',units='km, km/s',timeScale='TDB seconds past J2000',
                  aberration='NONE: geometric states; no light-time or stellar-aberration corrections',bodyIds=BODY_IDS,displayNaifIds=DISPLAY,simulationNaifIds=SIMULATION,
                  interpolation='Cubic Hermite using authoritative position and velocity; analytic derivative for velocity',stepSeconds=STEP,chunks=chunks,targets=sources,
                  leapSeconds=dict(taiMinusUtc=37,knownThrough='2026-12-31',sourceUrl='https://datacenter.iers.org/data/html/bulletinc-072.html',futureAssumption='No leap second assumed in 2027; refresh IERS/NAIF leap-second data if one is announced.'),
                  physicalParameterSource='https://ssd.jpl.nasa.gov/planets/phys_par.html',gravitationalParameterSource='https://ssd.jpl.nasa.gov/astro_par.html',
                  textureAttribution='/textures/sources.json',dataQualityReport='/data/data-quality.md',
                  notes=['Displayed planet centers are distinct from unexpanded planetary-system barycenters used for integration.', 'The 1 km threshold measures interpolation against held-out Horizons samples, not uncertainty of the underlying ephemeris.'])
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    report=dict(generatedAt=generated,passed=all(x['passed'] for x in checks),thresholdKm=1,method='Every 3-hour midpoint held out from the 6-hour cubic-Hermite table. Neither midpoint positions nor velocities are used for interpolation.',
                reference='NASA/JPL Horizons; same coordinates, time scale, origin and target ID',sampleStepSeconds=STEP,validationOffsetSeconds=10800,
                totalCheckpoints=sum(x['checkpoints'] for x in checks),maxPositionErrorKm=max(x['maxPositionErrorKm'] for x in checks),bodies=checks)
    (OUT/'interpolation-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(f'Wrote {len(chunks)} monthly chunks. Overall max position error {report["maxPositionErrorKm"]:.6f} km.',flush=True)

if __name__=='__main__': main()
