import { describe, expect, it } from 'vitest';
import { AscentSimulation } from './ascent';
import { LiftoffSimulation } from './liftoff';
import { BASELINE_VEHICLE } from './vehicle';
import { currentPhenomenon, flightEnvironmentReading, plumeAppearance } from './flightPhenomena';

function ascent() {
  const launch = new LiftoffSimulation(BASELINE_VEHICLE); launch.start();
  for (let i = 0; i < 3000 && launch.state.phase !== 'complete'; i++) launch.step();
  return new AscentSimulation(BASELINE_VEHICLE, launch.snapshot());
}
describe('flight phenomena use the actual mission', () => {
  it('distinguishes combustion on the pad from aerodynamic energy loss', () => {
    const launch = new LiftoffSimulation(BASELINE_VEHICLE); launch.start();
    expect(currentPhenomenon(launch.state).title).toBe('点火之前');
    while (launch.state.time < -1) launch.step();
    const r = flightEnvironmentReading(launch.state);
    expect(r.powered).toBe(true); expect(r.airSpeedMS).toBe(0); expect(r.dynamicPressurePa).toBe(0); expect(r.dragPowerW).toBe(0);
    expect(currentPhenomenon(launch.state).title).toBe('喷焰来自发动机');
  });
  it('matches force-model telemetry across a real ascent and does not mutate or advance it', () => {
    const sim = ascent(); let samples = 0, lastPressure = Infinity, lastSpread = -1;
    for (let i = 0; i < 7000 && sim.running; i++) {
      sim.step(); if (i % 200) continue;
      const before = sim.snapshot(), r = flightEnvironmentReading(sim.state), a = sim.state.ascent!;
      expect(r.dynamicPressurePa).toBeCloseTo(a.dynamicPressurePa, 7);
      expect(r.dragPowerW).toBeCloseTo(sim.state.dragN * a.airSpeedMS, 5);
      expect(r.pressurePa).toBeLessThanOrEqual(lastPressure);
      const p = plumeAppearance(r.pressurePa, sim.state.throttle, a.stage);
      expect(p.rarefaction).toBeGreaterThanOrEqual(lastSpread);
      lastPressure = r.pressurePa; lastSpread = p.rarefaction;
      currentPhenomenon(sim.state); expect(sim.snapshot()).toEqual(before); samples++;
    }
    expect(samples).toBeGreaterThan(10); expect(sim.state.phase).toBe('stage-ready');
    expect(flightEnvironmentReading(sim.state).powered).toBe(false); expect(currentPhenomenon(sim.state).id).toBe('separation');
    expect(plumeAppearance(lastPressure, sim.state.throttle, 0).lengthM).toBe(0);
    sim.separate(); expect(currentPhenomenon(sim.state).id).toBe('separation');
    while (sim.state.phase === 'separating') sim.step(); sim.step();
    expect(flightEnvironmentReading(sim.state).powered).toBe(true); expect(currentPhenomenon(sim.state).id).toBe('thin');
  });
  it('distinguishes stopped tasks and unpowered orbital flight from atmospheric flames', () => {
    const launch = new LiftoffSimulation(BASELINE_VEHICLE); launch.start(); launch.cancel();
    expect(currentPhenomenon(launch.state).title).toBe('任务已停止');
    const s = ascent().snapshot();
    s.phase = 'orbit-coast'; s.orbit = {} as NonNullable<typeof s.orbit>; s.thrustN = s.throttle = 0;
    expect(currentPhenomenon(s).id).toBe('coast');
    s.phase = 'orbit-failed'; expect(currentPhenomenon(s).title).toBe('任务已停止');
  });
  it('keeps an illustrative plume bounded at low pressure and removes it at cutoff', () => {
    const sea = plumeAppearance(101325, 1, 0), space = plumeAppearance(0, 1, 0);
    expect(space.widthM).toBeGreaterThan(sea.widthM); expect(space.lengthM).toBeGreaterThan(sea.lengthM);
    for (const pressure of [101325, 1000, 0, -1]) {
      expect(plumeAppearance(pressure, 0, 1).lengthM).toBe(0); expect(plumeAppearance(pressure, 0, 1).opacity).toBe(0);
      expect(Number.isFinite(plumeAppearance(pressure, 1, 1).lengthM)).toBe(true);
    }
  });
});
