import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { makePilotShip } from './pilotShip';
import { disposeEnvironmentScene } from './environmentMeshes';
import { createFlightState,stepFlight,FLIGHT_STEP } from './flightPractice';
import { idleInput } from './autopilot';
import {createCrewReturnVisuals} from './crewReturnVisuals';
import {createCrewMission} from './crewMission';
import {CREW_GROUND_OPTICS,crewGroundView} from './crewObservation';
import {LAUNCH_EARTH} from '../data/launchMission';

let scene:THREE.Scene;
beforeEach(()=>{
  // Canvas drawing is verified in the browser. These tests check actual hull occlusion geometry.
  const context={fillRect:vi.fn(),clearRect:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),fillText:vi.fn()};
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>context})});
  scene=new THREE.Scene();
});
afterEach(()=>{disposeEnvironmentScene(scene);vi.unstubAllGlobals();});

describe('physical cockpit window',()=>{
  it('removes the service fastener rings with their module, leaving only capsule hardware on return',()=>{
    const ship=makePilotShip();scene.add(ship.group);
    const capsule=ship.group.getObjectByName('capsule-fasteners') as THREE.InstancedMesh,service=ship.group.getObjectByName('service-fasteners') as THREE.InstancedMesh;
    expect(capsule.count).toBe(56);expect(service.count).toBe(64);expect(capsule.parent).toBe(ship.group);expect(service.parent).toBe(ship.serviceGroup);
    ship.serviceGroup.visible=false;expect(capsule.parent?.visible).toBe(true);expect(service.parent?.visible).toBe(false);
  });
  it('shows only the working torque pair and swaps it for rate braking',()=>{
    const ship=makePilotShip(),state=createFlightState();scene.add(ship.group);
    stepFlight(state,{...idleInput(),yaw:1},FLIGHT_STEP,[]);ship.updatePropulsion(state,true);
    const active=()=>ship.attitudeGlow.children.filter(j=>j.visible).map(j=>j.name);
    const starting=active();expect(starting).toHaveLength(2);expect(starting.every(n=>n.startsWith('yaw'))).toBe(true);expect(ship.plume.visible).toBe(false);
    stepFlight(state,idleInput(),FLIGHT_STEP,[]);ship.updatePropulsion(state,true);expect(active()).toHaveLength(2);expect(active().every(n=>!starting.includes(n))).toBe(true);
    ship.updatePropulsion(state,false);expect(active()).toHaveLength(0);expect(ship.attitudeGlow.visible).toBe(false);
  });
  it.each([false,true].flatMap(crewCouch=>[0,Math.PI/2,Math.PI].map(yaw=>({crewCouch,yaw}))))('keeps the pilot forward view open at ship yaw $yaw, crew couch $crewCouch',({yaw,crewCouch})=>{
    const ship=makePilotShip({crewCouch});scene.add(ship.group);
    ship.group.position.set(120,-43,68);ship.group.rotation.set(.24,yaw,-.15);scene.updateMatrixWorld(true);
    const origin=ship.group.localToWorld(ship.cockpit.eye.clone());
    for(const angle of [-.2,0,.2]){
      const direction=new THREE.Vector3(Math.sin(angle),0,-Math.cos(angle)).applyQuaternion(ship.group.quaternion);
      const ray=new THREE.Raycaster(origin,direction,0,5),hits=ray.intersectObject(ship.group,true);
      expect(hits.some(hit=>hit.object.name==='forward-windshield')).toBe(true);
      const opaque=hits.filter(hit=>{
        if(!(hit.object instanceof THREE.Mesh))return false;
        // First-person hides the pilot's head; raycasting itself ignores Object3D.visible.
        for(let parent:THREE.Object3D|null=hit.object;parent;parent=parent.parent)if(!parent.visible)return false;
        const materials=Array.isArray(hit.object.material)?hit.object.material:[hit.object.material];
        return materials.some(material=>!material.transparent);
      });
      expect(opaque.map(hit=>hit.object.name||hit.object.type)).toEqual([]);
    }
  });
  it('uses the same seated body in crew view and hides only the head at the pilot eye',()=>{
    const ship=makePilotShip();scene.add(ship.group);const pilot=ship.cockpit.pilot;
    expect(ship.group.getObjectByName('seated-pilot')).toBe(pilot.group);
    pilot.setView(false);expect(pilot.head.visible).toBe(true);expect(pilot.group.children.length).toBeGreaterThan(15);
    pilot.setView(true);expect(pilot.head.visible).toBe(false);expect(pilot.group.visible).toBe(true);
    ship.cockpit.controls({...idleInput(),yaw:1},false);expect(pilot.group.userData.control).toBe('monitoring');
    ship.cockpit.controls({...idleInput(),yaw:1},true);expect(pilot.group.userData.control).toBe('manual');
  });
  it('keeps the mounted base-camera centre ray clear of deployed feet, nozzles and heat shield',()=>{
    const ship=makePilotShip({crewCouch:true}),hardware=createCrewReturnVisuals();scene.add(ship.group,hardware.parachutes);ship.group.add(hardware.body,hardware.attitudeBody);
    const attitude=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(1,0,0));
    const s={...createCrewMission().snapshot(),phase:'landing' as const,carrierStage:'none' as const,serviceAttached:false,position:[LAUNCH_EARTH.semiMajorM+10,0,0] as [number,number,number],altitudeM:10,mainChuteFraction:1,attitude:attitude.toArray(),thrust:[14000,0,0] as [number,number,number]};
    ship.serviceGroup.visible=false;ship.heatShield.visible=true;ship.group.quaternion.copy(attitude);hardware.update(s);scene.updateMatrixWorld(true);
    const feed=crewGroundView(s),ray=new THREE.Raycaster(feed.position,feed.forward,.04,50);
    const opaque=ray.intersectObject(ship.group,true).filter(hit=>{
      for(let p:THREE.Object3D|null=hit.object;p;p=p.parent)if(!p.visible)return false;
      if(!(hit.object instanceof THREE.Mesh))return false;
      return (Array.isArray(hit.object.material)?hit.object.material:[hit.object.material]).some(m=>!m.transparent);
    });
    expect(hardware.legParts.every(part=>part.group.visible)).toBe(true);
    expect(feed.rangeM).toBeGreaterThan(9);expect(opaque.map(hit=>hit.object.name||hit.object.type)).toEqual([]);
    // The old cardinal mount would stare straight into landing foot 0, proving the occlusion check matters.
    const blocked=new THREE.Raycaster(new THREE.Vector3(2.6,0,CREW_GROUND_OPTICS.position[2]).applyQuaternion(attitude),feed.forward,.04,50);
    expect(blocked.intersectObject(ship.group,true).some(hit=>hit.object.name==='landing-foot-0')).toBe(true);
  });
  it('uses the crew avatar hands once, keeping their controls within reach',()=>{
    const ship=makePilotShip({crewCouch:true});scene.add(ship.group);
    expect(ship.group.getObjectByName('cockpit-left-glove')).toBeUndefined();expect(ship.group.getObjectByName('cockpit-right-glove')).toBeUndefined();
    expect(ship.group.getObjectByName('crew-pilot-left-glove')).toBeTruthy();expect(ship.group.getObjectByName('crew-pilot-right-glove')).toBeTruthy();
    ship.cockpit.controls({...idleInput(),thrust:1,brake:true},true);
    const lever=ship.group.getObjectByName('pilot-throttle-hand')!,hand=ship.group.getObjectByName('crew-pilot-left-glove')!;
    expect(lever.position.distanceTo(hand.position)).toBeLessThan(.05);
  });
});
