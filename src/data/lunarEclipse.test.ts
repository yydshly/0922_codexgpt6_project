import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BODY_IDS,type StateFrame} from '../types';
import {interpolateChunk} from '../ephemeris/ephemeris';
import {LUNAR_REFERENCE_TDB,LUNAR_START,LUNAR_END,ttCalendarToTdb,lunarShadow,lunarStage,minimumShadowAxis,inLunarWindow} from './lunarEclipse';
import {tdbToUtc,tdbMinusTt,J2000_UNIX_MS} from './time';
import report from '../../public/data/events/lunar-2026-03-03.json';
const raw=readFileSync('public/data/2026-03.json'),chunk=JSON.parse(raw.toString()),sample=(t:number)=>interpolateChunk(chunk,t);
it('keeps source TT separate from legacy UT estimates and project UTC',()=>{
 expect(Math.abs((LUNAR_REFERENCE_TDB-tdbMinusTt(LUNAR_REFERENCE_TDB))*1000+J2000_UNIX_MS-Date.parse('2026-03-03T11:34:52.100Z'))).toBeLessThan(.01);
 expect(tdbToUtc(LUNAR_REFERENCE_TDB).toISOString()).toBe('2026-03-03T11:33:42.916Z');expect(ttCalendarToTdb('2026-03-03T11:34:52.100Z')).toBe(LUNAR_REFERENCE_TDB);
 expect(inLunarWindow(LUNAR_START)).toBe(true);expect(inLunarWindow(LUNAR_END)).toBe(true);expect(inLunarWindow(LUNAR_END+1)).toBe(false);
});
it('classifies the whole lunar disc, not only its center',()=>{
 expect(lunarStage(-1,0,5,8,1)).toBe('背日侧之外');expect(lunarStage(10,9,5,8,1)).toBe('无食');expect(lunarStage(10,7,5,8,1)).toBe('半影月食');expect(lunarStage(10,4.5,5,8,1)).toBe('月偏食');expect(lunarStage(10,4,5,8,1)).toBe('月全食');expect(lunarStage(10,0,-1,8,1)).toBe('半影月食');
});
it('uses same-frame geometry with orthogonal projected axes and decreasing umbra',()=>{
 const f=sample(LUNAR_REFERENCE_TDB),g=lunarShadow(f)!;expect(Math.hypot(...g.point)).toBeCloseTo(g.offsetKm,8);expect(g.stage).toBe('月全食');expect(g.umbraKm).toBeLessThan(6371.01);expect(g.penumbraKm).toBeGreaterThan(6371.01);
 const shift=f.positions.map((v,i)=>v+[2e6,-3e6,8e6][i%3]);expect(lunarShadow({...f,positions:shift})!.offsetKm).toBeCloseTo(g.offsetKm,6);
 expect(lunarShadow(null)).toBeNull();expect(lunarShadow({...f,positions:new Float64Array(2)})).toBeNull();
 const pole:StateFrame={time:0,positions:new Float64Array(BODY_IDS.length*3),velocities:new Float64Array(BODY_IDS.length*3)};pole.positions[2]=-149597870.7;pole.positions[BODY_IDS.indexOf('moon')*3+2]=384400;expect(lunarShadow(pole)!.point.every(Number.isFinite)).toBe(true);
});
it('reproduces the independent-reference difference without tuning the model to match',()=>{
 expect(createHash('sha256').update(raw).digest('hex')).toBe(report.input.sha256);
 const t=minimumShadowAxis(sample),g=lunarShadow(sample(t))!;expect(t).toBeCloseTo(report.model.minimumTdb,3);expect(t-LUNAR_REFERENCE_TDB).toBeGreaterThan(35);expect(t-LUNAR_REFERENCE_TDB).toBeLessThan(41);
 expect(g.magnitude).toBeCloseTo(report.model.magnitude,7);expect(g.magnitude).toBeLessThan(report.reference.umbralMagnitude);
 expect(lunarShadow(sample(t-60))!.offsetKm).toBeGreaterThan(g.offsetKm);expect(lunarShadow(sample(t+60))!.offsetKm).toBeGreaterThan(g.offsetKm);
 expect([-4,-2,-1,0,1,2,4].map(h=>lunarShadow(sample(LUNAR_REFERENCE_TDB+h*3600))!.stage)).toEqual(['无食','半影月食','月偏食','月全食','月偏食','半影月食','无食']);
 report.curve.forEach(p=>{const value=lunarShadow(sample(p.time))!;expect(value.offsetKm).toBeCloseTo(p.offsetKm,7);expect(value.stage).toBe(p.stage);});
});
