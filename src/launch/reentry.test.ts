import { beforeAll, describe, expect, it } from 'vitest';
import { FlightSession, P2_FLIGHT_VERSION, flightChecksum, parseFlightSave } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { REENTRY, ReentryClock, ReentrySimulation, entryReading, reentryAtmosphere, reentryModel, stagnationHeatFlux } from './reentry';
import { add, airVelocity, dot, integrateAscent, norm, scale, type Particle } from './ascent';
import type { FlightState } from './liftoff';
import { LAUNCH_EARTH } from '../data/launchMission';

let initial: FlightState, initialSave: string, interfaceState: FlightState, result: FlightState, finalSave: string;
const finish = (s: FlightSession) => { for (let i = 0; s.running; i++) { if (i > 35000) throw Error('unbounded'); s.advanceSteps(1); } };
beforeAll(() => {
  const s = new FlightSession(BASELINE_VEHICLE, 843800000);
  for (const action of ['start', 'continue-ascent', 'separate', 'continue-orbit', 'coast', 'continue-deployment', 'open-fairing', 'deploy', 'analyze-avoidance', 'align-avoidance', 'ignite-avoidance', 'observe-avoidance', 'analyze-deorbit', 'align-deorbit', 'ignite-deorbit', 'passivate-deorbit'] as const) { s.action(action); finish(s); }
  initial = structuredClone(s.state); initialSave = JSON.stringify(s.save());
  s.action('prepare-reentry'); s.action('coast-reentry'); finish(s); interfaceState = structuredClone(s.state);
  s.action('enter-reentry'); finish(s); result = structuredClone(s.state); finalSave = JSON.stringify(s.save());
}, 30000);

