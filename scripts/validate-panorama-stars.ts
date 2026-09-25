import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseStarCatalogue} from '../src/data/starCatalogue';
import {panoramaStarDirection} from '../src/data/panoramaStars';
const bytes=readFileSync('data-sources/stars/hipparcos-1997-checkpoints.tsv');
const provenance=JSON.parse(readFileSync('data-sources/stars/hipparcos-1997-checkpoints.provenance.json','utf8'));
if(createHash('sha256').update(bytes).digest('hex')!==provenance.sha256)throw Error('Comparison source checksum mismatch');
const data=parseStarCatalogue(JSON.parse(readFileSync('public/data/stars/hip2-subset.json','utf8')));
const stars=new Map([...data.sky,...data.nearby].map(s=>[s.hip,s]));
const rows=bytes.toString('utf8').split(/\r?\n/).filter(l=>/^\s*\d+\t/.test(l)).map(line=>{
 const [hip,ra,dec]=line.split('\t').map(Number),a=ra*Math.PI/180,d=dec*Math.PI/180,e=23.43929111111111*Math.PI/180;
 // Independent spherical formula applied to the archived 1997 reduction, not product Cartesian code.
 const latitude=Math.asin(Math.sin(d)*Math.cos(e)-Math.cos(d)*Math.sin(e)*Math.sin(a));
 const longitude=Math.atan2(Math.sin(a)*Math.cos(e)+Math.tan(d)*Math.sin(e),Math.cos(a));
 const reference=[Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),-Math.cos(latitude)*Math.sin(longitude)];
 const s=stars.get(hip)!;if(!s)throw Error('Missing checkpoint');const actual=panoramaStarDirection(s.ra,s.dec);
 const cross=[actual[1]*reference[2]-actual[2]*reference[1],actual[2]*reference[0]-actual[0]*reference[2],actual[0]*reference[1]-actual[1]*reference[0]];
 const separationMas=Math.atan2(Math.hypot(...cross),actual.reduce((sum,v,i)=>sum+v*reference[i],0))*180/Math.PI*3600000;
 return {hip,referenceEclipticLongitudeDeg:(longitude*180/Math.PI+360)%360,referenceEclipticLatitudeDeg:latitude*180/Math.PI,separationMas};
});
const maxSeparationMas=Math.max(...rows.map(r=>r.separationMas));const passed=rows.length===5&&rows.every(r=>Number.isFinite(r.separationMas)&&r.separationMas<20);
const result={date:new Date().toISOString(),epoch:'J1991.25',frame:'ICRS directions rotated to Horizons ECLIPJ2000, then Three (X,Z,-Y)',obliquityArcsec:84381.448,coordinateSource:'https://ssd.jpl.nasa.gov/horizons/manual.html',catalogueSource:provenance,method:'1997 archived coordinates + independent spherical formula vs Hipparcos-2 + product Cartesian rotation',limitations:'Same observing mission, different reductions; gross frame/import check, not current-epoch accuracy, apparent positions, navigation or independent telescope observations.',thresholdMas:20,maxSeparationMas,passed,rows};
writeFileSync('public/data/stars/panorama-validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed,count:rows.length,maxSeparationMas}));if(!passed)process.exitCode=1;
