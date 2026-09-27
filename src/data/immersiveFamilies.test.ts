import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bodyById } from './catalog';
import { BODY_IDS, type StateFrame, type Vec3 } from '../types';
import { immersiveFamilyMembers, familyRadius, familyViewport, familyViewDirection, fitFamilyCamera } from './immersiveFamilies';
import { createImmersiveFamily, familyMemberVisible } from '../components/immersiveFamilyScene';
import { referenceAttitude } from '../components/referenceAttitude';

function frameAt(): StateFrame {
  const frame = { time: 840000000, positions: new Float64Array(30), velocities: new Float64Array(30) };
  frame.positions.set([100000000, 2000000, -30000], BODY_IDS.indexOf('earth') * 3);
  frame.positions.set([100384000, 2020000, -27000], BODY_IDS.indexOf('moon') * 3);
  frame.velocities.set([30, 1, 2], BODY_IDS.indexOf('earth') * 3);
  frame.velocities.set([30.3, 1.9, 2.1], BODY_IDS.indexOf('moon') * 3);
  return frame;
}
const satellites = [
  { id: 'titan', position: [1200000, -240000, 180000] as Vec3, velocity: [2, 4, .1] as Vec3 },
  { id: 'enceladus', position: [-180000, 130000, -80000] as Vec3, velocity: [7, -8, 2] as Vec3 },
  { id: 'rhea', position: [-400000, -300000, 100000] as Vec3, velocity: [-6, 7, 1] as Vec3 },
  { id: 'europa', position: [10, 20, 30] as Vec3, velocity: [1, 2, 3] as Vec3 },
];

describe('沉浸同景的数据、尺度与取景', () => {
  it('地月作同帧相减，转换坐标但保留真实距离和相对速度，不混入其他行星', () => {
    const frame = frameAt(), original = frame.positions.slice();
    const members = immersiveFamilyMembers('earth', frame, satellites);
    expect(members.map(m => m.id)).toEqual(['earth', 'moon']);
    const moon = members[1];
    expect(moon.position.clone().multiplyScalar(bodyById.earth.radiusKm).toArray()).toEqual([384000, 3000, -20000]);
    expect(moon.distanceKm).toBeCloseTo(Math.hypot(384000, 20000, 3000), 8);
    expect(moon.speedKmS).toBeCloseTo(Math.hypot(.3, .9, .1), 12);
    const translated = { ...frame, positions: frame.positions.map((p, i) => p + [900000, -50000, 3000][i % 3]) };
    expect(immersiveFamilyMembers('earth', translated, [])[1].position.toArray()).toEqual(moon.position.toArray());
    expect(frame.positions).toEqual(original);
  });
  it('土星只接收三颗代表卫星的相对历表；缺数据不生成假位置', () => {
    const members = immersiveFamilyMembers('saturn', frameAt(), satellites);
    expect(members.map(m => m.id)).toEqual(['saturn', 'enceladus', 'rhea', 'titan']);
    expect(members[3].position.clone().multiplyScalar(bodyById.saturn.radiusKm).distanceTo(new THREE.Vector3(1200000, 180000, 240000))).toBeLessThan(1e-8);
    expect(immersiveFamilyMembers('saturn', frameAt(), []).map(m => m.id)).toEqual(['saturn']);
  });
  it('真实半径比不设最小可见球径；放大只影响卫星外观，位置与资料不变', () => {
    for (const parent of ['earth', 'saturn'] as const) {
      const members = immersiveFamilyMembers(parent, frameAt(), satellites);
      const before = JSON.stringify(members);
      for (const member of members) {
        expect(familyRadius(member, parent, false)).toBeCloseTo(member.radiusKm / bodyById[parent].radiusKm, 14);
        expect(familyRadius(member, parent, true) / familyRadius(member, parent, false)).toBe(member.parent ? 1 : parent === 'earth' ? 2 : 16);
      }
      expect(JSON.stringify(members)).toBe(before);
    }
  });
  it('不同屏幕和近景目标都收入未被操作面板遮挡的矩形，镜头在球外', () => {
    for (const parent of ['earth', 'saturn'] as const) {
      const members = immersiveFamilyMembers(parent, frameAt(), satellites);
      const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(referenceAttitude(bodyById[parent], frameAt().time));
      const direction = familyViewDirection(parent, members, new THREE.Vector3(-1, .2, .3).normalize(), pole);
      if (parent === 'earth') expect(Math.abs(direction.dot(members[1].position.clone().normalize()))).toBeLessThan(1e-10);
      for (const [width, height] of [[1600, 960], [1024, 640], [390, 844]]) {
        const viewport = familyViewport(width, height);
        for (const group of [members, ...members.map(m => [m])]) {
          const bounds = group.map(m => ({ position: m.position, radius: m.parent && parent === 'saturn' ? 2.4 : familyRadius(m, parent, true) }));
          const pose = fitFamilyCamera(bounds, direction, pole, viewport);
          const camera = new THREE.PerspectiveCamera(pose.fov, width / height, .0001, 2000);
          camera.position.copy(pose.position); camera.up.copy(pose.up); camera.lookAt(pose.target);
          camera.setViewOffset(width, height, width / 2 - (viewport.left + viewport.right) / 2, height / 2 - (viewport.top + viewport.bottom) / 2, width, height);
          camera.updateProjectionMatrix(); camera.updateMatrixWorld();
          for (const bound of bounds) {
            expect(camera.position.distanceTo(bound.position)).toBeGreaterThan(bound.radius);
            for (let i = 0; i < 50; i++) {
              const z = 1 - 2 * (i + .5) / 50, phi = i * Math.PI * (3 - Math.sqrt(5)), r = Math.sqrt(1 - z * z);
              const p = new THREE.Vector3(r * Math.cos(phi), r * Math.sin(phi), z).multiplyScalar(bound.radius).add(bound.position).project(camera);
              const x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2;
              expect(x).toBeGreaterThanOrEqual(viewport.left); expect(x).toBeLessThanOrEqual(viewport.right);
              expect(y).toBeGreaterThanOrEqual(viewport.top); expect(y).toBeLessThanOrEqual(viewport.bottom);
            }
          }
        }
      }
    }
  });
  it('实际三维卫星也只改变半径，距离线可以隐藏，遮挡的名称不透过母星', () => {
    const members = immersiveFamilyMembers('saturn', frameAt(), satellites);
    const scene = createImmersiveFamily(members, 'saturn', frameAt(), new THREE.TextureLoader());
    scene.update(false, true, true);
    const titan = scene.root.getObjectByName('immersive-family:titan')!;
    const position = titan.position.clone(), size = titan.scale.x;
    scene.update(true, false, false);
    expect(titan.position.toArray()).toEqual(position.toArray()); expect(titan.scale.x).toBe(size * 16);
    const camera = new THREE.PerspectiveCamera(42, 1, .01, 100);
    camera.position.set(0, 0, 5); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    members[1].position.set(0, 0, -5);
    expect(familyMemberVisible(members[1], members, camera, 'saturn', false)).toBe(false);
    members[1].position.set(2, 0, 0);
    expect(familyMemberVisible(members[1], members, camera, 'saturn', false)).toBe(false); // Outside 42° frustum.
    members[1].position.set(1.4, 0, 0);
    expect(familyMemberVisible(members[1], members, camera, 'saturn', false)).toBe(true);
    scene.root.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose()); } });
  });
});
