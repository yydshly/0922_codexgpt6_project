import {describe,it,expect} from 'vitest';
import {BODY_IDS,type StateFrame,type BodyId} from '../types';
import {AU_KM,bodyById} from './catalog';
import {centerDistance,distancePair,solarDistanceRows} from './distanceComparison';
const frame=():StateFrame=>({time:850000000,positions:new Float64Array(30),velocities:new Float64Array(30)});
function put(f:StateFrame,id:BodyId,p:number[]){f.positions.set(p,BODY_IDS.indexOf(id)*3);}
describe('distance comparison in scientific coordinates',()=>{
 it('uses the 3D separation, invariant under shared translation and rotation',()=>{
  const f=frame();put(f,'earth',[10,20,30]);put(f,'moon',[13,24,42]);
  expect(centerDistance(f,'earth','moon')).toBe(13);
  for(let i=0;i<30;i+=3){const [x,y,z]=f.positions.slice(i,i+3);f.positions.set([-y+200,x-500,z+1000],i);}
  expect(centerDistance(f,'earth','moon')).toBe(13);
  expect(centerDistance(f,'moon','earth')).toBe(13);
 });
 it('converts km to AU and does not substitute the difference of solar radii',()=>{
  const f=frame();put(f,'earth',[AU_KM,0,0]);put(f,'mars',[-AU_KM,0,0]);
  expect(distancePair(f,'earth','mars')!.au).toBe(2);
  put(f,'moon',[AU_KM,384400,0]);const pair=distancePair(f,'earth','moon')!;
  expect(pair.km).toBe(384400);expect(pair.diameters).toBeCloseTo(384400/(2*bodyById['earth'].radiusKm),10);
 });
 it('keeps radius and center distance in one scale for all 90 distinct pairs without pixel floors',()=>{
  const f=frame();BODY_IDS.forEach((id,i)=>put(f,id,[i*AU_KM,i*i*AU_KM,0]));
  for(const a of BODY_IDS)for(const b of BODY_IDS)if(a!==b){const p=distancePair(f,a,b)!;
   expect((p.x[1]-p.x[0])/(p.radii[0]*2)).toBeCloseTo(p.diameters,6);
   expect(p.radii[0]/p.radii[1]).toBeCloseTo(bodyById[a].radiusKm/bodyById[b].radiusKm,8);
   expect(p.x[0]-p.radii[0]).toBeGreaterThanOrEqual(39.99999);expect(p.x[1]+p.radii[1]).toBeLessThanOrEqual(760.00001);
   expect(Math.max(...p.radii)).toBeLessThanOrEqual(45);
  }
  expect(distancePair(f,'sun','neptune')!.radii[1]).toBeLessThan(.01);
 });
 it('normalizes both solar charts to a common endpoint and preserves linear ratios',()=>{
  const f=frame();BODY_IDS.forEach((id,i)=>put(f,id,[i*AU_KM,0,0]));
  const s=solarDistanceRows(f)!;expect(s.rows).toHaveLength(8);expect(s.maxAu).toBe(9);
  const earth=s.rows.find(r=>r.body.id==='earth')!,neptune=s.rows.find(r=>r.body.id==='neptune')!;
  expect(earth.linear).toBeCloseTo(1/3);expect(earth.compressed).toBeCloseTo(Math.log10(4),10);
  expect(earth.compressed).toBeGreaterThan(earth.linear);expect(neptune.linear).toBe(1);expect(neptune.compressed).toBe(1);
 });
 it('does not present missing, coincident or invalid positions as zero distance',()=>{
  const f=frame();expect(distancePair(null,'earth','moon')).toBeNull();expect(centerDistance(f,'earth','earth')).toBeNull();
  expect(centerDistance(f,'earth','moon')).toBeNull();put(f,'moon',[NaN,1,2]);expect(centerDistance(f,'earth','moon')).toBeNull();
  expect(solarDistanceRows(f)).toBeNull();f.time=NaN;expect(centerDistance(f,'sun','earth')).toBeNull();
 });
});
