import * as THREE from 'three';
import type { FlightState } from './liftoff';
import { fixedToLocal } from './coordinates';
import { rotateEarth, surfaceAt } from './ascent';
import { GROUND_STATIONS } from './satelliteOperations';
import { DEFAULT_OPERATIONS_GUIDES, operationsGuideReading, type OperationsGuides } from './operationsGuides';

/** Explanatory geometry only. Visibility and end points come from the active task state. */
export function createOperationsView() {
  const root = new THREE.Group();
  const dots = GROUND_STATIONS.map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(26000,12,8),new THREE.MeshBasicMaterial({color:'#84deda'}));root.add(m);return m;});
  const line=(color:string)=>{const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));const result=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85}));result.frustumCulled=false;root.add(result);return result;};
  const contact=line('#8fe7a6'), observation=line('#efb57e'), power=line('#ffe291');
  contact.name='ops-contact';observation.name='ops-observation';power.name='ops-power';
  const dashed = [contact, observation, power].map(l=>new THREE.LineDashedMaterial({color:l.material.color,transparent:true,opacity:.6}));
  const solid = [contact.material, observation.material, power.material];
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(1,3,10),new THREE.MeshBasicMaterial({color:'#ffe291'}));root.add(arrow);
  const nadirDot = new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:'#efb57e'}));root.add(nadirDot);
  const anchors: Record<keyof OperationsGuides, THREE.Vector3|null> = {power:null, observation:null, contact:null};
  const updateLine=(l:THREE.Line,start:THREE.Vector3,end:THREE.Vector3)=>{const a=l.geometry.attributes.position;start.toArray(a.array,0);end.toArray(a.array,3);a.needsUpdate=true;l.computeLineDistances();};
  return {root, anchors, materials:[...solid,...dashed], update(s:FlightState,origin:THREE.Vector3,overview:boolean,options:OperationsGuides=DEFAULT_OPERATIONS_GUIDES,regional=false) {
    anchors.power=anchors.observation=anchors.contact=null;
    const reading=operationsGuideReading(s),o=s.operations;root.visible=!!reading;if(!reading||!o||!s.deployment)return;
    const local=(p:readonly number[])=>fixedToLocal(new THREE.Vector3(p[0],p[1],p[2])).sub(origin);
    // Marks are enlarged for readability. Depth testing preserves occlusion by the Earth.
    o.links.forEach((l,i)=>{dots[i].visible=overview&&options.contact;dots[i].scale.setScalar(regional?.15:1);dots[i].position.copy(local(l.fixedPosition));dots[i].material.color.set(reading.transmitting&&reading.station?.id===l.id?'#d8ffb0':'#84deda');});
    const point=local(s.deployment.satellite.fixedPosition), active=reading.station;
    const segment=(key:keyof OperationsGuides,l:THREE.Line,end:THREE.Vector3,index:number,working:boolean)=>{
      l.material=working?solid[index]:dashed[index];dashed[index].dashSize=overview?26000:1;dashed[index].gapSize=overview?17000:.6;
      updateLine(l,point,end);if(l.visible)anchors[key]=overview?point.clone().lerp(end,.65):point.clone().add(end.clone().sub(point).setLength(3.5));
    };
    contact.visible=options.contact&&!!active;
    if(active)segment('contact',contact,local(active.fixedPosition),0,reading.transmitting);
    observation.visible=options.observation;
    const fixed=s.deployment.satellite.fixedPosition, geo=surfaceAt(fixed);
    const nadir=local(fixed.map((v,i)=>v-geo.up[i]*geo.height));
    segment('observation',observation,nadir,1,reading.collecting);
    nadirDot.visible=options.observation&&overview;nadirDot.position.copy(nadir);nadirDot.scale.setScalar(regional?1500:20000);
    // A short direction arrow, never a fabricated Sun location or distance.
    const sunFixed=new THREE.Vector3(...rotateEarth(o.sunDirection,-s.time));
    const direction=local(sunFixed.toArray()).sub(local([0,0,0])).normalize();
    const tip=point.clone().addScaledVector(direction,overview?regional?Math.max(150000,geo.height*.7):1600000:4.5);
    power.visible=arrow.visible=options.power;segment('power',power,tip,2,!reading.shadow);
    arrow.position.copy(tip);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);arrow.scale.setScalar(overview?regional?1800:45000:.12);
    arrow.material.color.set('#ffe291'); // The direction remains valid in eclipse; the dashed line denotes blocked sunlight.
  }};
}
