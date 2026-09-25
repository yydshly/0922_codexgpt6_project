import {describe,it,expect} from 'vitest';
import {patroclusSystemState,appendPatroclusPrimary,patroclusLocal} from './patroclusSystem';
import type {StateBatch} from '../ephemeris/stateProvider';
const frame={time:100,positions:new Float64Array(30),velocities:new Float64Array(30)};
const batch:StateBatch={timeTdb:100,originId:'ssb',frame:'ECLIPJ2000',positionUnit:'km',velocityUnit:'km/s',sourceVersion:'horizons-patroclus-menoetius-test',states:[{id:'patroclus',position:[1e9,2e9,3e9],velocity:[1,2,3]},{id:'menoetius',position:[1e9+690,2e9,3e9],velocity:[1,2.1,3]}]};
describe('Patroclus primary identity and relative states',()=>{
 it('subtracts the primary in the same solution and keeps scientific input intact',()=>{
  const before=JSON.stringify(batch),s=patroclusSystemState(frame,batch)!;expect(s.separationKm).toBe(690);expect(s.speedKmS).toBeCloseTo(.1);expect(patroclusLocal([1,2,3])).toEqual([1,3,-2].map(v=>v*.13/56.5));expect(JSON.stringify(batch)).toBe(before);
 });
 it('rejects stale frames, wrong origins, other solutions and duplicate identities',()=>{
  expect(patroclusSystemState(frame,{...batch,timeTdb:101})).toBeNull();expect(patroclusSystemState(frame,{...batch,originId:'patroclus'})).toBeNull();expect(patroclusSystemState(frame,{...batch,sourceVersion:'latest-barycenter'})).toBeNull();expect(patroclusSystemState(frame,{...batch,states:[...batch.states,batch.states[0]]})).toBeNull();
 });
 it('only adds the primary to the heliocentric list and never invents a state on failure',()=>{
  const base={...batch,sourceVersion:'base',states:[{...batch.states[0],id:'other'}]};
  expect(appendPatroclusPrimary(frame,base,batch)?.states.map(s=>s.id)).toEqual(['other','patroclus']);
  expect(appendPatroclusPrimary(frame,base,null)).toBe(base);expect(appendPatroclusPrimary(frame,null,null)).toBeNull();
  expect(patroclusSystemState(frame,{...batch,states:[{...batch.states[0],position:[NaN,0,0]},batch.states[1]]})).toBeNull();
 });
});
