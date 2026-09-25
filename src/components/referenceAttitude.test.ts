import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {BODIES,bodyById} from '../data/catalog';
import {referenceAttitude,renderedRotationHours} from './referenceAttitude';
import {APPEARANCE_OBJECTS,tiltReference} from '../data/appearanceAudit';
import {SATELLITES} from '../data/satellites';

describe('shared dated reference attitude',()=>{
 it('matches the archived PCK linear meridian coefficients, including documented old Mars model',()=>{
  const pck=readFileSync('data-sources/pck00011.tpc','utf8');
  for(const body of BODIES){
   const rows=[...pck.matchAll(new RegExp('BODY'+body.displayNaifId+'_PM\\s*=\\s*\\(([^)]+)\\)','gi'))];
   const coefficients=rows.map(row=>row[1].trim().split(/\s+/).map(Number));
   expect(coefficients.some(row=>Math.abs(row[0]-body.primeMeridianDeg!)<1e-8&&Math.abs(row[1]-body.rotationRateDegPerDay!)<1e-8),body.id).toBe(true);
  }
  for(const moon of SATELLITES){
   const rows=[...pck.matchAll(new RegExp('BODY'+moon.naifId+'_RADII\\s*=\\s*\\(([^)]+)\\)','gi'))];
   expect(rows.some(row=>row[1].trim().split(/\s+/).map(Number).every((n,i)=>Math.abs(n-moon.axesKm[i])<1e-6)),moon.id).toBe(true);
  }
 });
 it('returns to the same orientation after one model rotation at 2026 epochs',()=>{
  for(const body of BODIES){const t=840000000;const q=referenceAttitude(body,t);const next=referenceAttitude(body,t+Math.abs(renderedRotationHours(body))*3600);
   expect(1-Math.abs(q.dot(next)),body.id).toBeLessThan(1e-10);
   expect(q.length(),body.id).toBeCloseTo(1,12);
  }
 });
 it('retains pole direction and applies signed motion without tilting twice',()=>{
  for(const body of BODIES){const q=referenceAttitude(body,0),next=referenceAttitude(body,60);
   const pole=new THREE.Vector3(0,1,0).applyQuaternion(q),after=new THREE.Vector3(0,1,0).applyQuaternion(next);
   expect(pole.distanceTo(after),body.id).toBeLessThan(1e-12);
   const x=new THREE.Vector3(1,0,0).applyQuaternion(q),x1=new THREE.Vector3(1,0,0).applyQuaternion(next);
   expect(Math.sign(new THREE.Vector3().crossVectors(x,x1).dot(pole)),body.id).toBe(Math.sign(body.rotationRateDegPerDay!));
  }
  const earthPole=new THREE.Vector3(0,1,0).applyQuaternion(referenceAttitude(bodyById.earth,0));
  expect(earthPole.y).toBeCloseTo(Math.cos(23.439291111*Math.PI/180),12);
  expect(earthPole.z).toBeCloseTo(-Math.sin(23.439291111*Math.PI/180),12);
 });
 it('is independent of frame rate, seeking direction and prior calculations',()=>{
  const expected=referenceAttitude(bodyById.sun,840000000).toArray();
  for(const t of [840000100,1,840000001,0])referenceAttitude(bodyById.sun,t);
  expect(referenceAttitude(bodyById.sun,840000000).toArray()).toEqual(expected);
 });
 it('declares the actual audit scope and distinct tilt reference',()=>{
  expect(APPEARANCE_OBJECTS).toHaveLength(29);
  expect(new Set(APPEARANCE_OBJECTS.map(b=>b.id)).size).toBe(29);
  expect(tiltReference('moon')).toContain('月球轨道');
  expect(tiltReference('sun')).toContain('黄道');
  for(const m of SATELLITES)expect(m.radiusKm**3).toBeCloseTo(m.axesKm.reduce((a,b)=>a*b,1),3);
  // Neptune's reference period and adopted W model differ: never overwrite either silently.
  expect(Math.abs(renderedRotationHours(bodyById.neptune)-bodyById.neptune.rotationHours)).toBeGreaterThan(.1);
 });
});
