import * as THREE from 'three';
import {coorbitalPoint,coorbitalOverview,coorbitalState,type CoorbitalMode} from '../data/coorbital';
import type {StateBatch} from '../ephemeris/stateProvider';
import {placeMacroLabels} from './macroLabelLayout';
export function createCoorbitalScene(scene:THREE.Scene,host:HTMLElement,onSelect:()=>void){
 const root=new THREE.Group();root.name='coorbital-reference';root.userData.integrated=true;root.userData.sceneElement='coorbital';scene.add(root);
 const colors={sun:'#ffcc70',earth:'#72c8f4',kamo:'#f5b983'};
 const make=(id:'sun'|'earth'|'kamo')=>{const m=new THREE.Mesh(new THREE.SphereGeometry(id==='sun'?.13:id==='earth'?.075:.025,24,16),id==='sun'?new THREE.MeshBasicMaterial({color:colors[id]}):new THREE.MeshStandardMaterial({color:colors[id],roughness:.8,emissive:colors[id],emissiveIntensity:.08}));root.add(m);return m;};
 const meshes={sun:make('sun'),earth:make('earth'),kamo:make('kamo')};meshes.kamo.userData.coorbital=true;
 const paths=(['earth','kamo'] as const).map(id=>{const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:colors[id],transparent:true,opacity:.7}));root.add(line);return {id,line};});
 const arrow=new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(-.25,0,0),.65,colors.sun,.12,.07);root.add(arrow);
 const overlay=document.createElement('div');overlay.className='macro-world-labels coorbital-world-labels';host.appendChild(overlay);
 const labels=(['sun','earth','kamo'] as const).map(id=>{const button=document.createElement('span');button.className='macro-world-label';button.style.setProperty('--label-color',colors[id]);button.textContent=id==='sun'?'太阳':id==='earth'?'地球':'Kamoʻoalewa · 准卫星';if(id==='kamo'){button.onclick=()=>{if(!mode)onSelect();};button.onkeydown=e=>{if(!mode&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onSelect();}};}overlay.append(button);return {id,button};});
 let mode:CoorbitalMode|null=null,lastTracks:StateBatch[]|null=null,lastMode:CoorbitalMode|null=null;
 return {root,meshes,update(batch:StateBatch|null,now:number|undefined,nextMode:CoorbitalMode|null,tracks:StateBatch[],overview:boolean){
  mode=nextMode;root.visible=!!coorbitalState(batch,now)&&(!!mode||overview);if(!root.visible||!batch)return;
  meshes.sun.visible=mode==='coorbital-sun';meshes.earth.visible=!!mode;meshes.kamo.visible=true;arrow.visible=mode==='coorbital-earth';
  if(mode){for(const id of ['sun','earth','kamo'] as const)meshes[id].position.fromArray(coorbitalPoint(batch,id,mode));}
  else meshes.kamo.position.fromArray(coorbitalOverview(batch));
  for(const {id,line} of paths){line.visible=!!mode&&(mode==='coorbital-sun'||id==='kamo');if(mode&&(tracks!==lastTracks||mode!==lastMode)){line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(tracks.map(b=>new THREE.Vector3(...coorbitalPoint(b,id,mode!))));}}
  lastTracks=tracks;lastMode=mode;
 },layout(camera:THREE.PerspectiveCamera,width:number,height:number,show:boolean){
  const candidates=labels.flatMap(({id,button})=>{button.style.visibility='hidden';const actionable=id==='kamo'&&!mode;button.classList.toggle('selectable',actionable);button.style.pointerEvents=actionable?'auto':'none';button.tabIndex=actionable?0:-1;if(actionable)button.setAttribute('role','button');else button.removeAttribute('role');button.textContent=id==='sun'?'太阳':id==='earth'?mode==='coorbital-earth'?'地球 · 旋转系原点':'地球':'Kamoʻoalewa · 准卫星';if(!show||!root.visible||!meshes[id].visible)return [];const p=meshes[id].position.clone().project(camera);if(p.z<-1||p.z>1)return [];return [{id,x:(p.x+1)*width/2,y:(1-p.y)*height/2,width:button.offsetWidth,height:button.offsetHeight,radius:id==='earth'?24:12}];});
  for(const box of placeMacroLabels(candidates,width,height,100,110,[])){const b=labels.find(l=>l.id===box.id)!.button;b.style.transform=`translate(${box.x}px,${box.y}px)`;b.style.visibility='visible';}
 },dispose(){overlay.remove();}};
}
