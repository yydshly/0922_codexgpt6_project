import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BODY_IDS,type StateFrame,type Vec3} from '../types';
import {bodyById} from './catalog';
import {interpolateChunk} from '../ephemeris/ephemeris';
import {SOLAR_REFERENCE_TDB,SOLAR_START,SOLAR_END,solarShadow,solarSurfaceZone,minimumSolarAxis,inSolarWindow} from './solarEclipse';
import {tdbToUtc,tdbMinusTt,J2000_UNIX_MS} from './time';
import {eclipseCase} from './eclipseCases';
import report from '../../public/data/events/solar-2026-08-12.json';
const raw=readFileSync('public/data/2026-08.json'),chunk=JSON.parse(raw.toString()),sample=(t:number)=>interpolateChunk(chunk,t);
const synthetic=(distance:number,offset=0):StateFrame=>{const f={time:0,positions:new Float64Array(BODY_IDS.length*3),velocities:new Float64Array(BODY_IDS.length*3)};f.positions.set([-149597870.7,0,0],BODY_IDS.indexOf('sun')*3);f.positions.set([distance,offset,0],BODY_IDS.indexOf('earth')*3);return f;};
it('keeps TT, UTC and each event playback window distinct',()=>{
 expect(Math.abs((SOLAR_REFERENCE_TDB-tdbMinusTt(SOLAR_REFERENCE_TDB))*1000+J2000_UNIX_MS-Date.parse('2026-08-12T17:47:05.200Z'))).toBeLessThan(.01);
 expect(tdbToUtc(SOLAR_REFERENCE_TDB).toISOString()).toBe('2026-08-12T17:45:56.016Z');
 expect(inSolarWindow(SOLAR_START)).toBe(true);expect(inSolarWindow(SOLAR_END)).toBe(true);expect(inSolarWindow(SOLAR_END+1)).toBe(false);
 expect(eclipseCase('solar-eclipse')?.reference).toBe(SOLAR_REFERENCE_TDB);expect(eclipseCase('lunar-eclipse')?.reference).not.toBe(SOLAR_REFERENCE_TDB);expect(eclipseCase('earth-spin')).toBeNull();
});
it('distinguishes total, annular, partial and night-side points on the sphere',()=>{
 const R=bodyById.earth.radiusKm,total=solarShadow(synthetic(360000))!,annular=solarShadow(synthetic(410000))!;
 expect(solarSurfaceZone(total,[0,0,-R])).toBe('全食区');expect(solarSurfaceZone(annular,[0,0,-R])).toBe('环食区');
 expect(solarSurfaceZone(total,[1000,0,-Math.sqrt(R*R-1000000)])).toBe('偏食区');expect(solarSurfaceZone(total,[5000,0,-Math.sqrt(R*R-25000000)])).toBe('无食');expect(solarSurfaceZone(total,[0,0,R])).toBe('夜侧');
 expect(solarShadow(synthetic(360000,R+500))!.axisHits).toBe(false);expect(solarShadow(synthetic(360000,R+500))!.penumbraTouches).toBe(true);expect(solarShadow(synthetic(360000,20000))!.penumbraTouches).toBe(false);
 // Near-side surface has a different cone radius from the Earth-center plane.
 expect(total.surfaceUmbraKm).toBeGreaterThan(total.umbraKm);expect(total.entryZ).toBe(-R);
});
it('matches an independent angular-disc calculation for daylight sphere points',()=>{
 const R=bodyById.earth.radiusKm,D=149597870.7;
 for(const distance of [360000,410000]){const g=solarShadow(synthetic(distance))!;
 for(const transverse of [0,20,70,150,500,2000,3300,4500]){const z=-Math.sqrt(R*R-transverse*transverse),p:Vec3=[transverse,0,z];
  const sun:Vec3=[-D-distance-z,-transverse,0],moon:Vec3=[-distance-z,-transverse,0];const ds=Math.hypot(...sun),dm=Math.hypot(...moon),a=Math.asin(bodyById.sun.radiusKm/ds),b=Math.asin(bodyById.moon.radiusKm/dm),sep=Math.acos(Math.min(1,sun.reduce((v,n,i)=>v+n*moon[i],0)/ds/dm));
  const expected=sep>=a+b?'无食':sep<Math.abs(a-b)?b>a?'全食区':'环食区':'偏食区';expect(solarSurfaceZone(g,p)).toBe(expected);
 }}
});
it('handles translation, invalid inputs and a polar shadow axis',()=>{
 const f=sample(SOLAR_REFERENCE_TDB),g=solarShadow(f)!;expect(Math.hypot(...g.point)).toBeCloseTo(g.offsetKm,8);
 const positions=f.positions.map((v,i)=>v+[2e6,-3e6,8e6][i%3]);expect(solarShadow({...f,positions})!.offsetKm).toBeCloseTo(g.offsetKm,6);
 expect(solarShadow(null)).toBeNull();expect(solarShadow({...f,positions:new Float64Array(2)})).toBeNull();const bad=f.positions.slice();bad[0]=NaN;expect(solarShadow({...f,positions:bad})).toBeNull();
 const pole=synthetic(360000);pole.positions.fill(0);pole.positions[BODY_IDS.indexOf('sun')*3+2]=-149597870.7;pole.positions[BODY_IDS.indexOf('earth')*3+2]=360000;expect(solarShadow(pole)!.point.every(Number.isFinite)).toBe(true);
});
it('reproduces the source comparison and all report samples without fitting the reference time',()=>{
 expect(createHash('sha256').update(raw).digest('hex')).toBe(report.input.sha256);const t=minimumSolarAxis(sample),g=solarShadow(sample(t))!;
 expect(t).toBeCloseTo(report.model.minimumTdb,3);expect(t-SOLAR_REFERENCE_TDB).toBeGreaterThan(30);expect(t-SOLAR_REFERENCE_TDB).toBeLessThan(40);expect(g.surfaceUmbraKm).toBeCloseTo(report.model.surfaceUmbraKm!,6);
 expect(g.axisHits).toBe(true);expect(solarSurfaceZone(g,[g.point[0],g.point[1],g.entryZ!])).toBe('全食区');expect(solarShadow(sample(t-60))!.offsetKm).toBeGreaterThan(g.offsetKm);expect(solarShadow(sample(t+60))!.offsetKm).toBeGreaterThan(g.offsetKm);
 expect(solarShadow(sample(SOLAR_START))!.penumbraTouches).toBe(false);expect(solarShadow(sample(SOLAR_END))!.penumbraTouches).toBe(false);
 report.curve.forEach(p=>{const s=solarShadow(sample(p.time))!;expect(s.offsetKm).toBeCloseTo(p.offsetKm,7);expect(s.axisHits).toBe(p.axisHits);expect(s.penumbraTouches).toBe(p.penumbraTouches);});
});
