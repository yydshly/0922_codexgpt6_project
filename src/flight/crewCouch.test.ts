import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CREW_COUCH_POSE, makeCrewCouch } from './crewCouch';
import { makePilotAvatar } from './pilotAvatar';

const input = { thrust: 1, yaw: 1, pitch: -1, roll: 1, brake: false };

describe('restrained crew acceleration couch', () => {
  it('reclines across the capsule with thighs forward and knees bent through ninety degrees', () => {
    const pilot = makePilotAvatar({mode: 'crew-couch'}), pose = pilot.pose!;
    expect(pilot.head.position.toArray()).toEqual(pose.head);
    expect(pilot.head.userData.poseLandmark).toBe('head');
    expect(pilot.group.getObjectByName('crew-pilot-pelvis')!.userData.poseLandmark).toBe('pelvis');
    for (const [index, side] of [-1, 1].entries()) {
      const hip = new THREE.Vector3(side * .2, pose.hip[1], pose.hip[2]);
      const knee = new THREE.Vector3(...pose.knees[index]), ankle = new THREE.Vector3(...pose.ankles[index]);
      expect(knee.y).toBeGreaterThan(hip.y);
      expect(knee.z).toBeLessThan(hip.z);
      expect(ankle.y).toBeLessThan(knee.y);
      expect(THREE.MathUtils.radToDeg(hip.sub(knee).angleTo(ankle.sub(knee)))).toBeCloseTo(90, 9);
    }
  });

  it('directs axial loading into the backrest rather than along the torso', () => {
    const pilot = makePilotAvatar({mode: 'crew-couch'}), couch = makeCrewCouch();
    const torso = pilot.group.getObjectByName('crew-pilot-torso')!, backrest = couch.group.getObjectByName('crew-couch-back-padding')!;
    const torsoAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(torso.quaternion);
    const chestNormal = new THREE.Vector3(0, 0, -1).applyQuaternion(torso.quaternion);
    const backNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(backrest.quaternion);
    const load = new THREE.Vector3(...CREW_COUCH_POSE.axialSeatLoadDirection);
    expect(torsoAxis.y).toBeGreaterThan(.95);
    expect(Math.abs(torsoAxis.dot(load))).toBeLessThan(.3);
    expect(backNormal.dot(load)).toBeGreaterThan(.95);
    expect(chestNormal.distanceTo(new THREE.Vector3(...CREW_COUCH_POSE.chestDirection))).toBeCloseTo(0, 12);
    expect(backNormal.distanceTo(new THREE.Vector3(...CREW_COUCH_POSE.backDirection))).toBeCloseTo(0, 12);
    expect(backrest.position.z).toBeGreaterThan(torso.position.z);
    expect(couch.group.getObjectByName('crew-couch-head-restraint')!.position.z).toBeGreaterThan(pilot.head.position.z);
  });

  it('supports both boots on foot pans and supplies head restraints and five harness straps', () => {
    const pilot = makePilotAvatar({mode: 'crew-couch'}), couch = makeCrewCouch();
    pilot.group.updateMatrixWorld(true); couch.group.updateMatrixWorld(true);
    for (const side of ['left', 'right']) {
      const boot = new THREE.Box3().setFromObject(pilot.group.getObjectByName(`crew-pilot-${side}-boot`)!);
      const footPan = new THREE.Box3().setFromObject(couch.group.getObjectByName(`crew-couch-${side}-foot-pan`)!);
      expect(footPan.min.y).toBeGreaterThanOrEqual(.025 - 1e-6);
      expect(boot.min.y).toBeCloseTo(footPan.max.y, 6);
      expect(boot.min.x).toBeGreaterThan(footPan.min.x); expect(boot.max.x).toBeLessThan(footPan.max.x);
      expect(boot.min.z).toBeGreaterThan(footPan.min.z); expect(boot.max.z).toBeLessThan(footPan.max.z);
      expect(couch.group.getObjectByName(`crew-couch-head-${side}-bolster`)).toBeDefined();
      expect(couch.group.getObjectByName(`crew-${side}-shoulder-harness`)).toBeDefined();
      expect(couch.group.getObjectByName(`crew-${side}-lap-harness`)).toBeDefined();
    }
    expect(couch.group.getObjectByName('crew-crotch-harness')).toBeDefined();
    expect(couch.group.getObjectByName('crew-harness-release-buckle')).toBeDefined();
    expect(couch.eye.toArray()).toEqual(pilot.eye.toArray());
  });

  it('lets the crew face look through a real helmet opening and transparent visor', () => {
    const pilot = makePilotAvatar({mode: 'crew-couch'}); pilot.setView(false); pilot.group.updateMatrixWorld(true);
    for (const yaw of [-.2, 0, .2]) {
      const ray = new THREE.Raycaster(pilot.eye, new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)), 0, .5);
      const hits = ray.intersectObject(pilot.head, true);
      expect(hits.some(hit => hit.object.name === 'crew-pilot-visor')).toBe(true);
      const opaque = hits.filter(hit => {
        if (!(hit.object instanceof THREE.Mesh)) return false;
        const materials = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
        return materials.some(material => !material.transparent);
      });
      expect(opaque.map(hit => hit.object.name)).toEqual([]);
    }
  });

  it('holds the whole restrained body and eye in craft coordinates through attitude and high load', () => {
    const craft = new THREE.Group(), pilot = makePilotAvatar({mode: 'crew-couch'}), couch = makeCrewCouch();
    craft.add(pilot.group, couch.group); craft.position.set(82, -10, 33); craft.rotation.set(.8, 1.2, -.3);
    const before = pilot.group.children.map(child => child.position.toArray());
    pilot.setView(false); pilot.setManual(true); pilot.update(input, 6);
    expect(pilot.group.children.map(child => child.position.toArray())).toEqual(before);
    expect(pilot.head.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    expect(pilot.group.position.toArray()).toEqual([0, 0, 0]);
    expect(pilot.group.quaternion.toArray()).toEqual([0, 0, 0, 1]);
    expect(pilot.group.userData.loadG).toBe(6);
    craft.updateMatrixWorld(true);
    const worldEye = pilot.group.localToWorld(pilot.eye.clone());
    expect(worldEye.distanceTo(craft.localToWorld(couch.eye.clone()))).toBeCloseTo(0, 12);
    const faceDirection = new THREE.Vector3(...CREW_COUCH_POSE.gazeDirection).applyQuaternion(pilot.head.getWorldQuaternion(new THREE.Quaternion()));
    expect(faceDirection.distanceTo(new THREE.Vector3(0, 0, -1).applyQuaternion(craft.quaternion))).toBeCloseTo(0, 12);
  });

  it('keeps the noseward pilot eye rays clear of the body, harness and couch', () => {
    const group = new THREE.Group(), pilot = makePilotAvatar({mode: 'crew-couch'}), couch = makeCrewCouch();
    group.add(pilot.group, couch.group); pilot.setView(true); group.updateMatrixWorld(true);
    for (const yaw of [-.2, 0, .2]) {
      const ray = new THREE.Raycaster(pilot.eye, new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)), 0, 4);
      const visible = ray.intersectObject(group, true).filter(hit => {
        for (let parent: THREE.Object3D | null = hit.object; parent; parent = parent.parent) if (!parent.visible) return false;
        return true;
      });
      expect(visible.map(hit => hit.object.name)).toEqual([]);
    }
  });

  it('preserves the default free-exploration seated body and its existing head motion', () => {
    const pilot = makePilotAvatar();
    expect(pilot.group.name).toBe('seated-pilot'); expect(pilot.pose).toBeUndefined();
    expect(pilot.head.position.toArray()).toEqual([0, 1.5, -2.68]);
    expect(pilot.eye.toArray()).toEqual([0, 1.5, -2.9]);
    expect(pilot.group.getObjectByName('crew-pilot-torso')).toBeUndefined();
    pilot.setManual(true); pilot.update(input, 1);
    expect(pilot.head.rotation.y).toBe(.04); expect(pilot.head.rotation.x).toBe(-.03);
  });
});
