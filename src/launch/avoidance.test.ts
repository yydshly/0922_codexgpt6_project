import { beforeAll, describe, expect, it } from 'vitest';
import { FlightSession, flightChecksum, LEGACY_FLIGHT_VERSION } from './flightSession';
import { BASELINE_VEHICLE, STANDARD_GRAVITY, compileVehicle } from './vehicle';
import { AVOIDANCE, avoidanceThrottle, createAvoidancePlan, maneuverModel } from './avoidance';
import { add, integrateAscent, norm, scale, type Particle } from './ascent';

const finish = (s: FlightSession) => { let n = 0; while (s.running && n++ < 100000) s.advanceSteps(1); if (n >= 100000) throw Error('unbounded'); };
let initialSave: string;
beforeAll(() => {
  const s = new FlightSession(BASELINE_VEHICLE, 843800000);
  for (const a of ['start', 'continue-ascent', 'separate', 'continue-orbit', 'coast', 'continue-deployment', 'open-fairing', 'deploy'] as const) { s.action(a); finish(s); }
  initialSave = JSON.stringify(s.save());
}, 30000);
const start = () => FlightSession.restore(initialSave);
const aligned = () => { const s = start(); s.action('analyze-avoidance'); s.action('align-avoidance'); finish(s); return s; };

