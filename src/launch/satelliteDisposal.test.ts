import { beforeAll, describe, expect, it } from 'vitest';
import { BASELINE_VEHICLE, deriveVehicle, parseVehicle, sameVehicle } from './vehicle';
import { FullFlightDemo } from './fullFlightDemo';
import { FlightSession, GROUND_FLIGHT_VERSION, parseFlightSave } from './flightSession';
import { SatelliteDisposalSimulation, satelliteDisposalPlan } from './satelliteDisposal';
import type { FlightState } from './liftoff';
import { add, norm, scale } from './ascent';
import { postDeploymentProgress, taskResultMarkdown } from './postDeploymentProgress';
import { OPS } from './satelliteOperations';

const BASE=843800000;let demo:FullFlightDemo, handoff:FlightState, cut:FlightState, armed:FlightState, burnSave:string;
beforeAll(()=>{
 demo=new FullFlightDemo(new FlightSession(BASELINE_VEHICLE,BASE),'powered');demo.setSpeed(3);
 for(let i=0;!demo.status.finished&&!demo.status.error;i++){
  if(i>30000)throw Error('stalled '+demo.session.state.phase);
  demo.advance(.25);const s=demo.session.state;
  if(s.phase==='ops-complete'&&!handoff)handoff=structuredClone(s);
  if(s.phase==='disposal-armed'&&!armed)armed=structuredClone(s);
  if(s.phase==='disposal-burn'&&s.satelliteDisposal!.burnedKg>1&&!burnSave)burnSave=JSON.stringify(demo.session.save());
  if(s.phase==='disposal-cutoff'&&!cut)cut=structuredClone(s);
 }
 if(demo.status.error)throw Error(demo.session.state.phase+': '+demo.status.error);
},60000);
describe('Satellite disposal choices and powered route',()=>{
 it('accounts for new hardware at launch while preserving the old configuration',()=>{
  const old=deriveVehicle(BASELINE_VEHICLE),power=deriveVehicle({...BASELINE_VEHICLE,satellitePlan:'powered'});
  expect(power.wetKg-old.wetKg).toBe(75);expect(power.payloadKg).toBe(575);expect(power.twr).toBeLessThan(old.twr);
  expect(parseVehicle(BASELINE_VEHICLE)).toEqual(BASELINE_VEHICLE);expect(sameVehicle(BASELINE_VEHICLE,power.config)).toBe(false);
  expect(()=>parseVehicle({...BASELINE_VEHICLE,satellitePlan:'destroy'})).toThrow();
 });
 it('uses satellite fuel, lowers orbit and reaches the reference surface without changing the carrier record',()=>{
  const s=demo.session.state,q=s.satelliteDisposal!,e=s.satelliteEquipment!;
  expect(s.phase).toBe('disposal-complete');expect(s.lifecycle).toBeUndefined();expect(q.outcome).toBe('surface-reference');
  expect(q.burnedKg).toBeGreaterThan(1);expect(q.ventedKg).toBeGreaterThan(0);expect(q.burnedKg+q.ventedKg+e.fuelKg).toBeCloseTo(40,7);
  expect(cut.deployment!.satellite.elements.periapsisM).toBeCloseTo(60000,2);expect(cut.thrustN).toBe(0);
  expect(s.deployment!.carrier).toEqual(handoff.deployment!.carrier);expect(s.operations!.carrierRecordTime).toBe(handoff.operations!.carrierRecordTime);
  expect(s.deployment!.satellite.massKg).toBeCloseTo(535.1,7);expect(Math.abs(s.heightM)).toBeLessThan(1e-5);
  expect(s.message).toContain('未宣称');expect(q.peakHeatWm2).toBeGreaterThan(0);expect(q.entryAt).not.toBeNull();
  expect(s.operations!.energyJ-q.startEnergyJ).toBeCloseTo(q.generatedJ-q.shuntedJ-q.lossJ-q.consumedJ+q.unservedJ,4);
  expect(postDeploymentProgress(s).steps.slice(3).map(p=>p.status)).toEqual(['complete','complete']);
  expect(taskResultMarkdown(s,'参考终点')).toContain('E02 任务结果');
  expect(taskResultMarkdown(s,'参考终点')).not.toContain('无推进器，没有主动离轨');
 });
 it('rejects missing propulsion and blocks insufficient fuel or electricity',()=>{
  const old=structuredClone(handoff);delete old.satelliteEquipment;
  expect(()=>new SatelliteDisposalSimulation(old,BASE)).toThrow('发射前');
  const low=structuredClone(handoff);low.satelliteEquipment!.fuelKg=.1;low.deployment!.satellite.massKg=low.satelliteEquipment!.dryKg+.1;
  expect(satelliteDisposalPlan(low).allowed).toBe(false);expect(()=>new SatelliteDisposalSimulation(low,BASE).command()).toThrow();
  const dark=structuredClone(handoff);dark.operations!.energyJ=1;expect(satelliteDisposalPlan(dark).allowed).toBe(false);
 });
 it('keeps powered hardware and commands out of old save versions and restores an actual burn',()=>{
  const restored=FlightSession.restore(burnSave);expect(restored.state.phase).toBe('disposal-burn');
  expect(restored.state.satelliteEquipment!.fuelKg).toBeLessThan(40);expect(restored.clock.paused).toBe(true);
  const save=JSON.parse(burnSave);save.version=GROUND_FLIGHT_VERSION;expect(()=>parseFlightSave(JSON.stringify(save))).toThrow('旧版');
  expect(FlightSession.restore(JSON.stringify(demo.session.save())).state).toEqual(demo.session.state);
 },60000);
 it('checks finite-burn convergence and pauses physics independently of display timing',()=>{
  const run=(step:number)=>{const sim=new SatelliteDisposalSimulation(handoff,BASE,step);sim.command();while(sim.running)sim.step();sim.align();while(sim.running)sim.step();sim.ignite();while(sim.running)sim.step();return sim.state;};
  const restored=FlightSession.restore(burnSave),t=restored.state.time;restored.advance(1);expect(restored.state.time).toBe(t);
  const fine=run(.125);expect(fine.phase).toBe('disposal-cutoff');
  expect(norm(add(cut.deployment!.satellite.position,scale(fine.deployment!.satellite.position,-1)))).toBeLessThan(20);
  expect(Math.abs(cut.satelliteDisposal!.burnedKg-fine.satelliteDisposal!.burnedKg)).toBeLessThan(.001);
  expect(norm(add(cut.deployment!.satellite.position,scale(armed.deployment!.satellite.position,-1)))).toBeGreaterThan(1000);
 },30000);
 it('flies the lighter powered bus through a manual route without adding free electrical capacity',()=>{
  const session=new FlightSession({...BASELINE_VEHICLE,payloadKg:250,satellitePlan:'powered'},BASE);
  const run=(action:Parameters<FlightSession['action']>[0])=>{session.action(action);let steps=0;while(session.running){if(++steps>100000)throw Error('stalled '+session.state.phase);session.advanceSteps(1);}if(session.state.phase.endsWith('-failed'))throw Error(session.state.message);};
  for(const action of ['preview-ascent','separate','continue-orbit','coast','continue-deployment','open-fairing','deploy','analyze-avoidance','align-avoidance','ignite-avoidance','observe-avoidance','prepare-operations','align-operations','observe-operations','downlink-operations'] as const)run(action);
  expect(session.state.phase).toBe('ops-complete');expect(session.state.deployment!.satellite.massKg).toBe(325);
  expect(session.state.operations!.capacityJ).toBe(OPS.batteryWh*3600*.5);
  for(const action of ['prepare-disposal','command-disposal','align-disposal','ignite-disposal','passivate-disposal','coast-disposal','enter-disposal','lower-disposal'] as const)run(action);
  expect(session.state.phase).toBe('disposal-complete');expect(session.state.massKg).toBeCloseTo(285.1,6);
  expect(session.state.reentry).toBeUndefined();
  expect(postDeploymentProgress(session.state).steps.slice(1,3).map(p=>p.status)).toEqual(['unvisited','unvisited']);
 },30000);
});
