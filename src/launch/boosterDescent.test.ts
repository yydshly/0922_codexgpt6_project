import {beforeAll,describe,expect,it} from 'vitest';
import {BoosterDescent} from './boosterDescent';
import {FlightSession,flightChecksum} from './flightSession';
import {BASELINE_VEHICLE} from './vehicle';
import type {FlightState} from './liftoff';
import {add,norm,scale} from './ascent';
import {taskResultMarkdown} from './postDeploymentProgress';

let source:FlightState,session:FlightSession;
beforeAll(()=>{
 session=new FlightSession(BASELINE_VEHICLE,843800000);session.action('preview-ascent');while(session.running)session.advanceSteps(1);session.action('separate');source=structuredClone(session.state);
});
describe('Independent first-stage reference descent',()=>{
 it('starts only at the actual separation state with the existing mass and momentum',()=>{
  const sim=new BoosterDescent(source),b=source.ascent!.detached!,before=structuredClone(source);
  expect(sim.record.latest.position).toEqual(b.position);expect(sim.record.latest.velocity).toEqual(b.velocity);expect(sim.record.massKg).toBe(b.massKg);
  sim.advanceTo(source.time+10);expect(source).toEqual(before);expect(sim.record.latest.time).toBeLessThanOrEqual(source.time+10+1e-7);
  expect(()=>new BoosterDescent(new FlightSession(BASELINE_VEHICLE,843800000).state)).toThrow('实际分离');
 });
 it('records ascent, descent, atmosphere and a bounded reference endpoint without declaring survival',()=>{
  const sim=new BoosterDescent(source);sim.advanceTo(source.time+4000);const r=sim.record;
  expect(r.status).toBe('surface-reference');expect(Math.abs(r.latest.altitudeM)).toBeLessThan(1e-5);expect(r.massKg).toBe(14000);
  expect(r.peakAltitudeM).toBeGreaterThan(source.ascent!.altitudeM);expect(r.peakHeatWm2).toBeGreaterThan(0);
  expect(r.events.some(e=>e.label.includes('最高点'))).toBe(true);expect(r.events.some(e=>e.label.includes('80 km'))).toBe(true);expect(r.events.some(e=>e.label.includes('20 km'))).toBe(true);
  expect(r.reason).toContain('未判定');expect(r.latest.model).toBe('entry');expect(r.latest.airSpeedMS).toBeGreaterThan(0);
  expect(r.samples[0].heatFluxWm2).toBeNull();expect(r.latest.heatFluxWm2).toBeNull();
  const frozen=sim.snapshot();sim.advanceTo(50000);expect(sim.record).toEqual(frozen);
  expect(taskResultMarkdown(source,'分离',r)).toContain('一级独立参考记录');
 });
 it('converges across three physical step sizes',()=>{
  const runs=[.25,.125,.0625].map(dt=>{const sim=new BoosterDescent(source,dt);sim.advanceTo(source.time+4000);return sim.record;});
  const distance=(a:number,b:number)=>norm(add(runs[a].latest.position,scale(runs[b].latest.position,-1)));
  expect(distance(0,1)).toBeLessThan(2);expect(distance(1,2)).toBeLessThan(distance(0,1));
  expect(Math.abs(runs[0].latest.time-runs[2].latest.time)).toBeLessThan(.02);
  expect(Math.abs(runs[0].peakHeatWm2/runs[2].peakHeatWm2-1)).toBeLessThan(.01);
 });
 it('is independent of render batching and does not compute beyond the current mission time',()=>{
  const whole=new BoosterDescent(source);whole.advanceTo(source.time+900);
  for(const interval of [1/60,1/3,25]){
   const sim=new BoosterDescent(source);for(let t=source.time;t<source.time+900;t+=interval)sim.advanceTo(t);sim.advanceTo(source.time+900);
   expect(sim.record).toEqual(whole.record);
  }
  const sim=new BoosterDescent(source);sim.advanceTo(source.time+.1);expect(sim.record.latest.time).toBe(source.time);
  sim.advanceTo(source.time+10);const before=sim.snapshot();sim.advanceTo(source.time+10);expect(sim.record).toEqual(before);
 });
 it('rebuilds derived records on restore without changing legacy flight snapshots or checksums',()=>{
  const active=FlightSession.restore(JSON.stringify(session.save())),control=FlightSession.restore(JSON.stringify(session.save()));
  control.boosterDescent=undefined;
  for(const task of [active,control]){
   while(task.running)task.advanceSteps(1);task.action('continue-orbit');while(task.running)task.advanceSteps(1);
   task.action('coast');while(task.running)task.advanceSteps(1);
  }
  expect(active.state).toEqual(control.state);expect(flightChecksum(active.state)).toBe(flightChecksum(control.state));
  expect(active.boosterDescent!.record.status).toBe('surface-reference');
  const restored=FlightSession.restore(JSON.stringify(active.save()));expect(restored.state).toEqual(active.state);expect(restored.boosterDescent!.record).toEqual(active.boosterDescent!.record);
  const frozen=restored.boosterDescent!.snapshot();restored.advance(.25);expect(restored.boosterDescent!.record).toEqual(frozen);
 });
 it('preserves the original separation mass for a lighter first-stage engine',()=>{
  const lighter=structuredClone(source);lighter.ascent!.detached!.massKg=13000;lighter.ascent!.separation!.boosterMassKg=13000;
  const a=new BoosterDescent(source),b=new BoosterDescent(lighter);a.advanceTo(source.time+900);b.advanceTo(source.time+900);
  expect(b.record.massKg).toBe(13000);expect(b.record.latest.airSpeedMS).toBeLessThan(a.record.latest.airSpeedMS);
 });
});
