import { beforeAll, describe, expect, it } from 'vitest';
import { FullFlightDemo } from './fullFlightDemo';
import { FlightSession, P5_FLIGHT_VERSION, flightChecksum, parseFlightSave } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { ReentrySimulation } from './reentry';
import { add, norm, scale } from './ascent';
import type { FlightState } from './liftoff';
import { satelliteDemoCue, satelliteDemoPacing, satelliteDeliveryExplanation } from './satelliteDemo';
import { demoCheckpoint } from './demoSequence';
import { demoPlayback } from './demoPlayback';

let demo: FullFlightDemo, deorbit: FlightState, ground: FlightState, oldBoundary: string;
const chapters = new Set<number>();
const chapterStates = new Map<number, string>();
const capabilityStates = new Map<string, FlightState>();
let collectionWatchS = 0, downlinkWatchS = 0;
beforeAll(() => {
  demo = new FullFlightDemo(new FlightSession(BASELINE_VEHICLE, 843800000)); demo.setSpeed(3);
  for (let ticks = 0; !demo.status.finished && !demo.status.error; ticks++) {
    if (ticks > 15000) throw Error(`Demo stalled ${demo.session.state.phase}`);
    const before = demo.session.state;
    if (before.phase === 'ops-cycle' && before.operations?.collecting) collectionWatchS += .25;
    if (before.phase === 'ops-downlink' && before.operations?.transmitting) downlinkWatchS += .25;
    demo.advance(.25); chapters.add(demo.status.chapter);
    const current = demo.session.state;
    if (current.phase.startsWith('ops-') && !capabilityStates.has(current.phase)) capabilityStates.set(current.phase, structuredClone(current));
    if (current.phase === 'ops-cycle' && current.operations?.shadow && !capabilityStates.has('shadow')) capabilityStates.set('shadow', structuredClone(current));
    if (!chapterStates.has(demo.status.chapter)) chapterStates.set(demo.status.chapter, flightChecksum(demo.session.state));
    if (demo.session.state.phase === 'deorbit-complete' && !deorbit) deorbit = structuredClone(demo.session.state);
    if (demo.session.state.phase === 'reentry-complete' && !oldBoundary) { const save = demo.session.save(); save.version = P5_FLIGHT_VERSION; oldBoundary = JSON.stringify(save); }
    if (demo.session.state.phase === 'reentry-surface' && !ground) ground = structuredClone(demo.session.state);
  }
}, 30000);

describe('Full flight demonstration and honest route endings', () => {
  it('labels the actual satellite checkpoint and keeps physical waiting distinct from teaching dwell', () => {
    const ready = capabilityStates.get('ops-ready')!, downlink = capabilityStates.get('ops-downlink')!;
    expect(demoCheckpoint(ready)).toMatchObject({ action: 'align-operations', durationS: 6 });
    expect(demoCheckpoint(capabilityStates.get('ops-complete')!)?.action).toBe('prepare-maintenance');
    expect(satelliteDeliveryExplanation(capabilityStates.get('ops-complete')!)).toContain('E01 没有推进器');
    expect(satelliteDeliveryExplanation(ready)).toBeNull();
    expect(demoCheckpoint(downlink)).toBeNull();
    const reading = demoPlayback(downlink, { ...demo.status, finished: false, paused: false, holdS: 6 });
    expect(reading.kind).toBe('running'); expect(reading.remainingS).toBeNull();
  });
  it('automatically presents observation between supply and delivery without inventing photography', () => {
    expect(satelliteDemoCue(capabilityStates.get('ops-ready')!)?.step).toBe(0);
    expect(satelliteDemoCue(capabilityStates.get('ops-power-ready')!)?.view).toBe('power');
    const observing = capabilityStates.get('ops-cycle')!;
    expect(satelliteDemoCue(observing)?.step).toBe(1);
    expect(satelliteDemoPacing(observing).visibleWork).toBe(true);
    expect(satelliteDemoCue(capabilityStates.get('ops-data-ready')!)?.detail).toContain('保存在机上');
    expect(satelliteDemoCue(capabilityStates.get('ops-downlink')!)?.view).toBe('orbit');
    expect(satelliteDemoCue(capabilityStates.get('ops-complete')!)?.detail).toContain('240 MB');
    expect(satelliteDemoCue(demo.session.state)).toBeNull();
    expect(collectionWatchS).toBeGreaterThan(10); expect(downlinkWatchS).toBeGreaterThan(5);
    const shadow = capabilityStates.get('shadow')!;
    expect(shadow.operations!.collecting).toBe(false);
    expect(satelliteDemoCue(shadow)?.detail).not.toContain('正在以');
  });
  it('holds observation explanations while paused without advancing physics or countdown', () => {
    demo.revisit(5); demo.pause(false);
    for (let i = 0; i < 20; i++) demo.advance(.25);
    expect(demo.session.state.phase).toBe('ops-ready');
    const hold = demo.status.holdS, hash = flightChecksum(demo.session.state);
    demo.pause(true); demo.advance(.25);
    expect(demo.status.holdS).toBe(hold); expect(flightChecksum(demo.session.state)).toBe(hash);
    demo.pause(false); for (let i = 0; i < 8; i++) demo.advance(.25);
    expect(demo.session.state.phase).toBe('ops-align');
    // Restore the completed checkpoint for the route assertions below.
    demo.revisit(6); demo.pause(false);
    for(let i=0; !demo.status.finished && !demo.status.error && i<15000; i++) demo.advance(.25);
    expect(demo.status.finished).toBe(true);
  }, 30000);
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
  it('revisits computed chapters paused, retains results across plans, and protects the original task', () => {
    const original = demo.original, checksum = flightChecksum(original.state), result = structuredClone(demo.status.results.unpowered);
    expect(result?.deliveredMB).toBe(240); expect(result?.satelliteAltitudeM).toBeGreaterThan(80000);
    expect(demo.status.visited).toEqual([0,1,2,3,4,5,6]);
    for (const chapter of [6,4,1,0,5]) {
      demo.revisit(chapter); expect(flightChecksum(demo.session.state)).toBe(chapterStates.get(chapter));
      expect(demo.status.chapter).toBe(chapter); expect(demo.status.paused).toBe(true); expect(demo.status.finished).toBe(false);
      const before = flightChecksum(demo.session.state); demo.advance(1); expect(flightChecksum(demo.session.state)).toBe(before);
    }
    demo.pause(false); for (let i=0;i<28;i++) demo.advance(.25);
    expect(demo.status.error).toBe(''); expect(demo.session.state.phase).not.toBe('ops-ready');
    demo.restartPlan('powered'); expect(demo.session.config.satellitePlan).toBe('powered'); expect(demo.status.visited).toEqual([0]);
    expect(demo.status.results.unpowered).toEqual(result); expect(demo.status.results.powered).toBeUndefined();
    expect(()=>demo.revisit(6)).toThrow('实际运行'); expect(()=>demo.revisit(NaN)).toThrow();
    expect(demo.session.baseTime).toBe(original.baseTime); expect(demo.stop()).toBe(original); expect(flightChecksum(original.state)).toBe(checksum);
  },30000);
});