describe('P3 reentry model and state continuity', () => {
  it('reads local atmosphere anchors in SI and interpolates density logarithmically without extrapolating', () => {
    expect(reentryAtmosphere(0).density).toBeCloseTo(1.225, 10);
    expect(reentryAtmosphere(60000).temperatureK).toBe(247.021);
    expect(reentryAtmosphere(120000).density).toBeCloseTo(2.2199e-8, 15);
    expect(reentryAtmosphere(62500).density).toBeCloseTo(Math.sqrt(3.0968e-4 * 1.6321e-4), 12);
    let previous = Infinity; for (let z = 0; z <= 1000000; z += 1000) { const a = reentryAtmosphere(z); expect(a.density).toBeLessThan(previous); expect(a.pressurePa).toBeGreaterThan(0); previous = a.density; }
    expect(() => reentryAtmosphere(-1)).toThrow(); expect(() => reentryAtmosphere(1000001)).toThrow(); expect(() => reentryAtmosphere(NaN)).toThrow();
  });
  it('uses W/m² heat flux, cubic speed and inverse square-root radius, with explicit unavailable intervals', () => {
    const flux = stagnationHeatFlux(1e-4, 7500, 1);
    expect(flux).toBeCloseTo(734707.96875, 5); expect(stagnationHeatFlux(1e-4, 15000, 1)).toBeCloseTo(flux * 8, 6);
    expect(stagnationHeatFlux(1e-4, 7500, 4)).toBeCloseTo(flux / 2, 6); expect(() => stagnationHeatFlux(1, 10, 0)).toThrow();
    const sample = (height: number, speed: number) => entryReading({ position: [LAUNCH_EARTH.semiMajorM + height, 0, 0], velocity: [0, speed, 0], fuel: 0 }, 2800, 0);
    expect(sample(120000, 7800).heatFluxWm2).toBeNull(); expect(sample(60000, 7800).heatFluxWm2).toBeGreaterThan(0); expect(sample(20000, 500).heatFluxWm2).toBeNull();
  });
  it('requires completed P2 and inherits mass, residuals and inertial state without mutating prior records', () => {
    expect(() => new ReentrySimulation({ ...initial, phase: 'deorbit-cutoff' })).toThrow();
    const q = new ReentrySimulation(initial), d = initial.deployment!;
    expect(q.state.deployment!.carrier.position).toEqual(d.carrier.position); expect(q.state.ascent!.velocity).toEqual(initial.ascent!.velocity);
    expect(result.massKg).toBe(initial.massKg); expect(result.ascent!.upperFuelKg).toBe(initial.ascent!.upperFuelKg);
    expect(result.deployment!.deorbit).toEqual(d.deorbit); expect(result.deployment!.avoidance).toEqual(d.avoidance);
    expect(result.thrustN).toBe(0); expect(result.reentry!.outcome).toBe('model-boundary');
  });
  it('splits both altitude checkpoints and keeps the satellite independently in orbit', () => {
    expect(interfaceState.phase).toBe('reentry-interface'); expect(interfaceState.ascent!.altitudeM).toBeCloseTo(120000, 5);
    expect(result.phase).toBe('reentry-complete'); expect(result.ascent!.altitudeM).toBeCloseTo(20000, 5);
    expect(result.deployment!.satellite.elements.periapsisM).toBeGreaterThan(380000); expect(result.deployment!.satellite.massKg).toBe(500);
    expect(result.reentry!.peakHeat!.t).toBeLessThan(result.reentry!.peakPressure.t);
    expect(result.reentry!.heatLoadJm2).toBeGreaterThan(5e7); expect(result.ascent!.airSpeedMS).toBeLessThan(300);
    expect(result.message).toContain('不能判定'); expect(result.reentry!.samples.at(-1)!.heatFluxWm2).toBeNull();
  });
  it('opposes the rotating atmosphere velocity, retains inertial gravity and has no propulsion mass flow', () => {
    const p: Particle = { position: [LAUNCH_EARTH.semiMajorM + 60000, 0, 0], velocity: [-100, 7800, 0], fuel: 12 };
    const f = entryReading(p, 2800, 0).force, relative = add(p.velocity, scale(airVelocity(p.position), -1));
    const gravity = scale(p.position, -LAUNCH_EARTH.gmM3S2 / norm(p.position) ** 3), aero = add(f.acceleration, scale(gravity, -1));
    expect(dot(aero, relative)).toBeLessThan(0); expect(f.airSpeed).toBeCloseTo(norm(relative), 10);
    expect(integrateAscent(p, reentryModel(2800, 12), 0, .25, () => 0).fuel).toBe(12);
  });
  it('converges with smaller steps through the entire descent, including integrated heating', () => {
    const run = (dt: number) => { const q = new ReentrySimulation(initial, dt); q.startCoast(); while (q.running) q.step(); q.startEntry(); while (q.running) q.step(); return q.state; };
    const medium = run(.125), fine = run(.0625);
    const distance = (s: FlightState) => norm(add(s.ascent!.position, scale(fine.ascent!.position, -1)));
    expect(distance(result)).toBeLessThan(2); expect(distance(medium)).toBeLessThan(1);
    expect(Math.abs(result.ascent!.airSpeedMS - fine.ascent!.airSpeedMS)).toBeLessThan(.01);
    expect(Math.abs(result.reentry!.heatLoadJm2 / fine.reentry!.heatLoadJm2 - 1)).toBeLessThan(.002);
    expect(Math.abs(result.time - fine.time)).toBeLessThan(.01);
  }, 30000);
  it('keeps elapsed integration identical across frame rates and multipliers and freezes on pause', () => {
    const run = (fps: number, rate: number) => { const c = new ReentryClock(new ReentrySimulation(initial)); c.simulation.startCoast(); c.pause(false); c.setRate(rate); for (let i = 0; i < 20 * fps / rate; i++) c.advance(1 / fps); return c; };
    const a = run(20, 1), b = run(60, 10), c = run(30, 100);
    expect(a.simulation.state).toEqual(b.simulation.state); expect(a.simulation.state).toEqual(c.simulation.state);
    const before = flightChecksum(c.simulation.state); c.pause(true); c.advance(100); expect(flightChecksum(c.simulation.state)).toBe(before);
  });
  it('restores P2 and completed P3 with strict replay, blocks restart and rejects older-version new commands', () => {
    const old = JSON.parse(initialSave); old.version = P2_FLIGHT_VERSION;
    expect(FlightSession.restore(JSON.stringify(old)).state).toEqual(initial);
    const restored = FlightSession.restore(finalSave); expect(restored.state).toEqual(result); expect(restored.clock.paused).toBe(true);
    expect(() => restored.action('ignite-deorbit')).toThrow(); expect(() => restored.action('enter-reentry')).toThrow();
    const forged = restored.save(); forged.version = P2_FLIGHT_VERSION; expect(() => parseFlightSave(JSON.stringify(forged))).toThrow('旧版');
    const changed = JSON.parse(finalSave); changed.snapshot.reentry.startMassKg++; expect(() => FlightSession.restore(JSON.stringify(changed))).toThrow('校验');
  }, 30000);
});
