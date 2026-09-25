import * as THREE from 'three';
import type {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {starDirection,starPosition,starsForView,starName,starDistance,type StarCatalogue,type StellarView} from '../data/starCatalogue';
export function buildStellarScene(scene:THREE.Scene,camera:THREE.PerspectiveCamera,controls:OrbitControls,canvas:HTMLCanvasElement,data:StarCatalogue|null,view:StellarView,selected:number|null,onSelect:(id:number)=>void){
 const isSky=view==='sky';const stars=starsForView(data,view,selected);
 const positions=stars.map(s=>new THREE.Vector3(...(isSky?starDirection(s.ra,s.dec).map(v=>v*100) as [number,number,number]:starPosition(s))));
 const sprite=document.createElement('canvas');sprite.width=sprite.height=64;const ctx=sprite.getContext('2d')!;
 const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(230,244,255,1)');g.addColorStop(.45,'rgba(157,201,229,.35)');g.addColorStop(1,'rgba(128,190,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const texture=new THREE.CanvasTexture(sprite);
 // Magnitudes are deliberately compressed into readable screen sizes, not radiometry.
 for(let bin=-2;bin<=16;bin++){
  const points=positions.filter((_,i)=>Math.floor(stars[i].hp)===bin);if(!points.length)continue;
  scene.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(points),new THREE.PointsMaterial({map:texture,color:'#d9efff',size:isSky?Math.max(2.5,9-bin):10,sizeAttenuation:false,transparent:true,depthWrite:false})));
 }
 const text=(caption:string,p:THREE.Vector3,width=5)=>{
  const c=document.createElement('canvas');c.width=512;c.height=80;const x=c.getContext('2d')!;x.fillStyle='rgba(9,25,35,.84)';x.fillRect(0,0,512,80);x.fillStyle='#d6edf0';x.font='32px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(caption,256,40);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false,sizeAttenuation:false}));s.scale.set(width>=7?.30:.23,(width>=7?.30:.23)*80/512,1);s.position.copy(p);s.renderOrder=4;scene.add(s);
 };
 const line=(points:THREE.Vector3[],color:string,opacity=.3)=>{scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity})));};
 const ringRadius=isSky?99:10;line(Array.from({length:129},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/64)*ringRadius,0,Math.sin(i*Math.PI/64)*ringRadius)),'#6fa9bd');
 if(!isSky){
  const sun=new THREE.Mesh(new THREE.SphereGeometry(.22,20,12),new THREE.MeshBasicMaterial({color:'#ffdb85'}));scene.add(sun);text('太阳 · 距离原点',new THREE.Vector3(0,1,0));text('赤道参考圈 · 半径 10 光年',new THREE.Vector3(0,0,11),7);
  line([new THREE.Vector3(),new THREE.Vector3(0,23,0)],'#6da9bb');text('天北方向',new THREE.Vector3(0,24,0));
  controls.minDistance=1;controls.maxDistance=90;camera.far=250;camera.position.set(30,22,36);controls.target.set(0,0,0);
 }else{
  controls.enabled=false;camera.position.set(0,0,0);camera.fov=70;camera.far=150;camera.lookAt(100,0,0);
  text('天北极',new THREE.Vector3(0,99,0),12);text('赤经 0h · 赤道',new THREE.Vector3(99,2,0),16);text('赤经 6h · 赤道',new THREE.Vector3(0,2,-99),16);
 }
 const index=stars.findIndex(s=>s.hip===selected);
 if(index>=0){const p=positions[index];
  scene.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints([p]),new THREE.PointsMaterial({map:texture,color:'#ffda81',size:24,sizeAttenuation:false,transparent:true,depthWrite:false})));
  text(starName(selected!),p.clone().add(new THREE.Vector3(0,isSky?2:1,0)),isSky?12:5);
  if(isSky)camera.lookAt(p);else{line([new THREE.Vector3(),p],'#d4b779',.65);text(`太阳 → ${starName(selected!)} · ${starDistance(stars[index]).toFixed(2)} 光年`,p.clone().multiplyScalar(.5).add(new THREE.Vector3(0,1,0)),8);controls.target.copy(p).multiplyScalar(.5);const offset=new THREE.Vector3().crossVectors(p,new THREE.Vector3(0,1,0)).normalize().add(new THREE.Vector3(0,.6,0)).normalize().multiplyScalar(Math.max(18,p.length()*1.65));camera.position.copy(controls.target).add(offset);}
 }
 camera.updateProjectionMatrix();if(controls.enabled)controls.update();
 let drag:{x:number;y:number;lastX:number;lastY:number;id:number}|null=null,moved=false;
 let dir=camera.getWorldDirection(new THREE.Vector3()),theta=Math.atan2(-dir.z,dir.x),phi=Math.asin(dir.y);
 const down=(e:PointerEvent)=>{if(e.button!==0)return;dir=camera.getWorldDirection(new THREE.Vector3());theta=Math.atan2(-dir.z,dir.x);phi=Math.asin(dir.y);drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,id:e.pointerId};moved=false;if(isSky)canvas.setPointerCapture(e.pointerId);};
 const move=(e:PointerEvent)=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)moved=true;
  if(isSky){theta+=(e.clientX-drag.lastX)*.004;phi=Math.max(-1.55,Math.min(1.55,phi+(e.clientY-drag.lastY)*.004));camera.lookAt(new THREE.Vector3(...starDirection(theta,phi)));}drag.lastX=e.clientX;drag.lastY=e.clientY;};
 const up=(e:PointerEvent)=>{if(!drag||drag.id!==e.pointerId)return;const click=!moved;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!click)return;
  camera.updateMatrixWorld();const rect=canvas.getBoundingClientRect();let best=-1,dist=15;
  positions.forEach((p,i)=>{const q=p.clone().project(camera);if(q.z< -1||q.z>1)return;const d=Math.hypot((q.x+1)/2*rect.width-(e.clientX-rect.left),(1-q.y)/2*rect.height-(e.clientY-rect.top));if(d<dist){dist=d;best=i;}});if(best>=0)onSelect(stars[best].hip);
 };
 const cancel=()=>{drag=null;};
 const wheel=(e:WheelEvent)=>{if(!isSky)return;e.preventDefault();camera.fov=Math.max(20,Math.min(100,camera.fov+e.deltaY*.035));camera.updateProjectionMatrix();};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});canvas.style.touchAction='none';
 return()=>{texture.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('wheel',wheel);};
}
