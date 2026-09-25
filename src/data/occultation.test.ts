import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {interpolateChunk} from '../ephemeris/ephemeris';
import {interpolateSatelliteChunk} from '../ephemeris/satellites';
import {BODY_IDS,type Vec3} from '../types';
import {occultationGeometry,occultationSpatial,occultationStage,occultationContact,sampleOccultation,OCCULTATION_REFERENCE,OCCULTATION_START,OCCULTATION_END,LIGHT_SPEED,ARCSEC,type OccultationSampler} from './occultation';
import {tdbToUtc} from './time';
import {eclipseCase} from './eclipseCases';
import {motionPlaybackSpeed,motionStepSeconds} from './motionLessons';
import report from '../../public/data/events/io-occultation-2026-01-12.json';
const files=['public/data/2026-01.json','public/data/satellites/jupiter-2026-01.json'],raw=files.map(f=>readFileSync(f)),[core,moons]=raw.map(b=>JSON.parse(b.toString()));
const position:OccultationSampler=(id,time)=>{const frame=interpolateChunk(core,time),i=BODY_IDS.indexOf(id==='io'?'jupiter':id)*3,p=[...frame.positions.slice(i,i+3)] as Vec3;if(id==='io'){const m=interpolateSatelliteChunk(moons,time).states.find(s=>s.id==='io')!;for(let k=0;k<3;k++)p[k]+=m.position[k];}return p;};
const sample=(t:number)=>occultationGeometry(t,position);
it('solves retarded time for a moving target instead of using simultaneous positions',()=>{
 const distance=7e8,velocity=10,reception=10000;
 const fixed:OccultationSampler=(id,t)=>id==='earth'?[0,0,0]:id==='jupiter'?[6e8,0,0]:[distance+velocity*t,0,0];
 const p=occultationGeometry(reception,fixed),delay=(distance+velocity*reception)/(LIGHT_SPEED+velocity);
 expect(p.lightSeconds).toBeCloseTo(delay,8);expect(p.observerDistanceKm/LIGHT_SPEED).toBeCloseTo(delay,8);expect(p.x).toBeCloseTo(0,10);expect(p.y).toBeCloseTo(0,10);expect(p.depthKm).toBeGreaterThan(0);
});
it('distinguishes full and partial occultations from transits and separated discs',()=>{
 const p={separation:12,jupiterRadius:10,ioRadius:1,depthKm:20};expect(occultationStage(p)).toBe('两视圆分离');expect(occultationStage({...p,separation:10})).toBe('木卫一部分被遮住');expect(occultationStage({...p,separation:8})).toBe('木卫一完全被遮住');expect(occultationStage({...p,separation:8,depthKm:-20})).toBe('木卫一在前 · 凌越');
});
it('preserves projection geometry under a common translation and handles polar viewing',()=>{
 const time=OCCULTATION_REFERENCE,p=sample(time),shift:Vec3=[8e6,-3e6,5e6],moved=occultationGeometry(time,(id,t)=>position(id,t).map((n,i)=>n+shift[i]) as Vec3);
 expect(moved.separation).toBeCloseTo(p.separation,7);expect(Math.hypot(p.x,p.y)).toBeCloseTo(p.separation,10);
 const polar=occultationGeometry(0,id=>id==='earth'?[0,0,0]:id==='jupiter'?[0,0,6e8]:[1e5,0,6.001e8]);expect(Number.isFinite(polar.x)).toBe(true);expect(Number.isFinite(polar.y)).toBe(true);
});
it('keeps the independent TT reference, case bounds and slow contact controls',()=>{
 expect(tdbToUtc(OCCULTATION_REFERENCE).toISOString()).toBe('2026-01-12T06:31:59.516Z');expect(eclipseCase('io-occultation')?.entry).toBe(OCCULTATION_REFERENCE-600);expect(motionPlaybackSpeed('io-occultation')).toBe(60);expect(motionStepSeconds('io-occultation')).toBe(30);
 expect(sampleOccultation(report.points,OCCULTATION_START-1)).toBeNull();expect(sampleOccultation(report.points,OCCULTATION_END+1)).toBeNull();expect(sampleOccultation(report.points,NaN)).toBeNull();expect(sampleOccultation(report.points,OCCULTATION_END)).not.toBeNull();
});
it('reproduces model contacts, provenance and the independent ingress discrepancy',()=>{
 raw.forEach((data,i)=>expect(createHash('sha256').update(data).digest('hex')).toBe(report.input[i].sha256));
 expect(createHash('sha256').update(readFileSync('data-sources/events/imcce-jupiter-2026.pdf')).digest('hex')).toBe(report.referenceArchive.sha256);
 const ref=OCCULTATION_REFERENCE,first=occultationContact(sample,ref-1800,ref+1800),second=occultationContact(sample,ref-1800,ref+1800,true);
 expect(first).toBeCloseTo(report.model.contacts.first,3);expect(second).toBeCloseTo(report.model.contacts.second,3);expect(first-ref).toBeGreaterThan(80);expect(first-ref).toBeLessThan(95);expect(second-first).toBeCloseTo(report.model.disappearanceMinutes*60,5);
 expect(occultationStage(sample(first-2))).toBe('两视圆分离');expect(occultationStage(sample((first+second)/2))).toBe('木卫一部分被遮住');expect(occultationStage(sample(second+2))).toBe('木卫一完全被遮住');expect(occultationStage(sample(report.model.contacts.third+2))).toBe('木卫一部分被遮住');expect(occultationStage(sample(report.model.contacts.fourth+2))).toBe('两视圆分离');
});
it('checks all independent midpoints against the generated case interpolation',()=>{
 let maximum=0;for(let i=0;i<report.points.length-1;i++){const t=(report.points[i].time+report.points[i+1].time)/2,exact=sample(t),interpolated=sampleOccultation(report.points,t)!;maximum=Math.max(maximum,Math.hypot(exact.x-interpolated.x,exact.y-interpolated.y)/ARCSEC*exact.observerDistanceKm);}
 expect(maximum).toBeLessThan(1);expect(maximum).toBeCloseTo(report.sampling.maxProjectedInterpolationKm,6);
});

it('reconstructs three-dimensional emission positions without changing observed separation or distance',()=>{
 for(const p of report.points){const [x,y,z]=occultationSpatial(p),jDistance=p.observerDistanceKm-p.depthKm;
  expect(Math.hypot(x,y,jDistance-z)).toBeCloseTo(p.observerDistanceKm,5);
  expect(Math.atan2(Math.hypot(x,y),jDistance-z)*ARCSEC).toBeCloseTo(p.separation,9);
 }
 const p=sample(OCCULTATION_REFERENCE),io=position('io',p.time-p.lightSeconds),j=position('jupiter',p.time-(p.observerDistanceKm-p.depthKm)/LIGHT_SPEED);
 expect(Math.hypot(...occultationSpatial(p))).toBeCloseTo(Math.hypot(...io.map((n,i)=>n-j[i])),5);
 expect(occultationSpatial({...p,x:0,y:0,separation:0})).toEqual([0,0,-p.depthKm]);
});
it('bounds reconstruction error at independent case midpoints',()=>{
 let maximum=0;for(let i=0;i<report.points.length-1;i++){const t=(report.points[i].time+report.points[i+1].time)/2,a=occultationSpatial(sample(t)),b=occultationSpatial(sampleOccultation(report.points,t)!);maximum=Math.max(maximum,Math.hypot(...a.map((n,k)=>n-b[k])));}
 expect(maximum).toBeLessThan(1);
});
