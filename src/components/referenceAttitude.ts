import * as THREE from 'three';
import type {BodyDefinition} from '../types';
const RAD=Math.PI/180;
/** Signed period of the linear W model, not a weather/cloud rotation period. */
export const renderedRotationHours=(body:BodyDefinition)=>8640/(body.rotationRateDegPerDay??8640/body.rotationHours);
/** IAU reference attitude: ICRF pole transformed into the agreed ECLIPJ2000 scene axes. */
export function referenceAttitude(body: BodyDefinition, time: number, out = new THREE.Quaternion()): THREE.Quaternion {
  const alpha = (body.poleRaDeg ?? 0) * RAD, delta = (body.poleDecDeg ?? 90) * RAD;
  const w = ((body.primeMeridianDeg ?? 0) + time / 86400 * (body.rotationRateDegPerDay ?? 8640 / body.rotationHours)) % 360 * RAD;
  const pole = new THREE.Vector3(Math.cos(delta) * Math.cos(alpha), Math.cos(delta) * Math.sin(alpha), Math.sin(delta));
  const q = new THREE.Vector3(-Math.sin(alpha), Math.cos(alpha), 0);
  const u = new THREE.Vector3().crossVectors(pole, q);
  const x = q.clone().multiplyScalar(Math.cos(w)).addScaledVector(u, Math.sin(w));
  const west = q.clone().multiplyScalar(Math.sin(w)).addScaledVector(u, -Math.cos(w));
  const transform = (v: THREE.Vector3) => {
    const eps = 23.439291111 * RAD;
    const y = v.y * Math.cos(eps) + v.z * Math.sin(eps);
    const z = -v.y * Math.sin(eps) + v.z * Math.cos(eps);
    return v.set(v.x, z, -y);
  };
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(transform(x), transform(pole), transform(west)));
}
