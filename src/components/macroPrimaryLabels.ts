import * as THREE from 'three';
import {PRIMARY_BODIES,type PrimaryId} from '../data/macroPrimary';
import {placeMacroLabels} from './macroLabelLayout';
export function createPrimaryLabels(host:HTMLElement,meshes:Record<PrimaryId,THREE.Mesh>,onSelect:(id:PrimaryId)=>void){
 const overlay=document.createElement('div');overlay.className='macro-world-labels primary-world-labels';host.appendChild(overlay);
 const labels=PRIMARY_BODIES.map(body=>{const button=document.createElement('button');button.type='button';button.className='macro-world-label selectable';button.textContent=body.name;button.setAttribute('aria-label',`定位${body.name}本体`);button.onclick=()=>onSelect(body.id as PrimaryId);overlay.appendChild(button);return {id:body.id as PrimaryId,button};});
 return {clear(){for(const {button} of labels)button.style.visibility='hidden';},layout(camera:THREE.PerspectiveCamera,width:number,height:number,visible:boolean,active:PrimaryId|null){
  const candidates=labels.flatMap(({id,button})=>{button.style.visibility='hidden';button.setAttribute('aria-pressed',String(active===id));const mesh=meshes[id];if(!visible||!mesh.visible||(active&&active!==id))return [];const world=mesh.getWorldPosition(new THREE.Vector3()),p=world.clone().project(camera);if(p.z<-1||p.z>1)return [];
   return [{id,x:(p.x+1)*width/2,y:(1-p.y)*height/2,width:button.offsetWidth,height:button.offsetHeight,radius:mesh.userData.labelRadius*height/(2*Math.tan(camera.fov*Math.PI/360)*world.distanceTo(camera.position))+6}];
  });
  const rect=host.getBoundingClientRect(),obstacles=[...host.querySelectorAll<HTMLElement>('.macro-world-labels:not(.primary-world-labels) .macro-world-label')].filter(b=>b.style.visibility==='visible').map(b=>{const r=b.getBoundingClientRect();return {x:r.x-rect.x,y:r.y-rect.y,width:r.width,height:r.height};});
  for(const box of placeMacroLabels(candidates,width,height,70,110,obstacles)){const b=labels.find(l=>l.id===box.id)!.button;b.style.transform=`translate(${box.x}px,${box.y}px)`;b.style.visibility='visible';}
 },dispose(){overlay.remove();}};
}
