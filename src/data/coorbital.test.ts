import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {coorbitalTrackTimes,coorbitalPoint,coorbitalState,coorbitalNumbers,difference} from './coorbital';
import {AU_KM} from './catalog';
import {interpolateMonthlyChunk,type MonthlyChunk} from '../ephemeris/stateProvider';
import manifest from '../../public/data/coorbital/manifest.json';
const packs=manifest.chunks.map(d=>JSON.parse(readFileSync('public/data/coorbital/'+d.file,'utf8')) as MonthlyChunk);
const sample=(t:number)=>interpolateMonthlyChunk(packs[manifest.chunks.findIndex(d=>t>=d.startTdb&&t<=d.endTdb)],t,manifest.version);
it('ships complete geometric TDB packs with source and checksums',()=>{
 expect(manifest.bodyIds).toEqual(['sun','earth','kamo']);expect(manifest.chunks).toHaveLength(24);expect(manifest.aberration).toContain('NONE');
 manifest.chunks.forEach((d,i)=>{expect(createHash('sha256').update(readFileSync('public/data/coorbital/'+d.file)).digest('hex')).toBe(d.sha256);expect(sample(d.startTdb).states).toHaveLength(3);expect(sample(d.endTdb).states).toHaveLength(3);if(i)expect(d.startTdb).toBe(manifest.chunks[i-1].endTdb);});
});
it('rechecks omitted Horizons samples rather than trusting the generated error report',()=>{
 for(const source of manifest.targets){const raw=gunzipSync(readFileSync(source.rawFile));expect(createHash('sha256').update(raw).digest('hex')).toBe(source.rawSha256);
 const rows=raw.toString().split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');let max=0,count=0;
 for(let i=1;i<rows.length-1;i+=2){const p=rows[i].split(','),t=(Number(p[0])-2451545)*86400;if(t<manifest.startTdb||t>manifest.endTdb)continue;
 const truth=p.slice(2,8).map(Number),s=sample(t).states.find(s=>s.id===source.id)!;max=Math.max(max,Math.hypot(...s.position.map((v,j)=>v-truth[j])));expect(Math.hypot(...s.velocity.map((v,j)=>v-truth[j+3]))).toBeLessThan(1e-4);count++;}
 expect(count).toBeGreaterThan(2900);expect(max).toBeLessThan(1);
 }
});
it('transforms the same positions while preserving distances and separating velocity reference',()=>{
 for(const d of manifest.chunks){const b=sample(d.startTdb+10*86400),s=coorbitalState(b)!;
 expect(Math.hypot(...coorbitalPoint(b,'earth','coorbital-earth'))).toBe(0);expect(Math.hypot(...coorbitalPoint(b,'sun','coorbital-sun'))).toBe(0);
 const p=coorbitalPoint(b,'kamo','coorbital-earth'),trueD=Math.hypot(...difference(s.kamo.position,s.earth.position));expect(Math.hypot(...p)*AU_KM/8).toBeCloseTo(trueD,6);
 const sun=coorbitalPoint(b,'sun','coorbital-earth');expect(sun[0]).toBeLessThan(-7);expect(Math.abs(sun[2])).toBeLessThan(1e-12);
 expect(coorbitalNumbers(b)!.relativeKmS).toBe(Math.hypot(...difference(s.kamo.velocity,s.earth.velocity)));}
});
it('rejects stale, incomplete, nonfinite and incompatible states',()=>{
 const b=sample(manifest.startTdb);expect(coorbitalState(b,b.timeTdb+1)).toBeNull();expect(coorbitalState({...b,originId:'earth'})).toBeNull();expect(coorbitalState({...b,states:b.states.slice(1)})).toBeNull();expect(coorbitalState({...b,states:b.states.map(s=>({...s,position:[NaN,0,0]}))})).toBeNull();
});

it('keeps annual track endpoints inside supported data including the final instant',()=>{
 for(const t of [manifest.startTdb,manifest.endTdb-1,manifest.endTdb]){const {year,times}=coorbitalTrackTimes(t);expect([2026,2027]).toContain(year);expect(times.length).toBe(184);expect(times[0]).toBeGreaterThanOrEqual(manifest.startTdb);expect(times.at(-1)!).toBeLessThanOrEqual(manifest.endTdb);expect(times.every((v,i)=>i===0||v>times[i-1])).toBe(true);}
});
