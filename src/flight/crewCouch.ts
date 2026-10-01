import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type CrewCouchPoint = readonly [number, number, number];

const backLength = Math.hypot(.53, .13);
const shinForward = .5 * (.02 / .70);

/** Capsule coordinates: the nose is -Z, the heat shield/base is +Z, cabin-up is +Y. */
export const CREW_COUCH_POSE = {
  hip: [0, .65, -2.35],
  shoulders: [[-.28, 1.18, -2.48], [.28, 1.18, -2.48]],
  head: [0, 1.58, -2.65],
  eye: [0, 1.58, -2.87],
  knees: [[-.20, .67, -3.05], [.20, .67, -3.05]],
  ankles: [[-.20, .17, -3.05 - shinForward], [.20, .17, -3.05 - shinForward]],
  boots: [[-.20, .155, -3.15 - shinForward], [.20, .155, -3.15 - shinForward]],
  elbows: [[-.57, .89, -2.72], [.57, .89, -2.72]],
  hands: [[-.76, 1.03, -3.12], [.76, 1.03, -3.12]],
  torsoDirection: [0, .53 / backLength, -.13 / backLength],
  chestDirection: [0, -.13 / backLength, -.53 / backLength],
  backDirection: [0, .13 / backLength, .53 / backLength],
  axialSeatLoadDirection: [0, 0, 1],
  gazeDirection: [0, 0, -1],
  cabinUp: [0, 1, 0],
} as const;

export const crewCouchEye = () => new THREE.Vector3(...CREW_COUCH_POSE.eye);

/** A shaped acceleration couch, fitted around the matching avatar's fixed pose. */
export function makeCrewCouch() {
  const group = new THREE.Group(); group.name = 'crew-acceleration-couch';
  group.userData.pose = 'crew-couch';
  const frame = new THREE.MeshStandardMaterial({color: '#69767b', metalness: .6, roughness: .48});
  const padding = new THREE.MeshStandardMaterial({color: '#3b4749', roughness: .94});
  const webbing = new THREE.MeshStandardMaterial({color: '#263d46', roughness: .94});
  const buckle = new THREE.MeshStandardMaterial({color: '#9ba7a9', metalness: .76, roughness: .36});
  const mesh = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, point: CrewCouchPoint) => {
    const object = new THREE.Mesh(geometry, material); object.name = name; object.position.set(...point);
    object.castShadow = true; object.receiveShadow = true; group.add(object); return object;
  };
  const box = (name: string, width: number, height: number, depth: number, material: THREE.Material, point: CrewCouchPoint) =>
    mesh(name, new RoundedBoxGeometry(width, height, depth, 2, Math.min(.03, width / 5, height / 5, depth / 5)), material, point);
  const span = (name: string, a: CrewCouchPoint, b: CrewCouchPoint, width: number, depth: number, material: THREE.Material) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const object = box(name, width, direction.length(), depth, material, from.clone().add(to).multiplyScalar(.5).toArray() as [number, number, number]);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return object;
  };

  // The torso lies transverse to the nose axis: +Z inertial load presses into this backrest.
  span('crew-couch-back-shell', [0, .72, -2.04], [0, 1.25, -2.17], .88, .13, frame);
  span('crew-couch-back-padding', [0, .70, -2.14], [0, 1.23, -2.27], .75, .13, padding);
  span('crew-couch-head-support', [0, 1.18, -2.14], [0, 1.59, -2.29], .70, .10, frame);
  box('crew-couch-pelvis-pan', .72, .13, .50, padding, [0, .455, -2.35]);
  box('crew-couch-head-restraint', .62, .50, .15, padding, [0, 1.58, -2.345]);
  for (const [index, side] of [-1, 1].entries()) {
    const label = side < 0 ? 'left' : 'right';
    box(`crew-couch-head-${label}-bolster`, .12, .40, .35, padding, [side * .31, 1.55, -2.52]);
    span(`crew-couch-${label}-side-rail`, [side * .43, .70, -2.14], [side * .43, 1.23, -2.27], .065, .065, frame);
    span(`crew-couch-${label}-thigh-pan`, [side * .2, .495, -2.35], [side * .2, .515, -3.05], .28, .10, padding);
    span(`crew-couch-${label}-calf-support`, [side * .2, .67, -2.925], [side * .2, .17, -2.925 - shinForward], .23, .08, frame);
    const boot = CREW_COUCH_POSE.boots[index];
    box(`crew-couch-${label}-foot-pan`, .27, .06, .37, frame, [side * .2, .055, boot[2]]);
    box(`crew-couch-${label}-heel-stop`, .27, .17, .045, padding, [side * .2, .17, boot[2] + .18]);
    box(`crew-couch-${label}-toe-stop`, .27, .17, .055, padding, [side * .2, .17, boot[2] - .18]);
    box(`crew-couch-${label}-foot-restraint`, .22, .022, .13, webbing, [side * .2, .236, boot[2] - .05]);
    span(`crew-couch-${label}-arm-rest`, [side * .54, .78, -2.70], [side * .76, .92, -3.12], .18, .09, padding);
    span(`crew-couch-${label}-mount`, [side * .35, .06, -2.25], [side * .35, .70, -2.14], .08, .08, frame);

    // Five-point webbing sits on the suit surface and joins at the pelvic release buckle.
    span(`crew-${label}-shoulder-harness`, [side * .19, 1.15, -2.615], [side * .035, .70, -2.58], .075, .018, webbing);
    span(`crew-${label}-lap-harness`, [side * .30, .66, -2.50], [side * .035, .70, -2.58], .075, .018, webbing);
  }
  span('crew-crotch-harness', [0, .55, -2.525], [0, .70, -2.58], .07, .018, webbing);
  box('crew-harness-release-buckle', .12, .075, .06, buckle, [0, .70, -2.585]);

  return {group, eye: crewCouchEye(), pose: CREW_COUCH_POSE};
}
