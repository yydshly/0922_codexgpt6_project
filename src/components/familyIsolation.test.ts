import {isolateEnvironmentContext} from './familyIsolation';
import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {isolateFamilyContext,restoreFamilyContext,isolateLocalSystem} from './familyIsolation';
import {familyMoonRadius,familyPlanetRadius} from '../data/macroFamilies';
import {bodyById} from '../data/catalog';
describe('family close-up scale and context',()=>{
 it('uses the same radius scale for Earth and Moon',()=>{
  const ratio=familyMoonRadius(bodyById.moon.radiusKm,'earth')/familyPlanetRadius('earth');
  expect(ratio).toBeCloseTo(1737.4/6371.0084,12);expect(ratio).toBeCloseTo(.2727,4);
 });
 it('temporarily hides unrelated geometry but keeps illumination and restores prior visibility exactly',()=>{
  const scene=new THREE.Scene(),earth=new THREE.Mesh(),venus=new THREE.Mesh(),hidden=new THREE.Group(),families=new THREE.Group(),stars=new THREE.Points(),light=new THREE.PointLight();
  earth.userData.primaryId='earth';venus.userData.primaryId='venus';families.name='macro-real-families';stars.userData.background=true;hidden.visible=false;scene.add(earth,venus,hidden,families,stars,light);
  const saved=new Map<THREE.Object3D,boolean>();isolateFamilyContext(scene,'earth',saved);
  expect(earth.visible&&families.visible&&stars.visible&&light.visible).toBe(true);expect(venus.visible).toBe(false);expect(scene.children).toContain(venus);
  restoreFamilyContext(saved);expect(venus.visible).toBe(true);expect(hidden.visible).toBe(false);expect(saved.size).toBe(0);
 });
});

it('isolates a nested companion system without losing siblings or saved switches',()=>{
 const scene=new THREE.Scene(),group=new THREE.Group(),eris=new THREE.Group(),other=new THREE.Group(),companion=new THREE.Mesh(),orbit=new THREE.Line();
 eris.userData.memberSystem='eris';orbit.userData.contextOrbit=true;eris.add(companion,orbit);group.add(eris,other);scene.add(group);other.visible=false;
 const saved=new Map<THREE.Object3D,boolean>();isolateLocalSystem(scene,'eris',saved);
 expect(group.visible&&eris.visible&&companion.visible).toBe(true);expect(orbit.visible).toBe(false);
 restoreFamilyContext(saved);expect(orbit.visible).toBe(true);expect(other.visible).toBe(false);
});

it('isolates an environment lesson and restores unrelated visibility without enabling hidden layers',()=>{
 const scene=new THREE.Scene(),earth=new THREE.Group(),sun=new THREE.Group(),family=new THREE.Group(),integrated=new THREE.Group(),off=new THREE.Group();
 earth.userData.primaryId='earth';sun.userData.primaryId='sun';family.name='macro-real-families';integrated.name='integrated-phenomena';off.visible=false;scene.add(earth,sun,family,integrated,off);
 const saved=new Map<THREE.Object3D,boolean>();isolateEnvironmentContext(scene,'earth',saved);
 expect(earth.visible).toBe(true);expect(integrated.visible).toBe(true);expect(sun.visible).toBe(false);expect(family.visible).toBe(false);
 restoreFamilyContext(saved);expect(sun.visible).toBe(true);expect(family.visible).toBe(true);expect(off.visible).toBe(false);
});
