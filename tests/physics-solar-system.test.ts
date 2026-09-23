import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NBodySystem } from '../src/physics/core';
import { BODIES } from '../src/data/catalog';
import { interpolateChunk, type EphemerisChunk, type LoadedManifest } from '../src/ephemeris/ephemeris';

describe('real default solar-system initial conditions', () => {
  it('conserves energy and angular momentum for 10 Julian years with a moving Sun', () => {
    const dataRoot = new URL('../public/data/', import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL('manifest.json', dataRoot), 'utf8')) as LoadedManifest;
    const chunk = JSON.parse(readFileSync(new URL(manifest.chunks[0].file, dataRoot), 'utf8')) as EphemerisChunk;
    const initial = interpolateChunk(chunk, manifest.startTdb, 'simulation');
    const system = new NBodySystem(initial, BODIES.map(body => body.simulationGm));
    const baseline = system.diagnostics();
    const initialAngular = Math.hypot(...baseline.scaledAngularMomentum);
    let maximumEnergy = 0, maximumAngular = 0;
    for (let day = 0; day < 3652.5;) {
      const next = Math.min(day + 1, 3652.5);
      system.advance((next - day) * 86400);
      const current = system.diagnostics();
      maximumEnergy = Math.max(maximumEnergy, Math.abs((current.scaledEnergy - baseline.scaledEnergy) / baseline.scaledEnergy));
      maximumAngular = Math.max(maximumAngular, Math.hypot(...current.scaledAngularMomentum.map((v, i) => v - baseline.scaledAngularMomentum[i])) / initialAngular);
      day = next;
    }
    expect(maximumEnergy).toBeLessThan(1e-8);
    expect(maximumAngular).toBeLessThan(1e-10);
    expect(Array.from(system.snapshot().positions).every(Number.isFinite)).toBe(true);
    expect(system.steps).toBe(1051920);
  }, 30000);
});
