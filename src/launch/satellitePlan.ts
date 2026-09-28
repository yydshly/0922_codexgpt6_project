/** Original teaching hardware, not the specification of a real satellite. */
export type SatellitePlan = 'unpowered' | 'powered';
export const DISPOSAL_KIT = { dryKg: 35, fuelKg: 40, thrustN: 200, ispS: 220, cdArea: 4.4, noseM: .5, targetPerigeeM: 60000, alignS: 12, maxBurnS: 600, residualFuelKg: .1, passivationS: 120 } as const;
export interface SatelliteEquipment { kind: 'powered'; busKg: 250 | 500; dryKg: number; initialFuelKg: number; fuelKg: number; thrustN: number; ispS: number }
export const satellitePlan = (v: { satellitePlan?: SatellitePlan }) => v.satellitePlan ?? 'unpowered';
export const satelliteWetKg = (v: { payloadKg: number; satellitePlan?: SatellitePlan }) => v.payloadKg + (satellitePlan(v) === 'powered' ? DISPOSAL_KIT.dryKg + DISPOSAL_KIT.fuelKg : 0);
export const satelliteName = (s: { satelliteEquipment?: SatelliteEquipment }) => s.satelliteEquipment ? 'E02' : 'E01';
export const satelliteEquipment = (busKg: 250 | 500): SatelliteEquipment => ({ kind: 'powered', busKg, dryKg: busKg + DISPOSAL_KIT.dryKg, initialFuelKg: DISPOSAL_KIT.fuelKg, fuelKg: DISPOSAL_KIT.fuelKg, thrustN: DISPOSAL_KIT.thrustN, ispS: DISPOSAL_KIT.ispS });
