import {describe,expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {crewDirections,crewPlaybackRate} from './crewDirections';
import {createCrewMission,type CrewPhase,type CrewSnapshot} from './crewMission';
import {airVelocity} from '../launch/ascent';

describe('crewed flight direction references',()=>{
  it('keeps inertial, atmosphere and platform velocities separate, including a stationary launch pad',()=>{
    const s=createCrewMission().snapshot(),d=crewDirections(s);
    expect(d.inertialVelocity.length()).toBeGreaterThan(300);expect(d.airRelativeVelocity.length()).toBeLessThan(1e-9);
    expect(d.inertialVelocity.toArray()).toEqual(s.velocity);expect(d.heatShield.dot(d.forward)).toBeCloseTo(-1);
    const orbit={...s,phase:'observe' as CrewPhase,velocity:[0,7700,0],targetVelocity:[0,7699.95,0]} as CrewSnapshot;
    const p=crewDirections(orbit);expect(p.inertialVelocity.length()).toBe(7700);expect(p.platformRelativeVelocity.length()).toBeCloseTo(.05);
  });
  it('slows only playback during a finite deorbit turn and keeps the burn capped at 10×',()=>{
    const s=createCrewMission().snapshot(),forward=new Vector3(0,0,-1),reverse=new Vector3(...s.velocity).negate().normalize();
    const turning={...s,phase:'deorbit' as CrewPhase,attitude:new Quaternion().setFromUnitVectors(forward,reverse.clone().negate()).toArray()};
    expect(crewPlaybackRate(turning,180)).toBe(1);
    const aligned={...turning,attitude:new Quaternion().setFromUnitVectors(forward,reverse).toArray(),angularVelocity:[0,0,0] as [number,number,number]};
    expect(crewPlaybackRate(aligned,180)).toBe(10);expect(crewPlaybackRate(aligned,1)).toBe(1);
    expect(crewPlaybackRate({...aligned,angularVelocity:[.1,0,0]},180)).toBe(1);
    expect(crewPlaybackRate({...s,phase:'ascent'},180)).toBe(180);
  });
  it('points launch thrust toward the nose, deorbit thrust backward, and the reentry heat shield into the air',()=>{
    const m=createCrewMission();m.start();let launch=0,burn=0,entry=0,landing=0,entered=false,contact=false;
    while(m.phase!=='complete'&&m.phase!=='failed'){
      m.step();const s=m.snapshot(),d=crewDirections(s),thrust=new Vector3(...s.thrust);
      if(s.phase==='ascent'&&thrust.length()>100){expect(d.forward.dot(thrust.normalize())).toBeGreaterThan(.999);launch++;}
      if(s.phase==='deorbit'&&thrust.length()>100){expect(d.forward.dot(thrust.clone().normalize())).toBeGreaterThan(.999);expect(d.thrustVelocityDeg).toBeGreaterThan(178);burn++;}
      if(s.phase==='entry'){expect(d.heatShieldAirDeg).toBeLessThan(5);if(!entered){entered=true;expect(thrust.length()).toBe(0);expect(s.mainFraction).toBe(0);expect(s.altitudeM).toBeLessThanOrEqual(120000);}const air=new Vector3(...s.velocity).sub(new Vector3(...airVelocity(s.position)));expect(new Vector3(...s.drag).dot(air)).toBeLessThanOrEqual(0);entry++;}
      if(s.phase==='landing'&&thrust.length()>100){expect(d.forward.dot(thrust.clone().normalize())).toBeGreaterThan(.99999);landing++;}
      if(s.phase==='touchdown'&&!contact){contact=true;expect(thrust.length()).toBe(0);expect(new Vector3(...s.chuteForce).length()).toBe(0);expect(new Vector3(...s.contactForce).length()).toBeGreaterThan(30000);}
      expect(new Vector3(...s.gravity).dot(new Vector3(...s.position))).toBeLessThan(0);
    }
    expect(m.phase,m.message).toBe('complete');expect(launch).toBeGreaterThan(100);expect(burn).toBeGreaterThan(100);expect(entry).toBeGreaterThan(100);expect(landing).toBeGreaterThan(10);
  },30000);
});
