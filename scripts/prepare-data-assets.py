"""Download attributed display textures and preserve authoritative parameter sources."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,urllib.request,time
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public'/'textures'
SOURCES=ROOT/'data-sources'
TEXTURES={
 'sun':'2k_sun.jpg','mercury':'2k_mercury.jpg','venus':'2k_venus_atmosphere.jpg',
 'earth':'2k_earth_daymap.jpg','moon':'2k_moon.jpg','mars':'2k_mars.jpg',
 'jupiter':'2k_jupiter.jpg','saturn':'2k_saturn.jpg','uranus':'2k_uranus.jpg','neptune':'2k_neptune.jpg',
 'earth-clouds':'2k_earth_clouds.jpg','earth-night':'2k_earth_nightmap.jpg',
 'saturn-ring':'2k_saturn_ring_alpha.png',
}
def download(url,path):
 if not path.exists():
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 Solar-System-Observatory/1.0'})
  for attempt in range(3):
   try:
    raw=urllib.request.urlopen(req,timeout=90).read()
    if len(raw)<100: raise ValueError('Empty source')
    path.write_bytes(raw); break
   except Exception:
    if attempt==2: raise
    time.sleep(2**attempt)
 return hashlib.sha256(path.read_bytes()).hexdigest()
ASSETS.mkdir(parents=True,exist_ok=True); SOURCES.mkdir(parents=True,exist_ok=True)
assets=[]
for name,remote in TEXTURES.items():
 url='https://www.solarsystemscope.com/textures/download/'+remote
 file=name+Path(remote).suffix
 sha=download(url,ASSETS/file)
 print(file,flush=True)
 assets.append(dict(file='/textures/'+file,sourceUrl=url,sha256=sha))
metadata=dict(author='Solar System Scope / INOVE',sourceUrl='https://www.solarsystemscope.com/textures/',
 license='Creative Commons Attribution 4.0 International (CC BY 4.0)',licenseUrl='https://creativecommons.org/licenses/by/4.0/',
 attribution='Planet textures: Solar System Scope / INOVE, CC BY 4.0. Based on NASA imagery and elevation data.',
 changes='Original 2K texture files, no image modifications. Lighting and atmospheric shading are applied at runtime.',
 caveat='Static visualization maps, not live imagery. Source textures include adjusted colors and some reconstructed terrain; atmospheric bands, clouds and surface appearance are not time-resolved.',
 downloadedAt=datetime.now(timezone.utc).isoformat(),textures=assets)
(ASSETS/'sources.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
official={
 'gm_de440.tpc':'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc',
 'pck00011.tpc':'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc',
 'naif0012.tls':'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls',
 'bulletinc-072.html':'https://datacenter.iers.org/data/html/bulletinc-072.html',
}
records=[]
for file,url in official.items():
 sha=download(url,SOURCES/file);print(file,flush=True)
 records.append(dict(file='data-sources/'+file,sourceUrl=url,sha256=sha))
(SOURCES/'parameter-sources.json').write_text(json.dumps(dict(generatedAt=datetime.now(timezone.utc).isoformat(),files=records,
 physicalParameters='https://ssd.jpl.nasa.gov/planets/phys_par.html',
 satellites='https://ssd.jpl.nasa.gov/sats/phys_par/',
 gravitationalParameters='https://ssd.jpl.nasa.gov/astro_par.html',
 approximateSemimajorAxes='https://ssd.jpl.nasa.gov/planets/approx_pos.html',
 belts='https://science.nasa.gov/solar-system/solar-system-facts/',
 radiusDefinition='Mean volumetric radius in km; sphere rendering approximates oblateness.',
 rotationModel='J2000 IAU pole right ascension/declination and prime meridian with PCK linear rotation rate. Mars uses the IAU 2009 static-pole approximation documented in pck00011; others use current pck00011 base terms. Periodic terms, precession, lunar libration and differential rotation are omitted; attitude is illustrative, independent of authoritative translational state.',
 moonObliquity='Moon obliquity 6.68 degrees is relative to its orbital plane; pole coordinates determine rendered inertial orientation.',
 massPolicy='Catalog masses retain rounded JPL physical values; dynamics uses the separately sourced GM, not G multiplied by rounded mass.',
 gmCompatibility='DE440 constants used for Newtonian comparison; Horizons DE441 translational state and current satellite models supply initial conditions. Differences to Horizons include this model simplification.'),indent=2),encoding='utf-8')
