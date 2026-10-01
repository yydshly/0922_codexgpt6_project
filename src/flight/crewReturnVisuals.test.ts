import {beforeAll,describe,expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {createCrewMission,CrewMission,CREW_VEHICLE,type CrewSnapshot} from './crewMission';
import {crewDirections,crewForceBalance} from './crewDirections';
import {createCrewReturnVisuals,crewReturnFrame,CREW_RETURN_GEOMETRY} from './crewReturnVisuals';
import {surfaceAt} from '../launch/ascent';
import {crewContactFrame} from './crewContact';
const samples=new Map<string,CrewSnapshot>();
beforeAll(()=>{
  const m=createCrewMission();m.start();
  while(!['complete','failed'].includes(m.phase)){
    m.step();const s=m.snapshot();
    if(s.phase==='entry'&&s.altitudeM<50000&&!samples.has('entry'))samples.set('entry',s);
    if(s.phase==='drogue'&&s.drogueFraction===1&&!samples.has('drogue'))samples.set('drogue',s);
    if(s.phase==='main-chute'&&s.altitudeM<500&&!samples.has('main'))samples.set('main',s);
    if(s.phase==='landing'&&s.altitudeM<5&&!samples.has('landing'))samples.set('landing',s);
    if(s.phase==='touchdown'&&s.altitudeM<1.8&&!samples.has('touchdown'))samples.set('touchdown',s);
  }
  expect(m.phase,m.message).toBe('complete');samples.set('complete',m.snapshot());
},30000);
describe('capsule descent hardware and forces',()=>{
  it('uses the same projected parachute area as the solver, with fore attachments and canopy along the pull direction',()=>{
    for(const key of ['drogue','main']){
      const s=samples.get(key)!,frame=crewReturnFrame(s),q=new Quaternion(...s.attitude);
      expect(frame.canopies.reduce((sum,c)=>sum+Math.PI*c.radiusM**2,0)).toBeCloseTo(s.chuteAreaM2,8);
      const active=frame.canopies.find(c=>c.areaM2>1)!;
      expect(active.areaM2).toBe(key==='drogue'?CREW_VEHICLE.drogueAreaM2:CREW_VEHICLE.mainChuteAreaM2);
      expect(active.center.clone().sub(new Vector3(0,0,CREW_RETURN_GEOMETRY.anchorZ).applyQuaternion(q)).normalize().dot(new Vector3(...s.chuteForce).normalize())).toBeCloseTo(1,8);
      for(const anchor of active.anchors)expect(anchor.clone().applyQuaternion(q.clone().invert()).z).toBeCloseTo(CREW_RETURN_GEOMETRY.anchorZ);
      expect(new Vector3(...s.chuteForce).dot(crewDirections(s).airRelativeVelocity)).toBeLessThan(0);
    }
  });
  it('keeps exhaust tips on fixed wide nozzle exits while power changes, with exhaust opposite to thrust',()=>{
    const s=samples.get('landing')!,visual=createCrewReturnVisuals(),q=new Quaternion(...s.attitude);
    const fixed=visual.jets.map(j=>j.flame.position.toArray());
    for(const factor of [.2,.8]){
      visual.update({...s,thrust:s.thrust.map(x=>x*factor) as [number,number,number]});visual.body.updateMatrixWorld(true);
      visual.jets.forEach((j,i)=>{
        expect(j.flame.position.toArray()).toEqual(fixed[i]);
        const exit=j.nozzle.localToWorld(new Vector3(0,-.26,0));expect(exit.distanceTo(j.flame.position)).toBeLessThan(1e-10);
        const flameDirection=new Vector3(0,-1,0).applyQuaternion(j.flame.quaternion).applyQuaternion(q);
        expect(flameDirection.dot(new Vector3(...s.thrust).normalize())).toBeCloseTo(-1,8);
      });
    }
  });
  it('keeps all compressed support feet on the ground after contact rather than penetrating it',()=>{
    for(const key of ['touchdown','complete']){
      const s=samples.get(key)!,q=new Quaternion(...s.attitude),up=new Vector3(...surfaceAt(s.position).up);
      const frame=crewContactFrame(s.position,q,true,crewReturnFrame(s).footBottoms);
      expect(Math.abs(frame.footClearanceM)).toBeLessThan(1e-5);
      for(const foot of crewReturnFrame(s).footBottoms)expect(foot.applyQuaternion(q).dot(up)+s.altitudeM).toBeGreaterThanOrEqual(-1e-5);
    }
    expect(samples.get('complete')!.altitudeM).toBeLessThan(2);
  });
  it('distinguishes downward motion from upward braking and suppresses direction angles at rest',()=>{
    const s=samples.get('landing')!,d=crewDirections(s),balance=crewForceBalance(s);
    expect(s.verticalMS).toBeLessThan(0);expect(balance.verticalN).toBeGreaterThan(0);expect(balance.explanation).toContain('正在减小下降速度');
    expect(d.thrustAirDeg).toBeGreaterThan(170);expect(d.heatShieldAirDeg).toBeLessThan(10);
    const final=crewDirections(samples.get('complete')!);expect(final.airRelativeVelocity.length()).toBeLessThan(.05);expect(final.heatShieldAirDeg).toBeNull();expect(final.forwardAirDeg).toBeNull();expect(final.thrustAirDeg).toBeNull();
    expect(Math.abs(crewForceBalance(samples.get('complete')!).verticalAccelerationMS2)).toBeLessThan(.01);
  });
  it('derives new chute readouts when restoring older valid saves without new display fields',()=>{
    const m=createCrewMission(),save=m.save();
    for(const name of ['chuteAreaM2','mainChuteFraction','drogueFraction'])delete (save.state as unknown as Record<string,unknown>)[name];
    expect(CrewMission.restore(save).snapshot()).toEqual(m.snapshot());
  });
});
