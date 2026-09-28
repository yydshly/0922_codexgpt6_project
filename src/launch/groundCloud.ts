import type { FlightState } from './liftoff';

/** Deterministic teaching puffs, fixed to the launch pad, not a weather or combustion simulation. */
export function groundCloudTiming(state: FlightState | null) {
  const ignition = state?.events.find(event => event.label === '发动机点火，建立推力');
  if (!state || !ignition) return { ageS: -1, emissionS: 0 };
  const stop = state.phase === 'aborted' ? state.time : Infinity;
  return { ageS: state.time - ignition.time, emissionS: Math.max(0, Math.min(8, stop - ignition.time)) };
}
export function groundCloudPuff(ageS: number, emissionS: number, index: number) {
  // Fixed birth slots keep already emitted puffs in place if emission stops early.
  const bornAt = index / 80 * 8, age = ageS - bornAt;
  if (bornAt >= emissionS || age <= 0 || age >= 65) return { radius: 0, height: 0, diameter: 0, opacity: 0 };
  const fade = Math.max(0, Math.min(1, (65 - age) / 40));
  return { radius: 4 + Math.sqrt(age) * 9, height: 5 + age * .45, diameter: 7 + Math.sqrt(age) * 4,
    opacity: Math.min(1, age / 2) * fade * fade * (3 - 2 * fade) };
}
