import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {interpolateChunk} from '../src/ephemeris/ephemeris';
import {interpolateSatelliteChunk} from '../src/ephemeris/satellites';
import {BODY_IDS,type Vec3} from '../src/types';
import {OCCULTATION_REFERENCE,OCCULTATION_START,OCCULTATION_END,OCCULTATION_SOURCE,occultationGeometry,occultationContact,sampleOccultation,ARCSEC} from '../src/data/occultation';
import {tdbToUtc} from '../src/data/time';
const files=['public/data/2026-01.json','public/data/satellites/jupiter-2026-01.json'],raw=files.map(f=>readFileSync(f)),[core,moons]=raw.map(b=>JSON.parse(b.toString()));
const position=(id:'earth'|'jupiter'|'io',time:number):Vec3=>{const frame=interpolateChunk(core,time),i=BODY_IDS.indexOf(id==='io'?'jupiter':id)*3,p:Array<number>=[...frame.positions.slice(i,i+3)];if(id==='io'){const m=interpolateSatelliteChunk(moons,time).states.find(s=>s.id==='io')!;for(let k=0;k<3;k++)p[k]+=m.position[k];}return p as Vec3;};
const sample=(t:number)=>occultationGeometry(t,position),ref=OCCULTATION_REFERENCE;
const contacts={first:occultationContact(sample,ref-1800,ref+1800),second:occultationContact(sample,ref-1800,ref+1800,true),third:occultationContact(sample,ref+3600,ref+10800,true),fourth:occultationContact(sample,ref+3600,ref+10800)};
const points=Array.from({length:481},(_,i)=>sample(OCCULTATION_START+i*60));
let maxPositionKm=0;for(let i=0;i<480;i++){const t=OCCULTATION_START+(i+.5)*60,a=sample(t),b=sampleOccultation(points,t)!;maxPositionKm=Math.max(maxPositionKm,Math.hypot(a.x-b.x,a.y-b.y)/ARCSEC*a.observerDistanceKm);}
if(maxPositionKm>1)throw new Error('案例采样误差超过 1 km，需加密');
const referenceArchive=JSON.parse(readFileSync('data-sources/events/imcce-jupiter-2026-source.json','utf8'));
if(createHash('sha256').update(readFileSync('data-sources/events/imcce-jupiter-2026.pdf')).digest('hex')!==referenceArchive.sha256)throw new Error('参考原文哈希不匹配');
const report={referenceArchive,version:'io-occultation-2026-01-12-v1',sources:[OCCULTATION_SOURCE,'https://promenade.imcce.fr/en/pages3/365.html','https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/'],reference:{ttLabel:'2026-01-12 06:33:08.7 TT',tdb:ref,event:'501 OC.D',disappearanceMinutes:3.61,pdfPage:3,definition:'Beginning of occultation; duration is the disappearance interval, not the full occultation.'},model:{contacts,firstUtc:tdbToUtc(contacts.first).toISOString(),deltaSeconds:contacts.first-ref,disappearanceMinutes:(contacts.second-contacts.first)/60,durationDifferenceSeconds:contacts.second-contacts.first-3.61*60,lightSeconds:sample(ref).lightSeconds},input:files.map((file,i)=>({file,sha256:createHash('sha256').update(raw[i]).digest('hex')})),observer:'Earth center at reception time',timeScale:'TDB seconds since J2000',frame:'Local sky plane from ECLIPJ2000; projected ecliptic north up',units:'arcsec, km, seconds',correction:'Iterated one-way light-time; no aberration, light deflection, oblateness, local atmosphere, eclipse illumination or limb topography.',sampling:{stepSeconds:60,holdouts:480,maxProjectedInterpolationKm:maxPositionKm},window:{start:OCCULTATION_START,end:OCCULTATION_END},points};
writeFileSync('public/data/events/io-occultation-2026-01-12.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({model:report.model,sampling:report.sampling},null,2));
