import {describe,it,expect} from 'vitest';
import {macroBinaryState,BINARY_SCALE,binaryLocal} from './macroBinary';
import {PLUTO_GM,CHARON_GM} from '../components/dwarfOrbit';
import {dynamicDwarfById} from './dwarfs';
import type {StateBatch} from '../ephemeris/stateProvider';
import type {StateFrame} from '../types';
const frame:StateFrame={time:100,positions:new Float64Array(30),velocities:new Float64Array(30)};
const makeBatch=():StateBatch=>({timeTdb:100,originId:'ssb',frame:'ECLIPJ2000',positionUnit:'km',velocityUnit:'km/s',sourceVersion:'test',states:[{id:'pluto',position:[1e9,2e9,3e9],velocity:[1,2,3]},{id:'charon',position:[1e9+19600,2e9,3e9],velocity:[1,2.22,3]}]});
describe('macro Pluto–Charon binary',()=>{
 it('rejects missing, stale or incompatible states instead of fabricating a second body',()=>{
  const b=makeBatch();expect(macroBinaryState(null,b)).toBeNull();expect(macroBinaryState(frame,null)).toBeNull();
  expect(macroBinaryState(frame,{...b,timeTdb:101})).toBeNull();expect(macroBinaryState(frame,{...b,originId:'pluto'})).toBeNull();
  expect(macroBinaryState(frame,{...b,states:[b.states[0]]})).toBeNull();b.states[1].position[0]=NaN;expect(macroBinaryState(frame,b)).toBeNull();
 });
 it('places both bodies about the GM-weighted center outside Pluto and preserves input',()=>{
  const b=makeBatch(),before=JSON.stringify(b),s=macroBinaryState(frame,b)!;
  expect(s.separation).toBe(19600);expect(s.speed).toBeCloseTo(.22);expect(s.centerFromPluto).toBeGreaterThan(dynamicDwarfById.pluto.radiusKm);
  for(let i=0;i<3;i++)expect(s.plutoLocal[i]*PLUTO_GM+s.charonLocal[i]*CHARON_GM).toBeCloseTo(0,4);
  expect(s.plutoLocal[0]).toBeLessThan(0);expect(s.charonLocal[0]).toBeGreaterThan(0);expect(JSON.stringify(b)).toBe(before);
 });
 it('keeps one local scale for physical radii, separation and vertical coordinates',()=>{
  const s=macroBinaryState(frame,makeBatch())!;
  const distance=Math.hypot(...s.charonLocal.map((v,i)=>v-s.plutoLocal[i]));
  expect(distance/(dynamicDwarfById.pluto.radiusKm*BINARY_SCALE)).toBeCloseTo(s.separation/dynamicDwarfById.pluto.radiusKm);
  expect(binaryLocal([1,2,3])).toEqual([BINARY_SCALE,3*BINARY_SCALE,-2*BINARY_SCALE]);
 });
 it('follows the Sun-relative macro anchor without changing the local binary when translated',()=>{
  const b=makeBatch(),s=macroBinaryState(frame,b)!;
  for(const body of b.states)body.position[0]+=1e9;
  const moved=macroBinaryState(frame,b)!;expect(moved.anchor).not.toEqual(s.anchor);expect(moved.separation).toBe(s.separation);
  moved.plutoLocal.forEach((v,i)=>expect(v).toBeCloseTo(s.plutoLocal[i],6));
 });
});
