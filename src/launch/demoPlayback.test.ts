import { describe, expect, it } from 'vitest';
import { FullFlightDemo } from './fullFlightDemo';
import { FlightSession, flightChecksum } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { demoPlayback } from './demoPlayback';

const create = () => new FullFlightDemo(new FlightSession(BASELINE_VEHICLE, 843800000));

describe('Explanation uses the real demonstration clock', () => {
  it('freezes the teaching countdown and physical state when paused, then executes the advertised next action', () => {
    const demo = create(); demo.advance(.25);
    const playing = demoPlayback(demo.session.state, demo.status);
    expect(playing.kind).toBe('checkpoint'); expect(playing.remainingS).toBe(3.75);
    expect(playing.checkpoint?.next).toBe('开始点火倒计时');
    const hash = flightChecksum(demo.session.state);
    demo.pause(true); demo.advance(10);
    const paused = demoPlayback(demo.session.state, demo.status);
    expect(paused.kind).toBe('paused'); expect(paused.remainingS).toBe(playing.remainingS);
    expect(flightChecksum(demo.session.state)).toBe(hash);
    demo.pause(false); for (let i = 0; i < 15; i++) demo.advance(.25);
    expect(demo.session.state.phase).toBe('countdown'); expect(demo.status.holdS).toBe(0);
    const running = demoPlayback(demo.session.state, demo.status);
    expect(running.kind).toBe('running'); expect(running.checkpoint).toBeNull(); expect(running.remainingS).toBeNull();
  });
  it('fast mode does not falsely shorten teaching time or present a flight ETA', () => {
    const demo = create(); demo.setSpeed(3); demo.advance(.25);
    expect(demoPlayback(demo.session.state, demo.status).remainingS).toBe(3.75);
    for (let i = 0; i < 15; i++) demo.advance(.25);
    const status = demoPlayback(demo.session.state, { ...demo.status, holdS: 4 });
    expect(status.kind).toBe('running'); expect(status.checkpoint).toBeNull();
  });
  it('shows a failure instead of claiming a paused demonstration will automatically continue', () => {
    const demo = create(); demo.session.state.phase = 'aborted'; demo.session.state.message = '起飞检查失败'; demo.advance(.25);
    const status = demoPlayback(demo.session.state, demo.status);
    expect(demo.status.paused).toBe(true); expect(status.kind).toBe('error');
    expect(status.detail).toContain('起飞检查失败'); expect(status.detail).not.toContain('自动执行下一步');
    expect(status.checkpoint).toBeNull();
  });
  it('withholds a countdown during restore and after completion, and restarts the real checkpoint on replay', () => {
    const demo = create(); demo.advance(.25);
    expect(demoPlayback(demo.session.state, demo.status, true).kind).toBe('restoring');
    expect(demoPlayback(demo.session.state, demo.status, true).checkpoint).toBeNull();
    const finished = demoPlayback(demo.session.state, { ...demo.status, paused: true, finished: true });
    expect(finished.kind).toBe('finished'); expect(finished.checkpoint).toBeNull();
    demo.revisit(0);
    const replay = demoPlayback(demo.session.state, demo.status);
    expect(replay.kind).toBe('paused'); expect(replay.remainingS).toBe(4);
  });
});
