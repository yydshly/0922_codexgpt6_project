import * as THREE from 'three';
import {familyLocalPosition,familyMoonRadius,type MacroMoon} from '../data/macroFamilies';
import type {PhenomenonParts} from '../data/phenomenonParts';

/** Reference torus placement, NOT a measured plasma boundary or density model. */
export function ioDisplayFrame(io:MacroMoon){
 const position=new THREE.Vector3(...familyLocalPosition(io.position,'jupiter'));
 const velocity=new THREE.Vector3(io.velocity[0],io.velocity[2],-io.velocity[1]);
 const normal=position.clone().cross(velocity).normalize();
 if(normal.lengthSq()<.5)return null;
 return {position,radius:position.length(),rotation:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal)};
}
export function createJupiterEnvironment(texture:THREE.Texture){
 const root=new THREE.Group();root.name='jupiter-environment';root.userData.sceneElement='environment';
 const magnet=new THREE.Group(),torus=new THREE.Group(),aurora=new THREE.Group();root.add(magnet,torus,aurora);
 for(let j=0;j<12;j++){const a=j/12*Math.PI*2;const points=Array.from({length:65},(_,i)=>{const x=-.65+i/64*2.8,r=.48*Math.sqrt(Math.max(0,1-Math.exp(-(x+.65)*4)));return new THREE.Vector3(x,r*Math.cos(a),r*Math.sin(a));});magnet.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#87bfea',transparent:true,opacity:.55,depthWrite:false})));}
 // Deterministic volume samples, with exaggerated tube thickness. No particle dynamics implied.
 const hash=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 const values=Array.from({length:700},(_,i)=>{const a=i*.618034*Math.PI*2,t=hash(i+13)*Math.PI*2,r=.14*Math.sqrt(hash(i+111));return new THREE.Vector3((1+r*Math.cos(t))*Math.cos(a),(1+r*Math.cos(t))*Math.sin(a),r*Math.sin(t));});
 const cloud=new THREE.Points(new THREE.BufferGeometry().setFromPoints(values),new THREE.PointsMaterial({color:'#bd99f5',size:.012,map:texture,transparent:true,opacity:.65,depthWrite:false}));torus.add(cloud);
 const ioBody=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshStandardMaterial({color:'#d8c16d',roughness:1}));root.add(ioBody);
 for(const sign of [-1,1]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.078,.002,6,80),new THREE.MeshBasicMaterial({color:'#a9b4ff',transparent:true,opacity:.5,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=sign*.106;aurora.add(ring);}
 let ioVisible=false;
 return {root,ioBody,ioAnchor:new THREE.Vector3(),
 update(position:THREE.Vector3|null,io:MacroMoon|undefined,enabled:boolean,detailed:boolean,showIo:boolean,parts:PhenomenonParts){
  root.visible=!!position&&enabled&&detailed;ioVisible=false;if(!position)return;root.position.copy(position);
  magnet.visible=parts.jupiterMagnet;magnet.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),position.clone().normalize());aurora.visible=parts.jupiterAurora;
  const frame=io?ioDisplayFrame(io):null;torus.visible=parts.ioTorus&&!!frame;ioBody.visible=torus.visible&&showIo;
  if(frame&&io){torus.quaternion.copy(frame.rotation);cloud.scale.setScalar(frame.radius);ioBody.position.copy(frame.position);ioBody.scale.setScalar(familyMoonRadius(io.radiusKm,'jupiter'));this.ioAnchor.copy(position).add(frame.position);ioVisible=root.visible&&ioBody.visible;}
 },get ioVisible(){return ioVisible;}};
}
