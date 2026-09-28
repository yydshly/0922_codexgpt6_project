import { beforeAll, describe, expect, it } from 'vitest';
import { FlightSession, P3_FLIGHT_VERSION, flightChecksum, parseFlightSave } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { OPS, GROUND_STATIONS, OperationsClock, OperationsSimulation, electricalStep, inEarthShadow, operationsReading, operationsSun, slewDirection, stationFixed, stationLink } from './satelliteOperations';
import { add, dot, norm, rotateEarth, scale, unit, type V3 } from './ascent';
import type { FlightState } from './liftoff';
import { LAUNCH_EARTH } from '../data/launchMission';
import { utcToTdb } from '../data/time';
import { createLaunchSatellite } from './vehicleModel';
import * as THREE from 'three';

const BASE=843800000, R=LAUNCH_EARTH.semiMajorM;
let initial:FlightState, save:string, final:FlightState, finalSave:string;
function finish(s:FlightSession){let i=0;while(s.running){if(i++>40000)throw Error('unbounded');s.advanceSteps(1);}}
beforeAll(()=>{
  const s=new FlightSession(BASELINE_VEHICLE,BASE);
  for(const a of ['start','continue-ascent','separate','continue-orbit','coast','continue-deployment','open-fairing','deploy','analyze-avoidance','align-avoidance','ignite-avoidance','observe-avoidance'] as const){s.action(a);finish(s);}
  initial=structuredClone(s.state);save=JSON.stringify(s.save());
  for(const a of ['prepare-operations','align-operations','observe-operations','downlink-operations'] as const){s.action(a);finish(s);}
  final=structuredClone(s.state);finalSave=JSON.stringify(s.save());
},30000);

