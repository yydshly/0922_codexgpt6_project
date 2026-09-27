import * as THREE from 'three';
import { BODY_IDS, type StateFrame, type Vec3 } from '../types';
import { bodyById } from './catalog';
import { satelliteById } from './satellites';
import type { SatelliteState } from '../ephemeris/satellites';

export type ImmersiveFamily = 'earth' | 'saturn';
export const IMMERSIVE_SATURN_MOONS = ['enceladus', 'rhea', 'titan'] as const;
export interface FamilyMember {
  id: string; name: string; parent: boolean; radiusKm: number; periodDays: number;
  position: THREE.Vector3; velocity: THREE.Vector3; distanceKm: number; speedKmS: number;
  sourceUrl: string; appearance: string; color: string;
}

/** Relative ECLIPJ2000 km -> scene x,z,-y, in parent mean radii. No distance compression. */
export function familyPosition(position: Vec3, parent: ImmersiveFamily) {
  return new THREE.Vector3(position[0], position[2], -position[1]).divideScalar(bodyById[parent].radiusKm);
}

export function immersiveFamilyMembers(parent: ImmersiveFamily, frame: StateFrame, satellites: SatelliteState[]): FamilyMember[] {
  const body = bodyById[parent];
  const members: FamilyMember[] = [{ id: parent, name: body.name, parent: true, radiusKm: body.radiusKm,
    periodDays: body.orbitalPeriodDays, position: new THREE.Vector3(), velocity: new THREE.Vector3(), distanceKm: 0, speedKmS: 0,
    sourceUrl: body.sourceUrl, appearance: 'rock', color: body.color }];
  if (parent === 'earth') {
    const i = BODY_IDS.indexOf('earth') * 3, j = BODY_IDS.indexOf('moon') * 3;
    const relative = [0, 1, 2].map(k => frame.positions[j + k] - frame.positions[i + k]) as Vec3;
    const velocity = [0, 1, 2].map(k => frame.velocities[j + k] - frame.velocities[i + k]) as Vec3;
    const moon = bodyById.moon;
    members.push({ id: 'moon', name: moon.name, parent: false, radiusKm: moon.radiusKm,
      periodDays: moon.orbitalPeriodDays, position: familyPosition(relative, parent), velocity: familyPosition(velocity, parent), distanceKm: Math.hypot(...relative),
      speedKmS: Math.hypot(...velocity), sourceUrl: moon.sourceUrl, appearance: 'rock', color: moon.color });
  } else {
    // Do not fabricate missing samples or import a moon from another parent.
    for (const id of IMMERSIVE_SATURN_MOONS) {
      const state = satellites.find(s => s.id === id);
      if (!state) continue;
      const moon = satelliteById[id];
      members.push({ id, name: moon.name, parent: false, radiusKm: moon.radiusKm, periodDays: moon.orbitalPeriodDays,
        position: familyPosition(state.position, parent), velocity: familyPosition(state.velocity, parent), distanceKm: Math.hypot(...state.position), speedKmS: Math.hypot(...state.velocity),
        sourceUrl: moon.sourceUrl, appearance: moon.appearance, color: moon.color });
    }
  }
  return members;
}

export function familyEnlargement(parent: ImmersiveFamily) { return parent === 'earth' ? 2 : 16; }
export function familyRadius(member: FamilyMember, parent: ImmersiveFamily, enlarged: boolean) {
  return member.radiusKm / bodyById[parent].radiusKm * (enlarged && !member.parent ? familyEnlargement(parent) : 1);
}

/** Camera-only envelope around the current orbital plane, never rendered as a trajectory. */
export function familyMotionBounds(members: FamilyMember[], parent: ImmersiveFamily) {
  const bounds = [{ position: new THREE.Vector3(), radius: parent === 'saturn' ? 2.4 : 1.04 }];
  for (const member of members.filter(m => !m.parent)) {
    const x = member.position.clone().normalize();
    const normal = new THREE.Vector3().crossVectors(member.position, member.velocity).normalize();
    const y = new THREE.Vector3().crossVectors(normal, x).normalize();
    const distance = member.position.length() * 1.15;
    if (y.lengthSq() < .5) { bounds.push({ position: new THREE.Vector3(), radius: distance }); continue; }
    for (let i = 0; i < 72; i++) {
      const angle = i * 2 * Math.PI / 72;
      bounds.push({ position: x.clone().multiplyScalar(distance * Math.cos(angle)).addScaledVector(y, distance * Math.sin(angle)), radius: familyRadius(member, parent, true) * 1.04 });
    }
  }
  return bounds;
}

export interface FamilyViewport { width: number; height: number; left: number; right: number; top: number; bottom: number }
export function familyViewport(width: number, height: number): FamilyViewport {
  // Reserve the story and footer, without shrinking the underlying WebGL canvas.
  return width > 800
    ? { width, height, left: Math.min(400, width * .36), right: width - 70, top: 165, bottom: Math.max(250, height - 230) }
    : { width, height, left: 30, right: width - 30, top: Math.min(340, height * .43), bottom: Math.max(height * .57, height - 275) };
}

/** View direction perpendicular to the Earth-Moon separation prevents an end-on opening view. */
export function familyViewDirection(parent: ImmersiveFamily, members: FamilyMember[], sun: THREE.Vector3, pole: THREE.Vector3) {
  if (parent === 'saturn') return pole.clone().multiplyScalar(.8).add(sun.clone().addScaledVector(pole, -sun.dot(pole)).normalize()).normalize();
  const separation = members.find(m => !m.parent)?.position.clone().normalize() ?? new THREE.Vector3(1, 0, 0);
  const direction = sun.clone().addScaledVector(separation, -sun.dot(separation));
  if (direction.lengthSq() < .01) direction.copy(pole).addScaledVector(separation, -pole.dot(separation));
  if (direction.lengthSq() < .01) direction.crossVectors(separation, new THREE.Vector3(1, 1, 0));
  return direction.normalize();
}

/** Fit physical bounds into the actual unobstructed screen rectangle, including portrait screens. */
export function fitFamilyCamera(bounds: { position: THREE.Vector3; radius: number }[], direction: THREE.Vector3, up: THREE.Vector3, viewport: FamilyViewport, fov = 42) {
  const box = new THREE.Box3();
  bounds.forEach(b => { const r = new THREE.Vector3().setScalar(b.radius); box.expandByPoint(b.position.clone().sub(r)); box.expandByPoint(b.position.clone().add(r)); });
  const target = box.getCenter(new THREE.Vector3());
  const z = direction.clone().normalize();
  const right = new THREE.Vector3().crossVectors(up, z);
  if (right.lengthSq() < 1e-10) right.crossVectors(new THREE.Vector3(1, 0, 0), z);
  right.normalize();
  const cameraUp = new THREE.Vector3().crossVectors(z, right).normalize();
  const tangent = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const tanX = tangent * Math.max(30, viewport.right - viewport.left) / viewport.height;
  const tanY = tangent * Math.max(30, viewport.bottom - viewport.top) / viewport.height;
  let distance = .01;
  for (const bound of bounds) {
    const point = bound.position.clone().sub(target), depth = point.dot(z);
    distance = Math.max(distance, depth + Math.abs(point.dot(right)) / tanX + bound.radius * Math.sqrt(1 + 1 / (tanX * tanX)),
      depth + Math.abs(point.dot(cameraUp)) / tanY + bound.radius * Math.sqrt(1 + 1 / (tanY * tanY)));
  }
  return { target, position: target.clone().addScaledVector(z, distance * 1.1), up: cameraUp, fov };
}
