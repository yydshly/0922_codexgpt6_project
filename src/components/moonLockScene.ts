import * as THREE from 'three';
import {moonRelative,bodyReferenceDirection} from '../data/spinOrbit';
import {familyLocalPosition,familyMoonRadius} from '../data/macroFamilies';
import {bodyById} from '../data/catalog';
import type {StateFrame} from '../types';
export function createMoonLockScene(scene:THREE.Scene){
 const root=new THREE.Group();root.name='moon-lock-reference';root.userData.integrated=true;root.visible=false;scene.add(root);
 const moving=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.15,'#ffa7cf',.027,.014);
 const fixed=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.12,'#78d4e6',.022,.011);
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.006,12,8),new THREE.MeshBasicMaterial({color:'#ffa7cf'}));
 const sight=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:'#c2d4d9',dashSize:.025,gapSize:.025,transparent:true,opacity:.45}));root.add(moving,fixed,marker,sight);
 return {root,update(frame:StateFrame|null,enabled:boolean,earth:THREE.Vector3){const relative=enabled?moonRelative(frame):null;root.visible=!!relative;if(!relative||!frame)return;
  root.position.copy(earth);const point=new THREE.Vector3(...familyLocalPosition(relative,'earth')),direction=bodyReferenceDirection('moon',frame.time);moving.position.copy(point);moving.setDirection(direction);fixed.position.copy(point);marker.position.copy(point).addScaledVector(direction,familyMoonRadius(bodyById.moon.radiusKm,'earth')*1.1);
  const p=sight.geometry.getAttribute('position') as THREE.BufferAttribute;p.setXYZ(1,point.x,point.y,point.z);p.needsUpdate=true;sight.geometry.computeBoundingSphere();sight.computeLineDistances();
 }};
}
