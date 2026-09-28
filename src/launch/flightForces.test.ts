import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BASELINE_VEHICLE } from './vehicle';
import { LiftoffSimulation } from './liftoff';
import { FlightSession } from './flightSession';
import { flightForces, flightForceInsight } from './flightForces';
import { createFlightForceView } from './flightForceView';
import { baseBasis } from './coordinates';
import { add, airVelocity, dot, norm, rotateEarth, scale, surfaceAt, unit, type V3 } from './ascent';

const stepTo = (s: LiftoffSimulation, t: number) => { while (s.state.time < t - 1e-9) s.step(); };
const total = (forces: ReturnType<typeof flightForces>) => forces.reduce((v, force) => add(v, force.localN), [0, 0, 0] as V3);
describe('3D force overlays follow the same flight state', () => {
  it('balances gravity on the pad and reverses the clamp reaction after thrust exceeds weight', () => {
    const sim = new LiftoffSimulation(BASELINE_VEHICLE); sim.start();
    expect(norm(total(flightForces(sim.state)))).toBe(0);
    stepTo(sim, -2); let forces = flightForces(sim.state);
    expect(forces.find(f => f.id === 'support')!.localN[1]).toBeGreaterThan(0);
    expect(norm(total(forces))).toBeLessThan(1e-8);
    stepTo(sim, -1); forces = flightForces(sim.state);
    expect(forces.find(f => f.id === 'support')!.localN[1]).toBeLessThan(0);
    expect(norm(total(forces))).toBeLessThan(1e-8);
    stepTo(sim, 2); forces = flightForces(sim.state);
    expect(forces.find(f => f.id === 'support')!.drawn).toBe(false);
    expect(total(forces)[1] / sim.state.massKg).toBeCloseTo(sim.state.accelerationMS2, 10);
  });
  it('uses Earth-centred gravity and air-relative drag while turning, not three fixed vertical arrows', () => {
    const session = new FlightSession(BASELINE_VEHICLE, 850000000); session.action('preview-ascent');
    while (session.state.time < 75) session.advanceSteps(1);
    const s = session.state, a = s.ascent!, forces = flightForces(s), basis = baseBasis();
    const inertial = (v: V3): V3 => rotateEarth(basis.east.clone().multiplyScalar(v[0]).addScaledVector(basis.up, v[1]).addScaledVector(basis.south, v[2]).toArray() as V3, s.time);
    const f = Object.fromEntries(forces.map(force => [force.id, inertial(force.localN)]));
    expect(dot(unit(f.thrust), a.direction)).toBeCloseTo(1, 12);
    expect(dot(unit(f.gravity), unit(a.position))).toBeCloseTo(-1, 12);
    expect(dot(unit(f.drag), unit(add(a.velocity, scale(airVelocity(a.position), -1))))).toBeCloseTo(-1, 12);
    expect(dot(unit(f.thrust), unit(f.gravity))).toBeGreaterThan(-.99);
    expect(dot(inertial(total(forces)), surfaceAt(a.position).up) / s.massKg).toBeCloseTo(s.accelerationMS2, 10);
  });
  it('removes thrust after burnout and cutoff, retaining small nonzero drag in numeric readouts', () => {
    const session = new FlightSession(BASELINE_VEHICLE, 850000000); session.action('preview-ascent');
    while (session.running) session.advanceSteps(1);
    expect(flightForces(session.state)[0].magnitudeN).toBe(0);
    expect(flightForceInsight(session.state).title).toContain('一级燃尽');
    session.action('separate'); expect(flightForces(session.state)[0].drawn).toBe(false);
    while (session.running) session.advanceSteps(1);
    expect(flightForces(session.state)[0].drawn).toBe(true);
    session.action('continue-orbit'); session.action('cutoff');
    const forces = flightForces(session.state), drag = forces.find(f => f.id === 'drag')!;
    expect(forces[0].drawn).toBe(false); expect(forces[1].drawn).toBe(true);
    expect(drag.magnitudeN).toBeGreaterThan(0); expect(drag.drawn).toBe(false);
    expect(flightForceInsight(session.state).title).toBe('关机后，仍有引力');
  });
  it('uses one linear length scale and never advances or mutates the simulation', () => {
    const sim = new LiftoffSimulation(BASELINE_VEHICLE); sim.start(); stepTo(sim, 6);
    const before = sim.snapshot(), forces = flightForces(sim.state), maximum = Math.max(...forces.map(f => f.magnitudeN));
    for (const f of forces) expect(f.arrowLengthM).toBeCloseTo(f.magnitudeN / maximum * 36, 12);
    flightForceInsight(sim.state); expect(sim.snapshot()).toEqual(before);
  });
  it('keeps scene vectors in world directions during camera rotation and hides the whole overlay when disabled', () => {
    const sim = new LiftoffSimulation(BASELINE_VEHICLE); sim.start(); stepTo(sim, -1);
    const view = createFlightForceView(), camera = new THREE.PerspectiveCamera(), center = new THREE.Vector3(0, 38.1, 0);
    try {
      camera.position.set(120, 65, 180); camera.lookAt(center); view.update(sim.state, center, camera, true);
      const directions = view.root.children.map(arrow => new THREE.Vector3(0, 1, 0).applyQuaternion(arrow.quaternion).toArray());
      const beforeOffsets = view.root.children.map(arrow => arrow.position.toArray());
      camera.position.set(-180, 125, 50); camera.lookAt(center); view.update(sim.state, center, camera, true);
      expect(view.root.children.map(arrow => new THREE.Vector3(0, 1, 0).applyQuaternion(arrow.quaternion).toArray())).toEqual(directions);
      expect(view.root.children.map(arrow => arrow.position.toArray())).not.toEqual(beforeOffsets);
      expect(view.root.position.toArray()).toEqual(center.toArray());
      camera.position.copy(center).add(new THREE.Vector3(0, 5, 50)); camera.lookAt(center); view.update(sim.state, center, camera, true);
      expect(view.root.scale.x).toBeLessThan(1); expect(view.root.scale.x).toBe(view.root.scale.y); expect(view.root.scale.y).toBe(view.root.scale.z);
      expect(view.root.scale.x * 36).toBeCloseTo(2 * camera.position.distanceTo(center) * Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2) * .25, 10);
      view.update(sim.state, center, camera, false); expect(view.root.visible).toBe(false);
    } finally { view.root.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } }); }
  });
  it('distinguishes the exact ignition command from waiting, thrust buildup and cancelled flight', () => {
    const sim = new LiftoffSimulation(BASELINE_VEHICLE); expect(flightForceInsight(sim.state).title).toContain('未点火');
    sim.start(); stepTo(sim, -3); expect(flightForceInsight(sim.state).title).toContain('指令刚发出');
    stepTo(sim, -2); expect(flightForceInsight(sim.state).title).toContain('已经点火');
    sim.cancel(); expect(flightForceInsight(sim.state).text).toBe(sim.state.message);
  });
});
