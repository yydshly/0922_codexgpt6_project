import * as THREE from 'three';
import {ORBIT_PLANETS,planetRelativeState,planetReferencePoints,planetDisplayDirection,type OrbitPlanetId,type PlanetOrbitOptions} from '../data/macroPlanetOrbits';
import type {PrimaryId} from '../data/macroPrimary';
import type {StateFrame} from '../types';
export function createPlanetOrbits(scene:THREE.Scene){
 const root=new THREE.Group();root.name='macro-planet-reference-orbits';root.userData.integrated=true;scene.add(root);
 const items=ORBIT_PLANETS.map(b=>{const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:b.color,transparent:true,opacity:.35,depthWrite:false}));line.name=`reference-orbit-${b.id}`;const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.45,'#b2edba',.09,.045);arrow.name=`motion-direction-${b.id}`;root.add(line,arrow);return {id:b.id as OrbitPlanetId,line,arrow,epoch:NaN,height:1};});
 return {update(frame:StateFrame|null,options:PlanetOrbitOptions,enabled:boolean,selected:PrimaryId|null,positions:Record<string,THREE.Vector3>,height:1|10,only?:OrbitPlanetId){
  root.visible=enabled&&!!frame;
  for(const item of items){
   const state=planetRelativeState(frame,item.id),chosen=!only||item.id===only;
   item.line.visible=enabled&&!!state&&options.orbits&&chosen;item.arrow.visible=enabled&&!!state&&options.direction&&chosen;
   if(!state)continue;
   if(item.line.visible&&(!Number.isFinite(item.epoch)||Math.abs(frame!.time-item.epoch)>=21600||item.height!==height)){
    item.line.geometry.dispose();item.line.geometry=new THREE.BufferGeometry().setFromPoints(planetReferencePoints(frame,item.id,height));item.epoch=frame!.time;item.height=height;
   }
   item.line.material.opacity=selected===item.id?.7:selected?.06:.35;
   if(item.arrow.visible){const direction=planetDisplayDirection(state.position,state.velocity,height);if(direction){item.arrow.position.copy(positions[item.id]);item.arrow.setDirection(new THREE.Vector3(...direction));}else item.arrow.visible=false;}
  }
 }};
}
