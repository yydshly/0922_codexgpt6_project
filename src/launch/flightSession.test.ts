import { describe, expect, it } from 'vitest';
import { FlightSession, parseFlightSave } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { add, norm, scale, type V3 } from './ascent';
import { DeploymentClock, DeploymentSimulation, splitPayload } from './deployment';
import { cross } from './orbitInsertion';

export const BASE_TIME = 843800000;
function finish(s: FlightSession) { let n = 0; while (s.running && n++ < 100000) s.advanceSteps(1); if (n >= 100000) throw Error('unbounded simulation'); }
export function toDeployment() { const s = new FlightSession(BASELINE_VEHICLE, BASE_TIME); s.action('start'); finish(s); s.action('continue-ascent'); finish(s); s.action('separate'); finish(s); s.action('continue-orbit'); finish(s); s.action('coast'); finish(s); s.action('continue-deployment'); return s; }
describe('E6 deployment and versioned flight replay', () => {
  it('conserves split mass, centre of mass, linear and angular momentum using a defined spring impulse', () => {
    const r: V3 = [6778000, 0, 0], v: V3 = [0, 7600, 100], d: V3 = [0, 1, 0], total = 8000, payload = 500;
    const split = splitPayload(r, v, d, total, payload);
    expect(split.carrierMass + payload).toBe(total);
    expect(norm(add(add(scale(split.carrierVelocity, split.carrierMass), scale(split.satelliteVelocity, payload)), scale(v, -total)))).toBeLessThan(1e-7);
    expect(norm(add(scale(add(scale(split.carrierPosition, split.carrierMass), scale(split.satellitePosition, payload)), 1 / total), scale(r, -1)))).toBeLessThan(1e-8);
    expect(norm(add(split.satelliteVelocity, scale(split.carrierVelocity, -1)))).toBeCloseTo(.5, 8);
    expect(split.springEnergyJ).toBeGreaterThan(0);
    const before = scale(cross(r, v), total), after = add(scale(cross(split.carrierPosition, split.carrierVelocity), split.carrierMass), scale(cross(split.satellitePosition, split.satelliteVelocity), payload));
    expect(norm(add(after, scale(before, -1))) / norm(before)).toBeLessThan(1e-14);
  });
  it('unlocks after verified insertion; opens a retained cover and deploys one independent satellite', () => {
    const s = toDeployment(), before = s.clock.simulation.snapshot();
    expect(() => s.action('deploy')).toThrow(); s.action('open-fairing'); expect(s.state.massKg).toBe(before.massKg); expect(s.state.deployment!.released).toBe(false);
    const positions = structuredClone(s.state.deployment!); s.action('deploy');
    expect(s.state.deployment!.carrier.position).toEqual(positions.carrier.position); expect(s.state.deployment!.satellite.position).toEqual(positions.satellite.position);
    expect(s.state.massKg + s.state.deployment!.satellite.massKg).toBe(before.massKg);
    expect(s.state.deployment!.release!.momentumError).toBeLessThan(1e-5); expect(s.state.deployment!.release!.centerErrorM).toBeLessThan(1e-7);
    expect(() => s.action('deploy')).toThrow(); finish(s);
    expect(s.state.phase).toBe('deployment-complete'); expect(s.state.deployment!.verified).toBe(true); expect(s.state.deployment!.separationM).toBeGreaterThan(50);
    expect(s.state.deployment!.elapsedS).toBe(120); expect(s.state.deployment!.panels).toBe(1); expect(s.state.ascent!.upperFuelKg).toBe(before.ascent!.upperFuelKg);
    expect(() => new DeploymentSimulation(BASELINE_VEHICLE, new FlightSession(BASELINE_VEHICLE, BASE_TIME).state)).toThrow('一圈');
  }, 20000);
  it('restores every checkpoint, powered flight and detached objects by replay, then advances identically', () => {
    const s = new FlightSession(BASELINE_VEHICLE, BASE_TIME);
    const verify = () => { const raw = JSON.stringify(s.save()), restored = FlightSession.restore(raw); expect(restored.clock.paused).toBe(true); expect(restored.state).toEqual(s.state); return restored; };
    s.action('start'); s.advanceSteps(180); verify(); finish(s); verify(); s.action('continue-ascent'); s.advanceSteps(777); verify(); finish(s); s.action('separate'); s.advanceSteps(30); verify(); finish(s);
    s.action('continue-orbit'); s.advanceSteps(4000); const powered = verify(); s.advanceSteps(100); powered.advanceSteps(100); expect(powered.state).toEqual(s.state);
    finish(s); s.action('coast'); finish(s); s.action('continue-deployment'); s.action('open-fairing'); verify(); s.action('deploy'); s.advanceSteps(100); const deployed = verify();
    s.advanceSteps(200); deployed.advanceSteps(200); expect(deployed.state).toEqual(s.state); finish(s); verify();
  }, 30000);
  it('rejects incompatible, corrupt and impossible save data without injecting a forged state', () => {
    const s = new FlightSession(BASELINE_VEHICLE, BASE_TIME); s.action('preview-ascent'); s.advanceSteps(1); const save = s.save();
    expect(() => parseFlightSave(JSON.stringify({ ...save, version: 'future' }))).toThrow('版本');
    expect(() => parseFlightSave(JSON.stringify({ ...save, baseTime: null }))).toThrow('日期');
    expect(() => parseFlightSave(JSON.stringify({ ...save, snapshot: { ...save.snapshot, massKg: 1 } }))).toThrow('校验');
    expect(() => FlightSession.restore(JSON.stringify({ ...save, journal: [{ action: 'reset', steps: 1 }] }))).toThrow('暂停');
    expect(() => FlightSession.restore(JSON.stringify({ ...save, journal: [{ action: 'reset', steps: 0 }, { action: 'deploy', steps: 0 }] }))).toThrow('不能执行');
    expect(() => parseFlightSave(JSON.stringify({ ...save, journal: [{ action: 'reset', steps: 100001 }] }))).toThrow('步数');
  });
  it('keeps fixed-step deployment identical at different frame rates and freezes unfolding when paused', () => {
    const handoff = toDeployment().state;
    const run = (fps: number, rate: number) => { const sim = new DeploymentSimulation(BASELINE_VEHICLE, { ...handoff, phase: 'orbit-complete' }); sim.openFairing(); sim.deploy(); const clock = new DeploymentClock(sim); clock.setRate(rate); for (let i = 0; i < 25 * fps / rate; i++) clock.advance(1 / fps); return clock; };
    const a = run(30, 1), b = run(60, 10), c = run(20, 100);
    expect(a.simulation.state).toEqual(b.simulation.state); expect(a.simulation.state).toEqual(c.simulation.state);
    const paused = a.simulation.snapshot(); a.pause(true); a.advance(30); expect(a.simulation.state).toEqual(paused);
    a.pause(false); a.advance(.25); expect(a.simulation.state.time).toBe(paused.time + .25);
  }, 20000);
});
