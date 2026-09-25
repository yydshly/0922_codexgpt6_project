import * as THREE from 'three';
import {earthSeasonPole,seasonGeometry} from '../data/seasons';
import type {StateFrame} from '../types';
export function createSeasonScene(scene:THREE.Scene){
 const root=new THREE.Group();root.name='season-reference';root.userData.integrated=true;root.visible=false;scene.add(root);
 const pole=earthSeasonPole(),tilt=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),pole);
 const line=(points:THREE.Vector3[],color:string)=>new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));
 root.add(new THREE.ArrowHelper(pole,pole.clone().multiplyScalar(-.17),.36,'#f2a7d3',.025,.014));
 const arc=Array.from({length:25},(_,i)=>new THREE.Vector3(0,1,0).applyQuaternion(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(),tilt,i/24)).multiplyScalar(.155));root.add(line(arc,'#f2a7d3'));
 root.add(line([new THREE.Vector3(0,-.18,0),new THREE.Vector3(0,.18,0)],'#78d4e6'));
 root.add(line(Array.from({length:97},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/48)*.093,0,Math.sin(i*Math.PI/48)*.093).applyQuaternion(tilt)),'#e0e8e4'));
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.006,12,8),new THREE.MeshBasicMaterial({color:'#ffdf82'}));root.add(marker);
 const arrows=[-1,0,1].map(()=>{const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.2,'#f3cd75',.025,.014);root.add(arrow);return arrow;});
 return {root,update(frame:StateFrame|null,enabled:boolean,earth:THREE.Vector3){const state=enabled?seasonGeometry(frame):null;root.visible=!!state;if(!state)return;root.position.copy(earth);marker.position.copy(state.direction).multiplyScalar(.095);
  const side=pole.clone().addScaledVector(state.direction,-pole.dot(state.direction)).normalize();arrows.forEach((arrow,i)=>{arrow.position.copy(state.direction).multiplyScalar(.42).addScaledVector(side,(i-1)*.13);arrow.setDirection(state.direction.clone().negate());});
 }};
}
