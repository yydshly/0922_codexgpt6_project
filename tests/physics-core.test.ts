import { describe, expect, it } from 'vitest';
import { NBodySystem } from '../src/physics/core';
import type { StateFrame } from '../src/types';

function circularPair() {
  const gms = [132712440041.279419, 398600.435507];
  const radius = 149597870.7, total = gms[0] + gms[1];
  const speed = Math.sqrt(total / radius), fraction = gms[1] / total;
  const frame: StateFrame = {
    time: 123456,
    positions: new Float64Array([-radius * fraction, 0, 0, radius * (1 - fraction), 0, 0]),
    velocities: new Float64Array([0, -speed * fraction, 0, 0, speed * (1 - fraction), 0]),
  };
  return { frame, gms, radius, period: 2 * Math.PI * radius / speed };
}

function relativePosition(frame: StateFrame): number[] {
  return [0, 1, 2].map(k => frame.positions[k + 3] - frame.positions[k]);
}

describe('independent Newtonian core', () => {
  it('returns a two-body circular orbit after its analytical period and moves the Sun', () => {
    const { frame, gms, period, radius } = circularPair();
    const system = new NBodySystem(frame, gms, period / 10000);
    system.advance(period / 4);
    expect(Math.abs(system.snapshot().positions[1])).toBeGreaterThan(100);
    system.advance(period * .75);
    const position = relativePosition(system.snapshot());
    expect(Math.hypot(position[0] - radius, position[1], position[2]) / radius).toBeLessThan(1e-6);
    expect(system.steps).toBe(10000);
  });

  it('produces identical fixed-step states at 30, 60, and 144 frame updates per second', () => {
    const { frame, gms } = circularPair();
    const snapshots = [30, 60, 144].map(fps => {
      const system = new NBodySystem(frame, gms);
      for (let frame = 0; frame < fps * 10; frame++) system.advance(86400 / fps);
      expect(system.steps).toBe(2880);
      return system.snapshot();
    });
    expect(snapshots[1]).toEqual(snapshots[0]);
    expect(snapshots[2]).toEqual(snapshots[0]);
  });

  it('converges at second order under 300 / 150 / 75 second steps', () => {
    const { frame, gms, period, radius } = circularPair();
    const duration = 365 * 86400;
    const angle = 2 * Math.PI * duration / period;
    const errors = [300, 150, 75].map(step => {
      const system = new NBodySystem(frame, gms, step);
      system.advance(duration);
      const position = relativePosition(system.snapshot());
      return Math.hypot(position[0] - radius * Math.cos(angle), position[1] - radius * Math.sin(angle), position[2]);
    });
    expect(errors[0] / errors[1]).toBeGreaterThan(3.8);
    expect(errors[0] / errors[1]).toBeLessThan(4.2);
    expect(errors[1] / errors[2]).toBeGreaterThan(3.6);
    expect(errors[1] / errors[2]).toBeLessThan(4.4);
  });

  it('retains fractional time, limits work, and resets without leaking mutable arrays', () => {
    const { frame, gms } = circularPair();
    const system = new NBodySystem(frame, gms);
    const copy = system.snapshot();
    copy.positions.fill(0);
    system.advance(1000, 1);
    expect(system.steps).toBe(1);
    expect(system.pendingSeconds).toBe(700);
    system.advance(0);
    expect(system.steps).toBe(3);
    expect(system.pendingSeconds).toBe(100);
    system.advance(200);
    expect(system.steps).toBe(4);
    system.reset(frame);
    expect(system.snapshot()).toEqual(frame);
    expect(system.pendingSeconds).toBe(0);
    expect(system.steps).toBe(0);
  });

  it('rejects invalid inputs and overlapping point masses', () => {
    const { frame, gms } = circularPair();
    expect(() => new NBodySystem(frame, gms, 0)).toThrow();
    expect(() => new NBodySystem({ ...frame, positions: new Float64Array(6) }, gms)).toThrow();
    const system = new NBodySystem(frame, gms);
    expect(() => system.advance(-1)).toThrow();
    expect(() => system.advance(NaN)).toThrow();
    expect(() => system.advance(300, 1.2)).toThrow();
  });
});
