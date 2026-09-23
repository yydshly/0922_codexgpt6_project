import { describe, it, expect } from 'vitest';
import raw from '../../public/data/macro/halley-sbdb.json';
import { halleyPoint, macroEcliptic, HALLEY_ORBIT, HALLEY_SOURCE, macroDetailVisible, defaultMacroLayers } from './macroLayers';
import { macroRadius } from './macroStructure';

describe('macro orbit provenance and coordinate transform', () => {
  it('reconstructs the independently supplied perihelion and aphelion distances', () => {
    const element = (id:string) => Number(raw.orbit.elements.find(e=>e.name===id)!.value);
    expect(Math.hypot(...halleyPoint(0))).toBeCloseTo(element('q'), 10);
    expect(Math.hypot(...halleyPoint(Math.PI))).toBeCloseTo(element('ad'), 9);
    expect(HALLEY_SOURCE.epochJdTdb).toBe(Number(raw.orbit.epoch));
  });
  it('keeps the retrograde orientation and inclination of the source plane', () => {
    const a=halleyPoint(0), b=halleyPoint(Math.PI/2);
    const normal=[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    expect(Math.acos(normal[2]/Math.hypot(...normal))*180/Math.PI).toBeCloseTo(HALLEY_ORBIT.i, 9);
    expect(normal[2]).toBeLessThan(0);
  });
  it('maps the same ecliptic axes as the planet view and preserves direction under compression', () => {
    expect(macroEcliptic([0,0,0])).toEqual([0,0,0]);
    const p=macroEcliptic([3,4,12]);
    expect(Math.hypot(...p)).toBeCloseTo(macroRadius(13), 12);
    expect(p[0]/p[1]).toBeCloseTo(3/12, 12);
    expect(p[2]/p[1]).toBeCloseTo(-4/12, 12);
  });
  it('keeps global structures visible and only hides local details at long range', () => {
    expect(macroDetailVisible('moons',62)).toBe(false);
    expect(macroDetailVisible('moons',18)).toBe(true);
    expect(macroDetailVisible('wind',62)).toBe(true);
    expect(macroDetailVisible('comets',62)).toBe(true);
    const initial=defaultMacroLayers(); initial.comets=false;
    expect(defaultMacroLayers().comets).toBe(true);
  });
});
