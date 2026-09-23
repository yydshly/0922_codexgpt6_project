import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AU_KM, bodyById } from '../data/catalog';
import { SATELLITES } from '../data/satellites';
import { overviewSatelliteOffset, overviewSatelliteRadius, satelliteFamilyCounts } from './overview-layout';
import type { Vec3 } from '../types';

describe('satellites in the shared solar-system scene', () => {
  it('includes new parent families in observation counts without an explicit parent whitelist', () => {
    const counts = satelliteFamilyCounts(SATELLITES);
    expect(counts.uranus).toBe(5);
    expect(counts.saturn).toBe(7);
    expect(counts.earth).toBe(1);
    expect(Object.values(counts).reduce((total, count) => total + count, 0)).toBe(20);
    expect(satelliteFamilyCounts([{ parentId: 'venus' }]).venus).toBe(1);
    expect(counts.mercury).toBeUndefined();
  });
  it('retains actual separation and radius in physical presentation with the agreed axis convention', () => {
    const state: Vec3 = [421700, 2300, -1800];
    const projected = overviewSatelliteOffset(state, 69911, 2.35, false);
    [421700 / AU_KM, -1800 / AU_KM, -2300 / AU_KM].forEach((value, i) => expect(projected.getComponent(i)).toBeCloseTo(value, 15));
    expect(projected.length() * AU_KM).toBeCloseTo(Math.hypot(...state), 8);
    expect(overviewSatelliteRadius(1821.6, 69911, 2.35, false)).toBe(1821.6 / AU_KM);
    expect(state).toEqual([421700, 2300, -1800]);
  });
  it('preserves direction and orbital ordering without changing the source values', () => {
    const close: Vec3 = [0, -421700, 5000], far: Vec3 = close.map(n => n * 3) as Vec3;
    const a = overviewSatelliteOffset(close, 69911, 2.35, true), b = overviewSatelliteOffset(far, 69911, 2.35, true);
    expect(a.clone().normalize().distanceTo(b.clone().normalize())).toBeLessThan(1e-12);
    expect(a.y).toBeGreaterThan(0); expect(a.z).toBeGreaterThan(0);
    expect(b.length()).toBeGreaterThan(a.length()); expect(b.length()).toBeLessThan(a.length() * 3);
    expect(a.length()).toBeGreaterThan(2.35 + overviewSatelliteRadius(1821.6, 69911, 2.35, true));
    expect(close).toEqual([0, -421700, 5000]);
  });
  it('keeps the enlarged Mimas sphere outside Saturn rings throughout the loaded ephemeris', () => {
    const parent = bodyById.saturn, mimas = SATELLITES.find(body => body.id === 'mimas')!;
    const manifest = JSON.parse(readFileSync('public/data/satellites/manifest.json', 'utf8'));
    const moonRadius = overviewSatelliteRadius(mimas.radiusKm, parent.radiusKm, 1, true);
    let clearance = Infinity;
    for (const descriptor of manifest.chunks.filter((chunk: { parentId: string }) => chunk.parentId === 'saturn')) {
      const chunk = JSON.parse(readFileSync(`public/data/satellites/${descriptor.file}`, 'utf8'));
      for (const row of chunk.series.find((series: { id: string }) => series.id === 'mimas').samples) {
        const position: Vec3 = [row[0], row[1], row[2]];
        const display = overviewSatelliteOffset(position, parent.radiusKm, 1, true, .03);
        clearance = Math.min(clearance, display.length() - moonRadius - 2.33);
      }
    }
    expect(clearance).toBeGreaterThan(.01);
    const position: Vec3 = [185_000, 4000, -2000];
    expect(overviewSatelliteOffset(position, parent.radiusKm, 1, false, .03).toArray())
      .toEqual(overviewSatelliteOffset(position, parent.radiusKm, 1, false).toArray());
  });
});
