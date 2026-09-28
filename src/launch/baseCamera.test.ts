import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {padCameraPose,rebaseLaunchCamera} from './baseCamera';

describe('base observation camera',()=>{
 it('preserves the viewed rocket and user orbit angle across a moving-origin handoff',()=>{
  const origin=new THREE.Vector3(0,158.1,0),target=new THREE.Vector3(0,188,0);
  for(const offset of [new THREE.Vector3(115,28,170),new THREE.Vector3(-180,70,-30)]){
   const camera=new THREE.PerspectiveCamera(44,1.5,.5,55000000);
   camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateMatrixWorld();
   const point=origin.clone().add(new THREE.Vector3(0,47,0)),before=point.clone().project(camera);
   const rebased=rebaseLaunchCamera(camera.position,target,origin);
   camera.position.copy(rebased.position);camera.lookAt(rebased.target);camera.updateMatrixWorld();
   expect(point.sub(origin).project(camera).distanceTo(before)).toBeLessThan(1e-12);
   expect(rebased.position.clone().sub(rebased.target).distanceTo(offset)).toBeLessThan(1e-12);
   expect(target.y).toBe(188);expect(origin.y).toBe(158.1);
  }
 });
 it('keeps the full arrow and tower inside the frame at supported desktop aspect ratios',()=>{
  for(const aspect of [.7,1,1.5,2.4])for(const view of ['overview','ground'] as const){
   const pose=padCameraPose(view,aspect),camera=new THREE.PerspectiveCamera(44,aspect,1,26000);
   camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
   for(const x of [-24,12])for(const y of [0,91])for(const z of [-8,12]){
    const p=new THREE.Vector3(x,y,z).project(camera);
    expect(Math.abs(p.x)).toBeLessThan(.85);expect(Math.abs(p.y)).toBeLessThan(.85);expect(p.z).toBeLessThan(1);
   }
   if(view==='ground')expect(pose.position.y).toBe(2.2);
  }
 });
 it('brings the service arms closer while keeping the camera above the surface',()=>{
  const overview=padCameraPose('overview',1.4),detail=padCameraPose('service',1.4);
  expect(detail.position.distanceTo(detail.target)).toBeLessThan(overview.position.distanceTo(overview.target));
  expect(detail.position.y).toBeGreaterThan(0);
 });
});
