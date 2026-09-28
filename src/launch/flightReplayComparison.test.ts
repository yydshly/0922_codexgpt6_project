import { describe, expect, it } from 'vitest';
import { FlightSession, flightChecksum, parseFlightSave } from './flightSession';
import { BASELINE_VEHICLE } from './vehicle';
import { replayMatches } from './flightReplayComparison';

describe('cross-runtime replay verification', () => {
  it('accepts only small numerical residuals while preserving exact structure and decisions', () => {
    expect(replayMatches({r: [6_700_000.123456, 1e-8], phase: 'orbit-coast', pass: true}, {r: [6_700_000.1234561, 0], pass: true, phase: 'orbit-coast'})).toBe(true);
    expect(replayMatches(-803.7180228577927, -803.7180232405663)).toBe(true);
    expect(replayMatches(265722.9522727962, 265722.95227944024)).toBe(true);
    expect(replayMatches(14343.012120454572, 14343.01211796084)).toBe(true);
    for (const [a,b] of [[0,1],[200.5,201],[true,false],['orbit-coast','orbit-complete'],[null,0],[[1,2],[1]], [{a:1},{a:1,b:2}], [[1],{'0':1}], [NaN,NaN], [Infinity,Infinity]]) expect(replayMatches(a,b)).toBe(false);
    expect(replayMatches([6_700_000.1],[6_700_000.11])).toBe(false);
    expect(replayMatches({counter:1000000000},{counter:1000000001})).toBe(false);
  });
  it('replays the journal and keeps the recomputed result rather than injecting the saved approximation', () => {
    const session=new FlightSession(BASELINE_VEHICLE,843800000);session.action('preview-ascent');session.advanceSteps(57);
    const save=session.save(),original=structuredClone(session.state);
    save.snapshot.ascent!.position[0]+=1e-7;
    save.checksum=flightChecksum(save.snapshot);
    const restored=FlightSession.restore(JSON.stringify(save));
    expect(restored.restoredWithRoundoff).toBe(true);expect(restored.clock.paused).toBe(true);
    expect(restored.state).toEqual(original);expect(restored.state.ascent!.position[0]).not.toBe(save.snapshot.ascent!.position[0]);
    session.advanceSteps(30);restored.advanceSteps(30);expect(restored.state).toEqual(session.state);
    expect(FlightSession.restore(JSON.stringify(restored.save())).restoredWithRoundoff).toBe(false);
  });
  it('still rejects corruption, materially changed values and forged decisions even with recomputed file checksums', () => {
    const session=new FlightSession(BASELINE_VEHICLE,843800000);session.action('preview-ascent');session.advanceSteps(57);
    const corrupt=session.save();corrupt.snapshot.dragN+=1e-8;
    expect(()=>parseFlightSave(JSON.stringify(corrupt))).toThrow('校验');
    const edits=[(s:ReturnType<FlightSession['save']>)=>{s.snapshot.ascent!.position[0]+=.01;},
      (s:ReturnType<FlightSession['save']>)=>{s.snapshot.massKg+=.1;},
      (s:ReturnType<FlightSession['save']>)=>{s.snapshot.phase='stage-ready';},
      (s:ReturnType<FlightSession['save']>)=>{s.snapshot.released=false;},
      (s:ReturnType<FlightSession['save']>)=>{s.snapshot.events[0].label='forged';},
      (s:ReturnType<FlightSession['save']>)=>{s.journal.at(-1)!.steps++;}];
    for(const edit of edits){const save=session.save();edit(save);save.checksum=flightChecksum(save.snapshot);expect(()=>FlightSession.restore(JSON.stringify(save))).toThrow('不一致');}
  });
});
