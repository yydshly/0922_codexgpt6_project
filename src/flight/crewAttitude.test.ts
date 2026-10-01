import {describe,it,expect} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {advanceCrewAttitude,CREW_ATTITUDE} from './crewAttitude';
import {createCrewMission,CrewMission} from './crewMission';
import {CAPSULE_REACTION_JETS,reactionJetStrength} from './reactionControl';
import {crewPlaybackRate} from './crewDirections';

describe('continuous crew attitude and return actuators',()=>{
  it('cannot turn a fuel-empty capsule in vacuum, but an aerodynamic moment can stabilize it',()=>{
    const target=new Vector3(0,1,0),q=new Quaternion(),w=new Vector3(),initial=q.clone();
    const empty=advanceCrewAttitude(q,w,target,.1,CREW_ATTITUDE.capsule,0);
    expect(q.angleTo(initial)).toBe(0);expect(w.length()).toBe(0);expect(empty.fuelUsedKg).toBe(0);expect(empty.effort.length()).toBe(0);
    const aero=advanceCrewAttitude(q,w,target,.1,CREW_ATTITUDE.capsule,0,6000);
    expect(q.angleTo(initial)).toBeGreaterThan(0);expect(aero.passiveTorque.length()).toBeGreaterThan(0);expect(aero.fuelUsedKg).toBe(0);
    expect(w.clone().multiplyScalar(CREW_ATTITUDE.capsule.inertiaKgM2/.1).distanceTo(aero.torque)).toBeLessThan(1e-9);
  });
  it('uses capsule nozzle couples with the right torque sign and cancelling translation',()=>{
    const center=new Vector3(0,0,-2.6);
    for(const axis of [new Vector3(1,0,0),new Vector3(0,-1,0),new Vector3(0,0,1)]){
      const force=new Vector3(),torque=new Vector3();
      for(const jet of CAPSULE_REACTION_JETS){const level=reactionJetStrength(jet,axis,new Vector3());
        const f=new Vector3(...jet.exhaust).multiplyScalar(-level);force.add(f);torque.add(new Vector3(...jet.position).sub(center).cross(f));}
      expect(force.length()).toBeLessThan(1e-9);expect(torque.clone().normalize().dot(axis)).toBeCloseTo(1);
    }
  });
  it('flies with continuous pose, finite angular acceleration, coherent thrust and an actual coast phase',()=>{
    const m=createCrewMission();m.start();let previous=m.snapshot(),coast=false,entry=false,maxStep=0,capsuleJetSteps=0;
    while(!['complete','failed'].includes(m.phase)){
      m.step();const s=m.snapshot(),rig=s.serviceAttached?['countdown','ascent','upper','insertion'].includes(previous.phase)?CREW_ATTITUDE.carrier:CREW_ATTITUDE.service:CREW_ATTITUDE.capsule;
      const oldQ=new Quaternion(...previous.attitude),q=new Quaternion(...s.attitude),oldW=new Vector3(...previous.angularVelocity),w=new Vector3(...s.angularVelocity);
      const turn=oldQ.angleTo(q);maxStep=Math.max(maxStep,turn);
      expect(turn).toBeLessThanOrEqual(.01200001);
      expect(w.clone().sub(oldW).length()).toBeLessThanOrEqual(.00600001);
      // Jettison publishes no service torque; its inherited angular velocity is unchanged.
      if(s.phase===previous.phase)expect(w.clone().sub(oldW).multiplyScalar(rig.inertiaKgM2/.1).distanceTo(new Vector3(...s.attitudeTorqueNm))).toBeLessThan(1e-6);
      const thrust=new Vector3(...s.thrust);if(thrust.length()>100&&['ascent','upper','insertion','deorbit','landing'].includes(s.phase))expect(new Vector3(0,0,-1).applyQuaternion(q).dot(thrust.normalize())).toBeGreaterThan(.99999);
      expect(s.capsuleRcsFuelKg).toBeLessThanOrEqual(previous.capsuleRcsFuelKg);
      if(s.phase==='return-coast'){coast=true;if(previous.phase==='deorbit'){expect(s.altitudeM).toBeGreaterThan(350000);expect(s.serviceAttached).toBe(false);expect(turn).toBeLessThan(.002);}if(new Vector3(...s.attitudeEffort).length()>.01)capsuleJetSteps++;}
      if(s.phase==='entry'&&previous.phase==='return-coast'){entry=true;expect(s.altitudeM).toBeLessThanOrEqual(120000);expect(s.altitudeM).toBeGreaterThan(119000);}
      previous=s;
    }
    expect(m.phase,m.message).toBe('complete');expect(coast&&entry).toBe(true);expect(capsuleJetSteps).toBeGreaterThan(10);expect(maxStep).toBeGreaterThan(.005);expect(m.capsuleRcsFuel).toBeGreaterThan(0);
  },30000);
  it('saves during the new coast stage, resumes identically and slows visible turns',()=>{
    const m=createCrewMission();m.start();while(!['return-coast','failed'].includes(m.phase))m.step();expect(m.phase).toBe('return-coast');for(let i=0;i<15;i++)m.step();
    const restored=CrewMission.restore(JSON.parse(JSON.stringify(m.save())));for(let i=0;i<100;i++){m.step();restored.step();}expect(restored.snapshot()).toEqual(m.snapshot());
    expect(crewPlaybackRate({...m.snapshot(),angularVelocity:[.02,0,0]},180)).toBe(1);
    expect(crewPlaybackRate({...m.snapshot(),angularVelocity:[0,0,0]},180)).toBe(180);
  });
});
