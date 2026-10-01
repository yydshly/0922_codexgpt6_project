import {describe,it,expect} from 'vitest';
import {Vector3} from 'three';
import {ExplorationSession,EXPLORATION_DESTINATIONS,planExplorationRoute,explorationTimeRate} from './exploration';
import {FLIGHT_STEP,targetReading} from './flightPractice';
import {idleInput} from './autopilot';

function finish(session:ExplorationSession){for(let i=0;i<120*400&&session.status!=='arrived'&&session.status!=='blocked';i++)session.step(idleInput(),FLIGHT_STEP);expect(session.status,session.message).toBe('arrived');}
describe('continuous exploration',()=>{
  it('flies the full route without resets, refuelling or scene changes',()=>{
    const s=new ExplorationSession();s.startTour();let time=0,fuel=100,distance=0;
    for(let i=0;i<120*1600&&s.visits.length<6;i++){
      s.step(idleInput(),FLIGHT_STEP);
      expect(s.state.time).toBeGreaterThanOrEqual(time);expect(s.state.fuel).toBeLessThanOrEqual(fuel);expect(s.distanceTravelled).toBeGreaterThanOrEqual(distance);
      time=s.state.time;fuel=s.state.fuel;distance=s.distanceTravelled;
      if(s.status==='blocked')throw Error(s.selectedId+' '+s.message);
    }
    expect(s.visits.map(v=>v.id)).toEqual(EXPLORATION_DESTINATIONS.map(v=>v.id));expect(s.state.contact).toBeNull();expect(s.state.fuel).toBeGreaterThan(0);expect(s.distanceTravelled).toBeGreaterThan(2000);
    expect(s.state.time).toBeGreaterThan(300);expect(s.tour).toHaveLength(0);
    expect(s.remainingTourIds()).toEqual([]);const completed=JSON.stringify(s);expect(s.resumeTour()).toBe(false);expect(JSON.stringify(s)).toBe(completed);
    for(let i=0;i<120;i++)s.step({...idleInput(),thrust:-1},FLIGHT_STEP);
    expect(s.remainingTourIds()).toEqual(['home']);const departed=JSON.stringify(s.state);expect(s.resumeTour()).toBe(true);expect(JSON.stringify(s.state)).toBe(departed);finish(s);
    expect(s.visits.map(v=>v.id)).toEqual([...EXPLORATION_DESTINATIONS.map(v=>v.id),'home']);expect(s.remainingTourIds()).toEqual([]);
  });
  it('can depart after arrival and return to a visited object',()=>{
    const s=new ExplorationSession();s.depart();finish(s);const first={time:s.state.time,fuel:s.state.fuel};
    s.depart('stage');finish(s);s.depart('satellite');finish(s);
    expect(s.visits.map(v=>v.id)).toEqual(['satellite','stage','satellite']);expect(s.state.time).toBeGreaterThan(first.time);expect(s.state.fuel).toBeLessThan(first.fuel);
  });
  it('browsing another destination preserves autopilot and changes the route only on departure',()=>{
    const s=new ExplorationSession();s.depart();for(let i=0;i<120*5;i++)s.step(idleInput(),FLIGHT_STEP);
    const before=JSON.stringify(s.state),route=JSON.stringify(s.route);s.select('rock');expect(JSON.stringify(s.state)).toBe(before);expect(s.pilot.enabled).toBe(true);expect(JSON.stringify(s.route)).toBe(route);expect(s.selectedId).toBe('satellite');expect(s.previewId).toBe('rock');
    s.depart();expect(s.selectedId).toBe('rock');expect(JSON.stringify(s.state)).toBe(before);finish(s);
  });
  it('manual input cancels the itinerary and retains existing motion',()=>{
    const s=new ExplorationSession();s.startTour();for(let i=0;i<120*10;i++)s.step(idleInput(),FLIGHT_STEP);const speed=s.state.velocity.length(),fuel=s.state.fuel;
    s.step({...idleInput(),yaw:1},FLIGHT_STEP);expect(s.pilot.enabled).toBe(false);expect(s.tour).toHaveLength(0);expect(s.state.velocity.length()).toBeCloseTo(speed);expect(s.state.fuel).toBeLessThan(fuel);
  });
  it('resumes an interrupted moving tour through the unvisited stops and returns home without resetting the vessel',()=>{
    const s=new ExplorationSession();s.startTour();finish(s);s.continueTour();
    for(let i=0;i<120*60&&s.state.velocity.length()<1;i++)s.step(idleInput(),FLIGHT_STEP);
    s.step({...idleInput(),yaw:1},FLIGHT_STEP);s.select('rock');
    expect(s.state.velocity.length()).toBeGreaterThan(0);expect(s.tour).toEqual([]);
    const state=JSON.stringify(s.state),visits=s.visits,trail=s.trail,history=JSON.stringify({visits,trail,distance:s.distanceTravelled});
    expect(s.remainingTourIds()).toEqual(['stage','station','view','rock','home']);expect(s.resumeTour()).toBe(true);
    expect(JSON.stringify(s.state)).toBe(state);expect(s.visits).toBe(visits);expect(s.trail).toBe(trail);expect(JSON.stringify({visits:s.visits,trail:s.trail,distance:s.distanceTravelled})).toBe(history);
    expect(s.selectedId).toBe('stage');expect(s.previewId).toBe('rock');
    for(let i=0;i<120*1600&&s.visits.length<6;i++){
      s.step(idleInput(),FLIGHT_STEP);if(s.status==='blocked')throw Error(s.selectedId+' '+s.message);
    }
    expect(s.visits.map(v=>v.id)).toEqual(['satellite','stage','station','view','rock','home']);expect(s.status).toBe('arrived');expect(s.state.contact).toBeNull();expect(s.state.fuel).toBeGreaterThan(0);
  });
  it('reads actual visits in catalog order and keeps a previously visited home as the final return',()=>{
    const s=new ExplorationSession();
    s.visits.push(...['stage','home','stage','satellite'].map(id=>({id,time:10,fuel:90,travel:100})));
    s.tour=['satellite'];s.selectedId='home';s.status='arrived';s.select('rock');
    const before=JSON.stringify(s),remaining=s.remainingTourIds();expect(remaining).toEqual(['station','view','rock','home']);remaining.pop();expect(JSON.stringify(s)).toBe(before);
    s.visits.push(...['rock','station','view'].map(id=>({id,time:20,fuel:80,travel:200})));
    expect(s.remainingTourIds()).toEqual([]);s.selectedId='view';expect(s.remainingTourIds()).toEqual(['home']);
  });
  it('leaves navigation untouched when fuel or contact prevents starting, continuing or resuming',()=>{
    const s=new ExplorationSession();s.startTour();finish(s);s.stay();s.select('rock');const fuel=s.state.fuel;
    for(const blocked of ['fuel','contact']){
      if(blocked==='fuel')s.state.fuel=0;else {s.state.fuel=fuel;s.state.contact='Contact prevents departure';}
      const before=JSON.stringify(s);
      expect(s.startTour()).toBe(false);expect(JSON.stringify(s)).toBe(before);
      expect(s.continueTour()).toBe(false);expect(JSON.stringify(s)).toBe(before);
      expect(s.resumeTour()).toBe(false);expect(JSON.stringify(s)).toBe(before);
    }
    s.state.contact=null;expect(s.continueTour()).toBe(true);expect(s.selectedId).toBe('stage');expect(s.previewId).toBe('rock');
  });
  it('retains a rejected first stop and can resume it after a manual retreat',()=>{
    const s=new ExplorationSession();s.state.position.set(0,0,-93);s.select('rock');
    expect(s.startTour()).toBe(false);expect(s.status).toBe('blocked');expect(s.tour[0]).toBe('satellite');
    expect(s.resumeTour()).toBe(false);expect(s.tour[0]).toBe('satellite');expect(s.remainingTourIds()[0]).toBe('satellite');
    for(let i=0;i<120*4;i++)s.step({...idleInput(),thrust:-1},FLIGHT_STEP);
    const before=JSON.stringify(s.state);expect(s.resumeTour()).toBe(true);expect(JSON.stringify(s.state)).toBe(before);expect(s.selectedId).toBe('satellite');expect(s.previewId).toBe('rock');finish(s);
    expect(s.visits.map(v=>v.id)).toEqual(['satellite']);expect(s.state.contact).toBeNull();
  });
  it('uses intermediate waypoints when the direct corridor is obstructed',()=>{
    const d={...EXPLORATION_DESTINATIONS[0],position:new Vector3(0,0,-400)};
    const obstacles=[{position:new Vector3(0,0,-180),radius:40,name:'blocking rock'},{position:d.position,radius:d.radius,name:d.name}];
    expect(planExplorationRoute(new Vector3(),d,obstacles)!.length).toBeGreaterThan(1);
    const s=new ExplorationSession([d],obstacles);s.depart();finish(s);expect(s.state.contact).toBeNull();
  });
  it('freezes departure dwell and navigation while paused',()=>{
    const s=new ExplorationSession();s.startTour();finish(s);const state=JSON.stringify(s.state),dwell=s.dwell,count=s.visits.length;
    for(let i=0;i<100;i++)s.step(idleInput(),0);
    expect(JSON.stringify(s.state)).toBe(state);expect(s.dwell).toBe(dwell);expect(s.visits).toHaveLength(count);
  });
  it('stops automatic departure with an explicit reason instead of retrying a zero-second countdown',()=>{
    const s=new ExplorationSession();s.startTour();finish(s);
    const queue=[...s.tour],arrivals=JSON.stringify(s.visits),position=s.state.position.clone();
    s.state.fuel=0;s.dwell=FLIGHT_STEP;
    s.step(idleInput(),FLIGHT_STEP);
    expect(s.status).toBe('blocked');expect(s.message).toContain('推进剂已用尽');expect(s.pilot.enabled).toBe(false);expect(s.staying).toBe(true);
    for(let i=0;i<120;i++)s.step(idleInput(),FLIGHT_STEP);
    expect(s.tour).toEqual(queue);expect(s.selectedId).toBe('satellite');expect(JSON.stringify(s.visits)).toBe(arrivals);expect(s.state.position.equals(position)).toBe(true);
    const before=JSON.stringify(s);expect(s.resumeTour()).toBe(false);expect(JSON.stringify(s)).toBe(before);
  });
  it('keeps free control available after the itinerary ends',()=>{
    const s=new ExplorationSession();s.depart();finish(s);const pos=s.state.position.clone();
    for(let i=0;i<120;i++)s.step({...idleInput(),thrust:-1},FLIGHT_STEP);
    expect(s.status).toBe('free');expect(s.state.position.distanceTo(pos)).toBeGreaterThan(.3);expect(s.visits).toHaveLength(1);
  });
  it('rejects zero fuel and invalid destinations without moving',()=>{
    const s=new ExplorationSession();expect(s.depart('missing')).toBe(false);s.state.fuel=0;expect(s.depart()).toBe(false);expect(s.state.position.length()).toBe(0);
  });
  it('ignores invalid time steps without advancing controls or the flight state',()=>{
    const s=new ExplorationSession();s.startTour();const before=JSON.stringify(s);
    for(const dt of [NaN,Infinity,-1,0,.2])s.step(idleInput(),dt);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('switches a moving route without resetting the clock',()=>{
    const s=new ExplorationSession();s.depart();for(let i=0;i<120*10;i++)s.step(idleInput(),FLIGHT_STEP);const t=s.state.time;s.depart('station');finish(s);
    expect(s.state.time).toBeGreaterThan(t);expect(targetReading(s.state,s.destination.position,s.destination.radius).clearance).toBeLessThan(30);
  });
  it('keeps an arrival open without losing the remaining tour or advancing its countdown',()=>{
    const s=new ExplorationSession();s.startTour();finish(s);const queue=[...s.tour],fuel=s.state.fuel,dwell=s.dwell,time=s.state.time;
    s.stay();for(let i=0;i<120*20;i++)s.step(idleInput(),FLIGHT_STEP);
    expect(s.status).toBe('arrived');expect(s.tour).toEqual(queue);expect(s.dwell).toBe(dwell);expect(s.visits).toHaveLength(1);expect(s.state.fuel).toBe(fuel);expect(s.state.time).toBeGreaterThan(time);
    const before=JSON.stringify(s.state);expect(s.continueTour()).toBe(true);expect(JSON.stringify(s.state)).toBe(before);expect(s.selectedId).toBe(queue[0]);expect(s.staying).toBe(false);finish(s);
  });
  it('does not accelerate observation time or permit skip-ahead while still cruising',()=>{
    const s=new ExplorationSession();s.startTour();expect(explorationTimeRate(s,4,idleInput())).toBe(1);expect(s.continueTour()).toBe(false);
    for(let i=0;i<120*5&&s.pilot.phase!=='thrust';i++)s.step(idleInput(),FLIGHT_STEP);
    expect(s.pilot.phase).toBe('thrust');expect(explorationTimeRate(s,4,idleInput())).toBe(4);expect(explorationTimeRate(s,4,{...idleInput(),yaw:1})).toBe(1);
    finish(s);expect(s.dwell).toBe(12);expect(explorationTimeRate(s,4,idleInput())).toBe(1);
    for(let i=0;i<120*10;i++)s.step(idleInput(),FLIGHT_STEP);expect(s.status).toBe('arrived');expect(s.dwell).toBeCloseTo(2,5);
    for(let i=0;i<120*2+2;i++)s.step(idleInput(),FLIGHT_STEP);expect(s.status).toBe('cruise');expect(s.selectedId).toBe('stage');
  });
  it('browsing during arrival does not change the vessel target or clear a deliberate stop',()=>{
    const s=new ExplorationSession();s.startTour();finish(s);s.stay();s.select('rock');
    expect(s.selectedId).toBe('satellite');expect(s.previewId).toBe('rock');expect(s.staying).toBe(true);expect(s.visits).toHaveLength(1);
    s.continueTour();expect(s.selectedId).toBe('stage');expect(s.previewId).toBe('rock');
  });
});
