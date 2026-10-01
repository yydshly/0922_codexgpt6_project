import {describe,it,expect} from 'vitest';
import {ExplorationSession} from './exploration';
import {ExplorationNarrationLog,type NarrationEntry} from './explorationNarrationLog';
import {narrativeCue} from './explorationNarrative';
import {idleInput,type AutopilotPhase} from './autopilot';
import {FLIGHT_STEP} from './flightPractice';

describe('published exploration narration history',()=>{
  it('ignores repeated frames, preview selections and changing arrival countdown numbers',()=>{
    const session=new ExplorationSession(),log=new ExplorationNarrationLog();
    session.status='arrived';session.tour=['stage'];session.dwell=12;
    log.capture(session,false);const first=log.entries[0];
    for(let second=11;second>=1;second--){
      session.dwell=second;session.state.time++;session.select('rock');
      log.capture(session,false);log.capture(session,false);
    }
    expect(log.entries).toHaveLength(1);expect(log.entries[0]).toBe(first);
    expect(first.targetId).toBe('satellite');expect(first.time).toBe(0);
    expect(first.cue.action).not.toBe(narrativeCue(session,false).action);
    session.stay();log.capture(session,false);
    expect(log.entries).toHaveLength(2);expect(log.entries[1].cue).toEqual(narrativeCue(session,false));
  });

  it('captures pause once without advancing simulation and records resuming the prior phase',()=>{
    const session=new ExplorationSession(),log=new ExplorationNarrationLog();
    session.startTour();session.pilot.phase='thrust';session.state.time=42;
    log.capture(session,false);const running=log.entries[0];
    const before=JSON.stringify(session);
    for(let i=0;i<20;i++)log.capture(session,true);
    expect(JSON.stringify(session)).toBe(before);expect(log.entries).toHaveLength(2);
    expect(log.entries[1].cue).toEqual(narrativeCue(session,true));
    log.capture(session,false);
    expect(log.entries).toHaveLength(3);
    expect(log.entries[2].cue).toEqual(running.cue);
    expect(log.entries.map(entry=>entry.time)).toEqual([42,42,42]);
    expect(log.entries.map(entry=>entry.id)).toEqual([1,2,3]);
  });

  it('attributes the active target and records a real departure even when phase titles match',()=>{
    const session=new ExplorationSession(),log=new ExplorationNarrationLog();
    session.depart('satellite');session.pilot.phase='thrust';log.capture(session,false);
    session.select('rock');log.capture(session,false);
    expect(log.entries).toHaveLength(1);
    expect(session.depart('stage')).toBe(true);session.pilot.phase='thrust';log.capture(session,false);
    expect(log.entries).toHaveLength(2);
    expect(log.entries[0].cue.title).toBe(log.entries[1].cue.title);
    expect(log.entries.map(entry=>entry.targetId)).toEqual(['satellite','stage']);
    expect(log.entries[1].targetName).toBe(session.destination.name);
  });

  it('does not record hidden pause or motion changes while a higher-priority warning is displayed',()=>{
    const session=new ExplorationSession(),log=new ExplorationNarrationLog();
    session.state.contact='接触检查';log.capture(session,false);
    session.state.mainThrust=1;log.capture(session,true);log.capture(session,false);
    expect(log.entries).toHaveLength(1);expect(log.entries[0].cue.tone).toBe('warning');
    session.state.contact=null;session.status='blocked';session.message='航线受阻';
    log.capture(session,false);log.capture(session,true);
    expect(log.entries).toHaveLength(2);expect(log.entries[1].cue).toEqual(narrativeCue(session,true));
    session.status='free';log.capture(session,true);
    expect(log.entries).toHaveLength(3);expect(log.entries[2].cue).toEqual(narrativeCue(session,true));
  });

  it('keeps alignment microcopy changes within one phase, while allowing a later return',()=>{
    const session=new ExplorationSession(),log=new ExplorationNarrationLog();
    session.depart('stage');session.pilot.phase='align';
    session.state.angularVelocity.set(0,.08,0);session.state.rcsTorque.set(0,1,0);
    log.capture(session,false);const first=log.entries[0];
    session.state.rcsTorque.set(0,-1,0);log.capture(session,false);
    expect(narrativeCue(session,false).text).not.toBe(first.cue.text);
    session.state.rcsTorque.set(0,0,0);log.capture(session,false);
    session.state.angularVelocity.set(0,0,0);log.capture(session,false);
    expect(log.entries).toHaveLength(1);
    session.pilot.phase='thrust';log.capture(session,false);
    session.pilot.phase='align';log.capture(session,false);
    expect(log.entries).toHaveLength(3);expect(log.entries[2].cue.title).toBe(first.cue.title);
  });

  it('captures changes in the displayed manual motion without logging continuous speed changes',()=>{
    const session=new ExplorationSession(),log=new ExplorationNarrationLog();session.takeover();
    log.capture(session,false);
    session.step({...idleInput(),thrust:1},FLIGHT_STEP);log.capture(session,false);
    for(let i=0;i<10;i++){session.step({...idleInput(),thrust:1},FLIGHT_STEP);log.capture(session,false);}
    expect(log.entries).toHaveLength(2);
    session.step({...idleInput(),thrust:-1},FLIGHT_STEP);log.capture(session,false);
    session.step({...idleInput(),brake:true},FLIGHT_STEP);log.capture(session,false);
    expect(log.entries).toHaveLength(3);
    session.step({...idleInput(),yaw:1},FLIGHT_STEP);log.capture(session,false);
    session.state.rcsTorque.set(0,0,0);session.state.angularVelocity.set(0,0,0);
    session.state.velocity.set(0,0,-2);session.state.firing=0;session.state.rcsTranslation.set(0,0,0);
    log.capture(session,false);session.state.velocity.multiplyScalar(2);log.capture(session,false);
    expect(log.entries).toHaveLength(5);
    expect(new Set(log.entries.map(entry=>entry.cue.title)).size).toBe(1);
    expect(new Set(log.entries.map(entry=>entry.cue.text)).size).toBe(5);
  });

  it('bounds history to the latest sixty transitions with monotonic ids and a discarded count',()=>{
    const session=new ExplorationSession(),log=new ExplorationNarrationLog();session.depart();
    for(let i=0;i<75;i++){
      session.pilot.phase=i%2?'thrust':'coast';session.state.time=i;log.capture(session,false);
    }
    expect(log.entries).toHaveLength(60);expect(log.discarded).toBe(15);
    expect(log.entries.map(entry=>entry.id)).toEqual(Array.from({length:60},(_,i)=>i+16));
    expect(log.entries[0].time).toBe(15);expect(log.entries[59].time).toBe(74);
    log.capture(session,false);expect(log.discarded).toBe(15);
    const restarted=new ExplorationNarrationLog();restarted.capture(new ExplorationSession(),false);
    expect(restarted.discarded).toBe(0);expect(restarted.entries[0].id).toBe(1);
  });

  it('preserves old snapshots and prevents consumers from mutating stored entries or cue contents',()=>{
    const session=new ExplorationSession(),log=new ExplorationNarrationLog();log.capture(session,false);
    const snapshot=log.entries,entry=snapshot[0],saved=JSON.stringify(entry);
    expect(()=>{(snapshot as NarrationEntry[]).pop();}).toThrow();
    expect(()=>{entry.targetName='changed';}).toThrow();
    expect(()=>{entry.cue.text='changed';}).toThrow();
    session.depart('stage');session.state.time=9;log.capture(session,false);
    expect(snapshot).toHaveLength(1);expect(log.entries).toHaveLength(2);
    expect(log.entries[0]).toBe(entry);expect(JSON.stringify(entry)).toBe(saved);
  });

  it('does not change flight, pilot, tour, route, timer or visit state in any published phase',()=>{
    const session=new ExplorationSession(),log=new ExplorationNarrationLog();session.startTour();
    const phases:AutopilotPhase[]=['off','stabilize','align','thrust','coast','brake','hold','blocked','complete'];
    for(const phase of phases){
      session.pilot.phase=phase;const before=JSON.stringify(session);
      log.capture(session,false);log.capture(session,true);log.capture(session,false);
      expect(JSON.stringify(session)).toBe(before);
    }
  });
});
