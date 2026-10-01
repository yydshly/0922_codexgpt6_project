import {beforeAll,describe,expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {airVelocity,add,scale,surfaceAt} from '../launch/ascent';
import {createCrewMission,CrewMission,crewIdle,type CrewPhase,type CrewSnapshot} from './crewMission';
import {crewPlaybackRate} from './crewDirections';
import {CREW_PILOT_FLIGHT_PHASES,CREW_PILOT_THROTTLE_PHASES,type CrewPilotAction} from './crewPilotControl';

type MissionSave=ReturnType<CrewMission['save']>;
const requiredActions:CrewPilotAction[]=['ignite','release','separate-booster','ignite-upper','separate-ship','begin-deorbit','separate-service','open-drogue','open-main','enable-landing','recover'];
const flightState=(s:CrewSnapshot)=>({time:s.time,position:s.position,velocity:s.velocity,attitude:s.attitude,angularVelocity:s.angularVelocity,
  carrierStage:s.carrierStage,serviceAttached:s.serviceAttached,released:s.released,massKg:s.massKg,
  launchFuelKg:s.launchFuelKg,serviceFuelKg:s.serviceFuelKg,capsuleRcsFuelKg:s.capsuleRcsFuelKg,landingFuelKg:s.landingFuelKg});
const fuelState=(m:CrewMission)=>[m.boosterFuel,m.upperFuel,m.serviceFuel,m.capsuleRcsFuel,m.landingFuel];
const allowedAction=(s:CrewSnapshot)=>s.pilot.actions.find(action=>action.allowed)?.action;

/** Exercise actual gates rather than using direct phase assignment or patching the state. */
function flyPilot(m:CrewMission){
  const phases=new Map<CrewPhase,MissionSave>(),authorized:CrewPilotAction[]=[];
  let previousPhase:CrewPhase|undefined,blocked=true,previousFuel=fuelState(m);
  for(let i=0;i<250000;i++){
    const changed=previousPhase!==m.phase;
    if(changed){phases.set(m.phase,structuredClone(m.save()));previousPhase=m.phase;}
    if(['complete','failed'].includes(m.phase))break;
    if(changed||blocked||i%100===0){
      const s=m.snapshot();
      expect(s.pilot.active).toBe(true);expect(s.fullDemo).toBe(false);expect(s.automatic).toBe(true);
      if(m.phase==='observe'&&m.observe()){
        phases.set(m.phase,structuredClone(m.save()));previousPhase=m.phase;
      }
      const action=allowedAction(m.snapshot());
      if(action){expect(m.pilotAction(action),`${m.phase}: ${action}`).toBe(true);authorized.push(action);}
    }
    const time=m.time;m.step();blocked=m.time===time;
    const fuel=fuelState(m);
    if(fuel.some((value,index)=>!Number.isFinite(value)||value<0||value>previousFuel[index]+1e-9))throw Error(`推进剂账本异常：${m.phase} / ${m.time}`);
    previousFuel=fuel;
  }
  expect(m.phase,m.message).toBe('complete');
  phases.set(m.phase,structuredClone(m.save()));
  return {phases,authorized};
}

describe('pilot-authorized crewed mission',()=>{
  const automaticPhases=new Map<CrewPhase,MissionSave>();
  let pilotResult:ReturnType<typeof flyPilot>,completed:CrewSnapshot,automaticCompleted:CrewSnapshot;
  beforeAll(()=>{
    const auto=createCrewMission();automaticPhases.set('ground',structuredClone(auto.save()));auto.start();let previous:CrewPhase|undefined;
    for(let i=0;i<150000&&!['complete','failed'].includes(auto.phase);i++){
      if(previous!==auto.phase){automaticPhases.set(auto.phase,structuredClone(auto.save()));previous=auto.phase;}
      auto.step();
    }
    expect(auto.phase,auto.message).toBe('complete');automaticPhases.set(auto.phase,structuredClone(auto.save()));automaticCompleted=auto.snapshot();
    const pilot=createCrewMission();pilot.startPilot();pilotResult=flyPilot(pilot);completed=pilot.snapshot();
  },60000);
  const at=(phase:CrewPhase)=>{const data=automaticPhases.get(phase);expect(data,phase).toBeDefined();return CrewMission.restore(structuredClone(data!));};

  it('waits for pilot ignition, release and every irreversible operation through the full mission',()=>{
    expect(pilotResult.authorized).toEqual(requiredActions);
    expect([...pilotResult.phases.keys()]).toEqual(expect.arrayContaining(['ground','countdown','ascent','upper','insertion','approach','observe','return-ready','deorbit','return-coast','entry','drogue','main-chute','landing','touchdown','complete']));
    expect(completed.inspection?.relativeSpeedMS).toBeLessThanOrEqual(.15);expect(completed.inspection?.pointingDeg).toBeLessThanOrEqual(6);
    expect(completed.recoveryChecks.every(check=>check.passed)).toBe(true);expect(completed.touchdownSpeedMS).toBeLessThanOrEqual(3);
    expect(completed.landingFuelKg).toBeGreaterThan(0);expect(completed.landingFuelKg).toBeLessThan(100);
    expect(completed.serviceFuelKg).toBeLessThan(900);expect(completed.capsuleRcsFuelKg).toBeLessThan(18);
  });

  it('keeps the prior automatic demonstration available with no pilot gates',()=>{
    expect(automaticCompleted.pilot.active).toBe(false);expect(automaticCompleted.fullDemo).toBe(true);
    expect(automaticCompleted.inspection).toBeDefined();expect(automaticCompleted.recoveryChecks.every(check=>check.passed)).toBe(true);
    expect(automaticCompleted.time).toBeGreaterThan(4000);expect(automaticCompleted.time).toBeLessThan(5000);
    expect(automaticCompleted.touchdownSpeedMS).toBeGreaterThan(0);expect(automaticCompleted.touchdownSpeedMS).toBeLessThan(3);
  });

  it('does not burn fuel, advance the platform or release the pad while waiting for an authorized action',()=>{
    const m=createCrewMission();m.startPilot();const initial=m.snapshot();
    expect(initial.phase).toBe('ground');expect(initial.pilot.pendingAction).toBe('ignite');expect(initial.pilot.engineLit).toBe(false);
    for(let i=0;i<100;i++)m.step(.1,{...crewIdle(),thrust:1,yaw:1});
    expect(m.snapshot()).toEqual(initial);
    expect(m.pilotAction('ignite')).toBe(true);
    for(let i=0;i<200&&m.snapshot().pilot.pendingAction!=='release';i++)m.step();
    const waiting=m.snapshot();expect(waiting.phase).toBe('countdown');expect(waiting.released).toBe(false);
    expect(waiting.launchFuelKg).toBeLessThan(initial.launchFuelKg);expect(waiting.pilot.engineLit).toBe(true);
    for(let i=0;i<100;i++)m.step();
    expect(m.snapshot()).toEqual(waiting);
    expect(m.pilotAction('release')).toBe(true);expect(m.phase).toBe('ascent');expect(m.released).toBe(true);
    expect(m.position).toEqual(waiting.position);expect(m.velocity).toEqual(waiting.velocity);
  });

  it('rejects out-of-sequence commands without changing the trajectory, resources or connection state',()=>{
    const m=createCrewMission();m.startPilot();const before=flightState(m.snapshot());
    for(const action of requiredActions.filter(action=>action!=='ignite'))expect(m.pilotAction(action),action).toBe(false);
    expect(flightState(m.snapshot())).toEqual(before);
    expect(m.pilotAction('ignite')).toBe(true);const ignited=flightState(m.snapshot());
    expect(m.pilotAction('ignite')).toBe(false);expect(m.pilotAction('release')).toBe(false);
    expect(flightState(m.snapshot())).toEqual(ignited);
  });

  it('does not record platform inspection merely because the pilot route is enabled',()=>{
    const m=at('approach');m.enablePilotRoute();
    expect(m.observe()).toBe(false);expect(m.inspection).toBeUndefined();expect(m.pilotAction('begin-deorbit')).toBe(false);
    const waiting=at('observe');waiting.enablePilotRoute();waiting.position=add(waiting.position,[500,0,0]);
    const before=flightState(waiting.snapshot());expect(waiting.observe()).toBe(false);expect(waiting.inspection).toBeUndefined();
    expect(waiting.pilotAction('begin-deorbit')).toBe(false);expect(flightState(waiting.snapshot())).toEqual(before);
  });

  it('keeps altitude, speed and dynamic-pressure gates on drogue and main parachutes',()=>{
    const high=at('entry');high.enablePilotRoute();const before=flightState(high.snapshot());
    expect(high.pilotAction('open-drogue')).toBe(false);expect(high.pilotAction('open-main')).toBe(false);
    expect(flightState(high.snapshot())).toEqual(before);expect(high.snapshot().chuteAreaM2).toBe(0);
    const fast=at('drogue');fast.enablePilotRoute();const local=surfaceAt(fast.position);
    fast.velocity=add(airVelocity(fast.position),scale(local.up,-500));const fastBefore=flightState(fast.snapshot());
    expect(fast.pilotAction('open-main')).toBe(false);expect(flightState(fast.snapshot())).toEqual(fastBefore);
  });

  it('converts a flying automatic mission to pilot authorization without resetting any flight state',()=>{
    const m=at('return-coast'),before=flightState(m.snapshot());m.enablePilotRoute();
    expect(m.snapshot().pilot.active).toBe(true);expect(m.fullDemo).toBe(false);expect(m.automatic).toBe(true);
    expect(flightState(m.snapshot())).toEqual(before);
    m.enablePilotRoute();expect(flightState(m.snapshot())).toEqual(before);
  });

  it('can take over and resume guidance in every supported flight phase without instantaneous motion or fuel changes',()=>{
    for(const phase of CREW_PILOT_FLIGHT_PHASES){
      const m=at(phase);m.enablePilotRoute();const before=flightState(m.snapshot());
      m.takeOver();expect(m.automatic,phase).toBe(false);expect(flightState(m.snapshot()),phase).toEqual(before);
      m.resumeAutomatic();expect(m.automatic,phase).toBe(true);expect(flightState(m.snapshot()),phase).toEqual(before);
    }
  });

  it('does not offer direct flight control on the pad, countdown, touchdown or terminal states',()=>{
    for(const phase of ['ground','countdown','touchdown','complete'] as const){
      const m=at(phase);m.enablePilotRoute();const before=flightState(m.snapshot());m.takeOver();
      expect(m.automatic,phase).toBe(true);expect(flightState(m.snapshot()),phase).toEqual(before);
    }
  });

  it('keeps directly piloted flight at 1× regardless of the selected fast-forward rate',()=>{
    for(const phase of CREW_PILOT_FLIGHT_PHASES){
      const m=at(phase);m.enablePilotRoute();m.takeOver();
      expect(crewPlaybackRate(m.snapshot(),180),phase).toBe(1);expect(crewPlaybackRate(m.snapshot(),10),phase).toBe(1);
    }
  });

  it('adjusts powered-flight throttle gradually with W/S and never creates a negative or over-range setting',()=>{
    for(const phase of CREW_PILOT_THROTTLE_PHASES){
      const m=at(phase);m.enablePilotRoute();m.takeOver();m.setPilotThrottle(.4);const before=m.snapshot();
      expect(before.pilot.throttle,phase).toBeCloseTo(.4);
      m.step(.1,{...crewIdle(),thrust:1});expect(m.snapshot().pilot.throttle,phase).toBeGreaterThan(.4);
      const higher=m.snapshot().pilot.throttle;m.step(.1,{...crewIdle(),thrust:-1});expect(m.snapshot().pilot.throttle,phase).toBeLessThan(higher);
      m.setPilotThrottle(-2);expect(m.snapshot().pilot.throttle,phase).toBe(0);
      m.setPilotThrottle(2);expect(m.snapshot().pilot.throttle,phase).toBe(1);
    }
  });

  it('allows capsule attitude control during coast and entry without rotating its existing velocity vector',()=>{
    for(const phase of ['return-coast','entry'] as const){
      const m=at(phase);m.enablePilotRoute();m.takeOver();const before=m.snapshot(),reference=CrewMission.restore(m.save());
      for(let i=0;i<20;i++){m.step(.1,{...crewIdle(),yaw:.3});reference.step(.1,crewIdle());}
      const after=m.snapshot();expect(new Quaternion(...before.attitude).angleTo(new Quaternion(...after.attitude)),phase).toBeGreaterThan(1e-4);
      expect(new Vector3(...after.velocity).distanceTo(new Vector3(...reference.velocity)),phase).toBeLessThan(.01);
      expect(after.capsuleRcsFuelKg,phase).toBeLessThan(before.capsuleRcsFuelKg);
      expect(new Vector3(...after.thrust).length(),phase).toBe(0);
    }
  });

  it('retains a pilot takeover across the actual coast-to-entry boundary',()=>{
    const m=at('return-coast');m.enablePilotRoute();m.takeOver();const fuel=m.capsuleRcsFuel;
    let before={position:[...m.position],velocity:[...m.velocity],time:m.time};
    for(let i=0;i<40000&&m.phase==='return-coast';i++){before={position:[...m.position],velocity:[...m.velocity],time:m.time};m.step();}
    const entry=m.snapshot();expect(entry.phase,m.message).toBe('entry');expect(entry.automatic).toBe(false);expect(entry.pilot.active).toBe(true);
    expect(entry.serviceAttached).toBe(false);expect(entry.capsuleRcsFuelKg).toBeLessThanOrEqual(fuel);
    expect(entry.time-before.time).toBeCloseTo(.1);expect(new Vector3(...entry.position).distanceTo(new Vector3().fromArray(before.position))).toBeLessThan(1000);
    expect(new Vector3(...entry.velocity).distanceTo(new Vector3().fromArray(before.velocity))).toBeLessThan(5);
    expect(new Vector3(...entry.thrust).length()).toBe(0);
  });

  it('applies in-orbit manual thrust as finite acceleration along the actual nose direction',()=>{
    const m=at('approach');m.enablePilotRoute();m.takeOver();const before=m.snapshot(),coast=CrewMission.restore(m.save());
    m.step(.1,{...crewIdle(),thrust:1,yaw:.4});coast.step(.1,{...crewIdle(),yaw:.4});
    const s=m.snapshot(),forward=new Vector3(0,0,-1).applyQuaternion(new Quaternion(...s.attitude)),thrust=new Vector3(...s.thrust);
    expect(thrust.length()).toBeGreaterThan(900);expect(forward.dot(thrust.normalize())).toBeGreaterThan(.99999);
    expect(new Vector3(...s.velocity).distanceTo(new Vector3(...coast.velocity))).toBeGreaterThan(0);
    expect(new Vector3(...s.velocity).distanceTo(new Vector3(...coast.velocity))).toBeLessThan(.1);
    expect(new Vector3(...s.velocity).angleTo(new Vector3(...before.velocity))).toBeLessThan(.001);
    expect(s.serviceFuelKg).toBeLessThan(before.serviceFuelKg);
  });

  it('stops the first-stage engine at zero manual throttle and only resumes finite fuel-backed thrust',()=>{
    const m=at('ascent');m.enablePilotRoute();m.takeOver();m.setPilotThrottle(0);const fuel=m.boosterFuel;
    m.step();expect(new Vector3(...m.snapshot().thrust).length()).toBe(0);expect(m.boosterFuel).toBe(fuel);
    m.setPilotThrottle(1);m.step();expect(new Vector3(...m.snapshot().thrust).length()).toBeGreaterThan(3000000);
    expect(m.boosterFuel).toBeLessThan(fuel);expect(m.velocity.every(Number.isFinite)).toBe(true);
  });

  it('retains pending authorization, engine state, throttle and direct control through save/restore',()=>{
    const ground=createCrewMission();ground.startPilot();const waiting=CrewMission.restore(JSON.parse(JSON.stringify(ground.save())));
    expect(waiting.snapshot()).toEqual(JSON.parse(JSON.stringify(ground.snapshot())));waiting.step();expect(waiting.time).toBe(ground.time);
    expect(waiting.pilotAction('ignite')).toBe(true);expect(ground.pilotAction('ignite')).toBe(true);
    for(let i=0;i<15;i++){waiting.step();ground.step();}expect(JSON.parse(JSON.stringify(waiting.snapshot()))).toEqual(JSON.parse(JSON.stringify(ground.snapshot())));
    const m=at('return-coast');m.enablePilotRoute();m.takeOver();m.setPilotThrottle(.35);m.step(.1,{...crewIdle(),yaw:.2});
    const restored=CrewMission.restore(JSON.parse(JSON.stringify(m.save())));expect(restored.snapshot()).toEqual(m.snapshot());
    for(let i=0;i<20;i++){m.step(.1,{...crewIdle(),pitch:.1});restored.step(.1,{...crewIdle(),pitch:.1});}
    expect(restored.snapshot()).toEqual(m.snapshot());
  });

  it('continues legacy crew-earth-3 saves without treating them as pilot-authorized missions',()=>{
    const m=at('approach'),legacy=structuredClone(m.save());delete (legacy.state as Partial<CrewSnapshot>).pilot;
    delete (legacy.integration as Partial<MissionSave['integration']>).pilot;
    const restored=CrewMission.restore(legacy);expect(restored.snapshot().pilot.active).toBe(false);
    expect(flightState(restored.snapshot())).toEqual(flightState(m.snapshot()));
    restored.step();m.step();expect(flightState(restored.snapshot())).toEqual(flightState(m.snapshot()));
  });

  it('rejects invalid pilot save state and does not mutate the current mission',()=>{
    const m=createCrewMission();m.startPilot();const before=m.snapshot();
    for(const patch of [{throttle:-.1},{throttle:1.1},{throttle:NaN},{active:'yes'},{pendingAction:'teleport'},{engineLit:'yes'}]){
      const invalid=structuredClone(m.save());Object.assign(invalid.state.pilot,patch);
      expect(()=>CrewMission.restore(invalid)).toThrow();expect(m.snapshot()).toEqual(before);
    }
  });

  it('preserves a missed unsafe landing as failure rather than allowing recovery to manufacture success',()=>{
    const m=at('landing');m.enablePilotRoute();m.takeOver();const local=surfaceAt(m.position);
    m.position=add(m.position,scale(local.up,20-local.height));m.velocity=add(airVelocity(m.position),scale(local.up,-20));
    m.landingFuel=0;m.capsuleRcsFuel=0;m.setPilotThrottle(0);
    const up=new Vector3(...local.up),side=new Vector3(1,0,0).cross(up).normalize();
    m.attitude.setFromUnitVectors(new Vector3(0,0,-1),up.clone().applyAxisAngle(side,Math.PI/3));
    for(let i=0;i<1000&&m.phase!=='failed';i++)m.step();
    expect(m.phase,m.message).toBe('failed');expect(m.snapshot().recoveryReady).toBe(false);
    const failed=flightState(m.snapshot());expect(m.pilotAction('recover')).toBe(false);m.step();
    expect(m.phase).toBe('failed');expect(flightState(m.snapshot())).toEqual(failed);expect(m.landingFuel).toBe(0);
  });
});
