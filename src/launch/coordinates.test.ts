import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { LAUNCH_EARTH, LAUNCH_SITE } from '../data/launchMission';
import { baseBasis, baseOrientation, EARTH_POLAR_M, fixedToGeodetic, fixedToLocal, fixedToScene, geodeticToFixed, localToFixed, sceneToFixed } from './coordinates';

describe('launch site coordinates', () => {
  it('places the equator, meridian and poles on WGS84 reference axes', () => {
    expect(geodeticToFixed({ latitudeDeg: 0, longitudeDeg: 0, altitudeM: 0 }).distanceTo(new Vector3(LAUNCH_EARTH.semiMajorM, 0, 0))).toBeLessThan(1e-6);
    expect(geodeticToFixed({ latitudeDeg: 0, longitudeDeg: 90, altitudeM: 0 }).distanceTo(new Vector3(0, LAUNCH_EARTH.semiMajorM, 0))).toBeLessThan(1e-6);
    expect(geodeticToFixed({ latitudeDeg: 90, longitudeDeg: 0, altitudeM: 0 }).z).toBeCloseTo(EARTH_POLAR_M, 6);
  });
  it('round trips geodetic positions, including negative altitude and orbit heights', () => {
    for (const point of [LAUNCH_SITE, { latitudeDeg: -43, longitudeDeg: 179.9, altitudeM: -100 }, { latitudeDeg: 60, longitudeDeg: -120, altitudeM: 400000 }, { latitudeDeg: -90, longitudeDeg: 0, altitudeM: 100 }]) {
      const restored = fixedToGeodetic(geodeticToFixed(point));
      expect(restored.latitudeDeg).toBeCloseTo(point.latitudeDeg, 9);
      expect(restored.longitudeDeg).toBeCloseTo(point.longitudeDeg, 9);
      expect(restored.altitudeM).toBeCloseTo(point.altitudeM, 5);
    }
  });
  it('uses an orthonormal right-handed east/up/south basis with metre-preserving local offsets', () => {
    const b = baseBasis();
    expect(new Vector3().crossVectors(b.east, b.up).distanceTo(b.south)).toBeLessThan(1e-12);
    expect(b.east.dot(b.up)).toBeCloseTo(0, 12);
    for (const p of [new Vector3(), new Vector3(300, 60, -150), new Vector3(-205, 17, 55)]) {
      expect(fixedToLocal(localToFixed(p)).distanceTo(p)).toBeLessThan(1e-6);
      expect(localToFixed(p).distanceTo(b.origin)).toBeCloseTo(p.length(), 6);
    }
  });
  it('keeps the site fixed while its inertial position changes with epoch; inverse is consistent', () => {
    const origin = geodeticToFixed(LAUNCH_SITE), copy = origin.clone();
    for (const time of [0, 8.43e8, 8.43e8 + 3600]) {
      const scene = fixedToScene(origin, time);
      expect(sceneToFixed(scene, time).distanceTo(origin)).toBeLessThan(1e-6);
      expect(scene.length()).toBeCloseTo(origin.length(), 6);
      expect(new Vector3(0, 1, 0).applyQuaternion(baseOrientation(time)).distanceTo(fixedToScene(baseBasis().up, time))).toBeLessThan(1e-12);
    }
    expect(fixedToScene(origin, 8.43e8).distanceTo(fixedToScene(origin, 8.43e8 + 3600))).toBeGreaterThan(1e6);
    expect(origin.equals(copy)).toBe(true);
  });
  it('rejects invalid coordinates instead of silently placing a site', () => {
    expect(() => geodeticToFixed({ latitudeDeg: 91, longitudeDeg: 0, altitudeM: 0 })).toThrow();
    expect(() => fixedToGeodetic(new Vector3())).toThrow();
  });
});
