import * as THREE from 'three';
import {moonPhase} from '../data/moonPhase';
import {familyLocalPosition} from '../data/macroFamilies';
import type {StateFrame} from '../types';
export function createMoonPhaseScene(scene:THREE.Scene){
 const root=new THREE.Group();root.name='moon-phase-reference';root.userData.integrated=true;root.visible=false;scene.add(root);
 const sight=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:'#93dfe8',dashSize:.025,gapSize:.025,transparent:true,opacity:.7}));root.add(sight);
 const rays=[-.22,0,.22].map(()=>{const a=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.4,'#f3cd75',.065,.035);root.add(a);return a;});
 return {root,update(frame:StateFrame|null,enabled:boolean,earth:THREE.Vector3){const phase=enabled?moonPhase(frame):null;root.visible=!!phase;if(!phase)return;root.position.copy(earth);
  const point=new THREE.Vector3(...familyLocalPosition(phase.relative,'earth'));const p=sight.geometry.getAttribute('position') as THREE.BufferAttribute;p.setXYZ(1,point.x,point.y,point.z);p.needsUpdate=true;sight.geometry.computeBoundingSphere();sight.computeLineDistances();
  const toSun=new THREE.Vector3(phase.sunDirection[0],phase.sunDirection[2],-phase.sunDirection[1]);const side=new THREE.Vector3().crossVectors(toSun,new THREE.Vector3(0,1,0)).normalize();
  rays.forEach((ray,i)=>{ray.position.copy(toSun).multiplyScalar(.8).addScaledVector(side,(i-1)*.22);ray.setDirection(toSun.clone().negate());});
 }};
}
