import {describe,it,expect} from 'vitest';
import {erisSystemState,replaceErisPrimary,erisLocal} from './erisSystem';
import type {StateBatch} from '../ephemeris/stateProvider';
const frame={time:100,positions:new Float64Array(30),velocities:new Float64Array(30)};
const batch:StateBatch={timeTdb:100,originId:'ssb',frame:'ECLIPJ2000',positionUnit:'km',velocityUnit:'km/s',sourceVersion:'horizons-eris-dysnomia-test',states:[{id:'eris',position:[1e9,2e9,3e9],velocity:[1,2,3]},{id:'dysnomia',position:[1e9+37000,2e9,3e9],velocity:[1,2.1,3]}]};
describe('Eris primary identity and relative states',()=>{
 it('subtracts the primary in the same solution and keeps scientific input intact',()=>{
  const before=JSON.stringify(batch),s=erisSystemState(frame,batch)!;expect(s.separationKm).toBe(37000);expect(s.speedKmS).toBeCloseTo(.1);expect(erisLocal([1,2,3])).toEqual([1,3,-2].map(v=>v*.13/1163));expect(JSON.stringify(batch)).toBe(before);
 });
 it('rejects stale frames, wrong origins, other solutions and duplicate identities',()=>{
  expect(erisSystemState(frame,{...batch,timeTdb:101})).toBeNull();expect(erisSystemState(frame,{...batch,originId:'eris'})).toBeNull();expect(erisSystemState(frame,{...batch,sourceVersion:'latest-barycenter'})).toBeNull();expect(erisSystemState(frame,{...batch,states:[...batch.states,batch.states[0]]})).toBeNull();
 });
 it('replaces the old barycenter marker once and never revives it on failed loading',()=>{
  const old={...batch,sourceVersion:'old',states:[{...batch.states[0],position:[9,9,9] as [number,number,number]}]};
  expect(replaceErisPrimary(frame,old,batch)?.states).toEqual([batch.states[0]]);
  expect(replaceErisPrimary(frame,old,null)?.states).toEqual([]);expect(old.states[0].position).toEqual([9,9,9]);
 });
});
