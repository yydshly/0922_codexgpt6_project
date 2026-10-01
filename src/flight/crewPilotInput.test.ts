import {describe,it,expect} from 'vitest';
import {createCrewMission,crewIdle} from './crewMission';
import {crewPilotInputAvailability,crewPilotKeyAvailable} from './crewPilotInput';

describe('pilot controls follow the installed equipment and real authority',()=>{
  it('allows the pilot to restart thrust but does not offer turning with an unpowered rocket',()=>{
    const mission=createCrewMission();mission.startPilot();mission.pilotAction('ignite');
    for(let i=0;i<120&&!mission.awaitingPilotAction;i++)mission.step();
    expect(mission.pilotAction('release')).toBe(true);mission.takeOver();mission.setPilotThrottle(0);
    mission.step(.1);
    const stopped=mission.snapshot();
    expect(crewPilotKeyAvailable(stopped,'KeyW')).toBe(true);
    expect(crewPilotKeyAvailable(stopped,'KeyA')).toBe(false);
    expect(crewPilotInputAvailability(stopped).attitudeReason).toContain('无推力');
    mission.setPilotThrottle(.5);mission.step(.1,{...crewIdle(),yaw:1});
    expect(crewPilotKeyAvailable(mission.snapshot(),'KeyA')).toBe(true);
    expect(Math.hypot(...mission.snapshot().attitudeTorqueNm)).toBeGreaterThan(0);
  });
  it('does not offer flight controls on the launch pad or after the task stops',()=>{
    const mission=createCrewMission();
    for(const phase of ['ground','countdown','failed','complete'] as const){
      mission.phase=phase;
      for(const code of ['KeyW','KeyS','KeyB','KeyA','ArrowUp','KeyE'])expect(crewPilotKeyAvailable(mission.snapshot(),code)).toBe(false);
    }
  });
  it('in-orbit translation, relative braking and service attitude share the finite service budget',()=>{
    const mission=createCrewMission();mission.carrierStage='none';mission.phase='approach';
    const available=mission.snapshot();
    expect(['KeyW','KeyS','KeyB','KeyA'].every(code=>crewPilotKeyAvailable(available,code))).toBe(true);
    mission.serviceFuel=0;
    expect(['KeyW','KeyS','KeyB','KeyA'].some(code=>crewPilotKeyAvailable(mission.snapshot(),code))).toBe(false);
  });
  it('return-capsule jets have their own fuel and do not gain a translation engine',()=>{
    const mission=createCrewMission();mission.carrierStage='none';mission.phase='entry';mission.serviceAttached=false;
    expect(crewPilotKeyAvailable(mission.snapshot(),'ArrowUp')).toBe(true);
    expect(crewPilotKeyAvailable(mission.snapshot(),'KeyW')).toBe(false);
    mission.capsuleRcsFuel=0;
    expect(crewPilotKeyAvailable(mission.snapshot(),'ArrowUp')).toBe(false);
    expect(crewPilotInputAvailability(mission.snapshot()).attitudeReason).toContain('恢复力矩仍参与');
  });
  it('landing thrust and attitude depend on two separate supplies',()=>{
    const mission=createCrewMission();mission.carrierStage='none';mission.phase='landing';mission.serviceAttached=false;mission.enablePilotRoute();mission.capsuleRcsFuel=0;
    expect(crewPilotKeyAvailable(mission.snapshot(),'KeyW')).toBe(true);
    expect(crewPilotKeyAvailable(mission.snapshot(),'KeyA')).toBe(false);
    mission.landingFuel=0;
    expect(crewPilotKeyAvailable(mission.snapshot(),'KeyW')).toBe(false);
  });
});
