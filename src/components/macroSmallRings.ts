import * as THREE from 'three';
import {CHARIKLO_RINGS,smallRingBounds,type SmallRingOptions} from '../data/smallBodyRings';
/** Co-located with the real body. This fixed teaching plane is deliberately not a pole solution. */
export function createSmallBodyRings(marker:THREE.Mesh){
 const group=new THREE.Group();group.name='chariklo-reference-rings';group.userData.sceneElement='small-rings';group.userData.integrated=true;group.visible=false;
 group.rotation.set(-Math.PI/2+.35,0,.3);marker.add(group);
 const meshes=CHARIKLO_RINGS.bands.map((band,index)=>{
  const mesh=new THREE.Mesh(new THREE.RingGeometry(1,2,192),new THREE.MeshBasicMaterial({color:index?'#c5d6dc':'#e9dcc4',side:THREE.DoubleSide,transparent:true,opacity:index?.52:.78,depthWrite:false}));
  mesh.name=band.name;mesh.userData.memberId='chariklo';group.add(mesh);return mesh;
 });
 let enhanced:boolean|undefined;
 return {group,update(options:SmallRingOptions){
  group.visible=options.enabled;
  meshes[0].visible=options.inner;meshes[1].visible=options.outer;
  if(enhanced!==options.enhanced){
   enhanced=options.enhanced;
   meshes.forEach((mesh,i)=>{const [inner,outer]=smallRingBounds(CHARIKLO_RINGS.bands[i],enhanced!);mesh.geometry.dispose();mesh.geometry=new THREE.RingGeometry(inner*.13,outer*.13,192);});
  }
 }};
}
