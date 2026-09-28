import { beforeAll, describe, expect, it } from 'vitest';
import { FlightSession, P4_FLIGHT_VERSION, flightChecksum, parseFlightSave } from './flightSession';
import { LifecycleClock, LifecycleSimulation, SATELLITE_LIFECYCLE as P5, disposalAssessment } from './satelliteLifecycle';
import { BASELINE_VEHICLE } from './vehicle';
import { add, norm, scale } from './ascent';
import { orbitalElements } from './orbitInsertion';
import type { FlightState } from './liftoff';
import { LAUNCH_EARTH } from '../data/launchMission';
import { operationsSun } from './satelliteOperations';

const BASE=843800000;
let initial:FlightState, maintained:FlightState, commanded:FlightState, retired:FlightState, result:FlightState, startSave:string, finalSave:string;
const finish=(s:FlightSession)=>{for(let i=0;s.running;i++){if(i>40000)throw Error('unbounded');s.advanceSteps(1);}};
beforeAll(()=>{
  const s=new FlightSession(BASELINE_VEHICLE,BASE);
  for(const a of ['start','continue-ascent','separate','continue-orbit','coast','continue-deployment','open-fairing','deploy','analyze-avoidance','align-avoidance','ignite-avoidance','observe-avoidance','prepare-operations','align-operations','observe-operations','downlink-operations'] as const){s.action(a);finish(s);}
  initial=structuredClone(s.state);startSave=JSON.stringify(s.save());s.action('prepare-maintenance');s.action('start-maintenance');finish(s);maintained=structuredClone(s.state);s.action('keep-maintenance');s.action('review-retirement');s.action('command-retirement');finish(s);commanded=structuredClone(s.state);s.action('close-retirement');finish(s);retired=structuredClone(s.state);s.action('observe-retirement');finish(s);result=structuredClone(s.state);finalSave=JSON.stringify(s.save());
},30000);
describe('P5 non-propulsive maintenance and retirement',()=>{
  it('carries the 250 kg configuration through launch, work and retirement with its own capacity and loads',()=>{
    const s=new FlightSession({...BASELINE_VEHICLE,payloadKg:250},BASE);
    for(const a of ['start','continue-ascent','separate','continue-orbit','coast','continue-deployment','open-fairing','deploy','analyze-avoidance','align-avoidance','ignite-avoidance','observe-avoidance','prepare-operations','align-operations','observe-operations','downlink-operations','prepare-maintenance','start-maintenance','review-retirement','command-retirement','close-retirement','observe-retirement'] as const){s.action(a);finish(s);}
    expect(s.state.phase).toBe('life-observed');expect(s.state.massKg).toBe(250);expect(s.state.operations!.capacityJ/3600).toBe(400);expect(s.state.operations!.energyJ/3600).toBeCloseTo(20,8);
    expect(s.state.lifecycle!.samples.some(p=>p.loadW===40)).toBe(true);expect(s.state.lifecycle!.samples.some(p=>p.loadW===310)).toBe(true);
  },30000);
  it('inherits resources and orbit without replacing P4 data, fuel or carrier history',()=>{
    const q=new LifecycleSimulation(initial,BASE),energy=initial.operations!.energyJ;
    expect(q.state.operations!.energyJ).toBe(energy);expect(q.state.lifecycle!.startEnergyJ).toBe(energy);expect(q.state.deployment!.satellite.position).toEqual(initial.deployment!.satellite.position);
    q.care();for(let i=0;i<30;i++)q.step();
    expect(q.state.operations!.samples).toEqual(initial.operations!.samples);expect(q.state.deployment!.carrier).toEqual(initial.deployment!.carrier);expect(q.state.operations!.deliveredMB).toBe(240);expect(q.state.thrustN).toBe(0);expect(q.state.massKg).toBe(initial.massKg);expect(initial.lifecycle).toBeUndefined();
  });
  it('guards entry and sequencing, requires no queued observation data, and leaves old state untouched',()=>{
    expect(()=>new LifecycleSimulation({...initial,phase:'ops-data-ready'},BASE)).toThrow();
    const queued=structuredClone(initial);queued.operations!.bufferMB=1;expect(()=>new LifecycleSimulation(queued,BASE)).toThrow();
    const q=new LifecycleSimulation(initial,BASE);expect(()=>q.reviewDisposal()).toThrow();expect(()=>q.closeEnergy()).toThrow();expect(()=>q.observeRetired()).toThrow();
  });
  it('waits at least one orbit and for 85 percent charge before allowing continuation',()=>{
    const l=maintained.lifecycle!,o=maintained.operations!;expect(maintained.phase).toBe('life-review');expect(l.elapsedS).toBeGreaterThanOrEqual(l.periodS);expect(o.energyJ/o.capacityJ).toBeGreaterThanOrEqual(.85);expect(o.loadW).toBe(80);
    const q=new LifecycleSimulation(initial,BASE);q.care();while(q.running)q.step();q.keepWorking();expect(q.state.phase).toBe('life-working');expect(q.state.operations!.loadW).toBe(200);expect(q.state.lifecycle!.isolated).toBe(false);
  });
  it('estimates a two-body reference budget without borrowing carrier propulsion',()=>{
    const r=LAUNCH_EARTH.semiMajorM+400000,mu=LAUNCH_EARTH.gmM3S2,speed=Math.sqrt(mu/r),e=orbitalElements([r,0,0],[0,speed,0]),a=disposalAssessment(e);
    const reference=speed-Math.sqrt(mu*(2/r-2/(r+LAUNCH_EARTH.semiMajorM+80000)));
    expect(a.requiredMS).toBeCloseTo(reference,8);expect(a.permitted).toBe(false);expect(a.availableMS).toBe(0);expect(disposalAssessment({...e,bound:false,apoapsisM:null}).requiredMS).toBeNull();
    expect(result.deployment!.carrier.massKg).toBe(initial.deployment!.carrier.massKg);expect(result.ascent!.upperFuelKg).toBe(initial.ascent!.upperFuelKg);
  });
  it('requires a continuous visible and powered command window, resets an interrupted reception',()=>{
    const q=new LifecycleSimulation(initial,BASE);q.care();while(q.running)q.step();q.reviewDisposal();q.commandRetirement();
    let waited=false;while(q.running&&q.state.lifecycle!.commandProgressS<2){if(!q.state.operations!.activeStation)waited=true;q.step();}
    expect(waited).toBe(true);expect(q.state.phase).toBe('life-contact');expect(q.state.lifecycle!.isolated).toBe(false);
    q.state.operations!.energyJ=q.state.operations!.capacityJ*.01;q.step();expect(q.state.lifecycle!.commandProgressS).toBe(0);expect(q.state.lifecycle!.commandAt).toBeNull();
    expect(commanded.phase).toBe('life-commanded');expect(commanded.lifecycle!.commandProgressS).toBe(5);expect(commanded.lifecycle!.isolated).toBe(false);expect(commanded.operations!.bufferMB).toBe(0);
  });
  it('depletes real stored energy to the declared residual without resetting charge or mass',()=>{
    expect(retired.phase).toBe('life-retired');expect(retired.operations!.energyJ/retired.operations!.capacityJ).toBeCloseTo(.05,12);expect(retired.lifecycle!.mode).toBe('retired');expect(retired.lifecycle!.consumedJ).toBeGreaterThan(1000000);
    expect(retired.massKg).toBe(initial.massKg);expect(retired.operations!.generationW).toBe(0);expect(retired.operations!.loadW).toBe(0);expect(retired.lifecycle!.isolated).toBe(true);expect(retired.lifecycle!.retiredAt).toBe(retired.time);
  });
  it('keeps retired objects moving without recharging, communicating or actively tracking attitude',()=>{
    expect(result.phase).toBe('life-observed');expect(result.time-retired.time).toBeCloseTo(600,8);expect(norm(add(result.deployment!.satellite.position,scale(retired.deployment!.satellite.position,-1)))).toBeGreaterThan(1000000);
    expect(result.operations!.energyJ).toBe(retired.operations!.energyJ);expect(result.operations!.arrayNormal).toEqual(retired.operations!.arrayNormal);expect(result.operations!.direction).toEqual(retired.operations!.direction);expect(result.operations!.transmitting).toBe(false);
    expect(result.deployment!.satellite.elements.periapsisM).toBeGreaterThan(300000);expect(result.message).toContain('尚未完成空间处置');
  });
  it('balances both the segment and carried-forward total energy ledgers',()=>{
    const o=result.operations!,l=result.lifecycle!;
    expect(Math.abs(o.energyJ-l.startEnergyJ-l.generatedJ+l.consumedJ+l.lossJ+l.shuntedJ-l.unservedJ)).toBeLessThan(.01);
    expect(Math.abs(o.energyJ-o.initialEnergyJ-o.generatedJ+o.consumedJ+o.lossJ+o.shuntedJ-o.unservedJ)).toBeLessThan(.01);expect(l.unservedJ).toBe(0);
    expect(o.collectedMB).toBe(o.deliveredMB+o.bufferMB);
  });
  it('uses the retained wing angle for potential power after isolation, with no battery input',()=>{
    const q=new LifecycleSimulation(initial,BASE);q.care();while(q.running)q.step();q.reviewDisposal();q.commandRetirement();while(q.running)q.step();q.closeEnergy();
    while(q.running&&q.state.operations!.shadow)q.step();expect(q.running).toBe(true);expect(q.state.operations!.shadow).toBe(false);
    q.state.lifecycle!.frozenNormal=scale(q.state.operations!.sunDirection,-1);q.step();
    expect(q.state.lifecycle!.potentialW).toBe(0);expect(q.state.operations!.incidence).toBe(0);expect(q.state.operations!.generationW).toBe(0);
    q.state.lifecycle!.frozenNormal=[...q.state.operations!.sunDirection];q.step();
    expect(q.state.lifecycle!.potentialW).toBeGreaterThan(1000);expect(q.state.operations!.incidence).toBeCloseTo(1,8);expect(q.state.operations!.generationW).toBe(0);
  });
  it('advances the same fixed steps at different frame rates and respects pause',()=>{
    const run=(fps:number,rate:number)=>{const c=new LifecycleClock(new LifecycleSimulation(initial,BASE));c.simulation.care();c.setRate(rate);c.pause(false);for(let i=0;i<20*fps/rate;i++)c.advance(1/fps);return c;};
    const a=run(20,1),b=run(60,10),c=run(30,100);expect(a.simulation.state).toEqual(b.simulation.state);expect(a.simulation.state).toEqual(c.simulation.state);c.pause(true);const before=flightChecksum(c.simulation.state);c.advance(.25);expect(flightChecksum(c.simulation.state)).toBe(before);
  });
  it('converges for equal physical time with smaller steps',()=>{
    const run=(dt:number)=>{const q=new LifecycleSimulation(initial,BASE,dt);q.care();for(let i=0;i<1800/dt;i++)q.step();return q.state;};
    const a=run(1),b=run(.5),c=run(.25);expect(norm(add(a.ascent!.position,scale(c.ascent!.position,-1)))).toBeLessThan(.1);expect(norm(add(b.ascent!.position,scale(c.ascent!.position,-1)))).toBeLessThan(.1);expect(Math.abs(a.operations!.energyJ-c.operations!.energyJ)/3600).toBeLessThan(.5);
  });
  it('restores legacy P4 plus P5 mid-operation and final saves, rejects forged versions and resource edits',()=>{
    const old=JSON.parse(startSave);old.version=P4_FLIGHT_VERSION;expect(FlightSession.restore(JSON.stringify(old)).state).toEqual(initial);
    const mid=FlightSession.restore(startSave);mid.action('prepare-maintenance');mid.action('start-maintenance');mid.advanceSteps(25);const loaded=FlightSession.restore(JSON.stringify(mid.save()));mid.advanceSteps(10);loaded.advanceSteps(10);expect(loaded.state).toEqual(mid.state);
    const complete=FlightSession.restore(finalSave);expect(complete.state).toEqual(result);expect(()=>complete.action('align-operations')).toThrow();expect(()=>complete.action('ignite-deorbit')).toThrow();expect(()=>complete.action('close-retirement')).toThrow();
    const wrong=JSON.parse(finalSave);wrong.version=P4_FLIGHT_VERSION;expect(()=>parseFlightSave(JSON.stringify(wrong))).toThrow('旧版');const forged=JSON.parse(finalSave);forged.snapshot.lifecycle.isolated=false;expect(()=>FlightSession.restore(JSON.stringify(forged))).toThrow('校验');
  },30000);
  it('retains an unfinished result on power loss or time limit instead of claiming disposal',()=>{
    const dark=structuredClone(initial),sun=operationsSun(BASE,initial.time).direction;dark.deployment!.satellite.position=scale(sun,-(LAUNCH_EARTH.semiMajorM+400000));dark.operations!.energyJ=.001;
    const q=new LifecycleSimulation(dark,BASE);q.care();q.step();expect(q.state.phase).toBe('life-failed');expect(q.state.lifecycle!.mode).toBe('power-lost');expect(q.state.lifecycle!.retiredAt).toBeNull();
    const timeout=new LifecycleSimulation(initial,BASE);timeout.care();timeout.state.lifecycle!.elapsedS=P5.maxS-1;timeout.state.time=initial.time+P5.maxS-1;timeout.step();expect(timeout.state.phase).toBe('life-failed');expect(timeout.state.lifecycle!.retiredAt).toBeNull();
  });
});
