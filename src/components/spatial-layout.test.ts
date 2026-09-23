import { describe, expect, it } from 'vitest';
import { BODIES, bodyById } from '../data/catalog';
import { mapOrbitalDistance, spatialRadius, type SpatialView } from './spatial-layout';

const views: SpatialView[] = ['overview','inner','outer'];

describe('illustrative spatial layout', () => {
  it('has a continuous zero and finite, nonnegative, strictly ordered radial distances', () => {
    const samples=[0,1e-9,1e-6,.01,.1,.307,.387,1,1.52,5.2,9.58,19.2,30.1,50,100,1000,100000];
    for (const view of views) {
      const distances=samples.map(value=>mapOrbitalDistance(value,view));
      expect(distances[0]).toBe(0);
      expect(distances[1]).toBeLessThan(1e-7);
      for (let i=0;i<distances.length;i++) {
        expect(Number.isFinite(distances[i])).toBe(true);
        expect(distances[i]).toBeGreaterThanOrEqual(0);
        if(i) expect(distances[i]).toBeGreaterThan(distances[i-1]);
      }
    }
  });

  it('keeps Mercury clear of the enlarged solar surface at perihelion', () => {
    for (const view of views) {
      const separation=mapOrbitalDistance(.307,view);
      expect(separation).toBeGreaterThan(spatialRadius(bodyById.sun,view)+spatialRadius(bodyById.mercury,view));
    }
  });

  it('retains body-size ordering and the Earth/Moon ratio with positive fixed radii', () => {
    const physicalOrder=[...BODIES].sort((a,b)=>a.radiusKm-b.radiusKm);
    for (const view of views) {
      const radii=physicalOrder.map(body=>spatialRadius(body,view));
      for(let i=0;i<radii.length;i++) {
        expect(Number.isFinite(radii[i])).toBe(true);
        expect(radii[i]).toBeGreaterThan(0);
        if(i)expect(radii[i]).toBeGreaterThan(radii[i-1]);
      }
      expect(spatialRadius(bodyById.moon,view)/spatialRadius(bodyById.earth,view))
        .toBeCloseTo(bodyById.moon.radiusKm/bodyById.earth.radiusKm,4);
    }
  });

  it('leaves the scientific body catalog unchanged and rejects invalid inputs', () => {
    const before=JSON.stringify(BODIES);
    const frozenBody=Object.freeze({...bodyById.earth});
    for(const view of views) {
      spatialRadius(frozenBody,view);
      for(const body of BODIES) {
        spatialRadius(body,view);
        mapOrbitalDistance(body.semiMajorAxisAu,view);
      }
      for(const invalid of [-1,NaN,Infinity,-Infinity]) {
        expect(()=>mapOrbitalDistance(invalid,view)).toThrow(RangeError);
      }
    }
    expect(JSON.stringify(BODIES)).toBe(before);
    expect(frozenBody).toEqual(bodyById.earth);
  });
});
