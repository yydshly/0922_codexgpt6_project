import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { FlightState } from './liftoff';
import { solarPointingReading } from './solarPointing';
import { createLaunchSatellite } from './vehicleModel';
import { satelliteDemoCue, satelliteDemoPacing } from './satelliteDemo';
import { slewDirection } from './satelliteOperations';

function state(angle: number, shadow = false) {
  const a = angle * Math.PI / 180;
  return { phase: 'ops-align', time: 15, deployment: { released: true }, operations: {
    startTime: 0, arrayNormal: [Math.cos(a), Math.sin(a), 0], sunDirection: [1, 0, 0],
    incidence: Math.max(0, Math.cos(a)), shadow, generationW: shadow ? 0 : 1400 * Math.max(0, Math.cos(a)),
    loadW: 200, energyJ: 60, capacityJ: 100,
  } } as FlightState;
}

describe('solar pointing is visible and agrees with the front-face geometry', () => {
  it('reports the full geometric angle instead of folding rear-facing normals to 90 degrees', () => {
    for (const angle of [0, 60, 90, 120, 180]) {
      const s = state(angle), before = JSON.stringify(s), r = solarPointingReading(s)!;
      expect(r.angleDeg).toBeCloseTo(angle, 8); expect(JSON.stringify(s)).toBe(before);
      if (angle > 90) { expect(r.generationW).toBe(0); expect(r.supply).toContain('背向太阳'); }
    }
  });
  it('separates alignment from sunlight availability and uses the task power ledger', () => {
    const s = state(0, true); s.phase = 'ops-power-ready'; s.time = 30;
    const dark = solarPointingReading(s)!;
    expect(dark.aligned).toBe(true); expect(dark.progress).toBe(1); expect(dark.generationW).toBe(0);
    expect(dark.supply).toContain('地球遮挡'); expect(dark.batteryPercent).toBe(60);
    expect(solarPointingReading(state(60))!.generationW).toBeCloseTo(700);
  });
  it('points BOTH actual blue mesh faces at the commanded normal under independent body rotations', () => {
    const model = createLaunchSatellite();
    const sun = new THREE.Vector3(.4, -.7, .3).normalize(), initial: [number,number,number] = [-1, 0, 0];
    for (const mass of [250, 500]) for (const u of [0, .5, 1]) {
      model.update(mass, 1); model.root.position.set(21,-9,100);
      model.root.quaternion.setFromEuler(new THREE.Euler(.7 + u, -.5, 1.2));
      const body = model.root.quaternion.clone();
      const commanded = new THREE.Vector3(...slewDirection(initial, sun.toArray(), u));
      model.pointArrays(commanded.clone().applyQuaternion(body.clone().invert()));
      const frames = model.arrayFaceFrames();
      expect(model.root.quaternion.equals(body)).toBe(true);
      model.arrayFaces.forEach((face, i) => {
        expect(frames[i].normal.distanceTo(commanded)).toBeLessThan(1e-12);
        const materials = face.panel.material as THREE.MeshStandardMaterial[];
        const blueIndex = materials.findIndex(m => m.color.getHexString() === '2565a8');
        const group = face.panel.geometry.groups.find(g => g.materialIndex === blueIndex)!;
        const position = face.panel.geometry.getAttribute('position'), index = face.panel.geometry.index!;
        const vertices = [0,1,2].map(k => new THREE.Vector3().fromBufferAttribute(position, index.getX(group.start + k)).applyMatrix4(face.panel.matrixWorld));
        const geometricNormal = vertices[1].sub(vertices[0]).cross(vertices[2].sub(vertices[0])).normalize();
        expect(geometricNormal.distanceTo(commanded)).toBeLessThan(1e-10);
      });
    }
  });
  it('describes electrical balance, full batteries and exhausted reserves from the actual ledger', () => {
    const s = state(85);
    expect(solarPointingReading(s)!.supplyKind).toBe('deficit');
    s.operations!.energyJ = 0;
    expect(solarPointingReading(s)!.supplyKind).toBe('unserved');
    s.operations!.energyJ = 40; s.operations!.generationW = s.operations!.loadW;
    expect(solarPointingReading(s)!.supplyKind).toBe('balanced');
    s.operations!.generationW = s.operations!.loadW + 500;
    expect(solarPointingReading(s)!.supplyKind).toBe('charging');
    s.operations!.energyJ = s.operations!.capacityJ;
    expect(solarPointingReading(s)!.supplyKind).toBe('full');
    expect(solarPointingReading(state(120))!.supplyKind).toBe('rear');
    expect(solarPointingReading(state(0, true))!.supplyKind).toBe('eclipse');
  });
  it('keeps direction annotations optional and on the actual front side', () => {
    const model = createLaunchSatellite(); model.update(500, 1);
    expect(model.arrayFaces.every(f => !f.guide.visible)).toBe(true);
    model.setArrayGuides(true); const frames = model.arrayFaceFrames();
    model.arrayFaces.forEach((f,i) => {
      expect(f.guide.visible).toBe(true);
      const arrowDirection = new THREE.Vector3(0,1,0).applyQuaternion(f.guide.getWorldQuaternion(new THREE.Quaternion()));
      expect(arrowDirection.dot(frames[i].normal)).toBeCloseTo(1, 12);
    });
    model.setArrayGuides(false); expect(model.arrayFaces.every(f => !f.guide.visible)).toBe(true);
  });
  it('stays close through power confirmation and protects alignment viewing time in fast demos', () => {
    const s = state(60);
    for (const phase of ['ops-ready','ops-align','ops-power-ready'] as const) {
      s.phase = phase; expect(satelliteDemoCue(s)?.view).toBe('power'); expect(satelliteDemoCue(s)?.step).toBe(0);
    }
    s.phase='ops-align'; expect(satelliteDemoPacing(s).visibleWork).toBe(true);
    s.phase='ops-cycle'; expect(satelliteDemoCue(s)?.view).toBe('surface');
    s.phase='life-ready'; expect(solarPointingReading(s)).toBeNull(); expect(satelliteDemoCue(s)).toBeNull();
  });
});
