"""Build parent-centered satellite ephemerides from official NASA/NAIF SPKs.

Requires: pip install numpy jplephem spiceypy
Only selected Chebyshev records are downloaded with serialized HTTP Range reads.
No SSD API is used: its real contact-information requirement remains respected.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, math, re, time, urllib.request
import numpy as np
import spiceypy as spice
from jplephem.daf import DAF
from jplephem.spk import SPK
from jplephem.excerpter import write_excerpt

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'data-sources'/'satellites'
OUT=ROOT/'public'/'data'/'satellites'
BASE='https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/'
KERNELS=[('jup365.bsp',[501,502,503,504,599]),('sat441.bsp',[602,606,601,603,604,605,608,699]),
         ('nep098_part-1.bsp',[801,899]),('mar099s.bsp',[401,402,499]),
         ('ura184_part-3.bsp',[705,701,702,703,704,799])]
# First candidate cadences are halved until every independent midpoint passes.
BODIES=[('io','jupiter',501,599,7200),('europa','jupiter',502,599,7200),
        ('ganymede','jupiter',503,599,21600),('callisto','jupiter',504,599,43200),
        ('titan','saturn',606,699,43200),('enceladus','saturn',602,699,7200),
        ('triton','neptune',801,899,21600),('phobos','mars',401,499,3600),
        ('deimos','mars',402,499,7200),
        ('miranda','uranus',705,799,7200),('ariel','uranus',701,799,7200),
        ('umbriel','uranus',702,799,14400),('titania','uranus',703,799,21600),
        ('oberon','uranus',704,799,21600),
        ('mimas','saturn',601,699,3600),('tethys','saturn',603,699,7200),
        ('dione','saturn',604,699,7200),('rhea','saturn',605,699,14400),
        ('iapetus','saturn',608,699,86400)]
J2000=946728000
GRID_START=datetime(2026,1,1,tzinfo=timezone.utc).timestamp()-J2000
GRID_END=datetime(2028,1,2,tzinfo=timezone.utc).timestamp()-J2000

class RangeFile:
    """Small cached file view over public static NAIF data, not an SSD API."""
    def __init__(self,url):
        self.url=url;self.offset=0;self.blocks=[];self.reads=[];self.total=None;self.etag=None
    def seek(self,offset,whence=0):
        if whence!=0:raise ValueError('Only absolute seek supported')
        self.offset=offset
    def read(self,size):
        start=self.offset;end=start+size
        for offset,data in self.blocks:
            if offset<=start and offset+len(data)>=end:
                self.offset=end;return data[start-offset:end-offset]
        first=start//65536*65536
        last=max(end,first+65536)-1
        if self.total is not None:last=min(last,self.total-1)
        for attempt in range(5):
            try:
                req=urllib.request.Request(self.url,headers={
                    'User-Agent':'Orbit-Observatory-SPK-Importer/1.0',
                    'Range':f'bytes={first}-{last}',
                })
                with urllib.request.urlopen(req,timeout=120) as response:
                    content_range=response.headers.get('Content-Range','')
                    match=re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)',content_range)
                    if response.status!=206 or not match or tuple(map(int,match.groups()[:2]))!=(first,last):
                        raise RuntimeError(f'Range response mismatch: HTTP {response.status}, {content_range}')
                    data=response.read()
                    if len(data)!=last-first+1:raise RuntimeError('Incomplete byte range')
                    etag=response.headers.get('ETag')
                    if self.etag is not None and etag!=self.etag:raise RuntimeError('Remote file changed during extraction')
                    self.etag=etag;self.total=int(match.group(3))
                    self.reads.append(dict(contentRange=content_range,etag=etag,lastModified=response.headers.get('Last-Modified'),
                                           sha256=hashlib.sha256(data).hexdigest(),bytes=len(data)))
                break
            except Exception:
                if attempt==4:raise
                time.sleep(2**attempt)
        self.blocks.append((first,data));self.offset=end
        # Explicitly serialized with a small pause; requests never run in parallel.
        time.sleep(.15)
        return data[start-first:end-first]

def covers_targets(path,targets):
    """Read actual SPK coverage, not just the cached filename/provenance list.

    A future target-list expansion must never silently reuse an older subset.
    SPK coverage windows may have gaps, so endpoints alone are insufficient.
    """
    objects=set(spice.spkobj(str(path)))
    if not set(targets).issubset(objects):return False
    for target in targets:
        coverage=spice.spkcov(str(path),target)
        if not any(a<=GRID_START and b>=GRID_END for a,b in
                   (spice.wnfetd(coverage,i) for i in range(spice.wncard(coverage)))):
            return False
    return True

def get_kernel(name,targets):
    path=CACHE/name.replace('.bsp','-2026-2027.bsp')
    provenance=path.with_suffix('.source.json')
    if path.exists() and provenance.exists():
        source=json.loads(provenance.read_text(encoding='utf-8'))
        if hashlib.sha256(path.read_bytes()).hexdigest()!=source['excerptSha256']:
            raise RuntimeError(f'Cached kernel checksum mismatch: {path}')
        if covers_targets(path,targets):
            print(f'Cached {name} (all requested targets and dates verified)',flush=True)
            return path,source
        print(f'Cached {name} lacks a requested target/date; extracting a complete replacement',flush=True)
    print(f'Extracting selected records from {name} ...',flush=True)
    remote=RangeFile(BASE+name)
    kernel=SPK(DAF(remote))
    summaries=[summary for summary,segment in zip(kernel.daf.summaries(),kernel.segments) if segment.target in targets]
    if {s[1][2] for s in summaries}!=set(targets):raise RuntimeError('Required target absent from kernel')
    if any(s[1][5] not in (2,3) for s in summaries):raise RuntimeError('Excerpt supports Chebyshev SPK types 2 and 3 only')
    temporary=path.with_suffix('.partial')
    with temporary.open('w+b') as output:
        # Padding includes UTC/TDB offset at the final boundary.
        write_excerpt(kernel,output,2461041.5,2461772.5,summaries)
        # jplephem accepts a short final record, while CSPICE requires the full
        # 1024-byte DAF physical record. Padding changes no coefficients.
        output.seek(0,2)
        output.write(b'\0'*((-output.tell())%1024))
    if not covers_targets(temporary,targets):
        raise RuntimeError(f'Extracted kernel does not cover all requested targets/dates: {name}')
    source=dict(url=BASE+name,originalFile=name,targets=targets,
        excerptStartTdb=GRID_START,excerptEndTdb=GRID_END,
        method='jplephem exact extraction of selected original Chebyshev records, no refitting',
        excerptSha256=hashlib.sha256(temporary.read_bytes()).hexdigest(),
        downloadedBytes=sum(r['bytes'] for r in remote.reads),rangeRequests=remote.reads,
        retrievedAt=datetime.now(timezone.utc).isoformat())
    temporary.replace(path)
    provenance.write_text(json.dumps(source,indent=2),encoding='utf-8')
    print(f'  {path.stat().st_size:,} byte excerpt, {source["downloadedBytes"]:,} downloaded bytes',flush=True)
    return path,source

def states(target,parent,times):
    return np.array([spice.spkezr(str(target),float(t),'ECLIPJ2000','NONE',str(parent))[0] for t in times])

def midpoint_check(samples,truth,step):
    a=samples[:-1];b=samples[1:]
    predicted_p=(a[:,:3]+b[:,:3])/2+step*(a[:,3:]-b[:,3:])/8
    predicted_v=1.5*(b[:,:3]-a[:,:3])/step-.25*(a[:,3:]+b[:,3:])
    pe=np.linalg.norm(predicted_p-truth[:,:3],axis=1)
    ve=np.linalg.norm(predicted_v-truth[:,3:],axis=1)
    return pe,ve

def write_composition_checkpoints(parent_id,parent_naif,solution):
    # These calendar values denote TDB, matching existing Horizons 3-hour
    # samples for the parent. They are not converted from UTC using leap seconds.
    calendar_points=[(2026,1,15,3),(2026,9,22,9),(2027,12,31,21)]
    points=[]
    for year,month,day,hour in calendar_points:
        epoch=datetime(year,month,day,hour,tzinfo=timezone.utc).timestamp()-J2000
        points.append(dict(time=epoch,states=[dict(id=id,state=states(target,parent_naif,[epoch])[0].tolist())
            for id,parent,target,_,_ in BODIES if parent==parent_id]))
    (CACHE/f'{parent_id}-composition-checkpoints.json').write_text(json.dumps(dict(
        parentNaifId=parent_naif,frame='ECLIPJ2000',units='km, km/s',timeScale='TDB seconds past J2000',
        parentReferenceFile=f'data-sources/horizons/{parent_naif}-2026-2027-3h.txt.gz',
        satelliteReference=f'Independent CSPICE evaluations from {solution}; parent-centered geometric states',
        points=points),indent=2),encoding='utf-8')

def main():
    CACHE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    sources=[]
    for name,targets in KERNELS:
        path,source=get_kernel(name,targets);sources.append(source);spice.furnsh(str(path))
    spice.furnsh(str(ROOT/'data-sources'/'naif0012.tls'))
    start=spice.str2et('2026-01-01 00:00:00 UTC')
    end=spice.str2et('2028-01-01 00:00:00 UTC')
    write_composition_checkpoints('uranus',799,'URA184')
    write_composition_checkpoints('saturn',699,'SAT441')
    series={};checks=[]
    for id,parent,target,parent_naif,initial_step in BODIES:
        step=initial_step;attempts=[]
        while True:
            times=np.arange(GRID_START,GRID_END+1,step,dtype=float)
            values=states(target,parent_naif,times)
            midpoint_times=times[:-1]+step/2
            truth=states(target,parent_naif,midpoint_times)
            pe,ve=midpoint_check(values,truth,step)
            maximum=float(pe.max())
            attempts.append(dict(stepSeconds=step,maxPositionErrorKm=maximum))
            print(f'{id}: {step}s cadence, {len(pe)} independent checkpoints, max {maximum:.6f} km',flush=True)
            if maximum<1:break
            step//=2
            if step<60:raise RuntimeError('Unexpectedly small required cadence')
        series[id]=dict(times=times,values=values,step=step,parentId=parent)
        checks.append(dict(id=id,targetNaifId=target,centerNaifId=parent_naif,stepSeconds=step,
            checkpoints=len(pe),maxPositionErrorKm=maximum,rmsPositionErrorKm=float(np.sqrt(np.mean(pe*pe))),
            maxVelocityErrorKmS=float(ve.max()),worstTimeTdb=float(midpoint_times[int(pe.argmax())]),
            attempts=attempts,passed=True))
        # Compact independent authoritative points for testing the TypeScript path.
        selected=np.unique(np.linspace(0,len(truth)-1,25,dtype=int))
        (CACHE/f'{id}-checkpoints.json').write_text(json.dumps([
            dict(time=float(midpoint_times[i]),state=truth[i].tolist()) for i in selected
        ],separators=(',',':')),encoding='utf-8')
    chunks=[]
    for year in (2026,2027):
        for month in range(1,13):
            next_year=year+(month==12);next_month=1 if month==12 else month+1
            lo=spice.str2et(f'{year}-{month:02}-01 00:00:00 UTC')
            hi=spice.str2et(f'{next_year}-{next_month:02}-01 00:00:00 UTC')
            for parent in dict.fromkeys(body[1] for body in BODIES):
                bodies=[]
                for id,_,_,_,_ in [b for b in BODIES if b[1]==parent]:
                    s=series[id];a=int(np.searchsorted(s['times'],lo,side='right')-1)
                    b=int(np.searchsorted(s['times'],hi,side='left'))+1
                    bodies.append(dict(id=id,startTdb=float(s['times'][a]),stepSeconds=s['step'],samples=s['values'][a:b].tolist()))
                payload=json.dumps(dict(parentId=parent,series=bodies),separators=(',',':')).encode()
                file=f'{parent}-{year}-{month:02}.json';(OUT/file).write_bytes(payload)
                chunks.append(dict(file=file,parentId=parent,startTdb=lo,endTdb=hi,bytes=len(payload),sha256=hashlib.sha256(payload).hexdigest()))
    generated=datetime.now(timezone.utc).isoformat()
    report=dict(generatedAt=generated,passed=True,thresholdKm=1,
        method='Every midpoint held out between stored states is independently evaluated from the original SPK Chebyshev polynomials. Midpoint states never participate in Hermite interpolation. Cadence is halved until all pass.',
        maxPositionErrorKm=max(c['maxPositionErrorKm'] for c in checks),
        totalCheckpoints=sum(c['checkpoints'] for c in checks),satellites=checks)
    (OUT/'interpolation-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    manifest=dict(version='naif-satellites-2026-2027-v3-saturn',source='NASA/JPL NAIF satellite SPK kernels',sourceUrl=BASE,
        generatedAt=generated,startUtc='2026-01-01T00:00:00.000Z',endUtc='2028-01-01T00:00:00.000Z',startTdb=start,endTdb=end,
        frame='ECLIPJ2000',units='km, km/s',timeScale='TDB seconds past J2000',
        origin='Each satellite is relative to its parent PLANET CENTER (599,699,899,499,799); never a system barycenter',
        aberration='NONE: geometric states, no light-time or stellar-aberration correction',
        satelliteIds=[b[0] for b in BODIES],chunks=chunks,sources=sources,
        interpolation='Cubic Hermite, independently validated adaptive cadence',
        interpolationReport='/data/satellites/interpolation-report.json',
        parameterSources=['https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc','https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc',
                          BASE+'ura184_part-3.cmt',BASE+'sat441.cmt','https://ssd.jpl.nasa.gov/sats/elem/'],
        notes=['Satellite positions are visualization ephemerides only; the existing ten-body Newtonian integration is unchanged.',
               'Interpolation accuracy is distinct from the observational uncertainty of an ephemeris solution.',
               '2027 UTC assumes no additional leap second; refresh NAIF leap-second data if IERS announces one.',
               'JUP365/SAT441/NEP098/MAR099/URA184 are fixed reproducible releases, matching the parent-center solution families; not a claim to use every most recent solution.',
               'Uranian satellite GM values in the metadata use the URA182 solution documented in URA184, while the original ten-body integration constants remain unchanged.'])
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(f'Wrote {len(chunks)} monthly planet-system packets, max error {report["maxPositionErrorKm"]:.6f} km.',flush=True)

if __name__=='__main__':main()
