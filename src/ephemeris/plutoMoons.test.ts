import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import manifest from '../../public/data/pluto-moons/manifest.json';
import {interpolateMonthlyChunk,type MonthlyChunk} from './stateProvider';
import {PLUTO_MOON_IDS,plutoMoonStates} from '../data/plutoMoons';
import {macroBinaryState,BINARY_SCALE} from '../data/macroBinary';
const read=(file:string)=>readFileSync(new URL('../../public/data/pluto-moons/'+file,import.meta.url));
const packs=manifest.chunks.map(c=>JSON.parse(read(c.file).toString()) as MonthlyChunk);
const sample=(time:number)=>interpolateMonthlyChunk(packs[manifest.chunks.findIndex(c=>time>=c.startTdb&&time<=c.endTdb)],time,manifest.version);
describe('Pluto small-moon packaged ephemerides',()=>{
 it('matches identities, source hashes and every packaged chunk',()=>{
  expect(manifest.bodyIds).toEqual([...PLUTO_MOON_IDS]);expect(manifest.chunks).toHaveLength(24);
  for(const c of manifest.chunks){const data=read(c.file);expect(data.length).toBe(c.bytes);expect(createHash('sha256').update(data).digest('hex')).toBe(c.sha256);}
  for(const target of manifest.targets){const raw=gunzipSync(readFileSync(target.rawFile));expect(createHash('sha256').update(raw).digest('hex')).toBe(target.rawSha256);expect(raw.toString()).toContain(target.targetSource);}
 });
 it('validates the browser interpolator against all unpublished three-hour checkpoints',()=>{
  for(const target of manifest.targets){
   const rows=gunzipSync(readFileSync(target.rawFile)).toString().split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');let count=0,position=0,velocity=0;
   rows.forEach((line,i)=>{if(i%2===0)return;const p=line.split(','),time=(Number(p[0])-2451545)*86400;if(time<manifest.startTdb||time>manifest.endTdb)return;const state=sample(time).states.find(s=>s.id===target.id)!;
    position=Math.max(position,Math.hypot(...state.position.map((v,k)=>v-Number(p[2+k]))));velocity=Math.max(velocity,Math.hypot(...state.velocity.map((v,k)=>v-Number(p[5+k]))));count++;
   });expect(count).toBeGreaterThan(2900);expect(position).toBeLessThan(1);expect(velocity).toBeLessThan(1e-4);
  }
 });
 it('has continuous monthly boundaries and covers both endpoints',()=>{
  expect(sample(manifest.startTdb).states).toHaveLength(4);expect(sample(manifest.endTdb).states).toHaveLength(4);
  for(let i=0;i<packs.length-1;i++){const time=manifest.chunks[i].endTdb,a=interpolateMonthlyChunk(packs[i],time,'a'),b=interpolateMonthlyChunk(packs[i+1],time,'b');a.states.forEach((state,j)=>expect(Math.hypot(...state.position.map((v,k)=>v-b.states[j].position[k]))).toBeLessThan(1e-5));}
 });
 it('subtracts a same-epoch SSB centre, never accepts stale or duplicate moon states',()=>{
  const time=manifest.startTdb,moons=sample(time),dwarfs=JSON.parse(readFileSync('public/data/dwarfs/2026-01.json','utf8'));
  const frame={time,positions:new Float64Array(30),velocities:new Float64Array(30)};
  const binary=macroBinaryState(frame,interpolateMonthlyChunk(dwarfs,time,'dwarfs'))!;
  const before=JSON.stringify(moons),states=plutoMoonStates(binary,moons);expect(states).toHaveLength(4);
  for(const s of states){expect(s.distanceKm).toBeGreaterThan(35000);expect(s.distanceKm).toBeLessThan(75000);expect(Math.hypot(...s.local)/BINARY_SCALE).toBeCloseTo(s.centerDistanceKm,5);}
  expect(plutoMoonStates(binary,{...moons,timeTdb:time+1})).toEqual([]);expect(plutoMoonStates(binary,{...moons,originId:'pluto'})).toEqual([]);expect(plutoMoonStates(binary,{...moons,states:[...moons.states,moons.states[0]]})).toEqual([]);expect(JSON.stringify(moons)).toBe(before);
 });
});
