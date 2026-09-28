import * as THREE from 'three';
import type { FlightState } from './liftoff';
import { fixedToLocal } from './coordinates';
import { surfaceAt } from './ascent';
import { GROUND_STATIONS } from './satelliteOperations';

/** Explanatory geometry only. Visibility and end points come from the active task state. */
export function createOperationsView() {
  const root = new THREE.Group();
  const dots = GROUND_STATIONS.map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(26000,12,8),new THREE.MeshBasicMaterial({color:'#84deda'}));root.add(m);return m;});
  const line=(color:string)=>{const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));const result=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85}));result.frustumCulled=false;root.add(result);return result;};
  const contact=line('#8fe7a6'), observation=line('#eac184');
  const updateLine=(l:THREE.Line,start:THREE.Vector3,end:THREE.Vector3)=>{const a=l.geometry.attributes.position;start.toArray(a.array,0);end.toArray(a.array,3);a.needsUpdate=true;};
  return {root, update(s:FlightState,origin:THREE.Vector3,overview:boolean) {
    const o=s.operations;root.visible=!!o&&overview;if(!o||!s.deployment)return;
    const local=(p:readonly number[])=>fixedToLocal(new THREE.Vector3(p[0],p[1],p[2])).sub(origin);
    o.links.forEach((l,i)=>{dots[i].position.copy(local(l.fixedPosition));dots[i].material.color.set(o.transmitting&&o.activeStation===l.id?'#d8ffb0':'#84deda');});
    const point=local(s.deployment.satellite.fixedPosition), active=o.links.find(l=>l.id===o.activeStation);
    contact.visible=o.transmitting&&!!active;
    if(active)updateLine(contact,point,local(active.fixedPosition));
    observation.visible=o.collecting;
    const fixed=s.deployment.satellite.fixedPosition, geo=surfaceAt(fixed);
    updateLine(observation,point,local(fixed.map((v,i)=>v-geo.up[i]*geo.height)));
  }};
}
