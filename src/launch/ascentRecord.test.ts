import { describe, expect, it } from 'vitest';
import { AscentRecord, ascentCurve } from './ascentRecord';
import { FlightSession, FLIGHT_VERSION } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { flightEnvironmentReading } from './flightPhenomena';

const baseTime = 843800000;
function finish(s: FlightSession, fps = 0, rate = 1) {
  s.pause(false); if (s.state.ascent) s.setRate(rate);
  for (let n = 0; s.running && n < 100000; n++) fps ? s.advance(1 / fps) : s.advanceSteps(1);
  expect(s.running).toBe(false);
}
function toCutoff(fps = 0, rate = 1) {
  const s = new FlightSession(BASELINE_VEHICLE, baseTime); s.action('start'); finish(s, fps);
  s.action('continue-ascent'); finish(s, fps, rate); s.action('separate'); finish(s, fps, rate);
  s.action('continue-orbit'); finish(s, fps, rate); return s;
}
describe('ascent data recording', () => {
  it('observes every physical step at different display frame rates and rates without changing physics', () => {
    const direct = toCutoff(), slow = toCutoff(30, 1), fast = toCutoff(60, 10);
    expect(fast.state).toEqual(direct.state); expect(slow.state).toEqual(direct.state);
    expect(fast.ascentRecord.snapshot()).toEqual(direct.ascentRecord.snapshot());
    expect(slow.ascentRecord.snapshot()).toEqual(direct.ascentRecord.snapshot());
    const record = direct.ascentRecord.snapshot();
    expect(record.status).toBe('cutoff'); expect(record.latest!.time).toBe(direct.state.orbit!.cutoff!.time);
    expect(record.peakQ!.time).not.toBe(record.peakPower!.time);
    expect(record.peakQ!.qPa).toBeGreaterThan(record.latest!.qPa * 100);
    expect(ascentCurve(record)).toContainEqual(record.peakQ); expect(ascentCurve(record)).toContainEqual(record.peakPower);
  }, 20000);
  it('reconstructs the same record from unchanged save format and does not extend it during coast', () => {
    const s = toCutoff(), before = s.ascentRecord.snapshot(), save = s.save();
    expect(save.version).toBe(FLIGHT_VERSION); expect(save.snapshot).not.toHaveProperty('ascentRecord');
    const restored = FlightSession.restore(JSON.stringify(save)); expect(restored.ascentRecord.snapshot()).toEqual(before); expect(restored.state).toEqual(s.state);
    restored.action('coast'); restored.advanceSteps(100); expect(restored.ascentRecord.snapshot()).toEqual(before);
  }, 10000);
  it('includes the computed departure during quick entry and restores partial history', () => {
    const full = new FlightSession(BASELINE_VEHICLE, baseTime); full.action('start'); finish(full); full.action('continue-ascent');
    const quick = new FlightSession(BASELINE_VEHICLE, baseTime); quick.action('preview-ascent');
    expect(quick.ascentRecord.snapshot()).toEqual(full.ascentRecord.snapshot());
    quick.advanceSteps(750); const before = quick.ascentRecord.snapshot();
    expect(before.status).toBe('recording'); expect(FlightSession.restore(JSON.stringify(quick.save())).ascentRecord.snapshot()).toEqual(before);
    quick.pause(true); quick.advance(.2); expect(quick.ascentRecord.snapshot()).toEqual(before);
    expect(new FlightSession(BASELINE_VEHICLE, baseTime).ascentRecord.snapshot().samples).toEqual([]);
  });
  it('keeps peaks from between displayed curve samples and marks early stops as partial', () => {
    const s = new FlightSession(BASELINE_VEHICLE, baseTime); s.action('preview-ascent');
    let peakQ = -Infinity, peakPower = -Infinity;
    while (s.running) { s.advanceSteps(1); const r = flightEnvironmentReading(s.state); peakQ = Math.max(peakQ, r.dynamicPressurePa); peakPower = Math.max(peakPower, r.dragPowerW); }
    const record = s.ascentRecord.snapshot(); expect(record.peakQ!.qPa).toBe(peakQ); expect(record.peakPower!.dragPowerW).toBe(peakPower);
    expect(record.status).toBe('recording'); // The first-stage peak cannot yet be called the final maximum.
    const stopped = new FlightSession(BASELINE_VEHICLE, baseTime); stopped.action('start'); stopped.advanceSteps(180); stopped.action('cancel');
    expect(stopped.ascentRecord.snapshot().status).toBe('stopped'); expect(stopped.ascentRecord.snapshot().peakQ).toBe(null);
  });
  it('bounds long curves without losing exact extrema or endpoints', () => {
    const observer = new AscentRecord(), s = new FlightSession(BASELINE_VEHICLE, baseTime).state;
    for (let i = 0; i < 5000; i++) observer.observe({ ...s, phase: 'ascending', time: i, speedMS: i === 2345 ? 200 : 1, dragN: 10 });
    const record = observer.snapshot(); expect(record.samples.length).toBeLessThanOrEqual(2048); expect(record.peakQ!.time).toBe(2345);
    const curve = ascentCurve(record); expect(curve).toContainEqual(record.peakQ); expect(curve.at(-1)!.time).toBe(4999);
  });
});
