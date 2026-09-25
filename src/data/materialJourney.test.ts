import {describe,it,expect} from 'vitest';
import {materialParts,materialStepForView,dustSample} from './materialJourney';
import {defaultPhenomenonParts} from './phenomenonParts';
import {defaultEnceladusChoices} from './enceladusInterior';
import {meteorDemoState} from './dust';
import {eRingPoints,createZodiacalDiagram} from '../components/materialClouds';
import type {MacroMoon} from './macroFamilies';
import * as THREE from 'three';
describe('material links in the main panorama',()=>{
 it('keeps unrelated layer choices and matches only the actual dust view',()=>{
  const p=defaultPhenomenonParts(),c=defaultEnceladusChoices();
  for(const id of ['stream','meteor','zodiacal'] as const){const next=materialParts(p,id);expect(next.corona).toBe(p.corona);expect(next.ioTorus).toBe(p.ioTorus);expect(materialStepForView(id==='meteor'?'earth':'dust','dust',next,null,c)?.id).toBe(id);expect(materialStepForView('earth',null,next,null,c)).toBeNull();}
  expect(materialStepForView('dust','dust',{...materialParts(p,'zodiacal'),stream:true},null,c)).toBeNull();
 });
 it('distinguishes the source moon close-up, its interior and the outer ring view',()=>{
  const p=defaultPhenomenonParts(),c=defaultEnceladusChoices();
  expect(materialStepForView('saturn',null,p,'enceladus',c)?.id).toBe('plume');
  expect(materialStepForView('saturn',null,p,'enceladus',{...c,cutaway:true})).toBeNull();
  expect(materialStepForView('saturn',null,p,null,{...c,eRing:true})?.id).toBe('e-ring');
  expect(materialStepForView('saturn',null,p,null,c)).toBeNull();
 });
 it('does not light the grain until the example enters the illustrated atmosphere',()=>{
  expect(meteorDemoState(0).glow).toBe(false);expect(meteorDemoState(.93).glow).toBe(true);expect(meteorDemoState(1).visible).toBe(false);
 });
 it('produces finite 3D dust samples and hides scattering if the observer anchor is missing',()=>{
  for(let i=0;i<1500;i++){const p=dustSample(i);expect(p.every(Number.isFinite)).toBe(true);expect(Math.abs(p[1])).toBeLessThanOrEqual(.12);expect(Math.hypot(p[0],p[2])).toBeLessThanOrEqual(3.45);}
  const diagram=createZodiacalDiagram(new THREE.Texture());diagram.update(null,true);expect(diagram.root.visible).toBe(false);diagram.update(new THREE.Vector3(1,0,0),true);expect(diagram.root.visible).toBe(true);diagram.update(new THREE.Vector3(),false);expect(diagram.root.visible).toBe(false);
 });
 it('anchors the reference E-ring plane to the current satellite state and rejects degeneracy',()=>{
  const moon:MacroMoon={id:'enceladus',name:'土卫二',parentId:'saturn',radiusKm:252.1,position:[238000,0,0],velocity:[0,12,0],appearance:'rock',color:'#fff',sourceUrl:'',orbitalPeriodDays:1.37};
  const points=eRingPoints(moon);expect(points.length).toBe(1600);expect(points.every(p=>p.toArray().every(Number.isFinite))).toBe(true);expect(Math.max(...points.map(p=>Math.abs(p.y)))).toBeLessThan(.04);
  expect(eRingPoints({...moon,velocity:[0,0,0]})).toEqual([]);
 });
});
