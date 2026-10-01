import { describe,expect,it } from 'vitest';
import { Vector3 } from 'three';
import { createFlightState,FLIGHT_STEP,stepFlight, type FlightInput } from './flightPractice';
import { advanceApproachMission,createApproachMission } from './approachMission';

const idle:FlightInput={thrust:0,yaw:0,pitch:0,roll:0,brake:false};
function exercise(target=new Vector3(0,0,-125),radius=10){
  const flight=createFlightState();flight.attitude.setFromUnitVectors(new Vector3(0,0,-1),target.clone().normalize());
  const mission=createApproachMission(flight,target,radius),obstacles=[{position:target,radius,name:'练习目标'}];
  const run=(seconds:number,input=idle)=>{for(let i=0;i<Math.round(seconds/FLIGHT_STEP);i++){stepFlight(flight,input,FLIGHT_STEP,obstacles);advanceApproachMission(mission,flight,target,radius);}};
  return {flight,mission,target,radius,run};
}
describe('approach exercise',()=>{
  it.each([[125,10],[105,8],[190,65]])('completes an actual thrust coast and brake sequence at distance %s', (distance,radius)=>{
    const {flight,mission,run}=exercise(new Vector3(0,0,-distance),radius);
    run(1.1);run(3,{...idle,thrust:1});
    const travel=distance-(radius+12+22.5),coast=(travel-7.2)/2.4;
    run(coast);run(3,{...idle,brake:true});run(5.1);
    expect(mission.status).toBe('success');expect(mission.clearance).toBeCloseTo(22.5,1);
    expect(mission.result?.fuelUsed).toBeCloseTo(1.32,6);expect(flight.velocity.length()).toBeCloseTo(0,7);
    expect(mission.heldFor).toBe(5);
  });
  it('requires physical approach, not just pointing or waiting at the initial position',()=>{
    const {mission,run}=exercise();run(30);expect(mission.aligned).toBe(true);expect(mission.approached).toBe(false);expect(mission.status).toBe('running');
  });
  it('checks total speed, not only closing speed, and resets an interrupted hold',()=>{
    const {flight,mission,target,radius,run}=exercise();run(1.1);flight.position.z=-80.5;run(2);
    expect(mission.heldFor).toBeCloseTo(2,6);
    flight.velocity.x=.3;run(.1);expect(mission.heldFor).toBe(0);expect(mission.status).toBe('running');
    flight.velocity.set(0,0,0);run(1);
    flight.attitude.setFromAxisAngle(new Vector3(0,1,0),.5);run(.1);expect(mission.heldFor).toBe(0);
    const before=mission.elapsed;for(let i=0;i<1000;i++)advanceApproachMission(mission,flight,target,radius);
    expect(mission.elapsed).toBe(before);expect(mission.heldFor).toBe(0);
  });
  it('does not accept stopping too close, and allows a positional correction',()=>{
    const {flight,mission,run}=exercise();run(1.1);flight.position.z=-93;run(6);
    expect(mission.clearance).toBe(10);expect(mission.status).toBe('running');expect(mission.phase).toBe('brake');
    flight.position.z=-80.5;run(5.1);expect(mission.status).toBe('success');
  });
  it('finishes with a frozen failure record on actual contact',()=>{
    const {mission,run,flight}=exercise();run(18,{...idle,thrust:1});expect(mission.status).toBe('failed');
    expect(mission.hint).toContain('接触');const result={...mission.result};flight.fuel=50;run(5);expect(mission.result).toEqual(result);
  });
  it('ends when fuel is exhausted and preserves the final readings',()=>{
    const {flight,mission,run}=exercise();flight.fuel=.01;run(.1,{...idle,thrust:1});expect(mission.status).toBe('failed');expect(mission.hint).toContain('耗尽');expect(mission.result?.speed).toBeGreaterThan(0);
  });
  it('uses the same hold time when fixed steps are grouped into different display frames',()=>{
    const simulate=(perFrame:number)=>{const x=exercise();x.run(1.1);x.flight.position.z=-80.5;for(let frame=0;frame<600/perFrame;frame++)for(let i=0;i<perFrame;i++){stepFlight(x.flight,idle,FLIGHT_STEP,[]);advanceApproachMission(x.mission,x.flight,x.target,x.radius);}return x.mission;};
    expect(simulate(2)).toEqual(simulate(4));expect(simulate(2).status).toBe('success');
  });
  it('does not show a reachable stopping point on the far side of a collision',()=>{
    const {flight,mission,run}=exercise();run(1.1);flight.velocity.z=-25;run(.1);
    expect(mission.status).toBe('running');expect(mission.predictedClearance).toBeNull();expect(mission.stopWarning).toContain('接触');expect(mission.phase).toBe('brake');
  });
  it('checks other objects on the stopping path, not just the mission target',()=>{
    const {flight,mission,target,radius}=exercise();flight.velocity.x=10;flight.time=1;
    advanceApproachMission(mission,flight,target,radius,[{position:new Vector3(35,0,0),radius:5,name:'其他级段'}]);
    expect(mission.predictedClearance).toBeNull();expect(mission.stopWarning).toContain('其他级段');
  });
});
