import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {createSmallBodyRings} from './macroSmallRings';
import {CHARIKLO_RINGS,smallRingBounds,defaultSmallRings} from '../data/smallBodyRings';
import {readScenePresence} from './scenePresence';
describe('Chariklo reference ring geometry',()=>{
 it('preserves published local ratios and keeps the two enhanced bands separate',()=>{
  const [a,b]=CHARIKLO_RINGS.bands;
  for(const enhanced of [false,true]){
   const inner=smallRingBounds(a,enhanced),outer=smallRingBounds(b,enhanced),radius=CHARIKLO_RINGS.bodyReferenceRadiusKm;
   expect((inner[0]+inner[1])/2*radius).toBeCloseTo(391);
   expect((inner[1]-inner[0])*radius).toBeCloseTo(enhanced?14:7);
   expect((outer[1]-outer[0])*radius).toBeCloseTo(enhanced?6:3);
   expect(inner[1]).toBeLessThan(outer[0]);
  }
  expect((smallRingBounds(b,false)[0]-smallRingBounds(a,false)[1])*124).toBeCloseTo(9);
 });
 it('follows its parent and reports only actually enabled geometry',()=>{
  const scene=new THREE.Scene(),marker=new THREE.Mesh(new THREE.SphereGeometry(.13),new THREE.MeshBasicMaterial());scene.add(marker);
  const rings=createSmallBodyRings(marker),camera=new THREE.PerspectiveCamera(45,1,.01,100);camera.position.set(0,0,8);camera.updateProjectionMatrix();
  const update=()=>{scene.updateMatrixWorld(true);return readScenePresence(scene,camera)['small-rings'].rendered;};
  rings.update({...defaultSmallRings(),enabled:true});expect(update()).toBe(2);
  marker.position.set(3,4,5);scene.updateMatrixWorld(true);expect(rings.group.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([3,4,5]);
  rings.update({...defaultSmallRings(),enabled:true,inner:false});expect(update()).toBe(1);
  rings.update({...defaultSmallRings(),enabled:false});expect(update()).toBe(0);
  rings.update({...defaultSmallRings(),enabled:true});marker.visible=false;expect(update()).toBe(0);
  scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();(object.material as THREE.Material).dispose();}});
 });
});
