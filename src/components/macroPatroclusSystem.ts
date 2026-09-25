import * as THREE from 'three';
import {PATROCLUS_PHYSICS,patroclusLocal,type PatroclusChoices,type PatroclusSystemState} from '../data/patroclusSystem';
export interface PatroclusSceneOptions {state:PatroclusSystemState;enabled:boolean;choices:PatroclusChoices}
export function createPatroclusCompanion(marker:THREE.Mesh){
 const root=new THREE.Group();root.userData.sceneElement='patroclus-system';root.userData.integrated=true;root.visible=false;marker.add(root);
 const moon=new THREE.Mesh(new THREE.SphereGeometry(.13*PATROCLUS_PHYSICS.radiusKm.menoetius/PATROCLUS_PHYSICS.radiusKm.patroclus,32,24),new THREE.MeshStandardMaterial({color:'#8f8e87',roughness:.9}));moon.userData.memberId='menoetius';root.add(moon);
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#9db8bb',transparent:true,opacity:.55}));root.add(line);
 return {root,moon,update(options:PatroclusSceneOptions){
  root.visible=!!options.state&&options.enabled&&options.choices.moon;
  if(!options.state)return;
  moon.position.set(...patroclusLocal(options.state.relative));moon.material.emissive.set(options.choices.selected==='menoetius'?'#536b60':'#000000');
  const p=line.geometry.getAttribute('position');p.setXYZ(1,...moon.position.toArray());p.needsUpdate=true;line.geometry.computeBoundingSphere();line.visible=options.choices.distance;
 }};
}
