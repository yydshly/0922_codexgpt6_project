import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import manifest from '../../public/data/borisov/manifest.json';
import chunk from '../../public/data/borisov/states.json';
import {interpolateMonthlyChunk} from './stateProvider';
import {historicalHeliocentric,historicalDisplay} from './borisov';
import {utcToTdb,tdbToUtc,AU_KM} from '../data/time';
import {BODIES} from '../data/catalog';
import {NEW_MEMBER_IDS} from '../data/regionMembers';
import {COMETS} from './comets';
const sample=(t:number)=>interpolateMonthlyChunk(chunk,t,manifest.version);
describe('historical interstellar visitor',()=>{
 it('archives geometric SSB states and keeps the historical identity out of current packs',()=>{
  expect(manifest.historical).toBe(true);expect(manifest.bodyIds).toEqual(['sun','earth','borisov']);
  expect(manifest.aberration).toContain('NONE');expect([...NEW_MEMBER_IDS,...COMETS.map(c=>c.id)]).not.toContain('borisov');
  for(const c of manifest.chunks){const bytes=readFileSync(`public/data/borisov/${c.file}`);expect(bytes.length).toBe(c.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(c.sha256);}
  for(const target of manifest.targets){const bytes=gunzipSync(readFileSync(target.rawFile));expect(createHash('sha256').update(bytes).digest('hex')).toBe(target.rawSha256);expect(bytes.toString()).toContain(target.targetSource);}
 });
 it('validates all withheld source samples with the browser interpolator',()=>{
  for(const target of manifest.targets){const raw=gunzipSync(readFileSync(target.rawFile)).toString();const lines=raw.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');let count=0,maxP=0,maxV=0;
   lines.forEach((line,index)=>{if(index%2===0)return;const parts=line.split(','),t=(Number(parts[0])-2451545)*86400;if(t<manifest.startTdb||t>manifest.endTdb)return;
    const s=sample(t).states.find(s=>s.id===target.id)!;maxP=Math.max(maxP,Math.hypot(...s.position.map((v,i)=>v-Number(parts[i+2]))));maxV=Math.max(maxV,Math.hypot(...s.velocity.map((v,i)=>v-Number(parts[i+5]))));count++;
   });expect(count).toBeGreaterThan(1000);expect(maxP).toBeLessThan(1);expect(maxV).toBeLessThan(1e-4);
  }
 });
 it('preserves height and distances, subtracts same-epoch Sun and shows an unbound open passage',()=>{
  const visits=[manifest.startTdb,utcToTdb(new Date('2019-12-08T00:00:00Z')),manifest.endTdb].map(t=>{
   const b=sample(t),relative=historicalHeliocentric(b),sun=b.states[0],original=b.states[2],s=relative.find(s=>s.id==='borisov')!;
   expect(s.position).toEqual(original.position.map((v,i)=>v-sun.position[i]));expect(s.velocity).toEqual(original.velocity.map((v,i)=>v-sun.velocity[i]));
   expect(Math.hypot(...historicalDisplay(s.position))*AU_KM).toBeCloseTo(Math.hypot(...s.position),5);
   expect(historicalDisplay(s.position)[1]).toBe(s.position[2]/AU_KM);
   expect(Math.hypot(...s.velocity)**2/2-BODIES[0].gm/Math.hypot(...s.position)).toBeGreaterThan(0);return s;
  });expect(Math.hypot(...visits[1].position)).toBeLessThan(Math.hypot(...visits[0].position));expect(Math.hypot(...visits[1].position)).toBeLessThan(Math.hypot(...visits[2].position));
  expect(Math.sign(visits[0].position[2])).not.toBe(Math.sign(visits[2].position[2]));
  expect(()=>historicalHeliocentric({...sample(manifest.startTdb),originId:'earth'})).toThrow();
 });
 it('covers both endpoints and converts historical UTC/Beijing dates without changing the global range',()=>{
  expect(tdbToUtc(manifest.startTdb).toISOString()).toBe('2019-09-01T00:00:00.000Z');expect(tdbToUtc(manifest.endTdb).toISOString()).toBe('2020-06-01T00:00:00.000Z');
  const date=new Date('2019-12-08T08:00:00+08:00');expect(tdbToUtc(utcToTdb(date)).getTime()).toBe(date.getTime());
  expect(sample(manifest.startTdb).states.length).toBe(3);expect(sample(manifest.endTdb).states.length).toBe(3);
  expect(()=>sample(utcToTdb(new Date('2026-09-24T00:00:00Z')))).toThrow();
 });
});
