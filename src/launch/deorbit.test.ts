import { beforeAll, describe, expect, it } from 'vitest';
import { FlightSession, flightChecksum, P1_FLIGHT_VERSION } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { DEORBIT, createDeorbitPlan, predictDeorbit, advancePassivation, initializeDeorbit, gasPressurePa } from './deorbit';
import { add, integrateAscent, norm, scale } from './ascent';

const finish = (s: FlightSession) => { let n = 0; while (s.running && n++ < 100000) s.advanceSteps(1); if (n >= 100000) throw Error('unbounded'); };
let initial: string;
beforeAll(() => {
  const s = new FlightSession(BASELINE_VEHICLE, 843800000);
  for (const action of ['start', 'continue-ascent', 'separate', 'continue-orbit', 'coast', 'continue-deployment', 'open-fairing', 'deploy', 'analyze-avoidance', 'align-avoidance', 'ignite-avoidance', 'observe-avoidance'] as const) { s.action(action); finish(s); }
  initial = JSON.stringify(s.save());
}, 30000);
const start = () => FlightSession.restore(initial);
const burn = () => { const s = start(); for (const action of ['analyze-deorbit', 'align-deorbit', 'ignite-deorbit'] as const) { s.action(action); finish(s); } return s; };

describe('P2 finite deorbit burn and explicit residual-energy accounting', () => {
  it('derives a finite burn from the existing state without moving anything or spending fuel', () => {
    const s = start(), before = flightChecksum(s.state), p = createDeorbitPlan(s.config, s.state);
    expect(flightChecksum(s.state)).toBe(before); expect(p.allowed).toBe(true); expect(p.burnS % .25).toBe(0);
    expect(p.predictedPerigeeM).toBeGreaterThan(30000); expect(p.predictedPerigeeM).toBeLessThanOrEqual(50000);
    expect(p.samples.at(-1)!.altitudeM).toBeGreaterThan(150000); expect(p.minimumSeparationM).toBeGreaterThan(1000);
    const fuel = structuredClone(s.state); fuel.ascent!.upperFuelKg = 0; expect(createDeorbitPlan(s.config, fuel).allowed).toBe(false);
    const late = structuredClone(s.state); late.deployment!.elapsedS = 7190; expect(createDeorbitPlan(s.config, late).allowed).toBe(false);
    const near = structuredClone(s.state); near.deployment!.separationM = 100; expect(createDeorbitPlan(s.config, near).allowed).toBe(false);
    expect(() => createDeorbitPlan(s.config, new FlightSession(s.config, s.baseTime).state)).toThrow('P1');
  }, 30000);
  it('gates command order, freezes checkpoints and allows declining before motion', () => {
    const s = start(), bodies = structuredClone(s.state.deployment!);
    expect(() => s.action('ignite-deorbit')).toThrow(); expect(() => s.action('passivate-deorbit')).toThrow();
    s.action('analyze-deorbit'); s.action('skip-deorbit'); expect(s.state.deployment).toEqual(bodies);
    s.action('analyze-deorbit'); const before = flightChecksum(s.state); s.advance(10); expect(flightChecksum(s.state)).toBe(before);
    s.action('align-deorbit'); expect(() => s.setRate(10)).toThrow('1 倍'); s.advanceSteps(12); s.pause(true);
    const pause = flightChecksum(s.state); s.advance(1); expect(flightChecksum(s.state)).toBe(pause);
    finish(s); expect(s.state.phase).toBe('deorbit-armed'); expect(s.state.thrustN).toBe(0);
    expect(s.state.ascent!.upperFuelKg).toBe(bodies.carrier.massKg - s.state.deployment!.deorbit!.plan.dryKg);
  }, 30000);
  it('matches its prediction and a finer step, while the satellite receives no maneuver', () => {
    const s = burn(), initialState = start().state, q = s.state.deployment!.deorbit!, d = initialState.deployment!;
    const fine = predictDeorbit(s.config, { position: d.carrier.position, velocity: d.carrier.velocity, fuel: initialState.ascent!.upperFuelKg }, { position: d.satellite.position, velocity: d.satellite.velocity, fuel: 0 }, q.plan, .125);
    expect(s.state.phase).toBe('deorbit-cutoff'); expect(s.state.thrustN).toBe(0); expect(q.cutoffVerified).toBe(true);
    expect(s.state.deployment!.carrier.elements.periapsisM).toBeCloseTo(q.plan.predictedPerigeeM, 5);
    expect(Math.abs(q.plan.predictedPerigeeM - fine.perigeeM)).toBeLessThan(.01);
    expect(q.fuelBurnedKg).toBeCloseTo(q.plan.fuelRequiredKg, 7);
    let sat = { position: d.satellite.position, velocity: d.satellite.velocity, fuel: 0 };
    for (let t = 0; t < q.elapsedS; t += .25) sat = integrateAscent(sat, { dry: s.config.payloadKg, cdArea: 4.4 }, q.plan.startTime + t, .25, () => 0);
    expect(s.state.deployment!.satellite.position).toEqual(sat.position);
    expect(s.state.deployment!.satellite.elements.periapsisM).toBeGreaterThan(380000);
    expect(s.state.ascent!.altitudeM).toBeGreaterThan(150000);
  }, 30000);
  it('vents mass and dissipates energy over time, keeps residuals and permanently rejects restart', () => {
    const s = burn(), q = s.state.deployment!.deorbit!, mass = s.state.massKg, fuel = s.state.ascent!.upperFuelKg;
    s.action('passivate-deorbit'); s.advanceSteps(40);
    expect(q.restartLocked).toBe(true); expect(q.pressurePa).toBeLessThan(gasPressurePa(2)); expect(q.batteryJ).toBeLessThan(DEORBIT.batteryJ);
    expect(s.state.thrustN).toBe(0); expect(s.state.massKg).toBeCloseTo(mass - q.propellantVentedKg - q.gasVentedKg, 7);
    finish(s); expect(s.state.phase).toBe('deorbit-complete'); expect(q.passivationElapsedS).toBe(120);
    expect(s.state.ascent!.upperFuelKg).toBeCloseTo(fuel * Math.exp(-6), 7); expect(s.state.ascent!.upperFuelKg).toBeGreaterThan(0);
    expect(q.gasKg + q.gasVentedKg).toBeCloseTo(2, 12); expect(q.batteryJ + q.dissipatedJ).toBe(DEORBIT.batteryJ);
    expect(q.batteryJ).toBe(0); expect(q.pressurePa).toBeLessThan(100000);
    expect(s.state.massKg + q.fuelBurnedKg + q.propellantVentedKg + q.gasVentedKg).toBeCloseTo(q.plan.startMassKg, 7);
    expect(() => s.action('ignite-deorbit')).toThrow(); expect(() => s.action('ignite-avoidance')).toThrow(); expect(() => s.action('passivate-deorbit')).toThrow();
    expect(s.state.deployment!.carrier.altitudeM).toBeGreaterThan(80000); expect(s.state.deployment!.satellite.massKg).toBe(500);
  }, 30000);
  it('uses step-independent inventories and convergent coast motion for ideal symmetric venting', () => {
    const s = burn(), original = s.state.deployment!.deorbit!, d = s.state.deployment!;
    const run = (dt: number) => {
      const q = initializeDeorbit(original.plan); q.passivationStart = s.state.time; q.passivationFuelKg = s.state.ascent!.upperFuelKg;
      let carrier = { position: d.carrier.position, velocity: d.carrier.velocity, fuel: q.passivationFuelKg };
      for (let t = 0; t < 120; t += dt) carrier = advancePassivation(carrier, q, s.state.time + t, dt);
      return { q, carrier };
    };
    const a = run(.25), b = run(.125), c = run(.0625);
    expect(a.q).toEqual(b.q); expect(b.q).toEqual(c.q);
    expect(norm(add(a.carrier.position, scale(c.carrier.position, -1)))).toBeLessThan(.001);
    expect(norm(add(b.carrier.velocity, scale(c.carrier.velocity, -1)))).toBeLessThan(.00001);
  }, 30000);
  it('restores old P1 saves and mid-burn/mid-passivation saves with strict replay checks', () => {
    const old = JSON.parse(initial); old.version = P1_FLIGHT_VERSION; expect(FlightSession.restore(JSON.stringify(old)).state).toEqual(start().state);
    const s = start(); s.action('analyze-deorbit'); s.action('align-deorbit'); finish(s); s.action('ignite-deorbit'); s.advanceSteps(10);
    expect(FlightSession.restore(JSON.stringify(s.save())).state).toEqual(s.state); finish(s); s.action('passivate-deorbit'); s.advanceSteps(101);
    const restored = FlightSession.restore(JSON.stringify(s.save())); expect(restored.state).toEqual(s.state); expect(restored.clock.paused).toBe(true);
    finish(s); finish(restored); expect(restored.state).toEqual(s.state);
    const forged = s.save(); forged.version = P1_FLIGHT_VERSION; expect(() => FlightSession.restore(JSON.stringify(forged))).toThrow('旧版');
  }, 30000);
  it('keeps passivation independent of render rate and playback acceleration', () => {
    const s = burn(), raw = JSON.stringify(s.save());
    const run = (fps: number, rate: number) => { const q = FlightSession.restore(raw); q.action('passivate-deorbit'); q.setRate(rate); for (let i = 0; i < 20 * fps / rate; i++) q.advance(1 / fps); return q.state; };
    expect(run(20, 1)).toEqual(run(60, 10)); expect(run(20, 1)).toEqual(run(30, 100));
  }, 30000);
});
