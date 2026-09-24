import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {readScenePresence,presenceText} from './scenePresence';
describe('actual scene visibility',()=>{
 it('distinguishes geometry outside the camera, hidden ancestors, and invisible materials',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const root=new THREE.Group();root.userData.sceneElement='members';scene.add(root);
  const near=new THREE.Mesh(new THREE.SphereGeometry(1),new THREE.MeshBasicMaterial()),far=near.clone();far.material=near.material.clone();far.position.x=50;root.add(near,far);scene.updateMatrixWorld(true);
  expect(readScenePresence(scene,camera).members).toEqual({objects:2,rendered:2,inView:1});
  near.visible=false;expect(presenceText(readScenePresence(scene,camera),'members')).toContain('视野外');
  root.visible=false;expect(readScenePresence(scene,camera).members.rendered).toBe(0);
  root.visible=true;far.material.visible=false;expect(readScenePresence(scene,camera).members.rendered).toBe(0);
  near.geometry.dispose();near.material.dispose();far.material.dispose();
 });
 it('does not count a historical scene or background geometry as current objects',()=>{
  const current=new THREE.Scene(),historical=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.updateMatrixWorld();
  const visitor=new THREE.Mesh(new THREE.SphereGeometry(),new THREE.MeshBasicMaterial());visitor.userData.sceneElement='visitor';historical.add(visitor);current.add(new THREE.Group());
  expect(readScenePresence(current,camera)).toEqual({});visitor.geometry.dispose();visitor.material.dispose();
 });
});
