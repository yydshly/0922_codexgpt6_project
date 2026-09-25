import * as THREE from 'three';
/** References inherit the existing body's scale and quaternion. No second spin clock. */
export function createMotionReference(parent:THREE.Mesh){
 const root=new THREE.Group();root.name='motion-reference';root.userData.integrated=true;parent.add(root);root.visible=false;
 const line=(p:THREE.Vector3[])=>new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),new THREE.LineBasicMaterial({color:'#f0d68b',transparent:true,opacity:.9}));
 root.add(line([new THREE.Vector3(0,-.15,0),new THREE.Vector3(0,.15,0)]));
 root.add(line(Array.from({length:97},(_,i)=>new THREE.Vector3(Math.cos(i/96*Math.PI*2)*.095,0,Math.sin(i/96*Math.PI*2)*.095))));
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.007,12,8),new THREE.MeshBasicMaterial({color:'#ffa7cf'}));marker.position.set(.099,0,0);root.add(marker);
 const meridian=line(Array.from({length:49},(_,i)=>{const a=-Math.PI/2+i/48*Math.PI;return new THREE.Vector3(.096*Math.cos(a),.096*Math.sin(a),0);}));root.add(meridian);
 return root;
}
