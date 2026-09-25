import * as THREE from 'three';
import {dustSample} from '../data/materialJourney';
import {familyLocalPosition,type MacroMoon} from '../data/macroFamilies';
export function createZodiacalDiagram(texture:THREE.Texture){
 const root=new THREE.Group();root.userData.sceneElement='stream';
 const cloud=new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({length:1500},(_,i)=>new THREE.Vector3(...dustSample(i)))),new THREE.PointsMaterial({color:'#ddcb9a',size:.045,map:texture,transparent:true,opacity:.7,depthWrite:false}));root.add(cloud);
 const grain=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshBasicMaterial({color:'#ffe8ae'}));grain.position.set(1.25,.08,.75);root.add(grain);
 const light=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#f2d591',dashSize:.08,gapSize:.05,transparent:true,opacity:.8}));root.add(light);
 return {root,update(earth:THREE.Vector3|null,enabled:boolean){root.visible=enabled&&!!earth;if(!earth)return;light.geometry.setFromPoints([new THREE.Vector3(),grain.position,earth]);light.computeLineDistances();}};
}
/** Broad reference ice-grain annulus in display coordinates; NOT a measured E-ring edge. */
export function eRingPoints(moon:MacroMoon){
 const p=new THREE.Vector3(...familyLocalPosition(moon.position,'saturn')),v=new THREE.Vector3(moon.velocity[0],moon.velocity[2],-moon.velocity[1]),n=p.clone().cross(v).normalize();if(n.lengthSq()<.5)return [];
 const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n),r=p.length();
 return Array.from({length:1600},(_,i)=>{const sample=dustSample(i),a=Math.atan2(sample[2],sample[0]),q=.76+.48*((i*97%1601)/1601);return new THREE.Vector3(r*q*Math.cos(a),sample[1]*.3,r*q*Math.sin(a)).applyQuaternion(rotation);});
}
export function createERing(){const bytes=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=(y*16+x)*4;bytes[k]=bytes[k+1]=bytes[k+2]=255;bytes[k+3]=Math.max(0,1-Math.hypot(x-7.5,y-7.5)/7.5)*255;}const map=new THREE.DataTexture(bytes,16,16);map.needsUpdate=true;const points=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({map,color:'#94cadd',size:.012,transparent:true,opacity:.65,depthWrite:false}));points.name='saturn-e-ring';points.userData.sceneElement='enceladus-detail';points.visible=false;return points;}
