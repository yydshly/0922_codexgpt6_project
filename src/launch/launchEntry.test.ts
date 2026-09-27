import { describe, expect, it } from 'vitest';
import { BASELINE_VEHICLE } from './vehicle';
import { LiftoffSimulation } from './liftoff';
import { AscentSimulation } from './ascent';
import { computeDeparture } from './launchEntry';

describe('fourth-step quick entry', () => {
  it('calculates the same departure state as watching the full countdown', () => {
    const normal = new LiftoffSimulation(BASELINE_VEHICLE), initial = normal.snapshot(); normal.start();
    while (normal.state.phase !== 'complete') normal.step();
    const quick = computeDeparture(BASELINE_VEHICLE, initial);
    expect({ ...quick, events: normal.state.events }).toEqual(normal.snapshot());
    expect(quick.events.at(-1)!.label).toContain('快速体验');
    expect(quick.fuelKg).toBeLessThan(180000);
    const ascent = new AscentSimulation(BASELINE_VEHICLE, quick);
    expect(ascent.state.time).toBe(normal.state.time); expect(ascent.state.massKg).toBe(normal.state.massKg);
  });
  it('never overwrites a started, cancelled, completed or ascending trial', () => {
    const initial = new LiftoffSimulation(BASELINE_VEHICLE).snapshot();
    for (const phase of ['countdown', 'ignition', 'ascending', 'complete', 'aborted', 'ascent'] as const) expect(() => computeDeparture(BASELINE_VEHICLE, { ...initial, phase })).toThrow('不会覆盖');
  });
  it('uses the applied configuration and validates failed prerequisite launches', () => {
    const config = { ...BASELINE_VEHICLE, boosterFillPercent: 50, payloadKg: 250 as const };
    const quick = computeDeparture(config, new LiftoffSimulation(config).snapshot());
    expect(quick.fuelKg).toBeLessThan(90000); expect(quick.massKg).toBeLessThan(140000);
    expect(() => computeDeparture({ ...config, boosterFillPercent: 0 }, new LiftoffSimulation(config).snapshot())).toThrow();
  });
});
