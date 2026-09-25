import * as THREE from 'three';
import type {ErosShapeChoices,ErosShapeData} from '../data/erosShape';
export interface ErosShapeOptions {data:ErosShapeData|null;choices:ErosShapeChoices}
/** PDS body-fixed km -> inertial equatorial -> ECLIPJ2000 -> scene (x,z,-y). */
export function erosAttitude(time:number,data:ErosShapeData):THREE.Quaternion {
 const m=data.metadata,rad=Math.PI/180,a=m.poleRaDeg*rad,d=m.poleDecDeg*rad;
 const w=((m.primeMeridianDeg+time/86400*m.rotationRateDegPerDay)%360)*rad;
 const pole=new THREE.Vector3(Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d));
 const q=new THREE.Vector3(-Math.sin(a),Math.cos(a),0),u=new THREE.Vector3().crossVectors(pole,q);
 const x=q.clone().multiplyScalar(Math.cos(w)).addScaledVector(u,Math.sin(w));
 const y=new THREE.Vector3().crossVectors(pole,x);
 const transform=(v:THREE.Vector3)=>{const e=23.439291111*rad;return new THREE.Vector3(v.x,-v.y*Math.sin(e)+v.z*Math.cos(e),-v.y*Math.cos(e)-v.z*Math.sin(e));};
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(transform(x),transform(y),transform(pole)));
}
export function erosGeometry(data:ErosShapeData){
 const geometry=new THREE.BufferGeometry();
 // Keep all three axes at a single scale. The reference sphere has this mesh's volume.
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positionsKm.map(n=>n*.13/data.metadata.equivalentRadiusKm),3));
 geometry.setIndex(data.indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
export function createErosShape(marker:THREE.Mesh<THREE.SphereGeometry,THREE.MeshStandardMaterial>){
 const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#b5a28a',roughness:.96}));
 mesh.userData.memberId='eros';mesh.userData.sceneElement='eros-shape';mesh.userData.integrated=true;mesh.visible=false;marker.add(mesh);
 let loaded:ErosShapeData|null=null;
 return {mesh,update(options:ErosShapeOptions,time:number){
  if(options.data!==loaded){mesh.geometry.dispose();mesh.geometry=options.data?erosGeometry(options.data):new THREE.BufferGeometry();loaded=options.data;}
  mesh.visible=!!loaded&&options.choices.shape;marker.material.visible=!mesh.visible;
  marker.userData.labelRadius=mesh.visible?.13*loaded!.metadata.maxRadiusKm/loaded!.metadata.equivalentRadiusKm:.13;
  if(loaded){mesh.quaternion.copy(erosAttitude(time,loaded));mesh.material.wireframe=options.choices.wireframe;}
 }};
}
