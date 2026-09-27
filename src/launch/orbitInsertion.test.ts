import { describe, expect, it } from 'vitest';
import { LAUNCH_EARTH } from '../data/launchMission';
import { AscentSimulation, add, norm, scale, type V3 } from './ascent';
import { LiftoffSimulation, type FlightState } from './liftoff';
import { BASELINE_VEHICLE } from './vehicle';
import { meetsOrbitTarget, orbitalElements, OrbitClock, OrbitSimulation, sampleOrbit } from './orbitInsertion';

function departure() { const s = new LiftoffSimulation(BASELINE_VEHICLE); s.start(); for (let i = 0; i < 3000 && s.state.phase !== 'complete'; i++) s.step(); return s.snapshot(); }
function handoff() { const s = new AscentSimulation(BASELINE_VEHICLE, departure()); for (let i = 0; i < 5000 && s.running; i++) s.step(); s.separate(); for (let i = 0; i < 2000 && s.running; i++) s.step(); return s.snapshot(); }
const initial = handoff();
function insertion(step = .05, coast = 2, state: FlightState = initial) { return new OrbitSimulation(BASELINE_VEHICLE, state, step, coast); }
function burn(s: OrbitSimulation) { for (let i = 0; i < 110000 && s.state.phase === 'orbit-burn'; i++) s.step(); expect(s.state.phase).toBe('orbit-review'); return s; }
const distance = (a: V3, b: V3) => norm(add(a, scale(b, -1)));
describe('orbital insertion from the real ascent handoff', () => {
  it('derives circular, suborbital and unbound conics without calling high altitude success', () => {
    const r = LAUNCH_EARTH.semiMajorM + 400000, v = Math.sqrt(LAUNCH_EARTH.gmM3S2 / r), p: V3 = [r, 0, 0];
    const circular = orbitalElements(p, [0, v * Math.cos(28.5 * Math.PI / 180), v * Math.sin(28.5 * Math.PI / 180)]);
    expect(circular.periapsisM).toBeCloseTo(400000, 5); expect(circular.apoapsisM).toBeCloseTo(400000, 5); expect(meetsOrbitTarget(circular)).toBe(true);
    expect(orbitalElements(p, [0, 1000, 0]).periapsisM).toBeLessThan(0);
    const open = orbitalElements(p, [0, v * 1.5, 0]); expect(open.apoapsisM).toBeNull(); expect(open.periodS).toBeNull(); expect(meetsOrbitTarget(open)).toBe(false);
    const points = sampleOrbit(open); expect(distance(points[0], points.at(-1)!)).toBeGreaterThan(1000); expect(points.every(p => norm(p) < r * 6)).toBe(true);
  });
  it('preserves time, position, velocity, mass and fuel on handoff and rejects invalid transitions', () => {
    const s = insertion(); expect(s.state.time).toBe(initial.time); expect(s.state.ascent!.position).toEqual(initial.ascent!.position); expect(s.state.ascent!.velocity).toEqual(initial.ascent!.velocity);
    expect(s.state.massKg).toBe(initial.massKg); expect(s.state.ascent!.upperFuelKg).toBe(initial.ascent!.upperFuelKg);
    expect(() => new OrbitSimulation(BASELINE_VEHICLE, departure())).toThrow('第 4 步');
    expect(() => new OrbitSimulation({ ...BASELINE_VEHICLE, payloadKg: 250 }, initial)).toThrow('不匹配');
    const snap = s.snapshot(); snap.ascent!.position[0] = 0; expect(s.state.ascent!.position[0]).not.toBe(0);
  });
  it('cuts off on elements, consumes propellant, and requires actual unpowered completion', () => {
    const s = burn(insertion()), o = s.state.orbit!;
    expect(meetsOrbitTarget(o.elements)).toBe(true); expect(s.state.time).toBeGreaterThan(initial.time + 100);
    expect(s.state.ascent!.upperFuelKg).toBeLessThan(initial.ascent!.upperFuelKg); expect(s.state.thrustN).toBe(0);
    const frozen = s.snapshot(); s.step(); expect(s.snapshot()).toEqual(frozen); expect(o.coastAngleRad).toBe(0);
    s.startCoast(); for (let i = 0; i < 4000 && s.running; i++) s.step();
    expect(s.state.phase).toBe('orbit-complete'); expect(o.coastAngleRad).toBeGreaterThanOrEqual(2 * Math.PI); expect(o.coastElapsedS).toBeGreaterThan(5000);
    expect(s.state.ascent!.upperFuelKg).toBe(frozen.ascent!.upperFuelKg); expect(s.state.massKg).toBe(frozen.massKg); expect(s.state.thrustN).toBe(0);
    expect(o.relativeEnergyChange).toBeLessThan(1e-5); expect(o.boosterRetired).toBe(true); expect(s.state.ascent!.detached).toBeUndefined();
  });
  it('manual early cutoff does not award success and stops before unmodelled reentry', () => {
    const s = insertion(); s.cutoff(); const fuel = s.state.ascent!.upperFuelKg;
    expect(meetsOrbitTarget(s.state.orbit!.elements)).toBe(false); s.startCoast(); for (let i = 0; i < 5000 && s.running; i++) s.step();
    expect(s.state.phase).toBe('orbit-failed'); expect(s.state.message).toContain('80 km'); expect(s.state.ascent!.upperFuelKg).toBe(fuel); expect(s.state.thrustN).toBe(0);
  });
  it('fuel exhaustion triggers a real zero-thrust review rather than supplying missing impulse', () => {
    const low = structuredClone(initial); low.massKg -= low.ascent!.upperFuelKg - 1; low.ascent!.upperFuelKg = 1;
    const s = insertion(.05, 2, low); burn(s); expect(s.state.ascent!.upperFuelKg).toBe(0); expect(s.state.thrustN).toBe(0); expect(meetsOrbitTarget(s.state.orbit!.elements)).toBe(false);
    expect(s.state.orbit!.cutoff!.reason).toContain('耗尽');
  });
  it('converges at resolved cutoff and a common coast time, without hiding event-time shifts', () => {
    const coarse = burn(insertion(.05, 2)), medium = burn(insertion(.025, 1)), fine = burn(insertion(.0125, .5));
    expect(Math.abs(coarse.state.time - fine.state.time)).toBeLessThan(.001);
    expect(distance(coarse.state.ascent!.position, fine.state.ascent!.position)).toBeLessThan(10); expect(distance(medium.state.ascent!.velocity, fine.state.ascent!.velocity)).toBeLessThan(.1);
    coarse.startCoast(); medium.startCoast(); fine.startCoast();
    for (const s of [coarse, medium, fine]) for (let t = 0; t < 2000; t += s.coastStepS) s.step();
    expect(distance(coarse.state.ascent!.position, fine.state.ascent!.position)).toBeLessThan(10); expect(distance(coarse.state.ascent!.velocity, fine.state.ascent!.velocity)).toBeLessThan(.1);
  }, 20000); // Three complete fine-step trajectories need more wall time on a busy CI machine.
  it('uses fixed steps across render rates and clears pause debt', () => {
    const run = (fps: number, rate: number) => { const clock = new OrbitClock(insertion()); clock.setRate(rate); for (let i = 0; i < fps * 10; i++) clock.advance(1 / fps); return clock; };
    expect(run(30, 1).simulation.snapshot()).toEqual(run(60, 1).simulation.snapshot());
    const quick = run(30, 10), equivalent = new OrbitClock(insertion()); for (let i = 0; i < 6000; i++) equivalent.advance(1 / 60);
    expect(quick.simulation.snapshot()).toEqual(equivalent.simulation.snapshot());
    quick.pause(true); const frozen = quick.simulation.snapshot(); quick.advance(30); expect(quick.simulation.snapshot()).toEqual(frozen);
    expect(() => quick.setRate(100)).toThrow('关机后');
    const coast = (fps: number, rate: number) => { const actual = burn(insertion()), clock = new OrbitClock(actual); actual.startCoast(); clock.setRate(rate);
      for (let i = 0; i < fps * 1000 / rate; i++) clock.advance(1 / fps); return actual.snapshot(); };
    expect(coast(30, 100)).toEqual(coast(60, 1));
  });
});
