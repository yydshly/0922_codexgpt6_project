import { rotateEarth, surfaceAt, type V3 } from './ascent';
import type { BoosterRecord, BoosterSample } from './boosterDescent';

export const BOOSTER_PLAYBACK_RATES = [5, 20, 50] as const;
export type BoosterPlaybackRate = typeof BOOSTER_PLAYBACK_RATES[number];

/** Presentation only. Never advances a FlightSession or extrapolates beyond recorded states. */
export function boosterPlaybackSample(record: BoosterRecord, requested: number): BoosterSample {
  const points = record.samples, first = points[0] ?? record.latest;
  if (!Number.isFinite(requested)) return first;
  if (requested <= first.time) return first;
  if (requested >= record.latest.time) return record.latest;
  let low = 0, high = points.length;
  while (low < high) { const mid = (low + high) >>> 1; if (points[mid].time <= requested) low = mid + 1; else high = mid; }
  const a = points[Math.max(0, low - 1)] ?? first, b = points[low] ?? record.latest;
  const dt = b.time - a.time;
  if (dt <= 0 || requested === a.time) return a;
  const t = (requested - a.time) / dt, t2 = t * t, t3 = t2 * t;
  // Hermite interpolation uses the recorded inertial velocity; Earth-fixed points are reconstructed at this time.
  const position = a.position.map((v, i) => (2*t3-3*t2+1)*v + (t3-2*t2+t)*dt*a.velocity[i] + (-2*t3+3*t2)*b.position[i] + (t3-t2)*dt*b.velocity[i]) as V3;
  const velocity = a.position.map((v, i) => ((6*t2-6*t)*v + (3*t2-4*t+1)*dt*a.velocity[i] + (-6*t2+6*t)*b.position[i] + (3*t2-2*t)*dt*b.velocity[i])/dt) as V3;
  const mix = (x:number,y:number) => x + (y-x)*t;
  const nullable = (x:number|null,y:number|null) => x === null || y === null ? null : mix(x,y);
  return {...a,time:requested,position,velocity,fixedPosition:rotateEarth(position,-requested),fixedDirection:rotateEarth(rotateEarth(a.fixedDirection,a.time),-requested),altitudeM:surfaceAt(position).height,
    verticalMS:mix(a.verticalMS,b.verticalMS),airSpeedMS:mix(a.airSpeedMS,b.airSpeedMS),density:mix(a.density,b.density),pressurePa:mix(a.pressurePa,b.pressurePa),dragN:mix(a.dragN,b.dragN),qPa:mix(a.qPa,b.qPa),
    temperatureK:nullable(a.temperatureK,b.temperatureK),mach:nullable(a.mach,b.mach),heatFluxWm2:nullable(a.heatFluxWm2,b.heatFluxWm2)};
}

export function advanceBoosterPlayback(time:number,wallSeconds:number,rate:BoosterPlaybackRate,end:number) {
  return Math.min(end,time + Math.max(0,Math.min(.25,Number.isFinite(wallSeconds)?wallSeconds:0))*rate);
}
