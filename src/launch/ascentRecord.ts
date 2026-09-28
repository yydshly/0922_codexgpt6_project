import type { FlightState } from './liftoff';
import { flightEnvironmentReading } from './flightPhenomena';

export interface AscentSample { time: number; altitudeM: number; speedMS: number; density: number; qPa: number; dragPowerW: number }
export interface AscentRecordData {
  samples: AscentSample[]; peakQ: AscentSample | null; peakPower: AscentSample | null;
  latest: AscentSample | null; status: 'waiting' | 'recording' | 'cutoff' | 'stopped'; sampleIntervalS: number;
}
/** Observes every committed physical step. Kept outside FlightState and reconstructed from the journal. */
export class AscentRecord {
  private data: AscentRecordData = { samples: [], peakQ: null, peakPower: null, latest: null, status: 'waiting', sampleIntervalS: 1 };
  observe(state: FlightState) {
    const d = this.data;
    if (d.status === 'cutoff' || d.status === 'stopped' || state.phase === 'ready') return;
    const r = flightEnvironmentReading(state);
    const point: AscentSample = { time: state.time, altitudeM: r.altitudeM, speedMS: r.airSpeedMS, density: r.density, qPa: r.dynamicPressurePa, dragPowerW: r.dragPowerW };
    d.latest = point; d.status = 'recording';
    if (point.qPa > (d.peakQ?.qPa ?? 0)) d.peakQ = point;
    if (point.dragPowerW > (d.peakPower?.dragPowerW ?? 0)) d.peakPower = point;
    if (!d.samples.length || point.time - d.samples.at(-1)!.time >= d.sampleIntervalS - 1e-8) d.samples.push(point);
    // The curve is bounded; exact peak samples are never discarded with curve decimation.
    if (d.samples.length > 2048) { d.samples = d.samples.filter((_, i) => i % 2 === 0); d.sampleIntervalS *= 2; }
    if (state.orbit?.cutoff) d.status = 'cutoff';
    else if (state.phase === 'aborted' || state.phase.endsWith('-failed')) d.status = 'stopped';
  }
  snapshot(): AscentRecordData { return structuredClone(this.data); }
}

/** Exact peaks and the latest endpoint are added to the display curve, without replacing the physics. */
export function ascentCurve(record: AscentRecordData): AscentSample[] {
  const points = new Map<number, AscentSample>();
  for (const point of [...record.samples, record.latest, record.peakQ, record.peakPower]) if (point) points.set(point.time, point);
  return [...points.values()].sort((a, b) => a.time - b.time);
}
