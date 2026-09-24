import { describe,it,expect } from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {R01_PARAMETERS,R01_ATLAS} from '../data/r01Members';
import {memberRelation} from './memberRelation';
import {interpolateChunk,type EphemerisChunk} from './ephemeris';
import {interpolateMonthlyChunk,type MonthlyChunk} from './stateProvider';
import {heliocentricComets} from './cometState';
import manifest from '../../public/data/small-bodies/manifest.json';
import {AU_KM,BODIES} from '../data/catalog';
import type {StateFrame} from '../types';
const read=(p:string)=>readFileSync(p,'utf8');
describe('R01 metadata and relative geometry',()=>{
 it('preserves numbered identities, orbit classes and the cited physical parameters',()=>{
  for(const [index,row] of R01_PARAMETERS.entries()){
   const raw=read(row.snapshotFile),source=JSON.parse(raw);
   expect(createHash('sha256').update(raw).digest('hex')).toBe(row.rawSha256);
   expect(source.object.des).toBe(row.number);
   expect(source.object.orbit_class.code).toBe(['AMO','TJN','TJN','CEN'][index]);
   expect(row.diameter).toEqual(source.phys_par.find((p:{name:string})=>p.name==='diameter'));
   expect(row.rotation).toEqual(source.phys_par.find((p:{name:string})=>p.name==='rot_per'));
   const atlas=R01_ATLAS.find(b=>b.id===row.id)!;
   if(atlas.radiusKm!==null)expect(atlas.radiusKm*2).toBeCloseTo(Number(row.diameter.value),6);
  }
 });
 it('uses three-dimensional distance and a signed projected longitude, invariant to SSB translation',()=>{
  const frame:StateFrame={time:0,positions:new Float64Array(30),velocities:new Float64Array(30)};
  const j=BODIES.findIndex(b=>b.id==='jupiter')*3;
  frame.positions.set([AU_KM,0,0],j);
  const state={id:'test',position:[0,AU_KM,AU_KM] as [number,number,number],velocity:[0,0,0] as [number,number,number]};
  expect(memberRelation(state,frame,'jupiter').distanceAu).toBeCloseTo(Math.sqrt(3));
  expect(memberRelation(state,frame,'jupiter').longitudeDegrees).toBeCloseTo(90);
  for(let n=0;n<30;n++)frame.positions[n]+=[100,-30,5][n%3];
  expect(memberRelation(state,frame,'jupiter').longitudeDegrees).toBeCloseTo(90);
  expect(memberRelation({...state,position:[0,-AU_KM,0]},frame,'jupiter').longitudeDegrees).toBeCloseTo(-90);
 });
 it('cross-checks L4/L5 geometry against the real Jupiter at monthly epochs, not fixed +/-60 degree markers',()=>{
  const angles:number[]=[];
  for(const chunk of manifest.chunks){
   const time=chunk.startTdb;
   const frame=interpolateChunk(JSON.parse(read('public/data/'+chunk.file)) as EphemerisChunk,time);
   const batch=interpolateMonthlyChunk(JSON.parse(read('public/data/small-bodies/'+chunk.file)) as MonthlyChunk,time,manifest.version);
   const states=heliocentricComets(frame,batch);
   const ahead=memberRelation(states.find(s=>s.id==='achilles')!,frame,'jupiter');
   const behind=memberRelation(states.find(s=>s.id==='aneas')!,frame,'jupiter');
   expect(ahead.longitudeDegrees).toBeGreaterThan(0);expect(ahead.longitudeDegrees).toBeLessThan(120);
   expect(behind.longitudeDegrees).toBeLessThan(0);expect(behind.longitudeDegrees).toBeGreaterThan(-120);
   expect(memberRelation(states.find(s=>s.id==='eros')!,frame,'earth').distanceAu).toBeGreaterThan(0);
   angles.push(ahead.longitudeDegrees);
  }
  expect(Math.max(...angles)-Math.min(...angles)).toBeGreaterThan(.1);
 });
});
