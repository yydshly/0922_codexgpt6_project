import {localDisplayDistance} from '../data/localDisplayScale';
import * as THREE from 'three';
import { AU_KM } from '../data/catalog';
import type { BodyId, Vec3 } from '../types';

/** Counts the observed sample, including the Moon in the main ten-body catalog. */
export function satelliteFamilyCounts(satellites: readonly { parentId: BodyId }[]): Partial<Record<BodyId, number>> {
  const counts: Partial<Record<BodyId, number>> = { earth: 1 };
  for (const satellite of satellites) counts[satellite.parentId] = (counts[satellite.parentId] ?? 0) + 1;
  return counts;
}

/** Parent-relative display offset only. Scientific state arrays are never changed. */
export function overviewSatelliteOffset(positionKm: Vec3, parentRadiusKm: number, parentDisplayRadius: number, spatial: boolean, clearanceRatio = 0): THREE.Vector3 {
  const offset = new THREE.Vector3(positionKm[0], positionKm[2], -positionKm[1]);
  if (!spatial) return offset.divideScalar(AU_KM);
  const distance = offset.length();
  if (!distance) return offset;
  // A compact satellite family remains attached to its moving parent. Local
  // direction and changing orbital phase are preserved, while radial spacing is compressed.
  // A shared radial clearance keeps enlarged inner moons outside a parent's rings.
  const displayed = parentDisplayRadius * (localDisplayDistance(distance / parentRadiusKm) + clearanceRatio);
  return offset.multiplyScalar(displayed / distance);
}

export function overviewSatelliteRadius(radiusKm: number, parentRadiusKm: number, parentDisplayRadius: number, spatial: boolean): number {
  return spatial ? parentDisplayRadius * .82 * Math.pow(radiusKm / parentRadiusKm, .36) : radiusKm / AU_KM;
}
