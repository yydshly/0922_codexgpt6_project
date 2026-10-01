import { describe,it,expect } from 'vitest';
import { Vector3 } from 'three';
import { createAutopilot,engageAutopilot,takeOverAutopilot,autopilotInput,idleInput } from './autopilot';
import { createFlightState,stepFlight,FLIGHT_STEP,targetReading } from './flightPractice';
import { createApproachMission,advanceApproachMission } from './approachMission';
import { createPilotLesson,createPilotReport } from './flightStory';

function exercise(target=new Vector3(0,0,-125),radius=10){
  const state=createFlightState(),pilot=createAutopilot();state.attitude.setFromAxisAngle(new Vector3(0,1,0),-.35);
  const obstacles=[{position:target,radius,name:'目标'}],mission=createApproachMission(state,target,radius);
  engageAutopilot(pilot);
  const phases=new Set<string>();
  const step=()=>{const input=autopilotInput(pilot,state,target,radius,obstacles,FLIGHT_STEP);phases.add(pilot.phase);stepFlight(state,input,FLIGHT_STEP,obstacles);advanceApproachMission(mission,state,target,radius,obstacles);};
  const finish=()=>{for(let i=0;i<120*150&&mission.status==='running';i++)step();};
  return {state,pilot,target,radius,obstacles,mission,phases,step,finish};
}
describe('local autopilot',()=>{
  it.each([[new Vector3(0,0,-125),10],[new Vector3(0,2,-105),8],[new Vector3(0,0,-190),65]] as const)('flies the actual approach and holds in environment %s', (target,radius)=>{
    const x=exercise(target,radius);x.finish();
    expect(x.mission.status,x.pilot.message).toBe('success');expect(x.state.contact).toBeNull();
    expect(x.state.fuel).toBeLessThan(100);expect(x.state.velocity.length()).toBeLessThan(.01);
    expect(x.mission.clearance).toBeGreaterThan(23);expect(x.mission.clearance).toBeLessThan(28);
    expect(x.mission.heldFor).toBe(5);expect(x.mission.assistedAimCount).toBe(0);
    expect([...x.phases]).toEqual(expect.arrayContaining(['align','thrust','coast','brake','hold']));
  });
  it('changes attitude gradually; controller does not mutate physical state',()=>{
    const x=exercise(),before=JSON.stringify(x.state);
    const input=autopilotInput(x.pilot,x.state,x.target,x.radius,x.obstacles,FLIGHT_STEP);
    expect(JSON.stringify(x.state)).toBe(before);expect(input.yaw).not.toBe(0);
    const previous=x.state.attitude.clone();stepFlight(x.state,input,FLIGHT_STEP,x.obstacles);
    expect(previous.angleTo(x.state.attitude)).toBeLessThan(.01);expect(previous.angleTo(x.state.attitude)).toBeGreaterThan(0);
  });
  it('takeover and resumption preserve state and complete after a sideways manual input',()=>{
    const x=exercise();for(let i=0;i<120*12;i++)x.step();
    const before=JSON.stringify(x.state);takeOverAutopilot(x.pilot);
    expect(JSON.stringify(x.state)).toBe(before);expect(x.pilot.takeovers).toBe(1);
    const time=x.pilot.automaticSeconds;for(let i=0;i<120;i++)stepFlight(x.state,{...idleInput(),yaw:1,thrust:1},FLIGHT_STEP,x.obstacles);
    expect(x.pilot.automaticSeconds).toBe(time);const changed=JSON.stringify(x.state);engageAutopilot(x.pilot);expect(JSON.stringify(x.state)).toBe(changed);
    x.finish();expect(x.mission.status).toBe('success');
  });
  it('pausing freezes automatic time and hold time',()=>{
    const x=exercise();for(let i=0;i<120*120&&x.pilot.phase!=='hold';i++)x.step();
    const pilot=JSON.stringify(x.pilot),state=JSON.stringify(x.state),held=x.mission.heldFor;
    for(let i=0;i<120;i++){autopilotInput(x.pilot,x.state,x.target,x.radius,x.obstacles,0);advanceApproachMission(x.mission,x.state,x.target,x.radius,x.obstacles);}
    expect(JSON.stringify(x.pilot)).toBe(pilot);expect(JSON.stringify(x.state)).toBe(state);expect(x.mission.heldFor).toBe(held);
    x.finish();expect(x.mission.status).toBe('success');
  });
  it('stops before an obstructed straight route and latches the explanation',()=>{
    const x=exercise();x.obstacles.push({position:new Vector3(0,0,-55),radius:8,name:'废弃级段'});
    for(let i=0;i<120*3;i++)x.step();
    expect(x.pilot.phase).toBe('blocked');expect(x.pilot.message).toContain('废弃级段');expect(x.state.position.length()).toBe(0);
    x.obstacles.pop();x.step();expect(x.pilot.phase).toBe('blocked');
    takeOverAutopilot(x.pilot);engageAutopilot(x.pilot);x.finish();expect(x.mission.status).toBe('success');
  });
  it('refuses insufficient fuel before accelerating',()=>{
    const x=exercise();x.state.fuel=.1;for(let i=0;i<120*20;i++)x.step();
    expect(x.pilot.phase).toBe('blocked');expect(x.pilot.message).toContain('推进剂');expect(x.state.velocity.length()).toBe(0);
  });
  it('brakes unsafe incoming motion rather than claiming a reachable stop',()=>{
    const x=exercise();x.state.velocity.z=-30;
    const input=autopilotInput(x.pilot,x.state,x.target,x.radius,x.obstacles,FLIGHT_STEP);
    expect(input.brake).toBe(true);expect(x.pilot.phase).toBe('blocked');expect(x.pilot.message).toContain('不能保证');
  });
  it('refuses an already overshot observation zone',()=>{
    const x=exercise();x.state.position.z=-95;x.step();expect(x.pilot.phase).toBe('blocked');expect(x.pilot.message).toContain('内边界');
  });
  it('recovers a rear-facing, rolled craft with initial transverse velocity',()=>{
    const x=exercise();x.state.attitude.setFromAxisAngle(new Vector3(0,1,1).normalize(),Math.PI);x.state.velocity.set(1,1,0);x.finish();
    expect(x.mission.status,x.pilot.message).toBe('success');
  });
  it('is independent of display frame grouping',()=>{
    const run=(group:number)=>{const x=exercise();for(let frame=0;frame<120*90/group;frame++)for(let j=0;j<group&&x.mission.status==='running';j++)x.step();return {state:x.state,result:x.mission.result,pilot:x.pilot};};
    expect(run(2)).toEqual(run(4));expect(run(4)).toEqual(run(8));
  });
  it('does not credit skipped manual checks to an automated story report',()=>{
    const x=exercise();x.finish();const lesson=createPilotLesson();lesson.phase='approach';
    const report=createPilotReport(lesson,x.mission.result!,x.state.time,x.state.fuel,x.pilot);
    expect(report.automaticSeconds).toBeGreaterThan(20);expect(report.manualSeconds).toBe(0);
    expect(report.phenomena).toHaveLength(2);expect(report.phenomena.join('')).not.toContain('亲自');
    lesson.completed=['look'];const mixed=createPilotReport(lesson,x.mission.result!,x.state.time,x.state.fuel,x.pilot);
    expect(mixed.phenomena[0]).toContain('亲自环顾');expect(mixed.phenomena).toHaveLength(3);
  });
  it('keeps physical state unchanged when disengaging and idling',()=>{
    const x=exercise();for(let i=0;i<120*10;i++)x.step();const reading=targetReading(x.state,x.target,x.radius);
    takeOverAutopilot(x.pilot);expect(autopilotInput(x.pilot,x.state,x.target,x.radius,x.obstacles,FLIGHT_STEP)).toEqual(idleInput());
    expect(targetReading(x.state,x.target,x.radius)).toEqual(reading);
  });
});
