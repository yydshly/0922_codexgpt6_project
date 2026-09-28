import { describe, expect, it } from 'vitest';
import { LiftoffSimulation, LIFTOFF } from './liftoff';
import { BASELINE_VEHICLE, compileVehicle } from './vehicle';
import { FlightSession } from './flightSession';
import { flightTelemetry, ignitionReading, telemetryNumber } from './flightTelemetry';

const config = BASELINE_VEHICLE;
const toTime = (sim: LiftoffSimulation, time: number) => { while (sim.state.time < time - 1e-9) sim.step(); };
describe('launch timing and whole-flight parameter readings', () => {
  it('starts ignition at minus three, builds for two seconds and holds full thrust until zero', () => {
    const sim = new LiftoffSimulation(config); sim.start(); toTime(sim, -3.05);
    expect(ignitionReading(sim.state).phase).toBe('waiting'); expect(sim.state.thrustN).toBe(0);
    sim.step(); expect(sim.state.time).toBeCloseTo(-3); expect(ignitionReading(sim.state).phase).toBe('ramping');
    expect(sim.state.events.at(-1)).toEqual({ time: -3, label: '发动机点火，建立推力' });
    sim.step(); expect(sim.state.thrustN).toBeGreaterThan(0); expect(sim.state.time).toBeLessThan(-2);
    expect(sim.state.throttle).toBeCloseTo(.025);
    toTime(sim, -2); expect(sim.state.throttle).toBeCloseTo(.5); expect(sim.state.released).toBe(false);
    toTime(sim, -1); expect(ignitionReading(sim.state).phase).toBe('holding'); expect(sim.state.throttle).toBe(1);
    expect(sim.state.heightM).toBe(0); expect(sim.state.accelerationMS2).toBe(0);
    expect(flightTelemetry(sim.state, config).supportN).toBeLessThan(0);
    toTime(sim, 0); expect(ignitionReading(sim.state).phase).toBe('released');
    expect(flightTelemetry(sim.state, config).supportN).toBe(0); expect(sim.state.accelerationMS2).toBeGreaterThan(0);
  });
  it('shows zero propellant flow after cancellation while preserving already spent propellant', () => {
    const sim = new LiftoffSimulation(config); sim.start(); toTime(sim, -2); sim.cancel();
    const r = flightTelemetry(sim.state, config);
    expect(ignitionReading(sim.state).phase).toBe('stopped'); expect(r.flowKgS).toBe(0); expect(r.thrustN).toBe(0);
    expect(r.boosterFuelKg).toBeLessThan(compileVehicle(config).stages[0].fuelKg);
    expect(r.supportN).toBe(r.weightN); expect(r.held).toBe(true);
  });
  it('keeps unsupported temperatures, heat flux and Mach unavailable, including on a firing pad', () => {
    const sim = new LiftoffSimulation(config); sim.start(); toTime(sim, -1);
    const r = flightTelemetry(sim.state, config);
    expect(r.density).toBe(1.225); expect(r.pressurePa).toBe(101325); expect(r.densityFraction).toBe(1);
    expect(r.dragN).toBe(0); expect(r.dragPowerW).toBe(0); expect(r.dynamicPressurePa).toBe(0);
    expect(r.thrustN).toBeGreaterThan(0);
    for (const field of [r.ambientTemperatureK, r.surfaceTemperatureK, r.heatFluxWm2, r.mach, r.inertialMS]) expect(field).toBeNull();
  });
  it('follows the active stage, atmosphere and force state throughout ascent and cutoff', () => {
    const session = new FlightSession(config, 850000000); session.action('preview-ascent');
    let samples = 0;
    while (session.running) {
      session.advanceSteps(1); if (session.clock.simulation.stepsTaken % 157) continue;
      const s = session.state, r = flightTelemetry(s, config), a = s.ascent!;
      expect(r.density).toBe(a.density); expect(r.airSpeedMS).toBe(a.airSpeedMS);
      expect(r.dynamicPressurePa).toBeCloseTo(a.dynamicPressurePa, 7);
      expect(r.dragN).toBeCloseTo(r.dynamicPressurePa * LIFTOFF.cd * LIFTOFF.areaM2, 7);
      expect(r.inertialMS).toBe(Math.hypot(...a.velocity));
      expect(r.upperFuelKg).toBe(a.upperFuelKg); expect(r.massKg).toBe(s.massKg); samples++;
    }
    expect(samples).toBeGreaterThan(10); expect(flightTelemetry(session.state, config).flowKgS).toBe(0);
    session.action('separate'); expect(flightTelemetry(session.state, config).stage).toBe(1);
    expect(flightTelemetry(session.state, config).flowKgS).toBe(0);
    while (session.running) session.advanceSteps(1);
    expect(flightTelemetry(session.state, config).flowKgS).toBeCloseTo(compileVehicle(config).stages[1].massFlowKgS, 7);
    session.action('continue-orbit'); session.action('cutoff');
    expect(flightTelemetry(session.state, config).thrustN).toBe(0); expect(flightTelemetry(session.state, config).flowKgS).toBe(0);
  });
  it('does not modify a snapshot, clock or journal and agrees after save restoration', () => {
    const session = new FlightSession(config, 850000000); session.action('start'); session.advanceSteps(250);
    const before = structuredClone(session.state), journal = structuredClone(session.journal), r = flightTelemetry(session.state, config);
    for (let i = 0; i < 100; i++) { flightTelemetry(session.state, config); ignitionReading(session.state); }
    expect(session.state).toEqual(before); expect(session.journal).toEqual(journal);
    const restored = FlightSession.restore(JSON.stringify(session.save())); expect(flightTelemetry(restored.state, config)).toEqual(r);
  });
  it('does not round tiny positive density, pressure or drag to a false zero', () => {
    expect(telemetryNumber(0)).toBe('0'); expect(telemetryNumber(1e-18, 4)).toBe('1.00e-18');
    expect(telemetryNumber(-.0002)).toBe('-2.00e-4'); expect(telemetryNumber(1.225, 4)).toBe('1.2250');
    expect(telemetryNumber(NaN)).toBe('—'); expect(telemetryNumber(Infinity)).toBe('—');
  });
});
