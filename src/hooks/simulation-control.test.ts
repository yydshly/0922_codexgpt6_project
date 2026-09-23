import { describe, expect, it } from 'vitest';
import { NBodySystem } from '../physics/core';
import { physicsAdvanceBudget } from './simulation-control';

describe('interactive worker scheduling at the ephemeris boundary', () => {
  const seed = () => ({ time: 0, positions: new Float64Array([0, 0, 0]), velocities: new Float64Array([1, 0, 0]) });
  it('reserves existing fractional time so the worker cannot overshoot', () => {
    const system = new NBodySystem(seed(), [1], 300);
    system.advance(290);
    const budget = physicsAdvanceBudget(system.snapshot().time, 330, system.pendingSeconds, 330);
    expect(budget.seconds).toBe(40);
    system.advance(budget.seconds);
    expect(system.snapshot().time).toBe(300);
    expect(system.pendingSeconds).toBe(30);
    expect(physicsAdvanceBudget(300, 330, 30, 1000).atBoundary).toBe(true);
  });
  it('allows an exact final step without exceeding the supported endpoint', () => {
    const system = new NBodySystem(seed(), [1], 300);
    system.advance(290);
    const budget = physicsAdvanceBudget(0, 300, system.pendingSeconds, 1e9);
    expect(budget.seconds).toBe(10);
    system.advance(budget.seconds);
    expect(system.snapshot().time).toBe(300);
    expect(physicsAdvanceBudget(300, 300, system.pendingSeconds, 1e9)).toEqual({ seconds: 0, atBoundary: true });
  });
  it('caps fast-forward requests while preserving full steps on the final frame', () => {
    const system = new NBodySystem(seed(), [1], 300);
    for (const requested of [90, 20, 140, 19, 7, 10_000]) {
      const budget = physicsAdvanceBudget(system.snapshot().time, 1000, system.pendingSeconds, requested);
      if (!budget.atBoundary) system.advance(budget.seconds);
      expect(system.snapshot().time).toBeLessThanOrEqual(1000);
    }
    expect(system.snapshot().time).toBe(900);
  });
});
