import * as THREE from 'three';
import {dynamicDwarfById} from '../data/dwarfs';
import {BINARY_SCALE,type MacroBinaryState} from '../data/macroBinary';
import {AU_KM} from '../data/catalog';
import {dwarfReferenceOrbit,PLUTO_GM,CHARON_GM} from './dwarfOrbit';
import {placeMacroLabels} from './macroLabelLayout';
export interface BinaryOptions {state:MacroBinaryState;enabled:boolean;center:boolean;orbits:boolean;selected:'pluto'|'charon'|null;onSelect:(id:'pluto'|'charon')=>void;onFocus:()=>void}
export function createMacroBinary(scene:THREE.Scene,host:HTMLElement,onSelect:BinaryOptions['onSelect'],onFocus:()=>void){
 const root=new THREE.Group();root.userData.integrated=true;root.name='macro-pluto-charon';scene.add(root);
 const bodies=(['pluto','charon'] as const).map(id=>{const b=dynamicDwarfById[id];const mesh=new THREE.Mesh(new THREE.SphereGeometry(b.radiusKm*BINARY_SCALE,40,28),new THREE.MeshStandardMaterial({color:b.color,roughness:.85}));mesh.userData.binaryId=id;root.add(mesh);return mesh;});
 const center=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.045,0,0),new THREE.Vector3(.045,0,0),new THREE.Vector3(0,-.045,0),new THREE.Vector3(0,.045,0),new THREE.Vector3(0,0,-.045),new THREE.Vector3(0,0,.045)]),new THREE.LineBasicMaterial({color:'#a9edcb'}));root.add(center);
 const orbits=[0,1].map(()=>{const l=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#b8ceb7',transparent:true,opacity:.4}));root.add(l);return l;});
 const overlay=document.createElement('div');overlay.className='macro-world-labels binary-world-labels';host.appendChild(overlay);
 const labels=['冥王星—卡戎 · 靠近','冥王星','卡戎','双体质心 · 非天体'].map((name,i)=>{const b=document.createElement('button');b.type='button';b.className='macro-world-label selectable';b.textContent=name;b.onclick=()=>i===1?onSelect('pluto'):i===2?onSelect('charon'):onFocus();overlay.appendChild(b);return b;});
 let available=false,detail=false,showCenter=true,epoch=NaN;
 return {anchor:root.position,get visible(){return root.visible;},
 update(options:BinaryOptions,camera:THREE.PerspectiveCamera,focused:string|null){
  const s=options.state;available=options.enabled&&!!s;detail=available&&(focused?focused==='pluto-system':camera.position.distanceTo(new THREE.Vector3(...s!.anchor))<12);root.visible=detail;showCenter=options.center;
  if(!s)return;root.position.set(...s.anchor);bodies[0].position.set(...s.plutoLocal);bodies[1].position.set(...s.charonLocal);center.visible=options.center;
  bodies.forEach((b,i)=>b.material.emissive.set(options.selected===(i?'charon':'pluto')?'#314b42':'#000000'));
  orbits.forEach(l=>l.visible=options.orbits);
  if(detail&&options.orbits&&(!Number.isFinite(epoch)||Math.abs(s.time-epoch)>1800)){
   const points=dwarfReferenceOrbit(s.charon,s.pluto,PLUTO_GM+CHARON_GM);
   orbits.forEach((l,i)=>{l.geometry.dispose();l.geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>p.clone().multiplyScalar(AU_KM*BINARY_SCALE*(i?PLUTO_GM:-CHARON_GM)/(PLUTO_GM+CHARON_GM))));});epoch=s.time;
  }
 },
 layout(camera:THREE.PerspectiveCamera,width:number,height:number,show:boolean){
  const candidates=[];for(let i=0;i<labels.length;i++){const b=labels[i];b.style.visibility='hidden';if(!show||!available||(i===0?detail:!detail)||(i===3&&!showCenter))continue;
   const p=(i===1||i===2?bodies[i-1].getWorldPosition(new THREE.Vector3()):root.position.clone()).project(camera);if(p.z<-1||p.z>1)continue;
   candidates.push({id:String(i),x:(p.x+1)*width/2,y:(1-p.y)*height/2,width:b.offsetWidth,height:b.offsetHeight});
  }
  const hostRect=host.getBoundingClientRect(),obstacles=[...host.querySelectorAll<HTMLElement>('.macro-world-labels:not(.binary-world-labels) .macro-world-label')].filter(b=>b.style.visibility==='visible').map(b=>{const r=b.getBoundingClientRect();return {x:r.x-hostRect.x,y:r.y-hostRect.y,width:r.width,height:r.height};});
  for(const box of placeMacroLabels(candidates,width,height,70,110,obstacles)){const b=labels[Number(box.id)];b.style.transform=`translate(${box.x}px,${box.y}px)`;b.style.visibility='visible';}
 },dispose(){overlay.remove();}};
}
