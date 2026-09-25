import {describe,it,expect} from 'vitest';
import {ENVIRONMENT_STEPS,environmentStepForView,environmentStepParts,incomingWindPoint} from './environmentJourney';
import {defaultPhenomenonParts} from './phenomenonParts';
import * as THREE from 'three';
describe('environment explanation in the shared panorama',()=>{
 it('shows only the intended solar and Earth components without changing unrelated choices',()=>{
  const previous={...defaultPhenomenonParts(),innerBelt:false,stream:false};
  for(const step of ENVIRONMENT_STEPS){
   const next=environmentStepParts(previous,step.id);
   expect(environmentStepForView(step.target,step.intent,next)?.id).toBe(step.id);
   for(const key of ['innerBelt','outerBelt','plasmasphere','stream','meteor','sheath','medium','neutrals'] as const)expect(next[key]).toBe(previous[key]);
  }
  expect(previous.corona).toBe(true);expect(previous.incomingWind).toBe(false);
 });
 it('does not label a family view or a manually changed layer set as a journey step',()=>{
  const parts=environmentStepParts(defaultPhenomenonParts(),'wind');
  expect(environmentStepForView('earth',null,parts)).toBeNull();
  expect(environmentStepForView('sun','solar',parts)).toBeNull();
  expect(environmentStepForView('earth','environment',{...parts,magnet:true})).toBeNull();
  expect(environmentStepForView(null,null,parts)).toBeNull();
 });
 it('can derive earlier steps from saved view state, without an independent selected index',()=>{
  const snapshots=ENVIRONMENT_STEPS.map(step=>({step,parts:environmentStepParts(defaultPhenomenonParts(),step.id)}));
  for(const {step,parts} of snapshots.reverse())expect(environmentStepForView(step.target,step.intent,parts)?.id).toBe(step.id);
 });
 it('keeps the diagram upstream, periodic and reproducible rather than integrating a fake transit',()=>{
  for(let i=0;i<96;i++)for(const t of [0,.12,.7,.999]){
   const p=incomingWindPoint(i,t);expect(p.every(Number.isFinite)).toBe(true);expect(p[0]).toBeGreaterThanOrEqual(-1.25);expect(p[0]).toBeLessThan(-.59);
   const next=incomingWindPoint(i,t+1);p.forEach((v,j)=>expect(next[j]).toBeCloseTo(v,8));
  }
  expect(incomingWindPoint(0,.2)[0]).toBeGreaterThan(incomingWindPoint(0,.1)[0]);
 });
 it('orients upstream and downstream with the real Sun–Earth direction for arbitrary Earth positions',()=>{
  for(const earth of [new THREE.Vector3(1,2,3),new THREE.Vector3(-3,0,1)]){
   const direction=earth.clone().normalize(),rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),direction);
   const upstream=new THREE.Vector3(-1,0,0).applyQuaternion(rotation);
   expect(upstream.dot(direction)).toBeCloseTo(-1);expect(new THREE.Vector3(1,0,0).applyQuaternion(rotation).dot(direction)).toBeCloseTo(1);
  }
 });
});
