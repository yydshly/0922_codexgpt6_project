import type { FlightState } from './liftoff';
import type { SatellitePlan } from './satellitePlan';

/** Only completed, actually computed demonstrations become comparison results. */
export interface DemoResult {
  plan: SatellitePlan; baseTime: number; time: number; satelliteAltitudeM: number;
  deliveredMB: number; batteryWh: number; burnedKg: number; remainingFuelKg: number | null;
  carrierTime: number | null; carrierAltitudeM: number | null;
}
export function completedDemoResult(s: FlightState, baseTime: number): DemoResult | null {
  if (!['life-observed', 'disposal-complete'].includes(s.phase) || !s.deployment || !s.operations) return null;
  return {
    plan: s.satelliteDisposal ? 'powered' : 'unpowered', baseTime, time: s.time,
    satelliteAltitudeM: s.deployment.satellite.altitudeM, deliveredMB: s.operations.deliveredMB,
    batteryWh: s.operations.energyJ / 3600, burnedKg: s.satelliteDisposal?.burnedKg ?? 0,
    remainingFuelKg: s.satelliteEquipment?.fuelKg ?? null,
    carrierTime: s.operations.carrierRecordTime ?? null,
    carrierAltitudeM: s.reentry?.outcome === 'surface-reference' ? s.deployment.carrier.altitudeM : null,
  };
}
