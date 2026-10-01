import {describe,it,expect} from 'vitest';
import {ExplorationSession,EXPLORATION_DESTINATIONS} from './exploration';
import {EXPLORATION_STORIES,narrativeArrivalCount,narrativeCue} from './explorationNarrative';
import {idleInput,type AutopilotPhase} from './autopilot';
import {FLIGHT_STEP} from './flightPractice';

function arrive(session:ExplorationSession){
  for(let i=0;i<120*400&&session.status!=='arrived'&&session.status!=='blocked';i++)session.step(idleInput(),FLIGHT_STEP);
  expect(session.status,session.message).toBe('arrived');
}

describe('exploration narration',()=>{
  it('gives each actual destination a complete chapter',()=>{
    expect(Object.keys(EXPLORATION_STORIES)).toEqual(EXPLORATION_DESTINATIONS.map(d=>d.id));
    for(const story of Object.values(EXPLORATION_STORIES))for(const text of Object.values(story))expect(text.length).toBeGreaterThan(8);
  });
  it('continues narrating the active destination when a different card is previewed',()=>{
    const session=new ExplorationSession();session.depart('satellite');session.pilot.phase='thrust';
    const before=narrativeCue(session,false);session.select('rock');
    expect(narrativeCue(session,false)).toEqual(before);expect(before.text).toContain('教学卫星');
    expect(session.previewId).toBe('rock');expect(session.selectedId).toBe('satellite');
    expect(narrativeArrivalCount(session)).toBe(0);
  });
  it('never turns a selection or an unconfirmed stop into an arrival',()=>{
    const session=new ExplorationSession();
    for(const destination of EXPLORATION_DESTINATIONS)session.select(destination.id);
    expect(narrativeArrivalCount(session)).toBe(0);expect(narrativeCue(session,false).tone).toBe('normal');
    session.depart('satellite');session.pilot.phase='hold';session.heldFor=2.9;
    expect(narrativeCue(session,false).tone).toBe('normal');expect(narrativeCue(session,false).text).toContain('3 秒');
    expect(narrativeArrivalCount(session)).toBe(0);
  });
  it('keeps danger visible before pause or arrival narration',()=>{
    const session=new ExplorationSession();session.status='arrived';session.state.contact='已进入教学卫星的保守接触范围';
    expect(narrativeCue(session,true)).toMatchObject({tone:'warning',text:session.state.contact});
    session.state.contact=null;session.status='blocked';session.message='推进剂不足';
    expect(narrativeCue(session,true)).toMatchObject({tone:'warning',text:'推进剂不足'});
    session.status='cruise';session.pilot.phase='blocked';session.pilot.message='航线受阻';
    expect(narrativeCue(session,true)).toMatchObject({tone:'warning',text:'航线受阻'});
  });
  it('pauses the explanation before showing an automatic departure countdown',()=>{
    const session=new ExplorationSession();session.startTour();arrive(session);
    const cue=narrativeCue(session,true);
    expect(cue.title).toBe('暂停在这一刻');expect(cue.text).toContain('倒计时均已暂停');expect(cue.action).not.toContain('秒后');
  });
  it('describes paused automatic travel, an arrived stop and manual control separately',()=>{
    const session=new ExplorationSession();session.startTour();
    expect(narrativeCue(session,true).text).toContain('前往教学卫星的航程已暂停');
    arrive(session);expect(narrativeCue(session,true).text).toContain('当前停留于教学卫星');
    session.takeover();session.select('rock');
    const cue=narrativeCue(session,true);expect(cue.text).toContain('手动探索已暂停');expect(cue.text).toContain('没有自动接近的航线');expect(cue.text).not.toContain('教学卫星');expect(cue.text).not.toContain('岩体');
  });
  it('distinguishes manual thrust, RCS braking and turning from unpowered coasting',()=>{
    const session=new ExplorationSession();session.state.velocity.set(0,0,-2);
    session.step({...idleInput(),thrust:1},FLIGHT_STEP);
    expect(narrativeCue(session,false).text).toContain('主推进正在');expect(narrativeCue(session,false).text).not.toContain('沿已有速度滑行');
    session.step({...idleInput(),brake:true},FLIGHT_STEP);
    expect(narrativeCue(session,false).text).toContain('RCS 喷口正在施加平移推力');
    session.step({...idleInput(),yaw:1},FLIGHT_STEP);
    expect(narrativeCue(session,false).text).toContain('正在调整姿态');expect(narrativeCue(session,false).text).toContain('转船头本身不会');
    for(let i=0;i<120;i++)session.step(idleInput(),FLIGHT_STEP);
    expect(narrativeCue(session,false).text).toContain('沿已有速度滑行');expect(narrativeArrivalCount(session)).toBe(0);
  });
  it('uses actual arrivals for observation prompts without claiming the user observed anything',()=>{
    const session=new ExplorationSession();session.startTour();arrive(session);session.select('rock');
    const cue=narrativeCue(session,false);
    expect(cue.title).toBe('抵达 · 教学卫星');expect(cue.text).toContain(EXPLORATION_STORIES.satellite.observe);
    expect(cue.action).toContain('废弃级段');expect(cue.action).toContain('12 秒');expect(narrativeArrivalCount(session)).toBe(1);
    session.stay();expect(narrativeCue(session,false).action).toContain('正在停留');expect(narrativeCue(session,false).action).not.toContain('秒后');
  });
  it('distinguishes applying turn torque from braking angular motion',()=>{
    const session=new ExplorationSession();session.depart('stage');session.pilot.phase='align';
    session.state.angularVelocity.set(0,.08,0);session.state.rcsTorque.set(0,1,0);
    expect(narrativeCue(session,false).text).toContain('建立角速度');
    session.state.rcsTorque.set(0,-1,0);expect(narrativeCue(session,false).text).toContain('反向制转');
    session.state.rcsTorque.set(0,0,0);expect(narrativeCue(session,false).text).toContain('船头仍在转动');
    session.state.angularVelocity.set(0,0,0);expect(narrativeCue(session,false).text).toContain('稳定对准');
  });
  it('describes RCS braking and preserves the distinction between a waypoint and a visit',()=>{
    const session=new ExplorationSession();session.depart();session.pilot.phase='brake';
    expect(narrativeCue(session,false).text).toContain('RCS');expect(narrativeCue(session,false).text).toContain('当前速度相反');
    session.route.unshift(session.state.position.clone());session.pilot.phase='hold';
    expect(narrativeCue(session,false).title).toContain('绕行航点');expect(narrativeCue(session,false).tone).toBe('normal');
    expect(narrativeArrivalCount(session)).toBe(0);
  });
  it('counts distinct known recorded destinations and requires a return arrival for the six-stop ending',()=>{
    const session=new ExplorationSession();
    for(const id of ['satellite','satellite','stage','station','view','rock','unknown'])session.visits.push({id,time:0,fuel:100,travel:0});
    session.selectedId='home';session.status='arrived';
    expect(narrativeArrivalCount(session)).toBe(5);expect(narrativeCue(session,false).title).not.toBe('六站到达记录已齐');
    session.visits.push({id:'home',time:0,fuel:100,travel:0});session.status='free';
    expect(narrativeCue(session,false).tone).toBe('normal');
    session.status='arrived';session.selectedId='rock';expect(narrativeCue(session,false).title).not.toBe('六站到达记录已齐');
    session.selectedId='home';expect(narrativeCue(session,false).title).toBe('六站到达记录已齐');
  });
  it('ends a flown six-stop route as a teaching arrival log, leaving observation to the user',()=>{
    const session=new ExplorationSession();session.startTour();
    for(let i=0;i<120*1600&&session.visits.length<6&&session.status!=='blocked';i++)session.step(idleInput(),FLIGHT_STEP);
    expect(session.status,session.message).toBe('arrived');expect(session.selectedId).toBe('home');expect(narrativeArrivalCount(session)).toBe(6);
    const cue=narrativeCue(session,false);expect(cue.title).toBe('六站到达记录已齐');expect(cue.text).toContain('自动接近后停稳');expect(cue.text).toContain('仍由你自己辨认');
    expect(EXPLORATION_STORIES.home.finding).toContain('不代表真实发射');
    session.takeover();expect(narrativeCue(session,false).tone).toBe('normal');expect(narrativeArrivalCount(session)).toBe(6);
  });
  it('reads every phase without mutating physics, route, visit history or timers',()=>{
    const session=new ExplorationSession();session.startTour();
    const phases:AutopilotPhase[]=['off','stabilize','align','thrust','coast','brake','hold','blocked','complete'];
    for(const phase of phases){session.pilot.phase=phase;const before=JSON.stringify(session);narrativeCue(session,false);narrativeCue(session,true);narrativeArrivalCount(session);expect(JSON.stringify(session)).toBe(before);}
  });
});
