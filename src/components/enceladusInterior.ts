import * as THREE from 'three';
import {ENCELADUS_INTERIOR,type EnceladusChoices} from '../data/enceladusInterior';
/** Drawing coordinates: -Y is illustrative south, not an ephemeris attitude. */
export function enceladusPlumePoints(){
 const positions:number[]=[],colors:number[]=[];
 for(let jet=0;jet<8;jet++)for(let i=0;i<80;i++){
  const t=(i+.5)/80,a=jet/8*Math.PI*2,w=.04+t*.19,spread=Math.sin(i*12.9898+jet*17.23);
  positions.push(Math.cos(a)*(.13+t*.32)+spread*w,-Math.sqrt(1-.13**2)-t*1.65,Math.sin(a)*(.13+t*.32)+Math.cos(i*9.32+jet)*w);
  const brightness=.95-t*.7;colors.push(brightness*.65,brightness*.85,brightness);
 }
 return {positions,colors};
}
export function createEnceladusInterior(marker:THREE.Mesh<THREE.SphereGeometry,THREE.MeshStandardMaterial>){
 const r=marker.geometry.parameters.radius,root=new THREE.Group();root.scale.setScalar(r);root.userData.sceneElement='enceladus-detail';root.userData.integrated=true;marker.add(root);
 const interior=new THREE.Group();root.add(interior);
 const radii=ENCELADUS_INTERIOR.displayRadii;
 const layers=Object.fromEntries(([['ice',radii.ocean,radii.surface,'#ddeaf1'],['ocean',radii.core,radii.ocean,'#2687ad'],['core',0,radii.core,'#967957']] as const).map(([id,inner,outer,color])=>{
  const group=new THREE.Group();group.name='enceladus-'+id;interior.add(group);
  const material=new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.85});
  group.add(new THREE.Mesh(new THREE.SphereGeometry(outer,64,40,Math.PI,Math.PI*1.5),material));
  // Two half-annuli close the radial cuts; all three layers share the same planes.
  for(const angle of [0,-Math.PI/2]){const face=new THREE.Mesh(new THREE.RingGeometry(inner,outer,64,1,-Math.PI/2,Math.PI),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(angle===0?.92:.58),side:THREE.DoubleSide}));face.rotation.y=angle;group.add(face);}
  group.traverse(o=>{if(o instanceof THREE.Mesh)o.userData.familyMoon='enceladus';});return [id,group];
 })) as Record<'ice'|'ocean'|'core',THREE.Group>;
 const cloud=enceladusPlumePoints(),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(cloud.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(cloud.colors,3));
 const pixels=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const n=(y*16+x)*4,d=Math.hypot((x-7.5)/7.5,(y-7.5)/7.5);pixels[n]=pixels[n+1]=pixels[n+2]=255;pixels[n+3]=Math.max(0,1-d)*200;}
 const map=new THREE.DataTexture(pixels,16,16);map.needsUpdate=true;
 const jets=new THREE.Points(geometry,new THREE.PointsMaterial({size:r*.09,map,vertexColors:true,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));jets.name='enceladus-jets';root.add(jets);
 return {root,interior,jets,layers,update(choices:EnceladusChoices,focused:boolean){
  interior.visible=focused&&choices.cutaway&&(choices.ice||choices.ocean||choices.core);marker.material.visible=!interior.visible;jets.visible=choices.jets;
  for(const id of ['ice','ocean','core'] as const)layers[id].visible=choices[id];
 }};
}
