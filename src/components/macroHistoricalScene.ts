import * as THREE from 'three';
import {borisovProvider,historicalHeliocentric,historicalDisplay} from '../ephemeris/borisov';
import type {MonthlyManifest} from '../ephemeris/stateProvider';
export interface HistoricalView {manifest:MonthlyManifest|null;time:number;view:'oblique'|'edge'|'top'}
export function createHistoricalScene(scene:THREE.Scene,element:HTMLElement,manifest:MonthlyManifest){
 scene.background=new THREE.Color('#081521');scene.add(new THREE.AmbientLight('#9fb9d1',1.2),new THREE.PointLight('#fff1ca',18,0,1));
  const bodies=[{id:'sun',label:'太阳 · 参照中心',color:'#ffcc6d',r:.13},{id:'earth',label:'地球 · 历史位置',color:'#6fc8ff',r:.065},{id:'borisov',label:'2I/Borisov',color:'#cdb1ff',r:.085}].map(d=>{
   const mesh=new THREE.Mesh(new THREE.SphereGeometry(d.r,28,20),d.id==='sun'?new THREE.MeshBasicMaterial({color:d.color}):new THREE.MeshStandardMaterial({color:d.color,roughness:.8}));scene.add(mesh);
   const label=document.createElement('span');label.className='history-body-label';label.textContent=d.label;label.style.color=d.color;label.style.transform=d.id==='sun'?'translate(10px,10px)':d.id==='borisov'?'translate(-100%,-24px)':'translate(12px,-30px)';element.append(label);return {...d,mesh,label};
  });
  for(const id of ['earth','borisov']){
   const points:THREE.Vector3[]=[];
   for(let t=manifest.startTdb;t<=manifest.endTdb;t=Math.min(manifest.endTdb,t+86400)){
    const state=historicalHeliocentric(borisovProvider.sample(t)!).find(s=>s.id===id)!;points.push(new THREE.Vector3(...historicalDisplay(state.position)));if(t===manifest.endTdb)break;
   }
   scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:id==='earth'?'#448fb7':'#cfb4ff',transparent:true,opacity:.75})));
  }
  const grid=new THREE.GridHelper(12,12,'#375268','#213847');(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.4;scene.add(grid);
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),2.2,'#6889a3',.15,.06);scene.add(arrow);

 return {update(time:number,camera:THREE.PerspectiveCamera,width:number,height:number){
  const batch=borisovProvider.sample(time);if(batch){const states=historicalHeliocentric(batch);for(const b of bodies){const state=states.find(s=>s.id===b.id)!;b.mesh.position.set(...historicalDisplay(state.position));}}
  for(const b of bodies){const p=b.mesh.position.clone().project(camera);b.label.style.display=p.z>-1&&p.z<1&&Math.abs(p.x)<.95&&Math.abs(p.y)<.92?'block':'none';b.label.style.left=`${(p.x*.5+.5)*width}px`;b.label.style.top=`${(-p.y*.5+.5)*height}px`;}
 },dispose(){scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});bodies.forEach(b=>b.label.remove());scene.clear();}};
}
