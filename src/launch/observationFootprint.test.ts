import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EARTH_RADII, observationFootprint, rayEllipsoid } from './observationFootprint';
import { geodeticToFixed } from './coordinates';
import { add, dot, norm, scale, unit, type V3 } from './ascent';
import { createObservationFootprintView } from './observationFootprintView';
import type { FlightState } from './liftoff';

describe('assumed nadir field of view on the Earth ellipsoid',()=>{
 it('agrees with an independent spherical analytic footprint, including a non-tiny angle',()=>{
  const R=6371000,h=400000,radii:V3=[R,R,R];
  for(const full of [6,20,40]){
   const result=observationFootprint([R+h,0,0],full,96,radii);expect(result.valid).toBe(true);if(!result.valid)return;
   const half=full*Math.PI/360,beta=Math.asin((R+h)/R*Math.sin(half))-half;
   expect(result.maxChordM).toBeCloseTo(2*R*Math.sin(beta),5);expect(result.center[0]).toBeCloseTo(R,6);
  }
 });
 it('keeps every boundary point on WGS84, within the specified cone, across poles and date line',()=>{
  for(const [lat,lon]of [[0,0],[28.5,-80.6],[89.99,179.99],[-90,0],[45,-179.99]]){
   const position=geodeticToFixed({latitudeDeg:lat,longitudeDeg:lon,altitudeM:400000}).toArray() as V3;
   const result=observationFootprint(position,40);expect(result.valid).toBe(true);if(!result.valid)return;
   for(const p of result.boundary){expect(p.reduce((s,v,i)=>s+(v/EARTH_RADII[i])**2,0)).toBeCloseTo(1,11);expect(dot(unit(add(p,scale(position,-1))),result.axis)).toBeCloseTo(Math.cos(20*Math.PI/180),10);}
   expect(result.heightM).toBeCloseTo(400000,3);
  }
 });
 it('widens with angle and altitude without changing the input state',()=>{
  const fixed:V3=[EARTH_RADII[0]+400000,0,0],old=[...fixed];
  const spans=[6,20,40].map(a=>{const p=observationFootprint(fixed,a);return p.valid?p.maxChordM:NaN;});
  expect(spans[0]).toBeLessThan(spans[1]);expect(spans[1]).toBeLessThan(spans[2]);
  const higher=observationFootprint([EARTH_RADII[0]+800000,0,0],20);expect(higher.valid&&higher.maxChordM>spans[1]).toBe(true);expect(fixed).toEqual(old);
 });
 it('refuses invalid or horizon-clipped footprints rather than inventing a filled area',()=>{
  const p:V3=[EARTH_RADII[0]+400000,0,0];
  for(const angle of [0,-20,180,NaN])expect(observationFootprint(p,angle).valid).toBe(false);
  expect(observationFootprint([0,0,0],20).valid).toBe(false);expect(observationFootprint(p,20,95).valid).toBe(false);
  expect(observationFootprint([EARTH_RADII[0]*3,0,0],40).valid).toBe(false);
  expect(rayEllipsoid(p,[1,0,0])).toBeNull();expect(rayEllipsoid(p,[0,0,0])).toBeNull();
 });
 it('selects the near, forward surface intersection',()=>{
  const R=EARTH_RADII[0];expect(rayEllipsoid([R+400000,0,0],[-2,0,0])?.[0]).toBeCloseTo(R,6);
  expect(norm(rayEllipsoid([R+400000,0,0],[-1,0,0])!)).toBeCloseTo(R,6);
 });
 it('shows annotation only when explicitly enabled in active work overview and clears stale cache',()=>{
  // View only consumes release, phase, position and work presence; no synthetic flight outcome is produced.
  const s={phase:'ops-cycle',operations:{},deployment:{released:true,satellite:{fixedPosition:[EARTH_RADII[0]+400000,0,0]}}} as unknown as FlightState;
  const view=createObservationFootprintView(),options={enabled:true,angle:20 as const},origin=new THREE.Vector3();
  view.update(s,origin,true,{...options,enabled:false});expect(view.root.visible).toBe(false);
  view.update(s,origin,true,options);expect(view.root.visible).toBe(true);expect(view.anchor.center).not.toBeNull();
  view.hide();expect(view.anchor.center).toBeNull();view.update(s,origin,true,options);expect(view.root.visible).toBe(true);expect(view.anchor.center).not.toBeNull();
  view.update(s,origin,false,options);expect(view.root.visible).toBe(false);expect(view.anchor.center).toBeNull();
  s.deployment!.satellite.fixedPosition=[EARTH_RADII[0]*3,0,0];view.update(s,origin,true,{...options,angle:40});expect(view.root.visible).toBe(false);
  view.update(s,origin,true,{...options,angle:40});expect(view.root.visible).toBe(false);
  s.phase='life-retired';view.update(s,origin,true,options);expect(view.root.visible).toBe(false);expect(view.anchor.center).toBeNull();
 });
});
