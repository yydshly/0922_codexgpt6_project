import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FlightSession } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import type { FlightState } from './liftoff';
import { GROUND_STATIONS, stationFixed, stationLink } from './satelliteOperations';
import { add, rotateEarth, scale, surfaceAt } from './ascent';
import { fixedToLocal } from './coordinates';
import { DEFAULT_OPERATIONS_GUIDES, operationsGuideReading } from './operationsGuides';
import { createOperationsView } from './operationsView';

let initial:FlightState;
beforeAll(()=>{
  const session=new FlightSession(BASELINE_VEHICLE,843800000);
  for(const action of ['start','continue-ascent','separate','continue-orbit','coast','continue-deployment','open-fairing','deploy','analyze-avoidance','align-avoidance','ignite-avoidance','observe-avoidance','prepare-operations'] as const){
    session.action(action);let steps=0;while(session.running){if(++steps>40000)throw Error('Task did not reach checkpoint');session.advanceSteps(1);}
  }
  initial=structuredClone(session.state);
},30000);
function visibleState(){
  const s=structuredClone(initial),station=stationFixed(GROUND_STATIONS[0]);
  const fixed=add(station,scale(surfaceAt(station).up,400000));
  s.deployment!.satellite.fixedPosition=fixed;s.deployment!.satellite.position=rotateEarth(fixed,s.time);
  s.operations!.links=GROUND_STATIONS.map(st=>stationLink(s.deployment!.satellite.position,s.time,st));
  s.operations!.activeStation='A';s.operations!.collecting=false;s.operations!.transmitting=false;
  s.phase='ops-cycle';return s;
}
describe('explanatory satellite lines follow current work state',()=>{
  it('distinguishes a visible station from active data transfer without changing the task',()=>{
    const s=visibleState(),saved=JSON.stringify(s),view=createOperationsView(),origin=fixedToLocal(new THREE.Vector3(...s.deployment!.satellite.fixedPosition));
    expect(operationsGuideReading(s)?.contact).toContain('可见，未下传');view.update(s,origin,true);
    const contact=view.root.getObjectByName('ops-contact') as THREE.Line;
    expect(contact.visible).toBe(true);expect(contact.material).toBeInstanceOf(THREE.LineDashedMaterial);
    expect(JSON.stringify(s)).toBe(saved);
    s.phase='ops-downlink';s.operations!.transmitting=true;view.update(s,origin,true);
    expect(operationsGuideReading(s)?.transmitting).toBe(true);expect(contact.material).not.toBeInstanceOf(THREE.LineDashedMaterial);
  });
  it('draws no connection when no ground station is visible, including a stale active ID',()=>{
    const s=visibleState();s.deployment!.satellite.fixedPosition=[0,0,6800000];
    s.operations!.links=GROUND_STATIONS.map(st=>stationLink([0,0,6800000],s.time,st));s.operations!.transmitting=true;
    const view=createOperationsView();view.update(s,new THREE.Vector3(),true);
    expect(operationsGuideReading(s)?.station).toBeUndefined();expect(operationsGuideReading(s)?.transmitting).toBe(false);
    expect(view.root.getObjectByName('ops-contact')!.visible).toBe(false);expect(view.anchors.contact).toBeNull();
  });
  it('uses actual star-under-point and rotating solar direction in both camera scales',()=>{
    const s=visibleState(),fixed=s.deployment!.satellite.fixedPosition,geo=surfaceAt(fixed),origin=fixedToLocal(new THREE.Vector3(...fixed));
    const view=createOperationsView();view.update(s,origin,true);
    const end=(name:string)=>new THREE.Vector3().fromBufferAttribute((view.root.getObjectByName(name) as THREE.Line).geometry.getAttribute('position'),1);
    const actualNadir=fixedToLocal(new THREE.Vector3(...add(fixed,scale(geo.up,-geo.height)))).sub(origin);
    expect(end('ops-observation').distanceTo(actualNadir)).toBeLessThan(.1);
    const toSun=fixedToLocal(new THREE.Vector3(...rotateEarth(s.operations!.sunDirection,-s.time))).sub(fixedToLocal(new THREE.Vector3())).normalize();
    expect(end('ops-power').normalize().dot(toSun)).toBeCloseTo(1,6);
    view.update(s,origin,false);expect(end('ops-power').length()).toBeCloseTo(4.5,4);expect(view.root.visible).toBe(true);
  });
  it('keeps a shadow direction distinct from power and respects independent switches',()=>{
    const s=visibleState();s.operations!.shadow=true;const view=createOperationsView();view.update(s,new THREE.Vector3(),true);
    expect(operationsGuideReading(s)?.power).toContain('电池供电');
    expect((view.root.getObjectByName('ops-power') as THREE.Line).material).toBeInstanceOf(THREE.LineDashedMaterial);
    view.update(s,new THREE.Vector3(),true,{...DEFAULT_OPERATIONS_GUIDES,power:false,contact:false});
    expect(view.anchors.power).toBeNull();expect(view.anchors.contact).toBeNull();expect(view.anchors.observation).not.toBeNull();
  });
  it('removes work-stage lines and annotations after disposal begins or before release',()=>{
    const s=visibleState(),view=createOperationsView();view.update(s,new THREE.Vector3(),true);expect(view.root.visible).toBe(true);
    s.phase='disposal-armed';view.update(s,new THREE.Vector3(),true);expect(view.root.visible).toBe(false);expect(Object.values(view.anchors)).toEqual([null,null,null]);
    s.phase='ops-ready';s.deployment!.released=false;expect(operationsGuideReading(s)).toBeNull();
  });
});
