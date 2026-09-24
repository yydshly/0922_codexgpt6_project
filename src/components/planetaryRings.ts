import * as THREE from 'three';
import { ringProfile,ringDisplayBounds } from '../data/rings';
import type { BodyDefinition } from '../types';
/** Reference geometry only; artistic opacity is not optical depth or measured brightness. */
export function makeFaintRings(body:BodyDefinition,radius:number){
 const group=new THREE.Group();group.name='additional-rings';
 const profile=ringProfile(body.id);
 if(!profile||body.id==='saturn')return group;
 for(const band of profile.bands){
   const [inner,outer]=ringDisplayBounds(band,body.radiusKm,true);
   const material=new THREE.MeshBasicMaterial({color:body.id==='jupiter'?'#d6bfa6':body.id==='uranus'?'#a9c4d0':'#95bac9',side:THREE.DoubleSide,transparent:true,opacity:band.opacity,depthWrite:false});
   const mesh=new THREE.Mesh(new THREE.RingGeometry(inner*radius,outer*radius,180),material);mesh.rotation.x=-Math.PI/2;mesh.userData.band=band;group.add(mesh);
   if(band.arc)for(const angle of [.35,.58,.8,1.03]){const arc=new THREE.Mesh(new THREE.RingGeometry(inner*radius,outer*radius,16,1,angle,.11),material.clone());arc.rotation.x=-Math.PI/2;arc.material.opacity=.9;arc.userData.band=band;arc.userData.arc=angle;group.add(arc);}
 }
 group.userData.enhanced=true;
 group.userData.update=(visible:boolean,enhanced:boolean,time:number)=>{
   // Keep illustrative arcs fixed in the reference equatorial plane, independent of surface rotation.
   group.rotation.y=-((body.primeMeridianDeg??0)+time/86400*(body.rotationRateDegPerDay??8640/body.rotationHours))%360*Math.PI/180;
   group.visible=visible;
   if(group.userData.enhanced===enhanced)return;
   group.userData.enhanced=enhanced;
   for(const object of group.children){const mesh=object as THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;const band=mesh.userData.band;const [inner,outer]=ringDisplayBounds(band,body.radiusKm,enhanced);mesh.geometry.dispose();mesh.geometry=new THREE.RingGeometry(inner*radius,outer*radius,mesh.userData.arc===undefined?180:16,1,mesh.userData.arc??0,mesh.userData.arc===undefined?Math.PI*2:.11);mesh.material.opacity=(mesh.userData.arc===undefined?band.opacity:.9)*(enhanced?1:.5);}
 };
 return group;
}
export function updateFaintRings(group:THREE.Object3D,visible:boolean,enhanced:boolean,time:number){group.getObjectByName('additional-rings')?.userData.update?.(visible,enhanced,time);}
