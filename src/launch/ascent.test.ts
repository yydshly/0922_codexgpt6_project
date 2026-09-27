import { describe, expect, it } from 'vitest';
import { BASELINE_VEHICLE, deriveVehicle } from './vehicle';
import { LIFTOFF, LiftoffSimulation } from './liftoff';
import { add, airVelocity, AscentClock, AscentSimulation, ascentForces, dot, integrateAscent, norm, rotateEarth, scale, SITE_FIXED, SITE_UP, surfaceAt, teachingAtmosphere, type Particle } from './ascent';
import { LAUNCH_EARTH } from '../data/launchMission';
const departure = () => { const s = new LiftoffSimulation(BASELINE_VEHICLE); s.start(); while (s.state.phase !== 'complete') s.step(); return s.snapshot(); };
const runUntilHold = (s: AscentSimulation) => { for (let i = 0; i < 30000 && s.running; i++) s.step(); return s; };
describe('E4 ascent and staging', () => {
  it('transports the exact departure position, relative velocity and propellant into the inertial frame', () => {
    const handoff = departure(), s = new AscentSimulation(BASELINE_VEHICLE, handoff).snapshot(), a = s.ascent!;
    expect(norm(add(a.fixedPosition, scale(add(SITE_FIXED, scale(SITE_UP, handoff.heightM + LIFTOFF.padHeightM)), -1)))).toBeLessThan(1e-8);
    const relative = rotateEarth(add(a.velocity, scale(airVelocity(a.position), -1)), -s.time);
    expect(norm(add(relative, scale(SITE_UP, -handoff.speedMS)))).toBeLessThan(1e-8);
    expect(s.massKg).toBe(handoff.massKg); expect(s.fuelKg).toBe(handoff.fuelKg); expect(s.time).toBe(handoff.time);
  });
  it('computes rotating-atmosphere drag from air-relative velocity, not inertial speed', () => {
    const position = add(SITE_FIXED, scale(SITE_UP, 100));
    const f = ascentForces({ position, velocity: airVelocity(position), fuel: 100 }, { dry: 1000, cdArea: 5 }, 0, 0);
    expect(f.airSpeed).toBe(0); expect(f.drag).toBe(0); expect(norm(airVelocity(position))).toBeGreaterThan(400);
    const stationary = ascentForces({ position, velocity: [0, 0, 0], fuel: 100 }, { dry: 1000, cdArea: 5 }, 0, 0); expect(stationary.drag).toBeGreaterThan(0);
  });
  it('varies thrust with pressure while the rated mass flow stays constant', () => {
    const motor = { flow: 100, sea: 280, vacuum: 320 }, model = { dry: 1000, cdArea: 0, motor };
    const force = (h: number) => ascentForces({ position: add(SITE_FIXED, scale(SITE_UP, h)), velocity: [0, 0, 0], fuel: 100 }, model, 0, 1);
    expect(force(200000).thrust).toBeGreaterThan(force(0).thrust); expect(force(0).thrust).toBeCloseTo(100 * 9.80665 * 280, 6);
    expect(teachingAtmosphere(50000).density).toBeLessThan(teachingAtmosphere(10000).density);
  });
  it('burns only the first stage before staging, holds at burnout, and never loses dry mass early', () => {
    const s = runUntilHold(new AscentSimulation(BASELINE_VEHICLE, departure()));
    expect(s.state.phase).toBe('stage-ready'); expect(s.state.fuelKg).toBe(0); expect(s.state.massKg).toBe(53300);
    expect(s.state.ascent!.upperFuelKg).toBe(36000); const before = s.snapshot(); s.step(); expect(s.snapshot()).toEqual(before);
    expect(s.state.thrustN).toBe(0); expect(s.state.ascent!.pitchDeg).toBeLessThan(90);
  });
  it('separates with defined equal/opposite impulses, exact mass accounting and continuous reference positions', () => {
    const s = runUntilHold(new AscentSimulation(BASELINE_VEHICLE, departure())), before = s.snapshot(); s.separate(); const a = s.state.ascent!;
    expect(s.state.massKg).toBe(39300); expect(a.detached!.massKg + s.state.massKg).toBe(before.massKg);
    expect(a.position).toEqual(before.ascent!.position); expect(a.detached!.position).toEqual(before.ascent!.position);
    expect(a.separation!.momentumError).toBeLessThan(1e-6); expect(a.separation!.relativeSpeedMS).toBeCloseTo(2, 9);
    expect(a.upperFuelKg).toBe(36000); expect(s.state.thrustN).toBe(0);
    const once = s.snapshot(); s.separate(); expect(s.snapshot()).toEqual(once);
  });
  it('coasts before second-stage ignition, retains fairing mass, and freezes at the scoped review checkpoint', () => {
    const s = runUntilHold(new AscentSimulation(BASELINE_VEHICLE, departure())); s.separate();
    const start = s.state.time; while (s.state.time < start + 2) s.step();
    expect(s.state.ascent!.upperFuelKg).toBe(36000); expect(s.state.thrustN).toBe(0);
    runUntilHold(s); expect(s.state.phase).toBe('ascent-complete'); expect(s.state.time - start).toBeCloseTo(33, 8);
    expect(s.state.ascent!.altitudeM).toBeGreaterThan(150000); expect(s.state.massKg).toBeCloseTo(3300 + s.state.ascent!.upperFuelKg, 8);
    expect(norm(add(s.state.ascent!.detached!.position, scale(s.state.ascent!.position, -1)))).toBeGreaterThan(100);
    const end = s.snapshot(); s.step(); expect(s.snapshot()).toEqual(end); expect(s.state.thrustN).toBeGreaterThan(0);
  });
  it('meets the frozen E1 convergence limits at identical burnout and upper-review events', () => {
    const initial = departure(), runs = [.05, .025, .0125].map(dt => { const s = runUntilHold(new AscentSimulation(BASELINE_VEHICLE, initial, dt)); const burnout = s.snapshot(); s.separate(); runUntilHold(s); return [burnout, s.snapshot()]; });
    for (const phase of [0, 1]) for (const run of [1, 2]) {
      const a = runs[0][phase], b = runs[run][phase]; expect(Math.abs(a.time - b.time)).toBeLessThan(1e-7);
      expect(norm(add(a.ascent!.position, scale(b.ascent!.position, -1)))).toBeLessThan(10);
      expect(norm(add(a.ascent!.velocity, scale(b.ascent!.velocity, -1)))).toBeLessThan(.1);
    }
  });
  it('preserves orbital energy for a full unpowered no-drag circular reference orbit', () => {
    const radius = LAUNCH_EARTH.semiMajorM + 400000, mu = LAUNCH_EARTH.gmM3S2, speed = Math.sqrt(mu / radius), period = 2 * Math.PI * radius / speed;
    let p: Particle = { position: [radius, 0, 0], velocity: [0, speed, 0], fuel: 0 };
    const energy = (s: Particle) => dot(s.velocity, s.velocity) / 2 - mu / norm(s.position), initial = energy(p);
    const steps = Math.ceil(period / 2), dt = period / steps;
    for (let i = 0; i < steps; i++) p = integrateAscent(p, { dry: 1000, cdArea: 0, noAir: true }, i * dt, dt, () => 0);
    expect(Math.abs((energy(p) - initial) / initial)).toBeLessThan(1e-5); expect(norm(add(p.position, [-radius, 0, 0]))).toBeLessThan(1);
  });
  it('produces identical physical states across cadence and wall-clock acceleration', () => {
    const handoff = departure(), snapshots = [[30, 1], [60, 4], [144, 10]].map(([fps, rate]) => { const s = new AscentSimulation(BASELINE_VEHICLE, handoff), clock = new AscentClock(s); clock.setRate(rate); for (let i = 0; i < 40 / rate * fps; i++) clock.advance(1 / fps); return s.snapshot(); });
    expect(snapshots[0]).toEqual(snapshots[1]); expect(snapshots[1]).toEqual(snapshots[2]);
  });
  it('pauses the entire system and rejects invalid rates and inconsistent handoffs', () => {
    const s = new AscentSimulation(BASELINE_VEHICLE, departure()), clock = new AscentClock(s); clock.pause(true); const before = s.snapshot(); clock.advance(20); expect(s.snapshot()).toEqual(before);
    expect(() => clock.setRate(100)).toThrow(); expect(() => new AscentSimulation({ ...BASELINE_VEHICLE, payloadKg: 250 }, departure())).toThrow('不匹配');
    const invalid = departure(); invalid.phase = 'ready'; expect(() => new AscentSimulation(BASELINE_VEHICLE, invalid)).toThrow('先完成');
  });
  it('keeps snapshots isolated and does not permit early separation', () => {
    const s = new AscentSimulation(BASELINE_VEHICLE, departure()), initial = s.snapshot(); s.separate(); expect(s.snapshot()).toEqual(initial);
    initial.ascent!.position[0] = 0; initial.ascent!.trail[0][0] = 0; expect(s.state.ascent!.position[0]).not.toBe(0); expect(s.state.ascent!.trail[0][0]).not.toBe(0);
    expect(surfaceAt(SITE_FIXED).height).toBeCloseTo(0, 7); expect(deriveVehicle(BASELINE_VEHICLE).wetKg).toBe(233300);
  });
});
