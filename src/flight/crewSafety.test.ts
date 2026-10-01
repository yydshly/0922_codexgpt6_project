import {beforeAll,describe,it,expect} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {createCrewMission,CrewMission,CREW_VEHICLE,type CrewPhase} from './crewMission';
import {CREW_ATTITUDE,advanceCrewAttitude} from './crewAttitude';
import {crewContactFrame,crewSupportedFeet,CREW_RETURN_GEOMETRY} from './crewContact';
import {airVelocity,surfaceAt,type V3} from '../launch/ascent';
const saves=new Map<CrewPhase,ReturnType<CrewMission['save']>>();
beforeAll(()=>{
  const m=createCrewMission();m.start();
  while(!['complete','failed'].includes(m.phase)){
    m.step();if(!saves.has(m.phase)&&(['upper','insertion','landing'].includes(m.phase)||m.phase==='touchdown'&&m.snapshot().recoveryReady))saves.set(m.phase,m.save());
  }
  expect(m.phase,m.message).toBe('complete');saves.set('complete',m.save());
},30000);
const restore=(phase:CrewPhase)=>CrewMission.restore(structuredClone(saves.get(phase)!));
const contactFault=(tiltDeg=0,rateRadS=0,verticalMS=1,horizontalMS=0,legs=true)=>{
  let m=restore('landing');m.fullDemo=false;const local=surfaceAt(m.position),up=new Vector3(...local.up),east=new Vector3(...local.east);
  m.attitude.setFromUnitVectors(new Vector3(0,0,-1),up).premultiply(new Quaternion().setFromAxisAngle(east,tiltDeg*Math.PI/180));
  m.angularVelocity.set(rateRadS,0,0);m.capsuleRcsFuel=0;
  if(!legs){const save=m.save();save.state.phase='drogue';save.integration.mainTime=null;m=CrewMission.restore(save);}
  const frame=crewContactFrame(m.position,m.attitude,legs);
  m.position=new Vector3(...m.position).addScaledVector(up,.01-frame.clearanceM).toArray() as V3;
  m.velocity=new Vector3(...airVelocity(m.position)).addScaledVector(up,-verticalMS).addScaledVector(east,horizontalMS).toArray() as V3;
  return m;
};
describe('crewed phase boundaries and abnormal landings',()=>{
  it('coasts for the entire unpowered upper-stage interval without invented TVC torque or freezing rotation',()=>{
    const m=restore('upper');m.angularVelocity.set(.01,0,0);let steps=0;
    for(let i=0;i<30;i++){
      const q=m.attitude.clone(),w=m.angularVelocity.clone();m.step();const s=m.snapshot();
      expect(s.phase).toBe('upper');expect(new Vector3(...s.thrust).length()).toBe(0);expect(new Vector3(...s.attitudeTorqueNm).length()).toBe(0);
      expect(m.angularVelocity.toArray()).toEqual(w.toArray());expect(m.attitude.angleTo(q)).toBeCloseTo(.001,8);expect(s.attitudeSource).toContain('无主动控制力矩');steps++;
    }
    expect(steps).toBe(30);
  });
  it('bounds TVC control authority by actual ramping motor thrust',()=>{
    const m=restore('upper');m.attitude.multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.4));
    for(let i=0;i<70;i++){
      m.step();const s=m.snapshot(),ratio=new Vector3(...s.thrust).length()/CREW_VEHICLE.upperThrustN;
      expect(new Vector3(...s.attitudeTorqueNm).length()).toBeLessThanOrEqual(CREW_ATTITUDE.carrier.maxTorqueNm*ratio+1e-6);
    }
  });
  it.each([60,180])('rejects a %s° tilted contact at the first actual foot/hull instead of waiting for a 2 m centre',tilt=>{
    const m=contactFault(tilt);m.step();const s=m.snapshot();expect(s.phase).toBe('failed');expect(s.message).toMatch(/倾角|舱体/);
    expect(s.altitudeM).toBeGreaterThan(2);expect(Math.abs(s.lowestPointClearanceM)).toBeLessThan(1e-5);expect(s.recoveryReady).toBe(false);
    const before=m.snapshot();m.step();m.recover();expect(m.snapshot()).toEqual(before);expect(CrewMission.restore(m.save()).snapshot()).toEqual(m.snapshot());
  });
  it.each([{rate:.2,v:1,h:0,reason:'角速率'},{rate:0,v:4,h:0,reason:'速度'},{rate:0,v:1,h:6,reason:'速度'}])('rejects high-speed / rotating first contact: $reason',fault=>{
    const m=contactFault(0,fault.rate,fault.v,fault.h);m.step();expect(m.phase).toBe('failed');expect(m.message).toContain(fault.reason);
  });
  it('detects the capsule envelope when the feet have not deployed',()=>{
    const m=contactFault(0,0,1,0,false);m.step();expect(m.phase).toBe('failed');expect(m.message).toContain('支脚未展开');expect(m.message).toContain('舱体');
  });
  it('retains connected upper-stage mass and attachment on launch failure and save/restore',()=>{
    const m=restore('insertion');m.upperFuel=0;const mass=m.mass;m.step();expect(m.phase).toBe('failed');expect(m.mass).toBe(mass);expect(m.snapshot().carrierStage).toBe('upper');
    expect(CrewMission.restore(m.save()).mass).toBe(mass);
  });
  it('requires observation and actual settled motion before recovery, and rejects a forged completed save',()=>{
    const m=restore('touchdown');m.fullDemo=false;expect(m.snapshot().recoveryReady).toBe(true);
    m.inspection=undefined;expect(m.recover()).toBe(false);expect(m.message).toContain('平台观察');
    const spinning=restore('touchdown');spinning.angularVelocity.set(.02,0,0);expect(spinning.recover()).toBe(false);expect(spinning.message).toContain('停稳');
    const forged=restore('complete').save();forged.state.angularVelocity=[.02,0,0];expect(()=>CrewMission.restore(forged)).toThrow('稳定');
    const airborne=restore('complete').save(),up=new Vector3(...surfaceAt(airborne.state.position).up);
    airborne.state.position=new Vector3(...airborne.state.position).addScaledVector(up,100).toArray() as V3;airborne.state.velocity=airVelocity(airborne.state.position);
    expect(()=>CrewMission.restore(airborne)).toThrow('稳定');
  });
  it('uses contact event time for the actual state and restores a fractional-step checkpoint identically',()=>{
    const m=restore('landing');let before=m.time;while(!['touchdown','failed'].includes(m.phase)){before=m.time;m.step();}
    expect(m.phase).toBe('touchdown');expect(m.events.at(-1)?.time).toBe(m.time);expect(m.time-before).toBeGreaterThan(0);expect(m.time-before).toBeLessThanOrEqual(.1);
    const r=CrewMission.restore(m.save());for(let i=0;i<100;i++){m.step();r.step();}expect(r.snapshot()).toEqual(m.snapshot());
  });
  it('never extends legs beyond their deployed length or fits feet to hide an unsafe tilt',()=>{
    const m=contactFault(60),q=m.attitude,up=new Vector3(...surfaceAt(m.position).up),feet=crewSupportedFeet(1,q,up,true);
    for(const p of feet)expect(p.z).toBe(CREW_RETURN_GEOMETRY.contactHeightM);
    const nominal=restore('touchdown').snapshot(),nq=new Quaternion(...nominal.attitude),nu=new Vector3(...surfaceAt(nominal.position).up);
    for(const p of crewSupportedFeet(nominal.altitudeM,nq,nu,true))expect(p.z).toBeLessThanOrEqual(2);
  });
  it('retains passive restoring torque when there is no usable jet fuel',()=>{
    const q=new Quaternion(),w=new Vector3(.4,0,0),target=new Vector3(0,1,0);
    const a=advanceCrewAttitude(q.clone(),w.clone(),target,.1,CREW_ATTITUDE.capsule,0,6000),b=advanceCrewAttitude(q.clone(),w.clone(),target,.1,CREW_ATTITUDE.capsule,0,6000,undefined,0);
    expect(a.torque.toArray()).toEqual(b.torque.toArray());expect(a.effort.length()).toBe(0);expect(a.passiveTorque.length()).toBeGreaterThan(0);
  });
});