describe('P1 bounded separation comparison and finite burn', () => {
  it('forecasts both alternatives from the same unmodified state and refuses insufficient prerequisites', () => {
    const s = start(), before = flightChecksum(s.state), p = createAvoidancePlan(s.config, s.state);
    expect(flightChecksum(s.state)).toBe(before); expect(p.allowed).toBe(true);
    expect(p.coast.samples).toHaveLength(91); expect(p.maneuver!.samples).toHaveLength(91);
    expect(p.maneuver!.finalM).toBeGreaterThan(p.coast.finalM + 100); expect(p.maneuver!.minimumM).toBeGreaterThanOrEqual(50);
    const lowFuel = structuredClone(s.state); lowFuel.ascent!.upperFuelKg = 0;
    expect(createAvoidancePlan(s.config, lowFuel).allowed).toBe(false);
    const tooClose = structuredClone(s.state); tooClose.deployment!.separationM = 20;
    expect(createAvoidancePlan(s.config, tooClose).allowed).toBe(false);
    const late = structuredClone(s.state); late.deployment!.elapsedS = 7000;
    expect(createAvoidancePlan(s.config, late).allowed).toBe(false);
    expect(() => createAvoidancePlan(s.config, new FlightSession(s.config, s.baseTime).state)).toThrow('部署检查');
  });
  it('turns only the carrier, stops before ignition and respects pause and command order', () => {
    const s = start(), direction = structuredClone(s.state.deployment!.direction), fuel = s.state.ascent!.upperFuelKg;
    expect(() => s.action('ignite-avoidance')).toThrow(); s.action('analyze-avoidance');
    const before = flightChecksum(s.state); s.advance(10); expect(flightChecksum(s.state)).toBe(before);
    s.action('align-avoidance'); expect(() => s.setRate(100)).toThrow('1 倍'); s.advanceSteps(16);
    expect(s.state.ascent!.direction).not.toEqual(direction); expect(s.state.deployment!.direction).toEqual(direction);
    s.pause(true); const paused = flightChecksum(s.state); s.advance(1); expect(flightChecksum(s.state)).toBe(paused);
    finish(s); expect(s.state.phase).toBe('avoidance-armed'); expect(s.state.thrustN).toBe(0); expect(s.state.ascent!.upperFuelKg).toBe(fuel);
    expect(() => s.action('observe-avoidance')).toThrow(); expect(() => s.action('align-avoidance')).toThrow();
  });
  it('burns the configured motor for six seconds, consumes mass and leaves the satellite unpowered', () => {
    const s = aligned(), baseline = start(), fuel = s.state.ascent!.upperFuelKg;
    baseline.action('continue-deployed'); baseline.advanceSteps(72);
    s.action('ignite-avoidance'); s.advanceSteps(8);
    expect(s.state.thrustN).toBeCloseTo(compileVehicle(s.config).stages[1].thrustN * .02, 5);
    expect(s.state.ascent!.upperFuelKg).toBeLessThan(fuel); expect(s.state.deployment!.carrier.massKg).toBe(s.state.massKg);
    finish(s); const a = s.state.deployment!.avoidance!;
    expect(s.state.phase).toBe('avoidance-cutoff'); expect(s.state.thrustN).toBe(0); expect(a.elapsedS).toBe(18);
    expect(a.fuelUsedKg).toBeCloseTo(a.plan.fuelRequiredKg, 7);
    expect(norm(add(s.state.deployment!.satellite.position, scale(baseline.state.deployment!.satellite.position, -1)))).toBeLessThan(1e-7);
    expect(norm(add(a.shadow.position, scale(baseline.state.deployment!.carrier.position, -1)))).toBeLessThan(1e-7);
    expect(s.state.massKg).toBeCloseTo(a.plan.startMassKg - a.fuelUsedKg, 8);
  });
  it('agrees with the ideal rocket equation and converges as the burn step is reduced', () => {
    const s = start(), plan = createAvoidancePlan(s.config, s.state), model = { ...maneuverModel(s.config, plan), mu: 0, noAir: true, steer: () => ({ direction: [1, 0, 0] as [number, number, number], pitchDeg: 0 }) };
    const run = (dt: number) => { let p: Particle = { position: [7000000, 0, 0], velocity: [0, 0, 0], fuel: plan.startFuelKg }; for (let t = 0; t < 6 - 1e-9; t += dt) p = integrateAscent(p, model, plan.startTime + 12 + t, dt, time => avoidanceThrottle(time - plan.startTime)); return p; };
    const a = run(.25), b = run(.125), c = run(.0625), isp = compileVehicle(s.config).stages[1].ispVacuumS;
    const exact = STANDARD_GRAVITY * isp * Math.log(plan.startMassKg / (model.dry + c.fuel));
    expect(Math.abs(norm(a.velocity) - exact)).toBeLessThan(1e-7);
    expect(norm(add(b.velocity, scale(c.velocity, -1)))).toBeLessThanOrEqual(norm(add(a.velocity, scale(c.velocity, -1))) + 1e-11);
  });
  it('reaches the predicted endpoint and matches a finer independent forecast within a millimetre', () => {
    const s = aligned(), fine = createAvoidancePlan(BASELINE_VEHICLE, start().state, .125);
    s.action('ignite-avoidance'); finish(s); s.action('observe-avoidance'); finish(s);
    const p = s.state.deployment!.avoidance!;
    expect(s.state.phase).toBe('avoidance-complete'); expect(p.elapsedS).toBe(900);
    expect(s.state.deployment!.separationM).toBeCloseTo(p.plan.maneuver!.finalM, 5);
    expect(Math.abs(p.plan.maneuver!.finalM - fine.maneuver!.finalM)).toBeLessThan(.001);
    expect(p.baselineDistanceM).toBeCloseTo(p.plan.coast.finalM, 5);
    expect(p.fuelUsedKg).toBeCloseTo(p.plan.fuelRequiredKg, 7); expect(p.actual).toHaveLength(91);
    expect(() => s.action('ignite-avoidance')).toThrow();
  });
  it('replays old saves and new burn/coast saves without injecting snapshots or losing fuel', () => {
    const old = JSON.parse(initialSave); old.version = LEGACY_FLIGHT_VERSION;
    expect(FlightSession.restore(JSON.stringify(old)).state).toEqual(start().state);
    const s = aligned(); s.action('ignite-avoidance'); s.advanceSteps(7);
    const restored = FlightSession.restore(JSON.stringify(s.save())); expect(restored.state).toEqual(s.state); expect(restored.clock.paused).toBe(true);
    s.advanceSteps(17); restored.advanceSteps(17); expect(restored.state).toEqual(s.state);
    s.action('observe-avoidance'); s.advanceSteps(100);
    const coast = FlightSession.restore(JSON.stringify(s.save())); expect(coast.state).toEqual(s.state);
    const wrong = s.save(); wrong.version = LEGACY_FLIGHT_VERSION; expect(() => FlightSession.restore(JSON.stringify(wrong))).toThrow('旧版');
  }, 30000);
  it('keeps motion independent of render rate and coast acceleration', () => {
    const s = aligned(); s.action('ignite-avoidance'); finish(s); const raw = JSON.stringify(s.save());
    const run = (fps: number, rate: number) => { const q = FlightSession.restore(raw); q.action('observe-avoidance'); q.setRate(rate); for (let i = 0; i < 20 * fps / rate; i++) q.advance(1 / fps); return q.state; };
    expect(run(30, 1)).toEqual(run(60, 10)); expect(run(30, 1)).toEqual(run(20, 100));
  }, 30000);
  it('can decline the analysis while preserving both bodies and enabling normal observation', () => {
    const s = start(), before = structuredClone(s.state.deployment!); s.action('analyze-avoidance'); s.action('skip-avoidance');
    expect(s.state.deployment).toEqual(before); expect(s.state.phase).toBe('deployment-complete'); s.action('continue-deployed'); s.advanceSteps(1); expect(s.state.time).toBeGreaterThan(JSON.parse(initialSave).snapshot.time);
  });
});