describe('P4 power, viewing geometry and data delivery',()=>{
  it('distinguishes sunward space, night-side umbra and off-axis sunlight',()=>{
    expect(inEarthShadow([R+400000,0,0],[1,0,0])).toBe(false);
    expect(inEarthShadow([-R-400000,0,0],[1,0,0])).toBe(true);
    expect(inEarthShadow([-R-400000,R+1,0],[1,0,0])).toBe(false);
    for(const p of [[-R-400000,0,0],[-R-400000,R+1,0]] as V3[]){expect(inEarthShadow(rotateEarth(p,2345),rotateEarth([1,0,0],2345))).toBe(inEarthShadow(p,[1,0,0]));}
  });
  it('places the equinox Sun near Greenwich noon and on the opposite side at midnight',()=>{
    const noon=operationsSun(utcToTdb(new Date('2026-03-20T12:00:00Z')),0).direction;
    const midnight=operationsSun(utcToTdb(new Date('2026-03-20T00:00:00Z')),0).direction;
    expect(noon[0]).toBeGreaterThan(.99);expect(midnight[0]).toBeLessThan(-.99);expect(Math.abs(noon[2])).toBeLessThan(.01);expect(norm(noon)).toBeCloseTo(1,12);
  });
  it('computes zenith, horizon and hidden-side station visibility in the rotating frame',()=>{
    const st=GROUND_STATIONS[0],fixed=stationFixed(st),up:V3=[Math.cos(st.latitudeDeg*Math.PI/180)*Math.cos(st.longitudeDeg*Math.PI/180),Math.cos(st.latitudeDeg*Math.PI/180)*Math.sin(st.longitudeDeg*Math.PI/180),Math.sin(st.latitudeDeg*Math.PI/180)];
    const overhead=add(fixed,scale(up,400000));
    expect(stationLink(overhead,0,st).elevationDeg).toBeCloseTo(90,5);
    expect(stationLink(rotateEarth(overhead,4000),4000,st).rangeM).toBeCloseTo(400000,5);
    expect(stationLink(scale(overhead,-1),0,st).visible).toBe(false);
    const east:V3=[-Math.sin(st.longitudeDeg*Math.PI/180),Math.cos(st.longitudeDeg*Math.PI/180),0];
    expect(stationLink(add(fixed,scale(east,100000)),0,st).elevationDeg).toBeCloseTo(0,8);
  });
  it('balances stored energy, load, losses, rejected charge and unmet load at both limits',()=>{
    for(const [e,g,l,dt] of [[500,300,100,1],[990,300,100,1],[500,0,100,1],[10,0,100,2],[1000,300,100,1]]){
      const x=electricalStep(e,1000,g,l,dt);
      expect(x.energyJ).toBeGreaterThanOrEqual(0);expect(x.energyJ).toBeLessThanOrEqual(1000);
      expect(x.energyJ-e).toBeCloseTo((g-l)*dt-x.lossJ-x.shuntedJ+x.unservedJ,9);
    }
    expect(electricalStep(10,1000,0,100,2).unservedJ).toBe(191);
    expect(electricalStep(1000,1000,300,100,1).shuntedJ).toBe(200);
  });
  it('retains the actual satellite state and freezes the carrier record, with explicit new energy initialization',()=>{
    const sim=new OperationsSimulation(initial,BASE),sat=initial.deployment!.satellite;
    expect(sim.state.deployment!.satellite.position).toEqual(sat.position);expect(sim.state.ascent!.velocity).toEqual(sat.velocity);
    expect(sim.state.massKg).toBe(sat.massKg);expect(sim.state.operations!.energyJ).toBe(800*3600*.6);
    sim.align();for(let i=0;i<10;i++)sim.step();
    expect(sim.state.deployment!.carrier).toEqual(initial.deployment!.carrier);expect(sim.state.deployment!.satellite.position).not.toEqual(sat.position);
    expect(initial.operations).toBeUndefined();expect(()=>new OperationsSimulation({...initial,phase:'deployment-open'},BASE)).toThrow();
    expect(()=>sim.downlink()).toThrow();
  });
  it('sets zero generation in eclipse, accounts for cosine incidence and inhibits reserve-mode payloads',()=>{
    const o=new OperationsSimulation(initial,BASE).state.operations!,time=initial.time+30,sun=operationsSun(BASE,time).direction;
    const day=scale(sun,R+400000),night=scale(day,-1);
    const r=operationsReading(day,time,BASE,o,500,'ops-cycle'),dark=operationsReading(night,time,BASE,o,500,'ops-cycle');
    expect(r.generationW).toBeGreaterThan(1400);expect(r.collecting).toBe(true);expect(dark.generationW).toBe(0);expect(dark.collecting).toBe(false);
    expect(operationsReading(day,time,BASE,{...o,reserveMode:true},500,'ops-cycle').loadW).toBe(200);
    const setup=operationsReading(day,o.startTime,BASE,{...o,initialDirection:scale(sun,-1)},500,'ops-align');expect(setup.generationW).toBe(0);
  });
  it('completes an observation orbit before downlink; the final byte and energy ledgers close',()=>{
    expect(final.phase).toBe('ops-complete');const o=final.operations!;
    expect(o.eclipseSeen&&o.sunlightAfterEclipse).toBe(true);expect(o.elapsedS).toBeGreaterThan(o.cyclePeriodS);
    expect([o.collectedMB,o.bufferMB,o.deliveredMB]).toEqual([240,0,240]);
    expect(o.samples.some(s=>s.bufferMB===240&&s.deliveredMB===0)).toBe(true);
    expect(o.samples.some(s=>s.shadow&&s.generationW===0)).toBe(true);
    expect(Math.abs(o.energyJ-o.initialEnergyJ-o.generatedJ+o.consumedJ+o.lossJ+o.shuntedJ-o.unservedJ)).toBeLessThan(.01);
    expect(o.unservedJ).toBe(0);expect(o.transmitting).toBe(false);
  });
  it('transfers only during a visible window, preserves queued data outside it, and enters reserve protection',()=>{
    const sim=new OperationsSimulation(initial,BASE);sim.align();while(sim.running)sim.step();sim.observe();while(sim.running)sim.step();
    expect(sim.state.phase).toBe('ops-data-ready');sim.downlink();let outside=0,inside=0;
    while(sim.running){const before=sim.state.operations!.deliveredMB;sim.step();const o=sim.state.operations!;if(o.deliveredMB>before)inside++;else outside++;expect(o.collectedMB).toBeCloseTo(o.bufferMB+o.deliveredMB,9);}
    expect(outside).toBeGreaterThan(0);expect(inside).toBeGreaterThan(0);
    const low=new OperationsSimulation(initial,BASE);low.align();low.state.operations!.energyJ=low.state.operations!.capacityJ*.1;low.step();expect(low.state.operations!.reserveMode).toBe(true);expect(low.state.operations!.collecting).toBe(false);
  });
  it('uses the same fixed steps across frame rates, with no advancement while paused',()=>{
    const run=(fps:number,rate:number)=>{const c=new OperationsClock(new OperationsSimulation(initial,BASE));c.simulation.align();c.pause(false);c.setRate(rate);for(let i=0;i<20*fps/rate;i++)c.advance(1/fps);return c;};
    const a=run(20,1),b=run(60,10),c=run(30,100);expect(a.simulation.state).toEqual(b.simulation.state);expect(a.simulation.state).toEqual(c.simulation.state);
    c.pause(true);const before=flightChecksum(c.simulation.state);c.advance(.25);expect(flightChecksum(c.simulation.state)).toBe(before);
  });
  it('converges over equal physical duration as the fixed step is reduced',()=>{
    const run=(dt:number)=>{const q=new OperationsSimulation(initial,BASE,dt);q.align();while(q.running)q.step();q.observe();for(let i=0;i<1200/dt;i++)q.step();return q.state;};
    const a=run(1),b=run(.5),c=run(.25);
    expect(norm(add(a.ascent!.position,scale(c.ascent!.position,-1)))).toBeLessThan(.1);
    expect(norm(add(b.ascent!.position,scale(c.ascent!.position,-1)))).toBeLessThan(.1);
    expect(Math.abs(a.operations!.energyJ-c.operations!.energyJ)/3600).toBeLessThan(.5);
  });
  it('restores P3-version earlier records and P4 final or in-progress records without weakening checksums',()=>{
    const old=JSON.parse(save);old.version=P3_FLIGHT_VERSION;expect(FlightSession.restore(JSON.stringify(old)).state).toEqual(initial);
    const full=FlightSession.restore(finalSave);expect(full.state).toEqual(final);expect(full.clock.paused).toBe(true);expect(()=>full.action('ignite-deorbit')).toThrow();
    const mid=FlightSession.restore(save);mid.action('prepare-operations');mid.action('align-operations');mid.advanceSteps(11);const restored=FlightSession.restore(JSON.stringify(mid.save()));mid.advanceSteps(8);restored.advanceSteps(8);expect(restored.state).toEqual(mid.state);
    const forged=JSON.parse(finalSave);forged.version=P3_FLIGHT_VERSION;expect(()=>parseFlightSave(JSON.stringify(forged))).toThrow('旧版');
    const changed=JSON.parse(finalSave);changed.snapshot.operations.deliveredMB++;expect(()=>FlightSession.restore(JSON.stringify(changed))).toThrow('校验');
  },30000);
  it('handles antipodal slews and independent solar-wing pointing without rotating the body',()=>{
    const p=slewDirection([1,0,0],[-1,0,0],.5);expect(norm(p)).toBeCloseTo(1,12);expect(dot(p,[1,0,0])).toBeCloseTo(0,12);
    const model=createLaunchSatellite();model.update(500,1);const orientation=model.root.quaternion.clone(), target=new THREE.Vector3(1,0,0);model.pointArrays(target);
    expect(model.root.quaternion.equals(orientation)).toBe(true);
    const wings=model.root.children.find(g=>g.type==='Group')!;
    expect(new THREE.Vector3(0,1,0).applyQuaternion(wings.quaternion).distanceTo(target)).toBeLessThan(1e-12);
    expect(unit(p)).toEqual(p);
  });
  it('retains undelivered data at the six-hour boundary instead of reporting success',()=>{
    const q=new OperationsSimulation(initial,BASE);q.align();while(q.running)q.step();q.observe();while(q.running)q.step();q.downlink();
    // Place the deterministic clock at its hard budget boundary; no forged state is accepted by save/restore.
    q.state.operations!.elapsedS=OPS.maxS-1;q.state.time=q.state.operations!.startTime+OPS.maxS-1;q.step();
    expect(q.state.phase).toBe('ops-failed');expect(q.state.operations!.bufferMB).toBeGreaterThan(0);
  });
});
