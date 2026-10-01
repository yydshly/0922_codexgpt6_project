import {describe,it,expect} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {renderToStaticMarkup} from 'react-dom/server';
import {createCrewMission} from './crewMission';
import {crewObservationReady} from './crewPilotControl';
import {crewPlaybackReadout,crewPropulsionReadout} from './crewFlightReadout';
import {CrewPilotBriefing} from '../components/CrewPilotBriefing';

describe('flight explanations follow actual computation',()=>{
  it('does not call the early countdown thrust buildup before thrust exists',()=>{
    const mission=createCrewMission();mission.startPilot();mission.pilotAction('ignite');
    expect(crewPropulsionReadout(mission.snapshot()).kind).toBe('ignition-wait');
    for(let i=0;i<90&&Math.hypot(...mission.snapshot().thrust)<=1;i++)mission.step();
    expect(mission.time).toBeGreaterThan(-3.1);
    expect(crewPropulsionReadout(mission.snapshot()).kind).toBe('ignition');
    expect(Math.hypot(...mission.snapshot().thrust)).toBeGreaterThan(1);
  });
  it('distinguishes a real second-stage authorization from a zero-throttle coast',()=>{
    const mission=createCrewMission();mission.startPilot();
    for(let i=0;i<2500&&mission.awaitingPilotAction!=='ignite-upper';i++){
      if(mission.awaitingPilotAction)expect(mission.pilotAction(mission.awaitingPilotAction)).toBe(true);
      mission.step();
    }
    expect(mission.pilotAction('ignite-upper')).toBe(true);mission.takeOver();mission.setPilotThrottle(0);mission.step();
    const state=mission.snapshot();
    expect(state.pilot.engineEnabled).toBe(true);expect(state.pilot.engineLit).toBe(false);
    expect(crewPropulsionReadout(state).kind).toBe('zero-throttle');
    const markup=renderToStaticMarkup(<CrewPilotBriefing state={state} playing/>);
    expect(markup).toContain('油门为零');expect(markup).not.toContain('二级推力已建立');
  });
  it('uses the same actual observation window for a paused record and the briefing',()=>{
    const mission=createCrewMission();mission.startPilot();
    for(let i=0;i<20000&&mission.phase!=='observe';i++){
      if(mission.awaitingPilotAction)expect(mission.pilotAction(mission.awaitingPilotAction)).toBe(true);
      mission.step();
    }
    const state=mission.snapshot(),time=mission.time;
    expect(crewObservationReady(state)).toBe(true);
    const markup=renderToStaticMarkup(<CrewPilotBriefing state={state} playing={false}/>);
    expect(markup).toContain('data-mission-status="observation"');
    expect(markup).toContain('无需先继续模拟');
    expect(markup).not.toContain('确认读数后点击「继续」');
    expect(mission.observe()).toBe(true);expect(mission.time).toBe(time);
    expect(mission.inspection?.time).toBe(time);
  });
  it('rejects out-of-window or invalid observation values, including at the wrong phase',()=>{
    const ready={phase:'observe' as const,distanceM:30,relativeSpeedMS:.15,pointingDeg:6};
    expect(crewObservationReady(ready)).toBe(true);
    for(const state of [{...ready,distanceM:29.9},{...ready,distanceM:100.1},{...ready,relativeSpeedMS:.151},{...ready,pointingDeg:6.1},{...ready,distanceM:NaN},{...ready,phase:'approach' as const}])expect(crewObservationReady(state)).toBe(false);
  });
  it('shows the policy cap separately from the selected rate and freezes it at checkpoints',()=>{
    const mission=createCrewMission(),state=mission.snapshot();
    const turning={...state,phase:'deorbit' as const};
    expect(crewPlaybackReadout(turning,true,180)).toMatchObject({requested:180,adopted:1});
    const aligned={...turning,attitude:new Quaternion().setFromUnitVectors(new Vector3(0,0,-1),new Vector3(...state.velocity).negate().normalize()).toArray() as typeof state.attitude};
    expect(crewPlaybackReadout(aligned,true,180)).toMatchObject({requested:180,adopted:10});
    expect(crewPlaybackReadout({...aligned,automatic:false},true,180).adopted).toBe(1);
    expect(crewPlaybackReadout(aligned,false,180).adopted).toBe(0);
    mission.startPilot();expect(crewPlaybackReadout(mission.snapshot(),true,180).adopted).toBe(0);
  });
  it('marks a terminal snapshot as frozen instead of active thrust',()=>{
    const state={...createCrewMission().snapshot(),phase:'failed' as const,thrust:[0,0,10000] as [number,number,number]};
    expect(crewPropulsionReadout(state)).toMatchObject({kind:'frozen',thrustN:10000});
    expect(crewPlaybackReadout(state,true,180).adopted).toBe(0);
  });
});
