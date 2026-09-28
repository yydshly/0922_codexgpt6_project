import { beforeAll, describe, expect, it } from 'vitest';
import { FullFlightDemo } from './fullFlightDemo';
import { FlightSession, P5_FLIGHT_VERSION, flightChecksum, parseFlightSave } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { ReentrySimulation } from './reentry';
import { add, norm, scale } from './ascent';
import type { FlightState } from './liftoff';

let demo: FullFlightDemo, deorbit: FlightState, ground: FlightState, oldBoundary: string;
const chapters = new Set<number>();
beforeAll(() => {
  demo = new FullFlightDemo(new FlightSession(BASELINE_VEHICLE, 843800000)); demo.setSpeed(3);
  for (let ticks = 0; !demo.status.finished && !demo.status.error; ticks++) {
    if (ticks > 15000) throw Error(`Demo stalled ${demo.session.state.phase}`);
    demo.advance(.25); chapters.add(demo.status.chapter);
    if (demo.session.state.phase === 'deorbit-complete' && !deorbit) deorbit = structuredClone(demo.session.state);
    if (demo.session.state.phase === 'reentry-complete' && !oldBoundary) { const save = demo.session.save(); save.version = P5_FLIGHT_VERSION; oldBoundary = JSON.stringify(save); }
    if (demo.session.state.phase === 'reentry-surface' && !ground) ground = structuredClone(demo.session.state);
  }
}, 30000);

describe('Full flight demonstration and honest route endings', () => {
  it('executes the whole baseline journey with real checks and separate outcomes', () => {
    expect(demo.status.error).toBe(''); expect(demo.status.finished).toBe(true); expect(chapters.size).toBe(7);
    expect(demo.session.state.phase).toBe('life-observed'); expect(demo.session.state.operations!.deliveredMB).toBe(240);
    expect(demo.session.state.reentry!.outcome).toBe('surface-reference'); expect(demo.session.state.lifecycle!.mode).toBe('retired');
    expect(demo.session.state.deployment!.satellite.altitudeM).toBeGreaterThan(80000);
    expect(demo.session.state.operations!.carrierRecordTime).toBe(ground.time);
    demo.pause(false); expect(demo.status.paused).toBe(true);
    expect(Math.abs(ground.deployment!.carrier.altitudeM)).toBeLessThan(1e-5);
    expect(ground.reentry!.lower!.speedMS).toBeGreaterThan(0); expect(ground.message).toContain('未把它标记为安全着陆');
  });
  it('preserves an existing manual flight and stops without replacing its configuration or journal', () => {
    const original = new FlightSession({ ...BASELINE_VEHICLE, payloadKg: 250 }, 843800000); original.action('start'); original.advanceSteps(60);
    const checksum = flightChecksum(original.state), journal = structuredClone(original.journal), d = new FullFlightDemo(original);
    for (let i=0;i<60;i++) d.advance(.25);
    expect(d.session.config.payloadKg).toBe(500); expect(d.stop()).toBe(original);
    expect(flightChecksum(original.state)).toBe(checksum); expect(original.journal).toEqual(journal); expect(original.clock.paused).toBe(true);
  });
  it('pauses both checkpoint dwell and integration, and stops on failure', () => {
    const d = new FullFlightDemo(new FlightSession(BASELINE_VEHICLE, 843800000)); d.advance(.25); d.pause(true);
    const hold = d.status.holdS, checksum = flightChecksum(d.session.state); d.advance(100);
    expect(d.status.holdS).toBe(hold); expect(flightChecksum(d.session.state)).toBe(checksum);
    d.pause(false); d.session.state.phase = 'aborted'; d.session.state.message = 'test failure'; d.advance(.1);
    expect(d.status.error).toBe('test failure'); expect(d.status.paused).toBe(true); expect(d.status.finished).toBe(false);
  });
  it('keeps old 20 km saves replayable and rejects new descent commands under old versions', () => {
    const old = FlightSession.restore(oldBoundary); expect(old.state.phase).toBe('reentry-complete'); expect(old.state.reentry!.lower).toBeUndefined();
    old.action('descend-reentry'); old.advanceSteps(8); const newSave = old.save();
    expect(FlightSession.restore(JSON.stringify(newSave)).state).toEqual(old.state);
    newSave.version = P5_FLIGHT_VERSION; expect(() => parseFlightSave(JSON.stringify(newSave))).toThrow('旧版');
  }, 30000);
  it('converges at the 0 m crossing without changing mass, fuel or giving a landing verdict', () => {
    const run = (step: number) => { const s = new ReentrySimulation(deorbit, step); s.startCoast(); while(s.running)s.step(); s.startEntry(); while(s.running)s.step(); s.startLower(); while(s.running)s.step(); return s.state; };
    const fine = run(.125);
    expect(norm(add(ground.deployment!.carrier.position, scale(fine.deployment!.carrier.position,-1)))).toBeLessThan(2);
    expect(Math.abs(ground.time - fine.time)).toBeLessThan(.02);
    expect(ground.massKg).toBe(deorbit.massKg); expect(ground.ascent!.upperFuelKg).toBe(deorbit.ascent!.upperFuelKg);
    expect(ground.reentry!.lower!.contactTime).toBe(ground.time);
  }, 30000);
  it('restores the full new route with exact state and preserves the historical carrier timestamp', () => {
    const restored = FlightSession.restore(JSON.stringify(demo.session.save()));
    expect(restored.state).toEqual(demo.session.state); expect(restored.clock.paused).toBe(true);
  }, 30000);
});
