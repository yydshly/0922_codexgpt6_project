import { describe, expect, it } from 'vitest';
import { BASELINE_VEHICLE, STANDARD_GRAVITY, deriveVehicle } from './vehicle';
import { integrateVertical, LiftoffClock, LiftoffSimulation, verticalForces, type VerticalModel } from './liftoff';
const advanceTo = (s: LiftoffSimulation, time: number) => { for (let i = 0; s.state.time < time - 1e-8 && i < 30000; i++) s.step(); };
const baseline = () => { const s = new LiftoffSimulation(BASELINE_VEHICLE); s.start(); return s; };
describe('E3 departure dynamics and transitions', () => {
  it('holds the rocket through ignition while consuming the integrated thrust ramp', () => {
    const s = baseline(), vehicle = deriveVehicle(BASELINE_VEHICLE);
    advanceTo(s, -3); expect(s.state.phase).toBe('ignition'); expect(s.state.fuelKg).toBe(vehicle.stages[0].fuelKg);
    advanceTo(s, -1); expect(s.state.thrustN).toBeCloseTo(3200000, 4); expect(s.state.heightM).toBe(0); expect(s.state.speedMS).toBe(0); expect(s.state.accelerationMS2).toBe(0);
    expect(s.state.fuelKg).toBeCloseTo(180000 - vehicle.stages[0].massFlowKgS, 7);
    advanceTo(s, 0); expect(s.state.released).toBe(true); expect(s.state.heightM).toBe(0);
    expect(s.state.fuelKg).toBeCloseTo(180000 - 2 * vehicle.stages[0].massFlowKgS, 7);
    s.step(); expect(s.state.heightM).toBeGreaterThan(0); expect(s.state.speedMS).toBeGreaterThan(0);
    expect(s.state.events.map(e => e.time)).toEqual([-10, -3, 0]);
  });
  it('cancels before release, shuts down and retains spent fuel without continuing time', () => {
    for (const time of [-7, -1]) {
      const s = baseline(); advanceTo(s, time); const fuel = s.state.fuelKg; s.cancel(); const snapshot = s.snapshot();
      for (let i = 0; i < 20; i++) s.step();
      expect(s.snapshot()).toEqual(snapshot); expect(s.state.fuelKg).toBe(fuel); expect(s.state.thrustN).toBe(0); expect(s.state.phase).toBe('aborted'); expect(s.state.released).toBe(false);
    }
  });
  it('freezes at the end of the departure segment without declaring orbit or switching the engine off', () => {
    const s = baseline(); advanceTo(s, 30);
    expect(s.state.phase).toBe('complete'); expect(s.state.heightM).toBeGreaterThanOrEqual(150); expect(s.state.heightM).toBeLessThan(155);
    expect(s.state.thrustN).toBeGreaterThan(0); const before = s.snapshot(); s.step(); s.cancel(); s.start(); expect(s.snapshot()).toEqual(before);
  });
  it('uses propellant mass consistently; changing configured mass changes actual ascent', () => {
    const a = baseline(), b = new LiftoffSimulation({ ...BASELINE_VEHICLE, boosterFillPercent: 50 }); b.start(); advanceTo(a, 3); advanceTo(b, 3);
    expect(b.state.heightM).toBeGreaterThan(a.state.heightM); expect(a.state.massKg).toBeCloseTo(53300 + a.state.fuelKg, 8);
    expect(a.state.accelerationMS2).toBeCloseTo((a.state.thrustN - a.state.weightN - a.state.dragN) / a.state.massKg, 10);
  });
  it('rejects incompatible and non-liftoff configurations before countdown', () => {
    expect(() => new LiftoffSimulation({ ...BASELINE_VEHICLE, boosterEngine: 'b-light' })).toThrow('推重比');
    expect(() => new LiftoffSimulation({ ...BASELINE_VEHICLE, boosterFillPercent: 0 })).toThrow('为空');
  });
  it('converges at the frozen 0.05/0.025 second step sizes at the same physical time', () => {
    const a = baseline(), b = new LiftoffSimulation(BASELINE_VEHICLE, .025), c = new LiftoffSimulation(BASELINE_VEHICLE, .0125); b.start(); c.start();
    [a, b, c].forEach(s => advanceTo(s, 6));
    expect(Math.abs(a.state.heightM - b.state.heightM)).toBeLessThan(.001);
    expect(Math.abs(a.state.speedMS - b.state.speedMS)).toBeLessThan(.001);
    expect(Math.abs(b.state.heightM - c.state.heightM)).toBeLessThan(.001);
    expect(a.state.events).toEqual(b.state.events);
  });
  it('reproduces an analytic variable-mass burn without gravity or drag and stops at fuel exhaustion', () => {
    const model: VerticalModel = { carriedKg: 900, flowKgS: 10, ispS: 285, mu: 0, radiusM: 1, rho: 0, cdArea: 1 };
    let s = { heightM: 0, speedMS: 0, fuelKg: 100 };
    for (let i = 0; i < 100; i++) s = integrateVertical(s, model, 1, .1);
    expect(s.speedMS).toBeCloseTo(285 * STANDARD_GRAVITY * Math.log(1000 / 900), 6);
    const split = integrateVertical({ heightM: 0, speedMS: 0, fuelKg: .2 }, model, 1, .1);
    expect(split.fuelKg).toBe(0); expect(split.speedMS).toBeCloseTo(285 * STANDARD_GRAVITY * Math.log(900.2 / 900), 7);
    expect(integrateVertical(split, model, 1, 1).speedMS).toBe(split.speedMS);
  });
  it('gravity accelerates downwards and drag opposes velocity on either side of zero', () => {
    const m: VerticalModel = { carriedKg: 900, flowKgS: 10, ispS: 285, mu: 9.8e6, radiusM: 1000, rho: 1.225, cdArea: 1 };
    expect(verticalForces({ heightM: 0, speedMS: 0, fuelKg: 100 }, m, 0).accelerationMS2).toBeCloseTo(-9.8, 10);
    expect(verticalForces({ heightM: 0, speedMS: 20, fuelKg: 100 }, m, 0).dragN).toBeGreaterThan(0);
    expect(verticalForces({ heightM: 0, speedMS: -20, fuelKg: 100 }, m, 0).dragN).toBeLessThan(0);
  });
  it('has identical physical results for 30, 60 and 144 callback cadences', () => {
    const snapshots = [30, 60, 144].map(fps => { const s = baseline(), clock = new LiftoffClock(s); for (let i = 0; i < 16 * fps; i++) clock.advance(1 / fps); return s.snapshot(); });
    expect(snapshots[0]).toEqual(snapshots[1]); expect(snapshots[1]).toEqual(snapshots[2]);
  });
  it('pauses fuel and time, resumes without catching up, and slows instead of jumping after a stall', () => {
    const s = baseline(), clock = new LiftoffClock(s); for (let i = 0; i < 180; i++) clock.advance(.05);
    clock.pause(true); const before = s.snapshot(); clock.advance(30); expect(s.snapshot()).toEqual(before);
    clock.pause(false); clock.advance(.05); expect(s.state.time).toBeCloseTo(before.time + .05, 10);
    const t = s.state.time; clock.advance(30); expect(s.state.time - t).toBeCloseTo(.25, 10);
  });
  it('isolates snapshots and resets exactly to configured fuel and mass', () => {
    const s = baseline(); advanceTo(s, 2); const snapshot = s.snapshot(); snapshot.events[0].label = 'changed';
    expect(s.state.events[0].label).toBe('开始倒计时');
    const reset = new LiftoffSimulation(BASELINE_VEHICLE); expect(reset.state.fuelKg).toBe(180000); expect(reset.state.massKg).toBe(233300); expect(reset.state.phase).toBe('ready');
  });
});
