import * as THREE from 'three';
import type { ObjectState } from '../ephemeris/stateProvider';
import { AU_KM } from '../data/catalog';

export const PLUTO_GM = 869.3;
export const CHARON_GM = 106.1;
/** Approximate pair barycenter from JPL PLU060 GM; both input vectors share one frame and unit. */
export function plutoCharonBarycenter(pluto: THREE.Vector3, charon: THREE.Vector3): THREE.Vector3 {
  return pluto.clone().multiplyScalar(PLUTO_GM).addScaledVector(charon, CHARON_GM).divideScalar(PLUTO_GM+CHARON_GM);
}

const toScene = (vector: THREE.Vector3) => vector.set(vector.x/AU_KM, vector.z/AU_KM, -vector.y/AU_KM);

/** A two-body reference conic at the current instant, never a future JPL track. */
export function dwarfReferenceOrbit(target: ObjectState, parent: ObjectState, muKm3S2: number): THREE.Vector3[] {
  const r = new THREE.Vector3(...target.position).sub(new THREE.Vector3(...parent.position));
  const v = new THREE.Vector3(...target.velocity).sub(new THREE.Vector3(...parent.velocity));
  const h = r.clone().cross(v);
  const eccentricityVector = v.clone().cross(h).divideScalar(muKm3S2).sub(r.clone().normalize());
  const e = eccentricityVector.length();
  const a = 1/(2/r.length()-v.lengthSq()/muKm3S2);
  if (!Number.isFinite(a) || a <= 0 || e >= .99 || h.lengthSq() === 0) return [];
  const p = e > 1e-7 ? eccentricityVector.normalize() : r.clone().normalize();
  const q = h.normalize().cross(p);
  return Array.from({ length: 361 }, (_, index) => {
    const angle = index/360*Math.PI*2;
    const radius = a*(1-e*e)/(1+e*Math.cos(angle));
    return toScene(p.clone().multiplyScalar(radius*Math.cos(angle)).addScaledVector(q, radius*Math.sin(angle)));
  });
}
