/** Scientific coordinates: ECLIPJ2000, km and km/s; time = TDB seconds past J2000. */
export const BODY_IDS = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;
export type BodyId = typeof BODY_IDS[number];
export type Vec3 = [number, number, number];
export interface BodyDefinition {
  id: BodyId; name: string; englishName: string; kind: 'star' | 'planet' | 'moon';
  color: string; radiusKm: number; gm: number; massKg: number;
  rotationHours: number; orbitalPeriodDays: number; obliquityDeg: number;
  semiMajorAxisAu: number; description: string; fact: string;
  texture?: string; sourceUrl: string;
  /** Orientation model relative to ICRF equator, angles in degrees at J2000. */
  poleRaDeg?: number; poleDecDeg?: number; primeMeridianDeg?: number;
  /** IAU prime-meridian rate, avoids accumulating rounded period errors. */
  rotationRateDegPerDay?: number;
  /** Center id used for authoritative display; integration may use a system barycenter. */
  displayNaifId: number; simulationNaifId: number; simulationGm: number;
}
export interface StateFrame {
  time: number;
  /** xyz ordered as BODY_IDS, length 30. */
  positions: Float64Array;
  velocities: Float64Array;
}
export type SimulationMode = 'ephemeris' | 'physics';
export type CameraView = 'overview' | 'inner' | 'outer' | 'earth-moon' | 'pluto-charon' | 'follow' | 'comparison';
export interface ViewOptions {
  view: CameraView; exaggerated: boolean; trajectories: boolean;
  referencePlane: boolean; velocityVectors: boolean; belts: boolean; scale: boolean;
  comparisonSet?: 'planets' | 'rocky' | 'all';
  presentation?: 'spatial' | 'physical';
  earthClouds?: boolean;
  earthAtmosphere?: boolean;
  cameraAngle?: 'perspective' | 'top';
  cameraOrbit?: boolean;
}
export interface EphemerisManifest {
  version: string; source: string; sourceUrl: string; generatedAt: string;
  startUtc: string; endUtc: string; startTdb: number; endTdb: number;
  frame: string; units: string; timeScale: string;
  bodyIds: readonly BodyId[];
  [key: string]: unknown;
}
export interface ValidationPoint {
  day: number;
  /** Magnitudes in km and km/s, ordered as BODY_IDS. */
  positionKm: number[]; velocityKmS: number[];
  numericalPositionKm: number[];
  numericalVelocityKmS?: number[];
  referenceRefinementPositionKm?: number[];
  modelPositionKm?: number[];
  modelVelocityKmS?: number[];
}
export interface ValidationReport {
  generatedAt: string; epochUtc: string; epochTdb: number;
  steps: number[]; points: ValidationPoint[];
  summary: Record<string, unknown>;
  notes: string[];
  [key: string]: unknown;
}
