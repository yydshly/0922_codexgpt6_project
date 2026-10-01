import { describe,it,expect } from 'vitest';
import { createPilotLesson,advancePilotLesson,launchStoryRecord } from './flightStory';
import { createFlightState,stepFlight,FLIGHT_STEP,type FlightInput } from './flightPractice';
import { FullFlightDemo } from '../launch/fullFlightDemo';
import { FlightSession } from '../launch/flightSession';
import { BASELINE_VEHICLE } from '../launch/vehicle';

const idle:FlightInput={thrust:0,yaw:0,pitch:0,roll:0,brake:false};
describe('first flight story',()=>{
  it('requires real look input, thrust, coast time and active braking',()=>{
    const state=createFlightState(),lesson=createPilotLesson();
    const run=(seconds:number,input=idle,head=0,bearing=0)=>{for(let i=0;i<seconds/FLIGHT_STEP;i++){stepFlight(state,input,FLIGHT_STEP,[]);advancePilotLesson(lesson,state,input,FLIGHT_STEP,head,bearing);}};
    run(10);expect(lesson.phase).toBe('look');run(.1,idle,.3,20);expect(lesson.phase).toBe('aim');
    run(1,idle,0,20);expect(lesson.phase).toBe('aim');run(.1);expect(lesson.phase).toBe('power');
    run(1);expect(lesson.phase).toBe('power');run(1,{...idle,thrust:1});expect(lesson.phase).toBe('coast');
    const fuel=state.fuel,speed=state.velocity.length();run(2.1);expect(state.fuel).toBe(fuel);expect(state.velocity.length()).toBeCloseTo(speed,9);expect(lesson.phase).toBe('brake');
    run(1,{...idle,brake:true});expect(lesson.phase).toBe('ready');expect(state.fuel).toBeLessThan(fuel);
  });
  it('paused or interrupted coasting does not falsely pass',()=>{
    const lesson=createPilotLesson(),state=createFlightState();lesson.phase='coast';state.velocity.z=-1;
    advancePilotLesson(lesson,state,idle,0,1,0);expect(lesson.coastSeconds).toBe(0);
    advancePilotLesson(lesson,state,idle,1,0,0);expect(lesson.coastSeconds).toBe(1);
    state.firing=1;advancePilotLesson(lesson,state,{...idle,thrust:1},.1,0,0);expect(lesson.coastSeconds).toBe(0);
  });
  it('training demo reaches genuine orbit verification and cannot run on to deployment',()=>{
    const original=new FlightSession(BASELINE_VEHICLE,843800000),demo=new FullFlightDemo(original,'unpowered',true);demo.setSpeed(3);
    expect(launchStoryRecord(demo.session.state)).toBeNull();
    for(let i=0;i<3000&&!demo.status.finished&&!demo.status.error;i++)demo.advance(.25);
    expect(demo.status.error).toBe('');expect(demo.status.finished).toBe(true);expect(demo.session.state.phase).toBe('orbit-complete');
    const record=launchStoryRecord(demo.session.state);expect(record?.coastSeconds).toBeGreaterThan(4000);expect(record?.periapsisKm).toBeGreaterThan(300);
    const time=demo.session.state.time;demo.pause(false);for(let i=0;i<100;i++)demo.advance(.25);
    expect(demo.session.state.time).toBe(time);expect(demo.session.state.deployment).toBeUndefined();expect(original.state.phase).toBe('ready');
  },20000);
});
