import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createImmersiveRingGuide, projectRingAnchor } from './immersiveRingGuide';
import { bodyById } from '../data/catalog';
import { IMMERSIVE_RING_REGIONS } from '../data/immersiveDetails';

describe('沉浸环分区指认', () => {
  it('分界区域只画边线，不添加假实体；切换时仅保留选中分区', () => {
    const guide = createImmersiveRingGuide(), camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 2, 5);
    guide.update('division', camera, new THREE.Quaternion());
    const division = guide.root.getObjectByName('division')!;
    expect(division.children.every(child => child instanceof THREE.Line)).toBe(true);
    expect(guide.root.children.filter(child => child.visible).map(child => child.name)).toEqual(['division']);
    guide.update(null, camera, new THREE.Quaternion());
    expect(guide.root.children.some(child => child.visible)).toBe(false);
  });
  it('镜头绕动、赤道面倾斜时，锚点仍在正确环段中并面向观察者', () => {
    const guide = createImmersiveRingGuide(), camera = new THREE.PerspectiveCamera();
    const attitude = new THREE.Quaternion().setFromEuler(new THREE.Euler(.4, -.8, .6));
    const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(attitude);
    for (const position of [[1, 2, 5], [-4, 1, -3], [5, -3, 0]]) {
      camera.position.fromArray(position);
      for (const region of IMMERSIVE_RING_REGIONS) {
        const anchor = guide.update(region.id, camera, attitude)!;
        expect(Math.abs(anchor.dot(pole))).toBeLessThan(1e-10);
        const km = anchor.length() * bodyById.saturn.radiusKm;
        expect(km).toBeGreaterThan(region.innerKm);
        expect(km).toBeLessThan(region.outerKm);
        expect(anchor.dot(camera.position)).toBeGreaterThan(0);
      }
    }
  });
  it('球体背后和视野外的锚点不显示，近侧可见点可投影', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, .1, 100);
    camera.position.set(0, 0, 5); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    expect(projectRingAnchor(new THREE.Vector3(0, 0, -2), camera)).toBeNull();
    expect(projectRingAnchor(new THREE.Vector3(100, 0, 0), camera)).toBeNull();
    const point = projectRingAnchor(new THREE.Vector3(1.5, 0, 0), camera);
    expect(point).not.toBeNull(); expect(point!.x).toBeGreaterThan(0);
  });
});
