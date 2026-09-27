import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { IMMERSIVE_VIEWS, immersiveCameraPose, immersiveSunDirection } from './immersiveViews';
import { BODY_IDS, type StateFrame } from '../types';
import { bodyById } from './catalog';
import { referenceAttitude } from '../components/referenceAttitude';
import { ringSystemBounds } from './rings';

function frameAt(time = 840000000): StateFrame {
  const positions = new Float64Array(30);
  BODY_IDS.forEach((_, i) => positions.set([100 + i * 100, -40 + i * 30, 10 + i * 5], i * 3));
  return { time, positions, velocities: new Float64Array(30) };
}
describe('沉浸取景的局部空间与真实光照', () => {
  it('光源使用太阳减天体位置，正确转换 ECLIPJ2000 三轴且不受整体平移影响', () => {
    const frame = frameAt();
    const expected = new THREE.Vector3(-300, -15, 90).normalize();
    expect(immersiveSunDirection(frame, 'earth').distanceTo(expected)).toBeLessThan(1e-12);
    const translated = { ...frame, positions: frame.positions.map((value, i) => value + [10000, -300, 888][i % 3]) };
    expect(immersiveSunDirection(translated, 'earth').distanceTo(expected)).toBeLessThan(1e-12);
  });
  it('所有镜头都在球体与主环之外，低角度视线确实更接近环面，且不改变历表', () => {
    for (const time of [820000000, 840000000, 870000000]) {
      const frame = frameAt(time), before = frame.positions.slice();
      for (const view of IMMERSIVE_VIEWS) {
        const pose = immersiveCameraPose(view.id, frame);
        const bound = view.body === 'saturn' ? ringSystemBounds('saturn', bodyById.saturn.radiusKm)[1] : 1.018;
        expect(pose.position.length()).toBeGreaterThan(bound);
        expect(pose.up.length()).toBeCloseTo(1, 12);
        expect(pose.up.clone().cross(pose.position).length()).toBeGreaterThan(.1);
        expect(pose.position.toArray().every(Number.isFinite)).toBe(true);
      }
      const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(referenceAttitude(bodyById.saturn, time));
      const elevation = (id: 'saturn-rings' | 'saturn-edge') => Math.asin(immersiveCameraPose(id, frame).position.normalize().dot(pole)) * 180 / Math.PI;
      expect(elevation('saturn-rings')).toBeCloseTo(24, 8);
      expect(elevation('saturn-edge')).toBeCloseTo(4, 8);
      expect(frame.positions).toEqual(before);
    }
  });
});
