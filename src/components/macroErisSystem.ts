import * as THREE from 'three';
import {ERIS_PHYSICS,erisLocal,type ErisChoices,type ErisSystemState} from '../data/erisSystem';
export interface ErisSceneOptions {state:ErisSystemState;enabled:boolean;choices:ErisChoices}
export function createErisCompanion(marker:THREE.Mesh){
 const root=new THREE.Group();root.userData.sceneElement='eris-system';root.userData.integrated=true;root.visible=false;marker.add(root);
 const moon=new THREE.Mesh(new THREE.SphereGeometry(.13*ERIS_PHYSICS.radiusKm.dysnomia/ERIS_PHYSICS.radiusKm.eris,32,24),new THREE.MeshStandardMaterial({color:'#8f8e87',roughness:.9}));moon.userData.memberId='dysnomia';root.add(moon);
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#9db8bb',transparent:true,opacity:.55}));root.add(line);
 return {root,moon,update(options:ErisSceneOptions){
  root.visible=!!options.state&&options.enabled&&options.choices.moon;
  if(!options.state)return;
  moon.position.set(...erisLocal(options.state.relative));moon.material.emissive.set(options.choices.selected==='dysnomia'?'#536b60':'#000000');
  const p=line.geometry.getAttribute('position');p.setXYZ(1,...moon.position.toArray());p.needsUpdate=true;line.geometry.computeBoundingSphere();line.visible=options.choices.distance;
 }};
}
