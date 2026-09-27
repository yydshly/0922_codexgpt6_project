import * as THREE from 'three';
import { BODY_IDS, type StateFrame } from '../types';
import { bodyById } from '../data/catalog';
import { familyRadius, type FamilyMember, type ImmersiveFamily } from '../data/immersiveFamilies';
import { makePlanetMaterial } from './celestialMaterials';
import { makeAtlasMesh } from './celestialEffects';
import { bindSatelliteSunlight } from './satelliteLighting';
import { referenceAttitude } from './referenceAttitude';

/** Scene owns these independently created geometries/materials and disposes them with the parent. */
export function createImmersiveFamily(members: FamilyMember[], parent: ImmersiveFamily, frame: StateFrame, loader: THREE.TextureLoader) {
  const root = new THREE.Group(), connections = new THREE.Group();
  const objects = new Map<string, THREE.Object3D>();
  const links = new Map<string, THREE.Line>();
  let currentMembers = members;
  const i = BODY_IDS.indexOf(parent) * 3, p = frame.positions, radius = bodyById[parent].radiusKm;
  for (const member of members.filter(m => !m.parent)) {
    const sun = new THREE.Vector3(p[0] - p[i], p[2] - p[i + 2], -(p[1] - p[i + 1])).addScaledVector(member.position, -radius).normalize();
    let object: THREE.Object3D;
    if (member.id === 'moon') {
      const material = makePlanetMaterial(bodyById.moon, loader);
      material.uniforms.sunDirection.value.copy(sun);
      object = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), material);
      referenceAttitude(bodyById.moon, frame.time, object.quaternion);
    } else {
      object = makeAtlasMesh(member);
      bindSatelliteSunlight(object).direction.copy(sun);
    }
    object.name = `immersive-family:${member.id}`;
    object.position.copy(member.position);
    root.add(object); objects.set(member.id, object);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), member.position]),
      new THREE.LineDashedMaterial({ color: '#99b3bf', transparent: true, opacity: .32, dashSize: .3, gapSize: .25, depthWrite: false }));
    line.computeLineDistances(); connections.add(line); links.set(member.id, line);
  }
  root.add(connections);
  const ambient = new THREE.AmbientLight('#d1dcff', .16); root.add(ambient);
  return {
    root,
    sync(nextMembers: FamilyMember[], nextFrame: StateFrame) {
      currentMembers = nextMembers;
      const positions = nextFrame.positions;
      for (const member of nextMembers.filter(m => !m.parent)) {
        const object = objects.get(member.id);
        if (!object) continue;
        object.position.copy(member.position);
        const sun = new THREE.Vector3(positions[0] - positions[i], positions[2] - positions[i + 2], -(positions[1] - positions[i + 1])).addScaledVector(member.position, -radius).normalize();
        if (member.id === 'moon') {
          referenceAttitude(bodyById.moon, nextFrame.time, object.quaternion);
          (object as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>).material.uniforms.sunDirection.value.copy(sun);
        } else {
          bindSatelliteSunlight(object).direction.copy(sun);
          object.quaternion.copy(immersiveSatelliteAttitude(member));
        }
        const line = links.get(member.id)!;
        const attribute = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        attribute.setXYZ(1, member.position.x, member.position.y, member.position.z); attribute.needsUpdate = true;
        line.geometry.computeBoundingSphere(); line.computeLineDistances();
      }
    },
    update(enlarged: boolean, lines: boolean, fill: boolean) {
      for (const member of currentMembers.filter(m => !m.parent)) objects.get(member.id)!.scale.setScalar(familyRadius(member, parent, enlarged));
      connections.visible = lines; ambient.intensity = fill ? .16 : .008;
      root.traverse(object => {
        const material = (object as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
        if (material?.uniforms?.presentationLight) material.uniforms.presentationLight.value = fill ? .55 : 0;
        if (material?.uniforms?.ambientLevel) material.uniforms.ambientLevel.value = fill ? .018 : .002;
      });
    },
  };
}

/** Hide labels behind another body's opaque sphere. Locator sizes never stand in for body sizes. */
export function familyMemberVisible(member: FamilyMember, members: FamilyMember[], camera: THREE.PerspectiveCamera, parent: ImmersiveFamily, enlarged: boolean) {
  const ray = new THREE.Ray(camera.position, member.position.clone().sub(camera.position).normalize());
  const distance = camera.position.distanceTo(member.position);
  for (const other of members) {
    if (other.id === member.id) continue;
    const hit = ray.intersectSphere(new THREE.Sphere(other.position, familyRadius(other, parent, enlarged)), new THREE.Vector3());
    if (hit && hit.distanceTo(camera.position) < distance) return false;
  }
  const projected = member.position.clone().project(camera);
  return projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1;
}

/** Simplified synchronous spin: local +X faces the parent; pole follows r×v. No measured surface longitude. */
export function immersiveSatelliteAttitude(member: FamilyMember) {
  const x = member.position.clone().negate().normalize();
  const y = new THREE.Vector3().crossVectors(member.position, member.velocity).normalize();
  if (x.lengthSq() < .5 || y.lengthSq() < .5) return new THREE.Quaternion();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
