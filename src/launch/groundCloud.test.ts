import { describe, expect, it } from 'vitest';
import { groundCloudPuff, groundCloudTiming } from './groundCloud';
import { createVehicleExhaust } from './rocketPlume';
import { LiftoffSimulation } from './liftoff';
import { AscentSimulation } from './ascent';
import { BASELINE_VEHICLE } from './vehicle';

describe('launch visual continuity', () => {
  it('retains pad smoke across the departure to ascent transition and fades with mission time', () => {
    const s = new LiftoffSimulation(BASELINE_VEHICLE); expect(groundCloudTiming(s.state).emissionS).toBe(0); s.start();
    while (s.state.phase !== 'complete') s.step();
    const ascent = new AscentSimulation(BASELINE_VEHICLE, s.snapshot());
    expect(groundCloudTiming(ascent.state)).toEqual(groundCloudTiming(s.state));
    const before = groundCloudTiming(ascent.state); expect(groundCloudPuff(before.ageS, before.emissionS, 0).opacity).toBeGreaterThan(0);
    expect(groundCloudPuff(64.9, 8, 0).opacity).toBeLessThan(.01); expect(groundCloudPuff(73, 8, 79).opacity).toBe(0);
    expect(groundCloudPuff(before.ageS, before.emissionS, 0)).toEqual(groundCloudPuff(before.ageS, before.emissionS, 0));
  });
  it('preserves emitted puffs on cancellation and never emits future puffs', () => {
    const s = new LiftoffSimulation(BASELINE_VEHICLE); s.start(); while (s.state.time < -1) s.step();
    const before = groundCloudTiming(s.state); s.cancel(); const after = groundCloudTiming(s.state);
    expect(groundCloudPuff(after.ageS, after.emissionS, 0)).toEqual(groundCloudPuff(before.ageS, before.emissionS, 0));
    expect(groundCloudPuff(after.ageS + 10, after.emissionS, 79).opacity).toBe(0);
  });
  it('uses the same multi-nozzle layout until separation, and hides all plumes at cutoff', () => {
    const view = createVehicleExhaust();
    view.update(20, 99000, 1, 0, BASELINE_VEHICLE.boosterEngine);
    const expected = BASELINE_VEHICLE.boosterEngine === 'b-light' ? 2 : 4;
    expect(view.root.children.filter(c => c.visible)).toHaveLength(expected);
    const positions = view.root.children.map(c => c.position.toArray());
    view.update(100, 100, 1, 0, BASELINE_VEHICLE.boosterEngine);
    expect(view.root.children.map(c => c.position.toArray())).toEqual(positions);
    view.update(180, 1, 1, 1, BASELINE_VEHICLE.boosterEngine); expect(view.root.children.filter(c => c.visible)).toHaveLength(1); expect(view.root.position.y).toBe(33.7);
    view.update(600, 0, 0, 1, BASELINE_VEHICLE.boosterEngine); expect(view.root.visible).toBe(false); expect(view.root.children.some(c => c.visible)).toBe(false);
    view.root.traverse(o => { const mesh = o as import('three').Mesh; mesh.geometry?.dispose(); if (mesh.material && !Array.isArray(mesh.material)) mesh.material.dispose(); });
  });
});
