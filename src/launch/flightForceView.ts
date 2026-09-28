import * as THREE from 'three';
import { flightForces, FORCE_KINDS } from './flightForces';
import type { FlightState } from './liftoff';

/** Teaching arrows in the live 3D scene. Offset origins for legibility, not actual application points. */
export function createFlightForceView() {
  const root = new THREE.Group(); root.visible = false;
  const shaftGeometry = new THREE.CylinderGeometry(.28, .28, 1, 12), headGeometry = new THREE.ConeGeometry(1.25, 1, 16);
  const arrows = FORCE_KINDS.map(kind => {
    const group = new THREE.Group(), material = new THREE.MeshBasicMaterial({ color: kind.color, depthTest: false, depthWrite: false, toneMapped: false });
    const shaft = new THREE.Mesh(shaftGeometry, material), head = new THREE.Mesh(headGeometry, material);
    shaft.renderOrder = head.renderOrder = 100; shaft.frustumCulled = head.frustumCulled = false;
    group.add(shaft, head); root.add(group); return { group, shaft, head };
  });
  const y = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3(), direction = new THREE.Vector3();
  return { root, update(state: FlightState, center: THREE.Vector3, camera: THREE.Camera, visible: boolean) {
    root.visible = visible; if (!visible) return;
    root.position.copy(center); right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    // Keep the longest arrow inside a close camera's vertical field of view, with one common scale.
    const height = camera instanceof THREE.PerspectiveCamera ? 2 * camera.position.distanceTo(center) * Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2) : Infinity;
    root.scale.setScalar(Math.min(1, Math.max(.001, height * .25 / 36)));
    flightForces(state).forEach((force, i) => {
      const arrow = arrows[i]; arrow.group.visible = force.drawn; if (!force.drawn) return;
      const length = force.arrowLengthM, headLength = Math.min(3.2, length * .35), shaftLength = length - headLength;
      arrow.group.position.copy(right).multiplyScalar((i - 1.5) * 12);
      arrow.group.quaternion.setFromUnitVectors(y, direction.fromArray(force.localN).normalize());
      arrow.shaft.scale.y = shaftLength; arrow.shaft.position.y = shaftLength / 2;
      arrow.head.scale.set(Math.min(1, length / 6), headLength, Math.min(1, length / 6)); arrow.head.position.y = shaftLength + headLength / 2;
    });
  } };
}
