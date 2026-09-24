import {describe,it,expect} from 'vitest';
import {BODY_IDS,type StateFrame} from '../types';
import {macroMoonStates,familyLocalPosition} from './macroFamilies';
import {SATELLITES} from './satellites';
import {satelliteDisplayPosition} from '../components/SatelliteSystem';
import {bodyById} from './catalog';
import {familyPlanetRadius} from './macroFamilies';
describe('macro family scientific state and display mapping',()=>{
 it('derives the Moon relative to Earth without modifying the barycentric input',()=>{
  const frame:StateFrame={time:123,positions:new Float64Array(30),velocities:new Float64Array(30)};
  const earth=BODY_IDS.indexOf('earth')*3,moon=BODY_IDS.indexOf('moon')*3;
  frame.positions.set([1e8,2e8,3e8],earth);frame.positions.set([1e8+384000,2e8-900,3e8+15000],moon);
  frame.velocities.set([30,4,2],earth);frame.velocities.set([29,5,2.5],moon);
  const copy=frame.positions.slice(),[state]=macroMoonStates(frame,[]);
  expect(state.position).toEqual([384000,-900,15000]);expect(state.velocity).toEqual([-1,1,.5]);expect(state.parentId).toBe('earth');expect(frame.positions).toEqual(copy);
 });
 it('retains parent-centered extension states and withholds all bodies without a matching main frame',()=>{
  const satellite={...SATELLITES[0],position:[1,2,3] as [number,number,number],velocity:[4,5,6] as [number,number,number]};
  expect(macroMoonStates(null,[satellite])).toEqual([]);
  const result=macroMoonStates({time:0,positions:new Float64Array(30),velocities:new Float64Array(30)},[satellite]);
  expect(result[1]).toMatchObject(satellite);expect(result[1]).not.toBe(satellite);
 });
 it('maps scientific height to scene Y, keeps direction, and preserves radial ordering',()=>{
  const v:[number,number,number]=[3e5,4e5,5e5],p=familyLocalPosition(v,'earth');
  expect(p[0]/p[1]).toBeCloseTo(3/5);expect(p[2]/p[1]).toBeCloseTo(-4/5);
  expect(Math.hypot(...familyLocalPosition(v.map(n=>n*2) as typeof v,'earth'))).toBeGreaterThan(Math.hypot(...p));expect(familyLocalPosition([0,0,0],'earth')).toEqual([0,0,0]);
 });
 it('uses the same mapping for satellite points and the existing reference ellipse renderer',()=>{
  for(const id of ['earth','mars','jupiter','saturn','uranus','neptune'] as const){
   const v:[number,number,number]=[1e6,-2e5,3e5];
   const expected=satelliteDisplayPosition(v,bodyById[id].radiusKm,false).multiplyScalar(familyPlanetRadius(id)/(bodyById[id].radiusKm/20000)).toArray();
   familyLocalPosition(v,id).forEach((value,i)=>expect(value).toBeCloseTo(expected[i],12));
  }
 });
});
