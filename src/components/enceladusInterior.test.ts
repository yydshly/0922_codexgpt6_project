import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {createEnceladusInterior,enceladusPlumePoints} from './enceladusInterior';
import {defaultEnceladusChoices,ENCELADUS_INTERIOR} from '../data/enceladusInterior';
import {readScenePresence} from './scenePresence';
import {familyMoonRadius} from '../data/macroFamilies';
const setup=()=>{const marker=new THREE.Mesh(new THREE.SphereGeometry(familyMoonRadius(252.1,'saturn')),new THREE.MeshStandardMaterial());const detail=createEnceladusInterior(marker),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.001,100);scene.add(marker);camera.position.set(.1,.03,.15);camera.lookAt(0,0,0);scene.updateMatrixWorld(true);return {marker,detail,scene,camera};};
describe('Enceladus same-scene teaching layers',()=>{
 it('has finite deterministic plume points outside the illustrative southern surface',()=>{const a=enceladusPlumePoints();expect(a).toEqual(enceladusPlumePoints());expect(a.positions.length).toBe(a.colors.length);expect(a.positions.every(Number.isFinite)).toBe(true);for(let i=0;i<a.positions.length;i+=3){expect(a.positions[i+1]).toBeLessThan(-.99);expect(Math.hypot(...a.positions.slice(i,i+3))).toBeGreaterThan(1);}});
 it('keeps core/ocean/ice ordered and uses display ratios explicitly, not physical thickness',()=>{const r=ENCELADUS_INTERIOR.displayRadii;expect(r.core).toBeLessThan(r.ocean);expect(r.ocean).toBeLessThan(r.surface);expect(ENCELADUS_INTERIOR.units).toContain('not estimated');});
 it('only cuts the focused moon, and toggles actually remove geometry without removing the position marker',()=>{
  const {marker,detail,scene,camera}=setup(),choices=defaultEnceladusChoices();
  detail.update(choices,true);expect(detail.interior.visible).toBe(false);expect(marker.material.visible).toBe(true);expect(readScenePresence(scene,camera)['enceladus-detail'].rendered).toBe(1);
  choices.cutaway=true;detail.update(choices,true);expect(marker.material.visible).toBe(false);expect(readScenePresence(scene,camera)['enceladus-detail'].rendered).toBe(10);
  choices.ice=false;detail.update(choices,true);expect(readScenePresence(scene,camera)['enceladus-detail'].rendered).toBe(7);
  choices.core=false;choices.ocean=false;choices.jets=false;detail.update(choices,true);expect(marker.material.visible).toBe(true);expect(readScenePresence(scene,camera)['enceladus-detail'].rendered).toBe(0);
  detail.update({...defaultEnceladusChoices(),cutaway:true},false);expect(marker.material.visible).toBe(true);expect(detail.interior.visible).toBe(false);
  marker.visible=false;expect(readScenePresence(scene,camera)['enceladus-detail'].rendered).toBe(0);
 });
 it('follows the existing marker rather than creating a second body or changing ephemeris coordinates',()=>{
  const {marker,detail,scene}=setup();marker.position.set(5,-2,8);scene.updateMatrixWorld(true);expect(detail.root.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([5,-2,8]);
  marker.position.add(new THREE.Vector3(1,3,-2));scene.updateMatrixWorld(true);expect(detail.root.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([6,1,6]);expect(detail.root.scale.x).toBe(marker.geometry.parameters.radius);
 });
});
