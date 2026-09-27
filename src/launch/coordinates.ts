import { Matrix4, Quaternion, Vector3 } from 'three';
import { LAUNCH_EARTH, LAUNCH_SITE } from '../data/launchMission';
import { bodyById } from '../data/catalog';
import { referenceAttitude } from '../components/referenceAttitude';

const RAD = Math.PI / 180;
const a = LAUNCH_EARTH.semiMajorM, f = 1 / LAUNCH_EARTH.inverseFlattening, e2 = f * (2 - f);
export const EARTH_POLAR_M = a * (1 - f);
export interface Geodetic { latitudeDeg: number; longitudeDeg: number; altitudeM: number }

/** WGS84 geodetic -> conventional ECEF, metres; east-positive longitude. */
export function geodeticToFixed({ latitudeDeg, longitudeDeg, altitudeM }: Geodetic) {
  if (![latitudeDeg, longitudeDeg, altitudeM].every(Number.isFinite) || Math.abs(latitudeDeg) > 90 || Math.abs(longitudeDeg) > 180) throw new Error('Invalid geodetic coordinate');
  const lat = latitudeDeg * RAD, lon = longitudeDeg * RAD, n = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  return new Vector3((n + altitudeM) * Math.cos(lat) * Math.cos(lon), (n + altitudeM) * Math.cos(lat) * Math.sin(lon), (n * (1 - e2) + altitudeM) * Math.sin(lat));
}

export function fixedToGeodetic(p: Vector3): Geodetic {
  const horizontal = Math.hypot(p.x, p.y);
  if (!Number.isFinite(p.length()) || p.length() < 1) throw new Error('Invalid Earth fixed position');
  if (horizontal < 1e-9) return { latitudeDeg: p.z < 0 ? -90 : 90, longitudeDeg: 0, altitudeM: Math.abs(p.z) - EARTH_POLAR_M };
  let latitude = Math.atan2(p.z, horizontal * (1 - e2));
  for (let i = 0; i < 12; i++) {
    const n = a / Math.sqrt(1 - e2 * Math.sin(latitude) ** 2);
    latitude = Math.atan2(p.z + e2 * n * Math.sin(latitude), horizontal);
  }
  const n = a / Math.sqrt(1 - e2 * Math.sin(latitude) ** 2);
  return { latitudeDeg: latitude / RAD, longitudeDeg: Math.atan2(p.y, p.x) / RAD, altitudeM: horizontal / Math.cos(latitude) - n };
}

/** Local drawing coordinates: +X east, +Y ellipsoid normal, +Z south, in metres. */
export function baseBasis(site: Geodetic = LAUNCH_SITE) {
  const lat = site.latitudeDeg * RAD, lon = site.longitudeDeg * RAD;
  const east = new Vector3(-Math.sin(lon), Math.cos(lon), 0);
  const up = new Vector3(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
  const south = new Vector3().crossVectors(east, up);
  return { east, up, south, origin: geodeticToFixed(site) };
}
export function localToFixed(local: Vector3, site: Geodetic = LAUNCH_SITE) {
  const b = baseBasis(site);
  return b.origin.addScaledVector(b.east, local.x).addScaledVector(b.up, local.y).addScaledVector(b.south, local.z);
}
export function fixedToLocal(p: Vector3, site: Geodetic = LAUNCH_SITE) {
  const b = baseBasis(site), relative = p.clone().sub(b.origin);
  return new Vector3(relative.dot(b.east), relative.dot(b.up), relative.dot(b.south));
}

/** Same linear IAU reference attitude as the observatory, not UT1/EOP navigation orientation. */
export function fixedToScene(p: Vector3, time: number) { return new Vector3(p.x, p.z, -p.y).applyQuaternion(referenceAttitude(bodyById.earth, time)); }
export function sceneToFixed(p: Vector3, time: number) { const v = p.clone().applyQuaternion(referenceAttitude(bodyById.earth, time).invert()); return new Vector3(v.x, -v.z, v.y); }
export function sceneDirectionToLocal(direction: Vector3, time: number) {
  const fixed = sceneToFixed(direction, time), b = baseBasis();
  return new Vector3(fixed.dot(b.east), fixed.dot(b.up), fixed.dot(b.south)).normalize();
}
export function baseOrientation(time: number): Quaternion {
  const b = baseBasis();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(fixedToScene(b.east, time), fixedToScene(b.up, time), fixedToScene(b.south, time)));
}
