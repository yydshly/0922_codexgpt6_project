import {describe,it,expect} from 'vitest';
import {Vector3} from 'three';
import {createCrewMission,crewIdle,CREW_VEHICLE,CrewMission,type CrewPhase} from './crewMission';
import {orbitalElements} from '../launch/orbitInsertion';
const until=(m:CrewMission,phase:CrewPhase,limit=150000)=>{for(let i=0;i<limit&&m.phase!==phase&&m.phase!=='failed';i++)m.step();expect(m.phase,m.message).toBe(phase);};
describe('continuous crewed Earth mission',()=>{
  it('restores resources, attitude and integrator counters and continues the same flight',()=>{
    const m=createCrewMission();m.start();until(m,'approach');m.takeOver();for(let i=0;i<30;i++)m.step(.1,{...crewIdle(),yaw:.5});m.resumeAutomatic();
    const restored=CrewMission.restore(JSON.parse(JSON.stringify(m.save())));
    expect(restored.snapshot()).toEqual(m.snapshot());
    until(m,'complete');until(restored,'complete');expect(restored.snapshot()).toEqual(m.snapshot());
  },15000);
  it('allows ground and every flown phase to be restored without changing the snapshot',()=>{
    const m=createCrewMission();expect(CrewMission.restore(m.save()).snapshot()).toEqual(m.snapshot());m.start();let last='';
    while(m.phase!=='complete'&&m.phase!=='failed'){if(m.phase!==last){last=m.phase;expect(CrewMission.restore(m.save()).snapshot()).toEqual(m.snapshot());}m.step();}
    expect(m.phase).toBe('complete');expect(CrewMission.restore(m.save()).snapshot()).toEqual(m.snapshot());
  },15000);
  it('rejects invalid or incompatible saves without mutating the current mission',()=>{
    const m=createCrewMission(),before=m.snapshot(),data=m.save();
    expect(()=>CrewMission.restore({...data,vehicleVersion:'other'})).toThrow('版本');
    expect(()=>CrewMission.restore({...data,state:{...data.state,serviceFuelKg:901}})).toThrow('资源');
    expect(()=>CrewMission.restore({...data,state:{...data.state,massKg:1}})).toThrow('质量');
    expect(()=>CrewMission.restore({...data,state:{...data.state,phase:'complete'}})).toThrow();
    expect(m.snapshot()).toEqual(before);
  });
  it('flies from ground through observation and finite soft landing without adding fuel',()=>{
    const m=createCrewMission();m.start();until(m,'complete');const s=m.snapshot();
    expect(m.events.map(e=>e.phase)).toEqual(expect.arrayContaining(['countdown','ascent','upper','insertion','approach','observe','return-ready','deorbit','entry','drogue','main-chute','landing','touchdown','complete']));
    expect(s.inspection?.relativeSpeedMS).toBeLessThan(.15);expect(s.inspection?.pointingDeg).toBeLessThan(6);
    expect(s.touchdownSpeedMS).toBeGreaterThan(0);expect(s.touchdownSpeedMS).toBeLessThan(3);
    expect(s.touchdownHorizontalMS).toBeLessThan(5);expect(s.landingFuelKg).toBeGreaterThan(0);expect(s.landingFuelKg).toBeLessThan(100);
    expect(s.serviceFuelKg).toBeLessThan(900);expect(s.capsuleRcsFuelKg).toBeGreaterThan(0);expect(s.capsuleRcsFuelKg).toBeLessThan(18);expect(s.massKg).toBeCloseTo(CREW_VEHICLE.capsuleDryKg+s.landingFuelKg+s.capsuleRcsFuelKg);
    expect(s.altitudeM).toBeGreaterThan(1);expect(s.altitudeM).toBeLessThan(2);expect(s.peakG).toBeLessThan(10);
  });
  it('keeps ground constraint until release and burns at T−3 instead of silently refilling',()=>{
    const m=createCrewMission();const initial=m.snapshot();expect(initial.properG).toBeCloseTo(1);m.start();
    for(let i=0;i<95;i++)m.step();const before=m.snapshot();expect(before.phase).toBe('countdown');expect(before.released).toBe(false);
    expect(before.altitudeM).toBeCloseTo(70.5,1);expect(before.launchFuelKg).toBeLessThan(initial.launchFuelKg);
    expect(before.serviceFuelKg).toBe(900);expect(before.landingFuelKg).toBe(100);until(m,'ascent');expect(m.released).toBe(true);
    expect(m.snapshot().contactForce).toEqual([0,0,0]);expect(m.snapshot().attitudeSource).toContain('约束已释放');
  });
  it('hands off the integrated launch state, not a local zero-velocity practice state',()=>{
    const m=createCrewMission();m.start();let before=m.snapshot();
    while(m.phase!=='approach'&&m.phase!=='failed'){before=m.snapshot();m.step();}
    const s=m.snapshot();expect(s.phase).toBe('approach');expect(s.orbitalSpeedMS).toBeGreaterThan(7000);
    const travel=new Vector3(...s.position).distanceTo(new Vector3(...before.position));expect(travel).toBeGreaterThan(600);expect(travel).toBeLessThan(900);
    expect(s.time-before.time).toBeCloseTo(.1);expect(s.serviceFuelKg).toBe(900);expect(s.landingFuelKg).toBe(100);
    expect(orbitalElements(s.position,s.velocity).periapsisM).toBeGreaterThan(390000);
    expect(s.attitudeTorqueNm).toEqual([0,0,0]);expect(s.attitudeEffort).toEqual([0,0,0]);expect(s.attitudeSource).toContain('服务舱');
  });
  it('turns without rotating the existing velocity and coasts in Earth gravity',()=>{
    const m=createCrewMission();m.start(false);until(m,'approach');const before=m.snapshot();m.takeOver();expect(m.position).toEqual(before.position);expect(m.velocity).toEqual(before.velocity);
    for(let i=0;i<100;i++)m.step(.1,{...crewIdle(),yaw:1});const after=m.snapshot();
    expect(after.angularVelocity.some(x=>Math.abs(x)>.01)).toBe(true);expect(after.orbitalSpeedMS).toBeGreaterThan(7000);
    const linear=new Vector3(...before.position).addScaledVector(new Vector3(...before.velocity),10);
    expect(linear.distanceTo(new Vector3(...after.position))).toBeGreaterThan(300);
    expect(new Vector3(...before.velocity).angleTo(new Vector3(...after.velocity))).toBeLessThan(.03);
    expect(after.serviceFuelKg).toBeLessThan(before.serviceFuelKg);expect(after.relativeSpeedMS).toBeLessThan(1);
  });
  it('requires actual observation and landing conditions before recording completion',()=>{
    const m=createCrewMission();expect(m.observe()).toBe(false);expect(m.mainChute()).toBe(false);m.recover();expect(m.phase).toBe('ground');
    m.start(false);until(m,'observe');m.position=m.position.map((x,i)=>x+(i===0?200:0)) as [number,number,number];expect(m.observe()).toBe(false);expect(m.inspection).toBeUndefined();
  });
  it('retains the approach and resource state when manual control is resumed automatically',()=>{
    const m=createCrewMission();m.start(false);until(m,'approach');m.takeOver();for(let i=0;i<20;i++)m.step(.1,{...crewIdle(),thrust:.2});const before=m.snapshot();m.resumeAutomatic();const after=m.snapshot();
    expect(after.position).toEqual(before.position);expect(after.velocity).toEqual(before.velocity);expect(after.serviceFuelKg).toBe(before.serviceFuelKg);expect(after.time).toBe(before.time);
    until(m,'observe');expect(m.snapshot().relativeSpeedMS).toBeLessThan(.15);
  });
});
