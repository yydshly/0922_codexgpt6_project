import { beforeAll, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FlightSession } from './flightSession';
import { FullFlightDemo } from './fullFlightDemo';
import { BASELINE_VEHICLE } from './vehicle';
import type { FlightState } from './liftoff';
import { observationExplanation, operationsEventMarkers, powerExplanation, satelliteTaskReceipt } from './taskExplanation';
import { AirLoadExplanation, ObservationExplanation, PowerExplanation, SatelliteTaskReceipt } from '../components/TaskExplanation';
import { flightTelemetry } from './flightTelemetry';
import { operationsGuideReading } from './operationsGuides';

const records = new Map<string, FlightState>();
beforeAll(() => {
  for (const plan of ['unpowered', 'powered'] as const) {
    const demo = new FullFlightDemo(new FlightSession(BASELINE_VEHICLE, 843800000), plan);
    demo.setSpeed(3);
    for (let i = 0; !demo.status.finished; i++) {
      if (i > 20000 || demo.status.error) throw Error(demo.status.error || `Stalled at ${demo.session.state.phase}`);
      demo.advance(.25);
      const s = demo.session.state;
      if (!records.has(`${plan}:${s.phase}`)) records.set(`${plan}:${s.phase}`, structuredClone(s));
      if (s.phase === 'ops-cycle' && s.operations?.shadow && !records.has('eclipse')) records.set('eclipse', structuredClone(s));
      if (s.operations?.transmitting && s.phase === 'ops-downlink' && !records.has('transmitting')) records.set('transmitting', structuredClone(s));
    }
    records.set(`${plan}:final`, structuredClone(demo.session.state));
  }
}, 60000);
const get = (key: string) => structuredClone(records.get(key)!);

describe('read-only event, power and outcome explanations', () => {
  it('connects real eclipse records to zero generation while pausing freezes activity labels', () => {
    const s = get('eclipse'), before = structuredClone(s);
    const r = powerExplanation(s, false)!;
    expect(r.shadow).toBe(true); expect(r.generationW).toBe(0);
    expect(r.differenceW).toBe(-s.operations!.loadW); expect(r.batteryAction).toBe('向负载补电');
    const html = renderToStaticMarkup(<PowerExplanation state={s} paused/>);
    expect(html).toContain('当前时间冻结'); expect(html).toContain('地球遮挡阳光');
    expect(observationExplanation(s, true)?.collecting).toBe(false);
    expect(s).toEqual(before);
  });
  it('does not advertise battery supply with an empty battery or charging when full', () => {
    const s = get('eclipse'); s.operations!.energyJ = 0;
    expect(powerExplanation(s, false)?.supplyKind).toBe('unserved');
    expect(operationsGuideReading(s)?.power).toContain('电池已耗尽');
    expect(renderToStaticMarkup(<PowerExplanation state={s} paused={false}/>)).toContain('缺口未被补足');
    s.operations!.energyJ = s.operations!.capacityJ; s.operations!.shadow = false;
    s.operations!.arrayNormal = [...s.operations!.sunDirection]; s.operations!.generationW = 1000; s.operations!.loadW = 200;
    expect(powerExplanation(s, false)?.batteryAction).toBe('已满，不再充入');
    expect(powerExplanation(s, false)?.result).toContain('800 W 不再存入');
  });
  it('distinguishes onboard data from delivered results and preserves paused snapshots', () => {
    const pending = get('unpowered:ops-data-ready'), complete = get('unpowered:ops-complete'), transmitting = get('transmitting');
    expect(satelliteTaskReceipt(pending)?.delivered).toBe(false);
    expect(pending.operations!.bufferMB).toBe(240); expect(pending.operations!.deliveredMB).toBe(0);
    expect(observationExplanation(pending, false)?.reason).toContain('下一步申请');
    expect(observationExplanation(transmitting, false)?.transmitting).toBe(true);
    expect(observationExplanation(transmitting, true)?.transmitting).toBe(false);
    expect(renderToStaticMarkup(<ObservationExplanation state={transmitting} paused/>)).toContain('数据量不变');
    expect(satelliteTaskReceipt(complete)).toMatchObject({ delivered: true, disposition: '尚未进入任务末期处理' });
    const failed = { ...pending, phase: 'ops-failed' as const };
    expect(observationExplanation(failed, false)?.reason).toContain('本段已停止');
    expect(satelliteTaskReceipt(failed)?.delivered).toBe(false);
  });
  it('keeps the work interval unchanged through actual E01 retirement and E02 descent', () => {
    for (const plan of ['unpowered', 'powered']) {
      const complete = get(`${plan}:ops-complete`), final = get(`${plan}:final`);
      const before = satelliteTaskReceipt(complete)!, after = satelliteTaskReceipt(final)!;
      expect(final.time).toBeGreaterThan(complete.time);
      expect(after.end).toBeCloseTo(complete.time); expect(after.duration).toBeCloseTo(before.duration);
      expect(after.deliveredMB).toBe(240); expect(after.bufferMB).toBe(0); expect(after.historical).toBe(true);
      expect(powerExplanation(final, false)).toBeNull(); expect(observationExplanation(final, false)).toBeNull();
      expect(renderToStaticMarkup(<SatelliteTaskReceipt state={final}/>)).toContain('历史');
    }
    expect(satelliteTaskReceipt(get('unpowered:final'))?.disposition).toContain('已退役仍在轨');
    expect(satelliteTaskReceipt(get('powered:disposal-boundary'))?.disposition).toContain('下降尚未结束');
    expect(satelliteTaskReceipt(get('powered:final'))?.disposition).toContain('地表参考面');
  });
  it('uses recorded event times rather than inventing exact boundaries from ten-second samples', () => {
    const s = get('unpowered:ops-complete'), o = s.operations!, markers = operationsEventMarkers(s);
    expect(markers.some(m => m.label === '进入地影')).toBe(true);
    expect(markers.some(m => m.label === '恢复日照')).toBe(true);
    expect(markers.filter(m => m.kind === 'data').map(m => m.label)).toEqual(['开始观测', '申请下传']);
    for (const m of markers) expect(s.events.some(e => Math.abs(e.time - o.startTime - m.t) < 1e-8)).toBe(true);
    s.events.push({ time: s.time + 100, label: '申请教学地面站下传' });
    expect(operationsEventMarkers(s)).toEqual(markers);
    expect(operationsEventMarkers(get('unpowered:final'))).toEqual(markers);
  });
  it('displays atmospheric load from the existing snapshot without inventing heat or altering physics', () => {
    const s = get('unpowered:ascent'), before = structuredClone(s), r = flightTelemetry(s, BASELINE_VEHICLE);
    const html = renderToStaticMarkup(<AirLoadExplanation reading={r}/>);
    expect(r.dynamicPressurePa).toBeCloseTo(.5 * r.density * r.airSpeedMS ** 2);
    expect(r.dragN).toBeCloseTo(r.dynamicPressurePa * r.cd * r.areaM2);
    expect(html).toContain('不是表面温度'); expect(html).not.toContain('NaN'); expect(s).toEqual(before);
  });
});
